// ── Firebase Realtime Database Adapter ────────────────────────────────────
// Wraps legacy Firebase Realtime Database methods into our universal database interface.

import { ref, get, set, update, remove, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { IDatabaseClient, DatabaseTable, QueryFilters, UnsubscribeFunction } from './db.types';

const TABLE_PATH_MAPPING: Record<DatabaseTable, string> = {
  users: 'users',
  camps: 'master/camps',
  hospitals: 'master/hospitals',
  camp_inventories: 'inventory',
  requests: 'requests',
  comments: 'comments',
  attachments: 'attachments',
  audit_logs: 'audit',
};

export class FirebaseAdapter implements IDatabaseClient {
  readonly name = 'firebase';

  private getPath(table: DatabaseTable, id?: string): string {
    const basePath = TABLE_PATH_MAPPING[table] || table;
    return id ? `${basePath}/${id}` : basePath;
  }

  async get<T>(table: DatabaseTable, id: string): Promise<T | null> {
    const snap = await get(ref(db, this.getPath(table, id)));
    if (!snap.exists()) return null;
    const val = snap.val() || {};
    return { ...val, [table === 'users' ? 'uid' : 'id']: id } as T;
  }

  async list<T>(table: DatabaseTable, filters?: QueryFilters, _limit?: number): Promise<T[]> {
    const snap = await get(ref(db, this.getPath(table)));
    if (!snap.exists()) return [];
    
    const data = snap.val() || {};
    let list = Object.entries(data).map(([key, val]: [string, any]) => ({
      ...val,
      [table === 'users' ? 'uid' : 'id']: val.uid || val.id || key,
    })) as T[];

    if (filters && Object.keys(filters).length > 0) {
      list = list.filter((item: any) => {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && item[k] !== v) return false;
        }
        return true;
      });
    }

    return list;
  }

  async upsert<T>(table: DatabaseTable, id: string, data: Partial<T>): Promise<boolean> {
    const targetRef = ref(db, this.getPath(table, id));
    
    // Check if record exists to decide set vs update, or clean undefined values
    const cleanData: Record<string, any> = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) cleanData[k] = v;
    });

    const snap = await get(targetRef);
    if (!snap.exists()) {
      await set(targetRef, { ...cleanData, [table === 'users' ? 'uid' : 'id']: id, createdAt: Date.now(), updatedAt: Date.now() });
    } else {
      await update(targetRef, { ...cleanData, updatedAt: Date.now() });
    }
    return true;
  }

  async remove(table: DatabaseTable, id: string): Promise<boolean> {
    await remove(ref(db, this.getPath(table, id)));
    return true;
  }

  subscribe<T>(
    table: DatabaseTable,
    id: string | null,
    callback: (data: T | T[] | null) => void,
    filters?: QueryFilters
  ): UnsubscribeFunction {
    const targetRef = ref(db, this.getPath(table, id || undefined));
    return onValue(targetRef, (snap) => {
      if (!snap.exists()) {
        callback(id ? null : ([] as any));
        return;
      }
      const data = snap.val();
      if (id) {
        callback({ ...data, [table === 'users' ? 'uid' : 'id']: id } as T);
      } else {
        let list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          [table === 'users' ? 'uid' : 'id']: val.uid || val.id || key,
        })) as T[];
        
        if (filters && Object.keys(filters).length > 0) {
          list = list.filter((item: any) => {
            for (const [k, v] of Object.entries(filters)) {
              if (v !== undefined && item[k] !== v) return false;
            }
            return true;
          });
        }
        callback(list);
      }
    });
  }
}
