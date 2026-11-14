import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
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
`);
saveDbToDisk();

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

// Middleware ya ulinzi wa API Key
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: API key si sahihi.' });
  }
  next();
};

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

    db.run('BEGIN TRANSACTION');
    try {
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
      }

      for (const del of deletes) {
        if (!del || !ALLOWED_TABLES.has(del.table) || !del.id) continue;
        deleteStmt.run([del.table, String(del.id), serverTime]);
        deletedCount++;
      }

      upsertStmt.free();
      deleteStmt.free();
      db.run('COMMIT');
    } catch (txErr) {
      db.run('ROLLBACK');
      throw txErr;
    }

    saveDbToDisk();

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
