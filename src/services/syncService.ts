import { db } from '../db/dexie';

export interface SyncStats {
  pendingCount: number;
  lastSynced?: string;
  isSyncing: boolean;
  successMessage?: string;
  errorMessage?: string;
}

const DEFAULT_API_URL = 'https://maduka.nyisu.com/api';
const DEFAULT_API_KEY = 'maduka-tatu-secret-2026';

export const getSyncConfig = () => {
  const env = (import.meta as any).env || {};
  const apiUrl = (
    localStorage.getItem('sync_api_url') ||
    env.VITE_SYNC_API_URL ||
    DEFAULT_API_URL
  ).replace(/\/+$/, '');

  const apiKey =
    localStorage.getItem('sync_api_key') ||
    env.VITE_SYNC_API_KEY ||
    DEFAULT_API_KEY;

  return { apiUrl, apiKey };
};

const SYNC_TABLES = [
  { name: 'sales', table: () => db.sales },
  { name: 'repairs', table: () => db.repairs },
  { name: 'products', table: () => db.products },
  { name: 'laundryOrders', table: () => db.laundryOrders },
  { name: 'wakalaTransactions', table: () => db.wakalaTransactions },
  { name: 'wakalaDayLogs', table: () => db.wakalaDayLogs },
  { name: 'expenses', table: () => db.expenses }
] as const;

let activeSyncPromise: Promise<{ success: boolean; syncedCount: number; pulledCount: number; message: string }> | null = null;
let resyncRequested = false;
let immediatePushTimer: ReturnType<typeof setTimeout> | null = null;

// Check how many records are waiting to be uploaded to cloud
export const getPendingSyncCount = async (): Promise<number> => {
  try {
    let count = 0;
    for (const entry of SYNC_TABLES) {
      count += await entry.table().filter(item => !item.isSynced).count();
    }
    const deleteQueueCount = await db.syncQueue.filter(q => q.action === 'delete').count();
    return count + deleteQueueCount;
  } catch (err) {
    console.error('Error counting unsynced records:', err);
    return 0;
  }
};

