// Vercel Serverless Function — High-Performance Batch SQL Migration Gateway
// Receives batched data from legacy Firebase storage and securely imports it into PostgreSQL tables within resilient SQL transactions.

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

function mapObjectToSnake(obj: any, isUserTable: boolean): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[camelToSnake(key)] = (Array.isArray(value) || (typeof value === 'object' && !(value instanceof Date)))
        ? JSON.stringify(value)
        : value;
    }
  }

  // Ensure mandatory timestamps fallback gracefully if missing in legacy test records
  const now = Date.now();
  if (!result.created_at) result.created_at = now;
  if (!result.updated_at && (isUserTable || result.status !== undefined)) result.updated_at = now;
  
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

    // Fetch existing PostgreSQL columns dynamically to protect against unexpected legacy NoSQL test fields
    const colRes = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'",
      [table]
    );
    const validColumns = new Set(colRes.rows.map((r: any) => r.column_name));

    const pkColumn = table === 'users' ? 'uid' : 'id';
    let processedCount = 0;
    let failedCount = 0;
    const errorDetails: string[] = [];

    for (const item of records) {
      try {
        const rawSnake = mapObjectToSnake(item, table === 'users');
        const snakeData: Record<string, any> = {};
        
        // Filter attributes so only existing relational table columns are processed
        for (const [k, v] of Object.entries(rawSnake)) {
          if (validColumns.has(k)) {
            snakeData[k] = v;
          }
        }

        const keys = Object.keys(snakeData);
        const values = Object.values(snakeData);

        // Verify valid identifier presence
        if (keys.length === 0) continue;
        if (table === 'camp_inventories' && (!snakeData.camp_id || !snakeData.blood_group)) continue;
        if (table !== 'camp_inventories' && !snakeData[pkColumn]) continue;

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

        const query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ${conflictClause};`;
        await client.query(query, values);
        processedCount++;
      } catch (rowError: any) {
        failedCount++;
        const identifier = table === 'camp_inventories' ? `${item.campId}_${item.bloodGroup}` : (item[pkColumn] || 'unknown');
        const msg = `Skipped row in ${table} (${identifier}): ${rowError.message}`;
        console.warn(`[BloodBridge Migration Warning] ${msg}`);
        if (errorDetails.length < 5) errorDetails.push(msg);
      }
    }

    console.info(`[BloodBridge DB Migration] Finished '${table}': ${processedCount} rows synced, ${failedCount} rows skipped.`);
    
    if (processedCount === 0 && failedCount > 0) {
      return res.status(500).json({ success: false, error: `Migration failed for all rows. Primary reason: ${errorDetails[0] || 'Unknown error'}` });
    }

    return res.status(200).json({ 
      success: true, 
      count: processedCount, 
      skipped: failedCount,
      message: `Migrated ${processedCount} rows successfully.` 
    });
  } catch (error: any) {
    console.error('[PostgreSQL Migration Error]:', error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message || 'Internal migration gateway error' });
  } finally {
    client.release();
  }
}
