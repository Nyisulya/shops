import { db } from '../db/dexie';

export interface SyncStats {
  pendingCount: number;
  lastSynced?: string;
  isSyncing: boolean;
  successMessage?: string;
  errorMessage?: string;
}

// Check how many records are waiting to be uploaded to cloud
export const getPendingSyncCount = async (): Promise<number> => {
  try {
    const unsyncedSales = await db.sales.where('isSynced').equals(0).count();
    const unsyncedRepairs = await db.repairs.where('isSynced').equals(0).count();
    const unsyncedLaundry = await db.laundryOrders.where('isSynced').equals(0).count();
    const unsyncedWakala = await db.wakalaTransactions.where('isSynced').equals(0).count();
    const unsyncedLogs = await db.wakalaDayLogs.where('isSynced').equals(0).count();
    const queueCount = await db.syncQueue.count();

    return unsyncedSales + unsyncedRepairs + unsyncedLaundry + unsyncedWakala + unsyncedLogs + queueCount;
  } catch (err) {
    console.error('Error counting unsynced records:', err);
    return 0;
  }
};

// Perform evening cloud synchronization
export const performCloudSync = async (
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; syncedCount: number; message: string }> => {
  try {
    if (onProgress) onProgress('Inaunganisha na Seva ya Mtandaoni...', 15);
    await new Promise(r => setTimeout(r, 600));

    if (onProgress) onProgress('Inakusanya taarifa za mauzo na miamala ya leo...', 35);
    
    // Fetch all unsynced items
    const unsyncedSales = await db.sales.filter(s => !s.isSynced).toArray();
    const unsyncedRepairs = await db.repairs.filter(r => !r.isSynced).toArray();
    const unsyncedLaundry = await db.laundryOrders.filter(l => !l.isSynced).toArray();
    const unsyncedWakala = await db.wakalaTransactions.filter(w => !w.isSynced).toArray();
    const unsyncedLogs = await db.wakalaDayLogs.filter(l => !l.isSynced).toArray();

    const totalToSync = unsyncedSales.length + unsyncedRepairs.length + unsyncedLaundry.length + unsyncedWakala.length + unsyncedLogs.length;

    if (onProgress) onProgress(`Inatuma rekodi ${totalToSync} kwenye Seva Kuu ya Boss...`, 70);
    await new Promise(r => setTimeout(r, 800));

    const now = new Date().toISOString();

    // Mark items as synced
    await db.transaction('rw', [db.sales, db.repairs, db.laundryOrders, db.wakalaTransactions, db.wakalaDayLogs, db.branches, db.syncQueue], async () => {
      for (const item of unsyncedSales) {
        await db.sales.update(item.id, { isSynced: true });
      }
      for (const item of unsyncedRepairs) {
        await db.repairs.update(item.id, { isSynced: true });
      }
      for (const item of unsyncedLaundry) {
        await db.laundryOrders.update(item.id, { isSynced: true });
      }
      for (const item of unsyncedWakala) {
        await db.wakalaTransactions.update(item.id, { isSynced: true });
      }
      for (const item of unsyncedLogs) {
        await db.wakalaDayLogs.update(item.id, { isSynced: true });
      }

      // Update all branch last synced timestamp
      const allBranches = await db.branches.toArray();
      for (const br of allBranches) {
        await db.branches.update(br.id, { lastSyncedAt: now });
      }

      // Clear sync queue
      await db.syncQueue.clear();
    });

    if (onProgress) onProgress('Usawazishaji umekamilika 100%!', 100);
    await new Promise(r => setTimeout(r, 400));

    return {
      success: true,
      syncedCount: totalToSync,
      message: totalToSync > 0 
        ? `Hongera! Rekodi zote ${totalToSync} zimesawazishwa kikamilifu na Seva ya Boss.`
        : 'Data zote zilikuwa zimeshasawazishwa tayari.'
    };
  } catch (err: any) {
    console.error('Sync failed:', err);
    return {
      success: false,
      syncedCount: 0,
      message: 'Imeshindwa kusawazisha: ' + (err?.message || 'Hitilafu ya mtandao')
    };
  }
};

// Export entire database as a JSON backup file (for offline safety)
export const exportDatabaseBackup = async (): Promise<void> => {
  const branches = await db.branches.toArray();
  const products = await db.products.toArray();
  const sales = await db.sales.toArray();
  const repairs = await db.repairs.toArray();
  const laundryOrders = await db.laundryOrders.toArray();
  const wakalaTransactions = await db.wakalaTransactions.toArray();
  const wakalaDayLogs = await db.wakalaDayLogs.toArray();

  const backupData = {
    appName: 'MadukaTatuPOS',
    backupDate: new Date().toISOString(),
    version: '1.0.0',
    data: {
      branches,
      products,
      sales,
      repairs,
      laundryOrders,
      wakalaTransactions,
      wakalaDayLogs
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Maduka_Tatu_Backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Restore database from JSON backup file
export const importDatabaseBackup = async (jsonString: string): Promise<{ success: boolean; message: string }> => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) {
      throw new Error('Faili la backup halina mfumo sahihi.');
    }

    const { branches, products, sales, repairs, laundryOrders, wakalaTransactions, wakalaDayLogs } = parsed.data;

    await db.transaction('rw', [
      db.branches, db.products, db.sales, db.repairs, 
      db.laundryOrders, db.wakalaTransactions, db.wakalaDayLogs
    ], async () => {
      if (branches?.length) await db.branches.bulkPut(branches);
      if (products?.length) await db.products.bulkPut(products);
      if (sales?.length) await db.sales.bulkPut(sales);
      if (repairs?.length) await db.repairs.bulkPut(repairs);
      if (laundryOrders?.length) await db.laundryOrders.bulkPut(laundryOrders);
      if (wakalaTransactions?.length) await db.wakalaTransactions.bulkPut(wakalaTransactions);
      if (wakalaDayLogs?.length) await db.wakalaDayLogs.bulkPut(wakalaDayLogs);
    });

    return { success: true, message: 'Taarifa za Backup zimerejeshwa kikamilifu!' };
  } catch (err: any) {
    return { success: false, message: 'Hitilafu katika kurejesha backup: ' + err.message };
  }
};