// Perform real two-way cloud synchronization (Push local -> Pull remote)
export const performCloudSync = async (
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; syncedCount: number; pulledCount: number; message: string }> => {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          syncedCount: 0,
          pulledCount: 0,
          message: 'Hakuna mtandao (Offline). Data zako ziko salama na zitatumwa ukipata data.'
        };
      }

      const { apiUrl, apiKey } = getSyncConfig();

      if (onProgress) onProgress('Inaunganisha na Seva ya maduka.nyisu.com...', 15);

      // 1. Kusanya rekodi zote ambazo hazijatumwa (isSynced !== true)
      const recordsToPush: Array<{ table: string; id: string; data: any }> = [];
      const pushedIdsByTable: Record<string, string[]> = {};

      for (const entry of SYNC_TABLES) {
        const unsynced = await entry.table().filter(item => !item.isSynced).toArray();
        if (unsynced.length > 0) {
          pushedIdsByTable[entry.name] = [];
          for (const item of unsynced) {
            recordsToPush.push({ table: entry.name, id: item.id, data: item });
            pushedIdsByTable[entry.name].push(item.id);
          }
        }
      }

      // Kusanya deletes kutoka syncQueue
      const queuedItems = await db.syncQueue.toArray();
      const deletesToPush = queuedItems
        .filter(q => q.action === 'delete')
        .map(q => ({ table: q.table, id: q.recordId }));

      const totalToPush = recordsToPush.length + deletesToPush.length;

      if (onProgress) {
        onProgress(
          totalToPush > 0
            ? `Inatuma rekodi ${totalToPush} kwenye Seva Kuu ya Boss...`
            : 'Inakagua taarifa mpya kutoka kwa Seva Kuu...',
          40
        );
      }

      // 2. PUSH kwenda VPS server
      if (totalToPush > 0) {
        const pushRes = await fetch(`${apiUrl}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            records: recordsToPush,
            deletes: deletesToPush
          })
        });

        if (!pushRes.ok) {
          const errBody = await pushRes.text().catch(() => '');
          throw new Error(`Seva imekataa (${pushRes.status}): ${errBody || pushRes.statusText}`);
        }

        const pushJson = await pushRes.json();
        if (!pushJson.ok) {
          throw new Error(pushJson.error || 'Seva imeshindwa kuhifadhi data.');
        }

        // Weka alama isSynced = true kwa rekodi zilizofanikiwa kutumwa TU
        await db.transaction(
          'rw',
          [
            db.sales,
            db.repairs,
            db.products,
            db.laundryOrders,
            db.wakalaTransactions,
            db.wakalaDayLogs,
            db.expenses,
            db.syncQueue
          ],
          async () => {
            for (const entry of SYNC_TABLES) {
              const ids = pushedIdsByTable[entry.name];
              if (!ids?.length) continue;
              for (const id of ids) {
                await (entry.table() as any).update(id, { isSynced: true });
              }
            }
            await db.syncQueue.clear();
          }
        );
      }

      // 3. PULL taarifa mpya kutoka VPS server
      if (onProgress) onProgress('Inavuta taarifa mpya kutoka kwa Seva...', 75);

      const activeRole = localStorage.getItem('active_auth_branch') || 'phone';
      const activeBranchId = localStorage.getItem('active_branch_id') || '';
      const isBossOrAdmin = activeRole === 'boss' || activeRole === 'admin';
      const lastPullKey = isBossOrAdmin ? 'last_pull_at_boss' : `last_pull_at_${activeBranchId}`;
      const lastPullAt = localStorage.getItem(lastPullKey) || '';

      const pullParams = new URLSearchParams();
      if (lastPullAt) pullParams.set('since', lastPullAt);
      if (!isBossOrAdmin && activeBranchId) pullParams.set('branchId', activeBranchId);

      const pullRes = await fetch(`${apiUrl}/sync/pull?${pullParams.toString()}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      });

      if (!pullRes.ok) {
        const errBody = await pullRes.text().catch(() => '');
        throw new Error(`Imeshindwa kuvuta data (${pullRes.status}): ${errBody || pullRes.statusText}`);
      }

      const pullJson = await pullRes.json();
      if (!pullJson.ok) {
        throw new Error(pullJson.error || 'Imeshindwa kusoma data kutoka seva.');
      }

      const remoteRecords: Array<{ table: string; id: string; data: any }> = pullJson.records || [];
      const remoteDeletes: Array<{ table: string; id: string }> = pullJson.deletes || [];

      const tableMap: Record<string, any> = {
        branches: db.branches,
        products: db.products,
        sales: db.sales,
        repairs: db.repairs,
        laundryOrders: db.laundryOrders,
        wakalaTransactions: db.wakalaTransactions,
        wakalaDayLogs: db.wakalaDayLogs,
        expenses: db.expenses
      };

      const now = pullJson.serverTime || new Date().toISOString();

      await db.transaction(
        'rw',
        [
          db.branches,
          db.products,
          db.sales,
          db.repairs,
          db.laundryOrders,
          db.wakalaTransactions,
          db.wakalaDayLogs,
          db.expenses
        ],
        async () => {
          // Group records by table for bulkPut, skipping any local unsynced edits
          const grouped: Record<string, any[]> = {};
          for (const rec of remoteRecords) {
            if (!tableMap[rec.table] || !rec.data) continue;
            if (!grouped[rec.table]) grouped[rec.table] = [];
            grouped[rec.table].push({ ...rec.data, isSynced: true });
          }

          for (const [tableName, items] of Object.entries(grouped)) {
            const tbl = tableMap[tableName];
            const unsyncedLocal = await tbl.filter((x: any) => x.isSynced === false).toArray();
            const protectedIds = new Set(unsyncedLocal.map((x: any) => x.id));
            const safeItems = items.filter(item => !protectedIds.has(item.id));
            if (safeItems.length > 0) {
              await tbl.bulkPut(safeItems);
            }
          }

          // Apply deletes
          const deletesByTable: Record<string, string[]> = {};
          for (const del of remoteDeletes) {
            if (!tableMap[del.table] || !del.id) continue;
            if (!deletesByTable[del.table]) deletesByTable[del.table] = [];
            deletesByTable[del.table].push(del.id);
          }
          for (const [tableName, ids] of Object.entries(deletesByTable)) {
            await tableMap[tableName].bulkDelete(ids);
          }

          // Update branch lastSyncedAt
          const allBranches = await db.branches.toArray();
          for (const br of allBranches) {
            await db.branches.update(br.id, { lastSyncedAt: now });
          }
        }
      );

      if (pullJson.serverTime) {
        localStorage.setItem(lastPullKey, pullJson.serverTime);
      }

      if (onProgress) onProgress('Usawazishaji umekamilika 100%!', 100);

      const pulledCount = remoteRecords.length;
      let message = 'Data zote ziko sawa na Seva ya Boss.';
      if (totalToPush > 0 && pulledCount > 0) {
        message = `Hongera! Rekodi ${totalToPush} zimetumwa na ${pulledCount} mpya zimepokewa.`;
      } else if (totalToPush > 0) {
        message = `Hongera! Rekodi zote ${totalToPush} zimetumwa kwenye Seva ya Boss.`;
      } else if (pulledCount > 0) {
        message = `Taarifa mpya ${pulledCount} zimepokewa kutoka kwa maduka.`;
      }

      return {
        success: true,
        syncedCount: totalToPush,
        pulledCount,
        message
      };
    } catch (err: any) {
      console.error('Sync failed:', err);
      return {
        success: false,
        syncedCount: 0,
        pulledCount: 0,
        message: 'Imeshindwa kusawazisha: ' + (err?.message || 'Hitilafu ya mtandao')
      };
    } finally {
      activeSyncPromise = null;
      if (resyncRequested) {
        resyncRequested = false;
        setTimeout(() => {
          triggerBackgroundSync();
        }, 150);
      }
    }
  })();

  return activeSyncPromise;
};

