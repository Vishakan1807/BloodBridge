// ── Zero-Downtime Database Controller & Failover Engine ────────────────────
// Routes traffic safely between Firebase and PostgreSQL based on VITE_DB_MODE.
// Prevents application crashes during database switching or network delays.

import type { IDatabaseClient, DatabaseTable, QueryFilters, UnsubscribeFunction } from './db.types';
import { FirebaseAdapter } from './firebaseAdapter';
import { PostgresAdapter } from './postgresAdapter';

export type DatabaseMode = 'firebase' | 'dual' | 'postgres';

export class DatabaseController implements IDatabaseClient {
  readonly name: string;
  private mode: DatabaseMode;
  private firebase: FirebaseAdapter;
  private postgres: PostgresAdapter;

  constructor(customMode?: DatabaseMode) {
    this.mode = (customMode || (import.meta.env.VITE_DB_MODE as DatabaseMode) || 'firebase').toLowerCase() as DatabaseMode;
    this.name = `dbController(${this.mode})`;
    this.firebase = new FirebaseAdapter();
    this.postgres = new PostgresAdapter();
    console.info(`[BloodBridge DB Controller] Initialized in '${this.mode.toUpperCase()}' operating mode.`);
  }

  getMode(): DatabaseMode {
    return this.mode;
  }

  setMode(newMode: DatabaseMode) {
    this.mode = newMode;
    console.info(`[BloodBridge DB Controller] Mode dynamically transitioned to '${newMode}'.`);
  }

  async get<T>(table: DatabaseTable, id: string): Promise<T | null> {
    if (this.mode === 'postgres') {
      const result = await this.postgres.get<T>(table, id);
      if (result) return result;
      // Fallback failover protection during cutover
      console.warn(`[DB Controller Failover] '${id}' not found in PostgreSQL; checking legacy Firebase...`);
      return await this.firebase.get<T>(table, id);
    }
    // 'firebase' or 'dual' mode reads cleanly from Firebase for 100% stability
    return await this.firebase.get<T>(table, id);
  }

  async list<T>(table: DatabaseTable, filters?: QueryFilters, limit?: number): Promise<T[]> {
    if (this.mode === 'postgres') {
      const results = await this.postgres.list<T>(table, filters, limit);
      if (results.length > 0) return results;
      console.warn(`[DB Controller Failover] No results in PostgreSQL for '${table}'; checking legacy Firebase...`);
      return await this.firebase.list<T>(table, filters, limit);
    }
    return await this.firebase.list<T>(table, filters, limit);
  }

  async upsert<T>(table: DatabaseTable, id: string, data: Partial<T>): Promise<boolean> {
    if (this.mode === 'firebase') {
      return await this.firebase.upsert<T>(table, id, data);
    }

    if (this.mode === 'postgres') {
      return await this.postgres.upsert<T>(table, id, data);
    }

    // 'dual' transition mode: parallel write with crash immunity
    const fbPromise = this.firebase.upsert<T>(table, id, data);
    const pgPromise = this.postgres.upsert<T>(table, id, data).catch((err) => {
      console.warn(`[Dual-Write Non-Fatal Warning] Failed to sync to PostgreSQL: ${err.message}`);
      return false;
    });

    const [fbSuccess, pgSuccess] = await Promise.all([fbPromise, pgPromise]);
    if (!pgSuccess) {
      console.info(`[DB Controller] Note: Written to Firebase successfully; PostgreSQL pending connection setup.`);
    }
    return fbSuccess;
  }

  async remove(table: DatabaseTable, id: string): Promise<boolean> {
    if (this.mode === 'firebase') {
      return await this.firebase.remove(table, id);
    }

    if (this.mode === 'postgres') {
      return await this.postgres.remove(table, id);
    }

    // 'dual' mode remove
    await Promise.all([
      this.firebase.remove(table, id),
      this.postgres.remove(table, id).catch(() => false),
    ]);
    return true;
  }

  subscribe<T>(
    table: DatabaseTable,
    id: string | null,
    callback: (data: T | T[] | null) => void,
    filters?: QueryFilters
  ): UnsubscribeFunction {
    if (this.mode === 'postgres') {
      return this.postgres.subscribe<T>(table, id, callback, filters);
    }
    // In 'firebase' or 'dual' mode, rely on instantaneous Firebase websocket observer
    return this.firebase.subscribe<T>(table, id, callback, filters);
  }
}

export const dbController = new DatabaseController();
