import { db } from './dexie';
import type { Branch } from '../types';

export const initializeDatabaseData = async () => {
  // Auto-migrate any legacy items with 'branch_phone' to 'branch_phone_1'
  try {
    await db.products.where('branchId').equals('branch_phone').modify({ branchId: 'branch_phone_1' });
    await db.repairs.where('branchId').equals('branch_phone').modify({ branchId: 'branch_phone_1' });
  } catch (err) {
    console.warn('Branch migration note:', err);
  }

  // Official branches only (no sample/demo products, sales, repairs, or orders)
  const officialBranches: Branch[] = [
    {
      id: 'branch_phone_1',
      name: 'Duka la Soko Kuu',
      type: 'phone',
      code: 'PH-01',
      location: 'Soko Kuu Mwanza',
      managerName: 'Juma Ramadhani',
      phone: '+255 712 345 678'
    },
    {
      id: 'branch_phone_2',
      name: 'Duka la Vunja Bei',
      type: 'phone',
      code: 'PH-02',
      location: 'Vunja Bei Mwanza',
      managerName: 'Bakari Omari',
      phone: '+255 754 112 233'
    },
    {
      id: 'branch_phone_3',
      name: 'Duka la Makoroboi',
      type: 'phone',
      code: 'PH-03',
      location: 'Makoroboi Mwanza',
      managerName: 'Kelvin Massawe',
      phone: '+255 784 990 011'
    },
    {
      id: 'branch_laundry_1',
      name: 'GGS Laundry - Machinjioni',
      type: 'laundry',
      code: 'LN-01',
      location: 'Machinjioni Mwanza',
      managerName: 'Neema Joseph',
      phone: '0685947264'
    },
    {
      id: 'branch_laundry_2',
      name: 'GGS Laundry - Mahina kati',
      type: 'laundry',
      code: 'LN-02',
      location: 'Mahina kati Mwanza',
      managerName: 'Grace Emmanuel',
      phone: '0713456789'
    },
    {
      id: 'branch_laundry_3',
      name: 'GGS Laundry - Nyasaka',
      type: 'laundry',
      code: 'LN-03',
      location: 'Nyasaka Mwanza',
      managerName: 'Agnes Charles',
      phone: '0765889900'
    },
    {
      id: 'branch_laundry_4',
      name: 'GGS Laundry - Sahwa',
      type: 'laundry',
      code: 'LN-04',
      location: 'Sahwa Mwanza',
      managerName: 'Beatrice Daniel',
      phone: '0787654321'
    },
    {
      id: 'branch_wakala_1',
      name: 'Wakala Kiosk - Kinondoni',
      type: 'wakala',
      code: 'WK-01',
      location: 'Kinondoni Manyanya Branch',
      managerName: 'Rashid Bakari',
      phone: '+255 784 567 890'
    }
  ];

  for (const branch of officialBranches) {
    const existing = await db.branches.get(branch.id);
    await db.branches.put({
      ...branch,
      lastSyncedAt: existing?.lastSyncedAt
    });
  }
};
