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
          sound: 'default'
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

const notifyFromPushedRecords = async (newSales, newRepairs, newWakala, newLaundry, updatedProducts) => {
  if (!fcmEnabled) return;

  const bossRows = queryAll("SELECT token FROM device_tokens WHERE role IN ('boss', 'admin')");
  const bossTokens = bossRows.map(r => r.token);

  if (bossTokens.length > 0) {
    if (newSales.length > 0) {
      const total = newSales.reduce((s, x) => s + Number(x.finalAmount || 0), 0);
      await sendPushToTokens(
        bossTokens,
        'Mauzo Mapya Dukani',
        newSales.length === 1
          ? `Mauzo ya ${formatTzs(total)} yamefanyika.`
          : `Mauzo ${newSales.length} mapya yenye jumla ya ${formatTzs(total)}.`,
        { type: 'sale' }
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

  // Notify branch attendants when products/stock are added or updated
  if (updatedProducts.length > 0) {
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

      const first = items[0];
      await sendPushToTokens(
        staffTokens,
        items.length === 1 ? 'Stoo / Mzigo Umesasishwa' : `Bidhaa ${items.length} Zimesasishwa`,
        items.length === 1
          ? `${first.name} (Stoo: ${first.stock})`
          : `${first.name} na bidhaa nyingine ${items.length - 1} zimewekwa stoo.`,
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
      notifyFromPushedRecords(newSales, newRepairs, newWakala, newLaundry, updatedProducts).catch(() => {});
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
