// Vercel Serverless Function — Unified PostgreSQL Database API Gateway
// Bridges React client queries cleanly to real-world relational PostgreSQL database over secure SSL connection pools.

import { Pool } from 'pg';

// Maintain a singleton connection pool across serverless cold starts
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL connection string is not configured in environment variables.');
    }
    pool = new Pool({
      connectionString,
      max: 10, // Optimize for Vercel Serverless connection limitations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

const ALLOWED_TABLES = new Set([
  'users',
  'camps',
  'hospitals',
  'camp_inventories',
  'requests',
  'comments',
  'attachments',
  'audit_logs',
]);

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapRowToCamel(row: any): any {
  if (!row || typeof row !== 'object') return row;
  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

function mapObjectToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[camelToSnake(key)] = value;
    }
  }
  return result;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbPool = getPool();
    const body = req.body || {};
    const { action, table, id, data, filters, limit } = body;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' is invalid or restricted.` });
    }

    const pkColumn = table === 'users' ? 'uid' : 'id';

    if (action === 'get') {
      if (!id) return res.status(400).json({ error: 'ID is required for get operation.' });
      const query = `SELECT * FROM ${table} WHERE ${pkColumn} = $1 LIMIT 1;`;
      const result = await dbPool.query(query, [id]);
      const row = result.rows[0] ? mapRowToCamel(result.rows[0]) : null;
      return res.status(200).json({ success: true, data: row });
    }

    if (action === 'list') {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (filters && typeof filters === 'object') {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') {
            const col = camelToSnake(k);
            conditions.push(`${col} = $${paramIdx}`);
            params.push(v);
            paramIdx++;
          }
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitClause = limit && Number.isInteger(limit) ? `LIMIT ${limit}` : 'LIMIT 1000';
      const orderCol = table === 'camp_inventories' ? 'last_updated_at' : (table === 'audit_logs' ? 'timestamp' : 'created_at');
      const query = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderCol} DESC ${limitClause};`;
      
      const result = await dbPool.query(query, params);
      const rows = result.rows.map(mapRowToCamel);
      return res.status(200).json({ success: true, data: rows });
    }

    if (action === 'upsert') {
      if (!data) return res.status(400).json({ error: 'Data object required for upsert.' });
      const rawSnake = mapObjectToSnake(data);
      
      // Dynamic column checking to protect against deprecated or unmapped frontend properties
      const colRes = await dbPool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'",
        [table]
      );
      const validColumns = new Set(colRes.rows.map((r: any) => r.column_name));
      
      const snakeData: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawSnake)) {
        if (validColumns.has(k)) {
          snakeData[k] = v;
        }
      }

      const keys = Object.keys(snakeData);
      const values = Object.values(snakeData).map(val => 
        (Array.isArray(val) || (typeof val === 'object' && val !== null && !(val instanceof Date)))
          ? JSON.stringify(val) 
          : val
      );

      if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to upsert.' });

      const colNames = keys.join(', ');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      
      let conflictClause = '';
      if (table === 'camp_inventories') {
        const updateSet = keys
          .filter(k => k !== 'camp_id' && k !== 'blood_group' && k !== 'created_at')
          .map(k => `${k} = EXCLUDED.${k}`)
          .join(', ');
        conflictClause = updateSet.length > 0
          ? `ON CONFLICT (camp_id, blood_group) DO UPDATE SET ${updateSet}`
          : `ON CONFLICT (camp_id, blood_group) DO NOTHING`;
      } else {
        const updateSet = keys
          .filter(k => k !== pkColumn && k !== 'created_at')
          .map(k => `${k} = EXCLUDED.${k}`)
          .join(', ');
        conflictClause = updateSet.length > 0
          ? `ON CONFLICT (${pkColumn}) DO UPDATE SET ${updateSet}`
          : `ON CONFLICT (${pkColumn}) DO NOTHING`;
      }

      const query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ${conflictClause} RETURNING *;`;
      const result = await dbPool.query(query, values);
      return res.status(200).json({ success: true, data: mapRowToCamel(result.rows[0]) });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'ID required for delete operation.' });
      const query = `DELETE FROM ${table} WHERE ${pkColumn} = $1;`;
      await dbPool.query(query, [id]);
      return res.status(200).json({ success: true, id });
    }

    return res.status(400).json({ error: `Action '${action}' is not recognized.` });
  } catch (error: any) {
    console.error('[PostgreSQL API Error]:', error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message || 'Internal database gateway error' });
  }
}
