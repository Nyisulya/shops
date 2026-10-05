import Dexie, { type Table } from 'dexie';
import type {
  Branch,
  Product,
  Sale,
  RepairOrder,
  LaundryOrder,
  WakalaTransaction,
  WakalaDayLog,
  SyncQueueItem
} from '../types';

export class MadukaDatabase extends Dexie {
  branches!: Table<Branch>;
  products!: Table<Product>;
  sales!: Table<Sale>;
  repairs!: Table<RepairOrder>;
  laundryOrders!: Table<LaundryOrder>;
  wakalaTransactions!: Table<WakalaTransaction>;
  wakalaDayLogs!: Table<WakalaDayLog>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('MadukaTatuDB');
    this.version(1).stores({
      branches: 'id, type, code',
      products: 'id, branchId, category, name, imei, isSynced',
      sales: 'id, branchId, saleNumber, createdAt, isSynced',
      repairs: 'id, branchId, repairNumber, status, createdAt, isSynced',
      laundryOrders: 'id, branchId, orderNumber, tagNumber, stage, paymentStatus, createdAt, isSynced',
      wakalaTransactions: 'id, branchId, transactionNumber, provider, type, createdAt, isSynced',
      wakalaDayLogs: 'id, branchId, date, status, isSynced',
      syncQueue: 'id, table, timestamp'
    });
  }
}

export const db = new MadukaDatabase();

// Helper to generate unique offline-safe IDs
export const generateUniqueId = (prefix: string = 'id'): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${randomStr}`;
};

// Queue changes for evening cloud sync
export const queueSync = async (table: string, recordId: string, action: 'create' | 'update' | 'delete', data: any) => {
  try {
    await db.syncQueue.put({
      id: generateUniqueId('sync'),
      table,
      recordId,
      action,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error adding to sync queue:', err);
  }
};
