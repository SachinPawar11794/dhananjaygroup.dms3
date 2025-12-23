import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import admin from 'firebase-admin';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK for verifying ID tokens.
// In Cloud Run this uses Application Default Credentials. Locally set
// GOOGLE_APPLICATION_CREDENTIALS to a service account JSON that has
// permission to access Firebase project (or use `gcloud auth application-default login`).
try {
  admin.initializeApp();
  console.log('Firebase Admin initialized for token verification');
} catch (err) {
  console.warn('Firebase Admin init warning:', err && err.message ? err.message : err);
}

function buildWhere(filters = [], orRaw = null, notObj = null, params = []) {
  const clauses = [];

  for (const f of filters) {
    if (f.type === 'eq') {
      params.push(f.value);
      clauses.push(`${f.column} = $${params.length}`);
    } else if (f.type === 'ilike') {
      params.push(f.value);
      clauses.push(`${f.column} ILIKE $${params.length}`);
    } else if (f.type === 'like') {
      params.push(f.value);
      clauses.push(`${f.column} LIKE $${params.length}`);
    } else {
      // fallback to equality
      params.push(f.value);
      clauses.push(`${f.column} = $${params.length}`);
    }
  }

  if (notObj) {
    if (notObj.op === 'is' && notObj.value === null) {
      clauses.push(`${notObj.column} IS NOT NULL`);
    } else {
      params.push(notObj.value);
      clauses.push(`NOT (${notObj.column} ${notObj.op} $${params.length})`);
    }
  }

  if (orRaw) {
    // orRaw format: "col.op.pattern,col2.op.pattern"
    const orParts = orRaw.split(',').map(p => p.trim()).filter(Boolean);
    const orClauses = [];
    for (const part of orParts) {
      const pieces = part.split('.');
      if (pieces.length >= 3) {
        const col = pieces[0];
        const op = pieces[1].toLowerCase();
        const pattern = pieces.slice(2).join('.');
        if (op === 'ilike') {
          params.push(pattern);
          orClauses.push(`${col} ILIKE $${params.length}`);
        } else if (op === 'like') {
          params.push(pattern);
          orClauses.push(`${col} LIKE $${params.length}`);
        } else {
          params.push(pattern);
          orClauses.push(`${col} = $${params.length}`);
        }
      }
    }
    if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return where;
}

app.post('/query', async (req, res) => {
  const body = req.body || {};
  const table = body.table;
  const action = body.action || 'select';
  const select = body.select || '*';
  const filters = body.filters || [];
  const order = body.order;
  const range = body.range;
  const payload = body.payload;
  const single = !!body.single;
  const countMode = body.count;
  const orRaw = body.orRaw || body.or || null;
  const notObj = body.not || null;

  if (!table) {
    res.status(400).json({ data: null, error: { message: 'Missing table' } });
    return;
  }

  const params = [];

  try {
    // Protect modifying actions: require a valid Firebase ID token in Authorization header.
    const protectedActions = ['insert', 'update', 'delete'];
    if (protectedActions.includes(action)) {
      const authHeader = req.headers.authorization || req.headers.Authorization || '';
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ data: null, error: { message: 'Missing Authorization header (Bearer token required)' } });
        return;
      }
      const idToken = authHeader.split(' ')[1];
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        // Attach user info to request for audit/logging if needed
        req.user = decoded;
      } catch (err) {
        res.status(401).json({ data: null, error: { message: 'Invalid or expired auth token' } });
        return;
      }
    }

    if (action === 'select') {
      const where = buildWhere(filters, orRaw, notObj, params);
      let count = null;
      if (countMode === 'exact') {
        const countSql = `SELECT COUNT(*)::int AS count FROM ${table} ${where}`;
        const countResult = await pool.query(countSql, params);
        count = countResult.rows[0].count;
      }

      let sql = `SELECT ${select} FROM ${table} ${where}`;
      if (order && order.column) {
        sql += ` ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}`;
      }
      if (range && typeof range.from === 'number' && typeof range.to === 'number') {
        const limit = range.to - range.from + 1;
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
        params.push(range.from);
        sql += ` OFFSET $${params.length}`;
      }

      const result = await pool.query(sql, params);
      res.json({ data: result.rows, error: null, count });
      return;
    } else if (action === 'insert') {
      if (!payload || !Array.isArray(payload) || payload.length === 0) {
        res.status(400).json({ data: null, error: { message: 'Invalid payload for insert' } });
        return;
      }
      // Insert first row (common use)
      const row = payload[0];
      const keys = Object.keys(row);
      const vals = keys.map(k => row[k]);
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(sql, vals);
      res.json({ data: result.rows, error: null });
      return;
    } else if (action === 'update') {
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ data: null, error: { message: 'Invalid payload for update' } });
        return;
      }
      const setKeys = Object.keys(payload);
      const setClauses = setKeys.map((k, i) => {
        params.push(payload[k]);
        return `${k} = $${params.length}`;
      });
      const where = buildWhere(filters, orRaw, notObj, params);
      const sql = `UPDATE ${table} SET ${setClauses.join(', ')} ${where} RETURNING *`;
      const result = await pool.query(sql, params);
      res.json({ data: result.rows, error: null });
      return;
    } else if (action === 'delete') {
      const where = buildWhere(filters, orRaw, notObj, params);
      const sql = `DELETE FROM ${table} ${where}`;
      const result = await pool.query(sql, params);
      res.json({ data: result.rowCount ? { deleted: result.rowCount } : [], error: null });
      return;
    } else {
      res.status(400).json({ data: null, error: { message: `Unknown action: ${action}` } });
      return;
    }
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ data: null, error: { message: err.message || String(err) } });
  }
});

const PORT = process.env.PORT || process.env.LOCAL_API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
  console.log('This server proxies simplified Supabase-like queries to Postgres.');
});


