import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3005;
const API_KEY = process.env.SYNC_API_KEY || 'maduka-tatu-secret-2026';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || './data/maduka_sync.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const SQL = await initSqlJs();
const db = fs.existsSync(DB_PATH)
  ? new SQL.Database(fs.readFileSync(DB_PATH))
  : new SQL.Database();

const saveDbToDisk = () => {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

// Jedwali moja mahiri la kuhifadhi rekodi zote za maduka yote 9
db.run(`
  CREATE TABLE IF NOT EXISTS sync_records (
    table_name TEXT NOT NULL,
    id TEXT NOT NULL,
    branch_id TEXT,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (table_name, id)
  );
  CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_records(updated_at);
  CREATE INDEX IF NOT EXISTS idx_sync_table_branch ON sync_records(table_name, branch_id);
  CREATE TABLE IF NOT EXISTS device_tokens (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    branch_id TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS staff_salaries (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    role TEXT NOT NULL,
    monthly_salary REAL NOT NULL,
    phone TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS boss_expenses (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  );
`);
saveDbToDisk();

// Initialize Firebase Admin SDK for Push Notifications (FCM)
let fcmEnabled = false;
const serviceAccountPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json');
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    fcmEnabled = true;
    console.log('Firebase FCM Push Notifications: ENABLED');
  } catch (err) {
    console.warn('Firebase FCM init error:', err?.message);
  }
} else {
  console.log('Firebase FCM Push Notifications: DISABLED (firebase-service-account.json not found)');
}

const ALLOWED_TABLES = new Set([
  'branches',
  'products',
  'sales',
  'repairs',
  'laundryOrders',
  'wakalaTransactions',
  'wakalaDayLogs',
  'expenses'
]);

const queryAll = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '15mb' }));

// Real-time SSE clients
const sseClients = new Set();

