// Vercel Serverless Function — High-Performance Batch SQL Migration Gateway
// Receives batched data from legacy Firebase storage and securely imports it into PostgreSQL tables within SQL transactions.

import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL connection string is not configured in environment variables.');
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapObjectToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[camelToSnake(key)] = (Array.isArray(value) || (typeof value === 'object' && !(value instanceof Date)))
        ? JSON.stringify(value)
        : value;
    }
  }
  return result;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const client = await getPool().connect();

  try {
    const { table, records } = req.body || {};
    
    if (!table || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Valid table name and records array are required.' });
    }

    if (records.length === 0) {
      return res.status(200).json({ success: true, count: 0, message: 'No records to migrate.' });
    }

    const pkColumn = table === 'users' ? 'uid' : 'id';

    // Begin ACID transaction for high speed and data integrity
    await client.query('BEGIN;');

    let processedCount = 0;
    for (const item of records) {
      const snakeData = mapObjectToSnake(item);
      const keys = Object.keys(snakeData);
      const values = Object.values(snakeData);

      if (keys.length === 0 || !snakeData[pkColumn]) continue;

      const colNames = keys.join(', ');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const updateSet = keys
        .filter(k => k !== pkColumn && k !== 'created_at')
        .map(k => `${k} = EXCLUDED.${k}`)
        .join(', ');

      const conflictClause = updateSet.length > 0
        ? `ON CONFLICT (${pkColumn}) DO UPDATE SET ${updateSet}`
        : `ON CONFLICT (${pkColumn}) DO NOTHING`;

      const query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ${conflictClause};`;
      await client.query(query, values);
      processedCount++;
    }

    await client.query('COMMIT;');
    console.info(`[BloodBridge DB Migration] Successfully synchronized ${processedCount} rows into '${table}'.`);
    
    return res.status(200).json({ success: true, count: processedCount, table });
  } catch (error: any) {
    await client.query('ROLLBACK;');
    console.error('[BloodBridge DB Migration Error]:', error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message || 'Batch migration failed during SQL transaction.' });
  } finally {
    client.release();
  }
}