// Background silent sync (hutumika app ikiona internet imerudi au kila baada ya muda)
export const triggerBackgroundSync = async (): Promise<void> => {
  if (!navigator.onLine) return;
  if (activeSyncPromise) {
    resyncRequested = true;
    return;
  }
  try {
    await performCloudSync();
  } catch {
    // Silent fail in background
  }
};

// Sukuma mabadiliko papo hapo (baada ya 300ms) kila mtu akiongeza, kuhariri au kufuta kitu
export const scheduleImmediatePush = (): void => {
  if (!navigator.onLine) return;
  if (immediatePushTimer) clearTimeout(immediatePushTimer);
  immediatePushTimer = setTimeout(() => {
    immediatePushTimer = null;
    triggerBackgroundSync();
  }, 300);
};

// Sikiliza mabadiliko ya Real-Time kutoka kwa Seva (SSE)
export const subscribeToRealtimeSync = (): (() => void) => {
  if (typeof EventSource === 'undefined') {
    return () => {};
  }

  const { apiUrl, apiKey } = getSyncConfig();
  const streamUrl = `${apiUrl}/sync/events?apiKey=${encodeURIComponent(apiKey)}`;
  let es: EventSource | null = null;

  try {
    es = new EventSource(streamUrl);
    es.addEventListener('sync-update', () => {
      triggerBackgroundSync();
    });
    es.addEventListener('connected', () => {
      // Hakikisha tumepull chochote kilichopita wakati hatukuwa connected
      triggerBackgroundSync();
    });
  } catch (err) {
    console.warn('Realtime SSE connection note:', err);
  }

  return () => {
    if (es) {
      es.close();
      es = null;
    }
  };
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
  const expenses = await db.expenses.toArray();

  const backupData = {
    appName: 'MadukaTatuPOS',
    backupDate: new Date().toISOString(),
    version: '1.1.0',
    data: {
      branches,
      products,
      sales,
      repairs,
      laundryOrders,
      wakalaTransactions,
      wakalaDayLogs,
      expenses
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

    const { branches, products, sales, repairs, laundryOrders, wakalaTransactions, wakalaDayLogs, expenses } = parsed.data;

    await db.transaction('rw', [
      db.branches, db.products, db.sales, db.repairs,
      db.laundryOrders, db.wakalaTransactions, db.wakalaDayLogs, db.expenses
    ], async () => {
      if (branches?.length) await db.branches.bulkPut(branches);
      if (products?.length) await db.products.bulkPut(products);
      if (sales?.length) await db.sales.bulkPut(sales);
      if (repairs?.length) await db.repairs.bulkPut(repairs);
      if (laundryOrders?.length) await db.laundryOrders.bulkPut(laundryOrders);
      if (wakalaTransactions?.length) await db.wakalaTransactions.bulkPut(wakalaTransactions);
      if (wakalaDayLogs?.length) await db.wakalaDayLogs.bulkPut(wakalaDayLogs);
      if (expenses?.length) await db.expenses.bulkPut(expenses);
    });

    return { success: true, message: 'Taarifa za Backup zimerejeshwa kikamilifu!' };
  } catch (err: any) {
    return { success: false, message: 'Hitilafu katika kurejesha backup: ' + err.message };
  }
};