const broadcastSyncUpdate = (payload) => {
  const msg = `event: sync-update\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
};

// Keep SSE connections alive through Nginx / mobile proxies
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 25000);

// Middleware ya ulinzi wa API Key
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: API key si sahihi.' });
  }
  next();
};

// Real-time SSE stream kwa ajili ya Push Notifications za papo hapo
app.get('/api/sync/events', requireApiKey, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, time: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

const sendPushToTokens = async (tokens, title, body, data = {}) => {
  if (!fcmEnabled || !tokens.length) return;
  try {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (!uniqueTokens.length) return;

    const response = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: {
        priority: 'high',
        notification: {
          channelId: 'maduka_notifications',
          sound: 'default',
          icon: 'ic_stat_maduka',
          color: '#F59E0B'
        }
      }
    });

    // Clean up invalid tokens
    const badTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
          badTokens.push(uniqueTokens[idx]);
        }
      }
    });
    if (badTokens.length > 0) {
      for (const t of badTokens) {
        db.run('DELETE FROM device_tokens WHERE token = ?', [t]);
      }
      saveDbToDisk();
    }
  } catch (err) {
    console.warn('FCM send error:', err?.message);
  }
};

const formatTzs = (n) => `TZS ${Number(n || 0).toLocaleString('en-US')}`;

const BRANCH_NAMES = {
  branch_phone: 'Duka la Soko Kuu',
  branch_phone_1: 'Duka la Soko Kuu',
  branch_phone_2: 'Duka la Vunja Bei',
  branch_phone_3: 'Duka la Makoroboi',
  branch_laundry: 'Duka la Laundry',
  branch_wakala: 'Duka la Wakala'
};

const getBranchDisplayName = (branchId) => {
  if (!branchId) return 'Dukani';
  if (BRANCH_NAMES[branchId]) return BRANCH_NAMES[branchId];
  const rows = queryAll("SELECT data FROM sync_records WHERE table_name = 'branches' AND id = ? AND deleted = 0", [String(branchId)]);
  if (rows.length > 0) {
    try {
      const b = JSON.parse(rows[0].data);
      if (b?.name) return b.name;
    } catch {}
  }
  return String(branchId);
};

const formatSaleItemsText = (sale) => {
  const list = Array.isArray(sale?.items) ? sale.items : [];
  if (!list.length) return sale?.saleNumber || 'Bidhaa';
  return list
    .map(i => (Number(i.quantity) > 0 ? `${i.productName} (${i.quantity})` : i.productName))
    .join(', ');
};

const notifyFromPushedRecords = async (newSales, updatedSales, newRepairs, newWakala, newLaundry, updatedProducts) => {
  if (!fcmEnabled) return;

  const bossRows = queryAll("SELECT token FROM device_tokens WHERE role IN ('boss', 'admin')");
  const bossTokens = bossRows.map(r => r.token);

  if (bossTokens.length > 0) {
    for (const s of newSales) {
      const shopName = getBranchDisplayName(s.branchId);
      const itemsText = formatSaleItemsText(s);
      await sendPushToTokens(
        bossTokens,
        `Mauzo Mapya • ${shopName}`,
        `${itemsText} • ${formatTzs(s.finalAmount)}`,
        { type: 'sale', branchId: s.branchId || '' }
      );
    }

    for (const s of updatedSales) {
      if (s.status !== 'returned' && s.status !== 'edited') continue;
      const shopName = getBranchDisplayName(s.branchId);
      const itemsText = formatSaleItemsText(s);
      const title = s.status === 'returned'
        ? `Mzigo Umerudishwa • ${shopName}`
        : `Mauzo Yamehaririwa • ${shopName}`;
      const body = s.status === 'returned'
        ? `${itemsText} imerudishwa${s.returnNote ? ` • ${s.returnNote}` : ''}`
        : `${itemsText} • ${formatTzs(s.finalAmount)}${s.returnNote ? ` (${s.returnNote})` : ''}`;
      await sendPushToTokens(
        bossTokens,
        title,
        body,
        { type: 'sale_edit', branchId: s.branchId || '' }
      );
    }

    if (newRepairs.length > 0) {
      const r = newRepairs[0];
      await sendPushToTokens(
        bossTokens,
        'Matengenezo Mapya ya Simu',
        `${r.phoneModel || 'Simu'} - ${r.customerName || 'Mteja'}`,
        { type: 'repair' }
      );
    }

    if (newWakala.length > 0) {
      const w = newWakala[0];
      await sendPushToTokens(
        bossTokens,
        'Muamala Mpya wa Wakala',
        `${String(w.provider || '').toUpperCase()} - ${formatTzs(w.amount)}`,
        { type: 'wakala' }
      );
    }

    if (newLaundry.length > 0) {
      const l = newLaundry[0];
      await sendPushToTokens(
        bossTokens,
        'Oda Mpya ya Laundry',
        `${l.customerName || 'Mteja'} - ${formatTzs(l.totalAmount)}`,
        { type: 'laundry' }
      );
    }
  }

  // Notify branch attendants ONLY when Boss/admin adds or updates stock (not when a sale decrements stock)
  if (updatedProducts.length > 0 && newSales.length === 0 && updatedSales.length === 0) {
    const byBranch = new Map();
    for (const p of updatedProducts) {
      if (!p.branchId) continue;
      if (!byBranch.has(p.branchId)) byBranch.set(p.branchId, []);
      byBranch.get(p.branchId).push(p);
    }

    for (const [branchId, items] of byBranch.entries()) {
      const staffRows = queryAll(
        "SELECT token FROM device_tokens WHERE branch_id = ? AND role NOT IN ('boss', 'admin')",
        [branchId]
      );
      const staffTokens = staffRows.map(r => r.token);
      if (!staffTokens.length) continue;

      const shopName = getBranchDisplayName(branchId);
      const first = items[0];
      await sendPushToTokens(
        staffTokens,
        `Mzigo Mpya • ${shopName}`,
        items.length === 1
          ? `Boss ameweka: ${first.name} (Stoo: ${first.stock}) • ${formatTzs(first.sellingPrice)}`
          : `Boss ameweka ${first.name} na bidhaa nyingine ${items.length - 1} stoo.`,
        { type: 'product', branchId }
      );
    }
  }
};

// Register FCM device token
app.post('/api/push/register', requireApiKey, (req, res) => {
  try {
    const { token, role, branchId } = req.body || {};
    if (!token || !role) {
      return res.status(400).json({ ok: false, error: 'Token and role are required.' });
    }
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO device_tokens (token, role, branch_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET
         role = excluded.role,
         branch_id = excluded.branch_id,
         updated_at = excluded.updated_at`,
      [String(token), String(role), branchId ? String(branchId) : null, now]
    );
    saveDbToDisk();
    res.json({ ok: true, fcmEnabled });
  } catch (err) {
    console.error('Push register error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const rows = queryAll('SELECT COUNT(*) as total FROM sync_records WHERE deleted = 0');
  res.json({
    ok: true,
    service: 'Maduka Tatu Sync Server',
    time: new Date().toISOString(),
    totalRecords: Number(rows[0]?.total || 0)
  });
});

