// ── Standalone PostgreSQL Client Adapter ──────────────────────────────────
// Connects React SPA to real-world SQL PostgreSQL serverless backend (/api/db).

import type { IDatabaseClient, DatabaseTable, QueryFilters, UnsubscribeFunction } from './db.types';

const API_ENDPOINT = '/api/db';

export class PostgresAdapter implements IDatabaseClient {
  readonly name = 'postgres';

  private async execute(payload: any): Promise<any> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`PostgreSQL gateway returned status ${response.status}: ${errBody}`);
      }

      return await response.json();
    } catch (error: any) {
      console.warn(`[PostgresAdapter Warning]: ${error.message}`);
      return { success: false, data: null };
    }
  }

  async get<T>(table: DatabaseTable, id: string): Promise<T | null> {
    const res = await this.execute({ action: 'get', table, id });
    return res?.data || null;
  }

  async list<T>(table: DatabaseTable, filters?: QueryFilters, limit?: number): Promise<T[]> {
    const res = await this.execute({ action: 'list', table, filters, limit });
    return Array.isArray(res?.data) ? res.data : [];
  }

  async upsert<T>(table: DatabaseTable, id: string, data: Partial<T>): Promise<boolean> {
    const payloadData = { ...data, [table === 'users' ? 'uid' : 'id']: id };
    const res = await this.execute({ action: 'upsert', table, data: payloadData });
    return !!res?.success;
  }

  async remove(table: DatabaseTable, id: string): Promise<boolean> {
    const res = await this.execute({ action: 'delete', table, id });
    return !!res?.success;
  }

  subscribe<T>(
    table: DatabaseTable,
    id: string | null,
    callback: (data: T | T[] | null) => void,
    filters?: QueryFilters
  ): UnsubscribeFunction {
    let isCancelled = false;

    // Immediate initial load
    const fetchData = async () => {
      if (isCancelled) return;
      if (id) {
        const item = await this.get<T>(table, id);
        if (!isCancelled) callback(item);
      } else {
        const items = await this.list<T>(table, filters);
        if (!isCancelled) callback(items);
      }
    };

    fetchData();

    // Lightweight reactivity check interval (5 seconds) to simulate live updates cleanly
    const interval = setInterval(fetchData, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }
}
