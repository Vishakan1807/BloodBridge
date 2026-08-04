// ── Universal Database Adapter Interface & Contracts ─────────────────────
// Ensures zero vendor lock-in and seamless failover between Firebase and PostgreSQL.

export type DatabaseTable =
  | 'users'
  | 'camps'
  | 'hospitals'
  | 'camp_inventories'
  | 'requests'
  | 'comments'
  | 'attachments'
  | 'audit_logs';

export interface QueryFilters {
  [key: string]: any;
}

export type UnsubscribeFunction = () => void;

export interface IDatabaseClient {
  readonly name: string;
  get<T>(table: DatabaseTable, id: string): Promise<T | null>;
  list<T>(table: DatabaseTable, filters?: QueryFilters, limit?: number): Promise<T[]>;
  upsert<T>(table: DatabaseTable, id: string, data: Partial<T>): Promise<boolean>;
  remove(table: DatabaseTable, id: string): Promise<boolean>;
  subscribe<T>(
    table: DatabaseTable,
    id: string | null,
    callback: (data: T | T[] | null) => void,
    filters?: QueryFilters
  ): UnsubscribeFunction;
}