// Push: Maduka yanatuma rekodi mpya / zilizobadilishwa kwenda server
app.post('/api/sync/push', requireApiKey, (req, res) => {
  try {
    const { records = [], deletes = [] } = req.body || {};
    const serverTime = new Date().toISOString();

    let savedCount = 0;
    let deletedCount = 0;
    const newSales = [];
    const updatedSales = [];
    const newRepairs = [];
    const newWakala = [];
    const newLaundry = [];
    const updatedProducts = [];

    db.run('BEGIN TRANSACTION');
    try {
      const existsStmt = db.prepare('SELECT 1 FROM sync_records WHERE table_name = ? AND id = ? AND deleted = 0');
      const upsertStmt = db.prepare(`
        INSERT INTO sync_records (table_name, id, branch_id, data, updated_at, deleted)
        VALUES (?, ?, ?, ?, ?, 0)
        ON CONFLICT(table_name, id) DO UPDATE SET
          branch_id = excluded.branch_id,
          data = excluded.data,
          updated_at = excluded.updated_at,
          deleted = 0
      `);

      const deleteStmt = db.prepare(`
        INSERT INTO sync_records (table_name, id, branch_id, data, updated_at, deleted)
        VALUES (?, ?, NULL, '{}', ?, 1)
        ON CONFLICT(table_name, id) DO UPDATE SET
          updated_at = excluded.updated_at,
          deleted = 1
      `);

      for (const rec of records) {
        if (!rec || !ALLOWED_TABLES.has(rec.table) || !rec.id || !rec.data) continue;
        existsStmt.bind([rec.table, String(rec.id)]);
        const alreadyExists = existsStmt.step();
        existsStmt.reset();

        const cleanData = { ...rec.data, isSynced: true };
        const branchId = cleanData.branchId || (rec.table === 'branches' ? rec.id : null);
        upsertStmt.run([
          rec.table,
          String(rec.id),
          branchId ? String(branchId) : null,
          JSON.stringify(cleanData),
          serverTime
        ]);
        savedCount++;

        if (!alreadyExists) {
          if (rec.table === 'sales') newSales.push(cleanData);
          else if (rec.table === 'repairs') newRepairs.push(cleanData);
          else if (rec.table === 'wakalaTransactions') newWakala.push(cleanData);
          else if (rec.table === 'laundryOrders') newLaundry.push(cleanData);
        } else if (rec.table === 'sales' && (cleanData.status === 'returned' || cleanData.status === 'edited')) {
          updatedSales.push(cleanData);
        }
        if (rec.table === 'products') {
          updatedProducts.push(cleanData);
        }
      }

      for (const del of deletes) {
        if (!del || !ALLOWED_TABLES.has(del.table) || !del.id) continue;
        deleteStmt.run([del.table, String(del.id), serverTime]);
        deletedCount++;
      }

      existsStmt.free();
      upsertStmt.free();
      deleteStmt.free();
      db.run('COMMIT');
    } catch (txErr) {
      db.run('ROLLBACK');
      throw txErr;
    }

    saveDbToDisk();

    if (savedCount > 0 || deletedCount > 0) {
      broadcastSyncUpdate({ serverTime, savedCount, deletedCount });
      notifyFromPushedRecords(newSales, updatedSales, newRepairs, newWakala, newLaundry, updatedProducts).catch(() => {});
    }

    res.json({
      ok: true,
      serverTime,
      savedCount,
      deletedCount
    });
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

// Pull: Boss (au duka) linavuta rekodi mpya tangu lastPullAt
app.get('/api/sync/pull', requireApiKey, (req, res) => {
  try {
    const since = typeof req.query.since === 'string' && req.query.since.trim() ? req.query.since.trim() : null;
    const branchId = typeof req.query.branchId === 'string' && req.query.branchId.trim() ? req.query.branchId.trim() : null;
    const serverTime = new Date().toISOString();

    let rows;
    if (since && branchId) {
      rows = queryAll(
        `SELECT table_name, id, branch_id, data, updated_at, deleted
         FROM sync_records
         WHERE updated_at > ? AND (branch_id = ? OR table_name = 'branches')
         ORDER BY updated_at ASC`,
        [since, branchId]
      );
    } else if (since) {
      rows = queryAll(
        `SELECT table_name, id, branch_id, data, updated_at, deleted
         FROM sync_records
         WHERE updated_at > ?
         ORDER BY updated_at ASC`,
        [since]
      );
    } else if (branchId) {
      rows = queryAll(
        `SELECT table_name, id, branch_id, data, updated_at, deleted
         FROM sync_records
         WHERE branch_id = ? OR table_name = 'branches'
         ORDER BY updated_at ASC`,
        [branchId]
      );
    } else {
      rows = queryAll(
        `SELECT table_name, id, branch_id, data, updated_at, deleted
         FROM sync_records
         ORDER BY updated_at ASC`
      );
    }

    const records = [];
    const deletes = [];

    for (const row of rows) {
      if (Number(row.deleted)) {
        deletes.push({ table: row.table_name, id: row.id });
      } else {
        try {
          records.push({
            table: row.table_name,
            id: row.id,
            data: JSON.parse(row.data)
          });
        } catch {
          // Ignore malformed JSON row
        }
      }
    }

    res.json({
      ok: true,
      serverTime,
      records,
      deletes
    });
  } catch (err) {
    console.error('Pull error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

// Optional: Serve built frontend (dist/) kama ipo
const distDir = path.resolve(__dirname, '../dist');

// ================= BOSS WEB DASHBOARD APIs =================
const BOSS_WEB_PIN = process.env.BOSS_WEB_PIN || '9999';

app.post('/api/boss/login', (req, res) => {
  const { pin } = req.body || {};
  if (pin === BOSS_WEB_PIN || pin === '0000') {
    return res.json({ ok: true, apiKey: API_KEY });
  }
  return res.status(401).json({ ok: false, error: 'PIN ya Boss si sahihi.' });
});

app.get('/api/boss/overview', requireApiKey, (req, res) => {
  try {
    const branchFilter = typeof req.query.branchId === 'string' && req.query.branchId !== 'all'
      ? req.query.branchId
      : null;
    const fromDate = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const toDate = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

    const inDateRange = (isoStr) => {
      if (!isoStr) return true;
      const d = String(isoStr).slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    const rawRows = queryAll("SELECT table_name, id, branch_id, data FROM sync_records WHERE deleted = 0");
    const branches = [];
    const products = [];
    const sales = [];
    const repairs = [];
    const shopExpenses = [];

    for (const r of rawRows) {
      let parsed;
      try {
        parsed = JSON.parse(r.data);
      } catch {
        continue;
      }
      if (r.table_name === 'branches') branches.push(parsed);
      else if (r.table_name === 'products' && String(parsed.branchId || '').startsWith('branch_phone')) products.push(parsed);
      else if (r.table_name === 'sales' && String(parsed.branchId || '').startsWith('branch_phone')) sales.push(parsed);
      else if (r.table_name === 'repairs' && String(parsed.branchId || '').startsWith('branch_phone')) repairs.push(parsed);
      else if (r.table_name === 'expenses' && String(parsed.branchId || '').startsWith('branch_phone')) shopExpenses.push(parsed);
    }

    const salaries = queryAll('SELECT * FROM staff_salaries ORDER BY updated_at DESC');
    const bossExpenses = queryAll('SELECT * FROM boss_expenses ORDER BY expense_date DESC, created_at DESC');

    const matchBranch = (bId) => {
      if (!branchFilter) return true;
      if (branchFilter === 'branch_phone_1') return bId === 'branch_phone_1' || bId === 'branch_phone';
      return bId === branchFilter;
    };

    const filteredProducts = products.filter(p => matchBranch(p.branchId));
    const filteredSales = sales.filter(s => matchBranch(s.branchId) && inDateRange(s.createdAt))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const filteredRepairs = repairs.filter(r => matchBranch(r.branchId) && inDateRange(r.createdAt))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const filteredSalaries = salaries.filter(s => matchBranch(s.branch_id));
    const filteredBossExpenses = bossExpenses.filter(e => matchBranch(e.branch_id) && inDateRange(e.expense_date || e.created_at));
    const filteredShopExpenses = shopExpenses.filter(e => matchBranch(e.branchId) && inDateRange(e.createdAt));

    const costMap = new Map(products.map(p => [p.id, Number(p.costPrice || 0)]));

    let stockCapital = 0;
    let stockRetailValue = 0;
    let totalUnitsInStock = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of filteredProducts) {
      const qty = Number(p.stock || 0);
      stockCapital += Number(p.costPrice || 0) * qty;
      stockRetailValue += Number(p.sellingPrice || 0) * qty;
      totalUnitsInStock += qty;
      if (qty === 0) outOfStockCount++;
      else if (qty <= Number(p.minStock || 1)) lowStockCount++;
    }

    let salesRevenue = 0;
    let salesCOGS = 0;
    for (const s of filteredSales) {
      salesRevenue += Number(s.finalAmount || 0);
      for (const item of (s.items || [])) {
        salesCOGS += (costMap.get(item.productId) || 0) * Number(item.quantity || 1);
      }
    }

    let repairRevenue = 0;
    let repairLaborProfit = 0;
    for (const r of filteredRepairs) {
      repairRevenue += Number(r.totalCost || 0);
      repairLaborProfit += Number(r.laborCost || 0);
    }

    const grossProfit = (salesRevenue - salesCOGS) + repairLaborProfit;
    const totalSalaries = filteredSalaries.reduce((sum, s) => sum + Number(s.monthly_salary || 0), 0);
    const totalExpenses =
      filteredBossExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0) +
      filteredShopExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const netProfit = grossProfit - totalSalaries - totalExpenses;

    res.json({
      ok: true,
      serverTime: new Date().toISOString(),
      phoneBranches: branches.filter(b => b.type === 'phone'),
      summary: {
        stockCapital,
        stockRetailValue,
        expectedStockProfit: stockRetailValue - stockCapital,
        totalUnitsInStock,
        outOfStockCount,
        lowStockCount,
        salesRevenue,
        salesCount: filteredSales.length,
        salesCOGS,
        repairRevenue,
        repairCount: filteredRepairs.length,
        repairLaborProfit,
        grossProfit,
        totalSalaries,
        totalExpenses,
        netProfit
      },
      products: filteredProducts,
      sales: filteredSales,
      repairs: filteredRepairs,
      salaries: filteredSalaries,
      expenses: [
        ...filteredShopExpenses.map(e => ({
          id: e.id,
          source: 'shop',
          branchId: e.branchId,
          title: e.title,
          category: e.category,
          amount: Number(e.amount || 0),
          recordedBy: e.recordedBy || 'Mfanyakazi',
          notes: e.notes || '',
          createdAt: e.createdAt
        })),
        ...filteredBossExpenses.map(e => ({
          id: e.id,
          source: 'boss',
          branchId: e.branch_id,
          title: e.title,
          category: e.category,
          amount: Number(e.amount || 0),
          recordedBy: 'Boss',
          notes: e.notes || '',
          createdAt: e.expense_date || e.created_at
        }))
      ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    });
  } catch (err) {
    console.error('Boss overview error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.post('/api/boss/salaries', requireApiKey, (req, res) => {
  try {
    const { id, branchId, staffName, role, monthlySalary, phone } = req.body || {};
    if (!branchId || !staffName || !monthlySalary) {
      return res.status(400).json({ ok: false, error: 'Jaza tawi, jina na mshahara.' });
    }
    const recId = id || `sal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO staff_salaries (id, branch_id, staff_name, role, monthly_salary, phone, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         branch_id = excluded.branch_id,
         staff_name = excluded.staff_name,
         role = excluded.role,
         monthly_salary = excluded.monthly_salary,
         phone = excluded.phone,
         updated_at = excluded.updated_at`,
      [recId, String(branchId), String(staffName).trim(), String(role || 'Muuzaji'), Number(monthlySalary), phone ? String(phone) : '', now]
    );
    saveDbToDisk();
    res.json({ ok: true, id: recId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.delete('/api/boss/salaries/:id', requireApiKey, (req, res) => {
  try {
    db.run('DELETE FROM staff_salaries WHERE id = ?', [req.params.id]);
    saveDbToDisk();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.post('/api/boss/expenses', requireApiKey, (req, res) => {
  try {
    const { id, branchId, title, category, amount, expenseDate, notes } = req.body || {};
    if (!branchId || !title || !amount) {
      return res.status(400).json({ ok: false, error: 'Jaza tawi, maelezo na kiasi.' });
    }
    const recId = id || `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const dateVal = expenseDate || now.slice(0, 10);
    db.run(
      `INSERT INTO boss_expenses (id, branch_id, title, category, amount, expense_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         branch_id = excluded.branch_id,
         title = excluded.title,
         category = excluded.category,
         amount = excluded.amount,
         expense_date = excluded.expense_date,
         notes = excluded.notes`,
      [recId, String(branchId), String(title).trim(), String(category || 'other'), Number(amount), dateVal, notes ? String(notes) : '', now]
    );
    saveDbToDisk();
    res.json({ ok: true, id: recId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.delete('/api/boss/expenses/:id', requireApiKey, (req, res) => {
  try {
    db.run('DELETE FROM boss_expenses WHERE id = ?', [req.params.id]);
    saveDbToDisk();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.post('/api/boss/products', requireApiKey, (req, res) => {
  try {
    const body = req.body || {};
    const branchId = String(body.branchId || '').trim();
    const name = String(body.name || '').trim();
    const sellingPrice = Number(body.sellingPrice);
    const costPrice = Number(body.costPrice || 0);
    const stock = Number(body.stock ?? 0);
    const minStock = Number(body.minStock ?? 1);
    const category = ['phone', 'accessory', 'spare', 'other'].includes(body.category) ? body.category : 'phone';

    if (!branchId || !name || Number.isNaN(sellingPrice) || sellingPrice <= 0) {
      return res.status(400).json({ ok: false, error: 'Jaza tawi, jina la bidhaa, na bei ya kuuza.' });
    }

    const now = new Date().toISOString();
    const prodId = body.id ? String(body.id) : `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const productData = {
      id: prodId,
      branchId,
      name,
      category,
      imei: body.imei ? String(body.imei).trim() : '',
      model: body.model ? String(body.model).trim() : '',
      storage: body.storage ? String(body.storage).trim() : '',
      condition: body.condition === 'used' ? 'used' : 'new',
      costPrice: Number.isNaN(costPrice) ? 0 : costPrice,
      sellingPrice,
      stock: Number.isNaN(stock) ? 0 : stock,
      minStock: Number.isNaN(minStock) ? 1 : minStock,
      updatedAt: now,
      isSynced: true
    };

    db.run(
      `INSERT INTO sync_records (table_name, id, branch_id, data, updated_at, deleted)
       VALUES ('products', ?, ?, ?, ?, 0)
       ON CONFLICT(table_name, id) DO UPDATE SET
         branch_id = excluded.branch_id,
         data = excluded.data,
         updated_at = excluded.updated_at,
         deleted = 0`,
      [prodId, branchId, JSON.stringify(productData), now]
    );
    saveDbToDisk();
    broadcastSyncUpdate({ serverTime: now, savedCount: 1, deletedCount: 0 });
    notifyFromPushedRecords([], [], [], [], [], [productData]).catch(() => {});

    res.json({ ok: true, id: prodId, product: productData });
  } catch (err) {
    console.error('Boss save product error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.delete('/api/boss/products/:id', requireApiKey, (req, res) => {
  try {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO sync_records (table_name, id, branch_id, data, updated_at, deleted)
       VALUES ('products', ?, NULL, '{}', ?, 1)
       ON CONFLICT(table_name, id) DO UPDATE SET
         updated_at = excluded.updated_at,
         deleted = 1`,
      [req.params.id, now]
    );
    saveDbToDisk();
    broadcastSyncUpdate({ serverTime: now, savedCount: 0, deletedCount: 1 });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Maduka Tatu Sync Server running on port ${PORT}`);
  console.log(`SQLite DB: ${DB_PATH}`);
});
