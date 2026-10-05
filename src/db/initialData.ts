import { db, generateUniqueId } from './dexie';
import type { Branch, Product, LaundryOrder, WakalaDayLog, WakalaTransaction, RepairOrder } from '../types';

export const initializeDatabaseData = async () => {
  const branchCount = await db.branches.count();
  if (branchCount > 0) return; // Already initialized

  console.log('Populating initial demo data for 3 branches...');

  // 1. Create 3 Branches
  const branches: Branch[] = [
    {
      id: 'branch_phone',
      name: 'Duka la Simu & Vifaa',
      type: 'phone',
      code: 'PH-01',
      location: 'Mwenge / Mlimani City Branch',
      managerName: 'Juma Ramadhani',
      phone: '+255 712 345 678',
      lastSyncedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'branch_laundry',
      name: 'GGS Laundry Service',
      type: 'laundry',
      code: 'LN-02',
      location: 'Mahinakati Mwanza',
      managerName: 'Neema Joseph',
      phone: '0685947264',
      lastSyncedAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'branch_wakala',
      name: 'Wakala Kiosk (M-Pesa & Banks)',
      type: 'wakala',
      code: 'WK-03',
      location: 'Kinondoni Manyanya Branch',
      managerName: 'Rashid Bakari',
      phone: '+255 784 567 890',
      lastSyncedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ];

  await db.branches.bulkPut(branches);

  // 2. Phone Shop Products
  const products: Product[] = [
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Samsung Galaxy A15 (128GB/6GB)',
      category: 'phone',
      model: 'Galaxy A15',
      storage: '128GB',
      condition: 'new',
      imei: '354892019482012',
      costPrice: 380000,
      sellingPrice: 430000,
      stock: 4,
      minStock: 2,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Itel 2160 (Simu ya Tochi / Wireless FM)',
      category: 'phone',
      model: 'Itel 2160',
      storage: 'Simu ya Tochi (N/A)',
      condition: 'new',
      imei: '358902194820194',
      costPrice: 22000,
      sellingPrice: 30000,
      stock: 12,
      minStock: 3,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Redmi Note 13 (256GB/8GB)',
      category: 'phone',
      model: 'Note 13',
      storage: '256GB',
      condition: 'new',
      imei: '864201938472910',
      costPrice: 480000,
      sellingPrice: 540000,
      stock: 3,
      minStock: 1,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'iPhone 12 Pro Max 128GB (Used Ex-UK)',
      category: 'phone',
      model: 'iPhone 12 Pro Max',
      storage: '128GB',
      condition: 'used',
      imei: '359102938471920',
      costPrice: 1100000,
      sellingPrice: 1300000,
      stock: 2,
      minStock: 1,
      warrantyMonths: 3,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Oraimo 20W Fast Charger Kit (Type-C)',
      category: 'accessory',
      model: 'FastLine 20W',
      costPrice: 15000,
      sellingPrice: 25000,
      stock: 18,
      minStock: 5,
      warrantyMonths: 6,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Screen Protector 9D / 10D (Universal)',
      category: 'accessory',
      costPrice: 2000,
      sellingPrice: 8000,
      stock: 45,
      minStock: 10,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Oraimo FreePods 4 Wireless Earbuds',
      category: 'accessory',
      model: 'FreePods 4',
      costPrice: 55000,
      sellingPrice: 75000,
      stock: 7,
      minStock: 2,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone',
      name: 'Kioo cha Samsung A12 (Original Replacement)',
      category: 'spare',
      costPrice: 40000,
      sellingPrice: 65000,
      stock: 3,
      minStock: 1,
      updatedAt: new Date().toISOString(),
      isSynced: true
    }
  ];

  await db.products.bulkPut(products);

  // 3. Sample Phone Repairs
  const repairs: RepairOrder[] = [
    {
      id: generateUniqueId('rep'),
      branchId: 'branch_phone',
      repairNumber: 'REP-101',
      customerName: 'Kassim Majaliwa',
      customerPhone: '0714902831',
      phoneModel: 'Samsung Galaxy A12',
      issueDescription: 'Kioo kimevunjika na touch haifanyi kazi',
      sparePartsCost: 45000,
      laborCost: 20000,
      totalCost: 65000,
      deposit: 30000,
      balanceDue: 35000,
      status: 'in_progress',
      technician: 'Fundi Salum',
      notes: 'Customer anahitaji kabla ya saa 11 jioni',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: false
    },
    {
      id: generateUniqueId('rep'),
      branchId: 'branch_phone',
      repairNumber: 'REP-102',
      customerName: 'Fatma Ally',
      customerPhone: '0754891023',
      phoneModel: 'Tecno Spark 10 Pro',
      issueDescription: 'Hachaji (Charging Port imeharibika)',
      sparePartsCost: 10000,
      laborCost: 15000,
      totalCost: 25000,
      deposit: 25000,
      balanceDue: 0,
      status: 'ready',
      technician: 'Fundi Salum',
      notes: 'Tayari imepimwa na inachaji vizuri',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      readyAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSynced: false
    }
  ];

  await db.repairs.bulkPut(repairs);

  // 4. Sample Laundry Orders
  const laundryOrders: LaundryOrder[] = [
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry',
      orderNumber: 'ORD-501',
      tagNumber: 'LN-101',
      customerName: 'Mama Ashura',
      customerPhone: '0712998877',
      items: [
        {
          id: generateUniqueId('item'),
          itemType: 'Mashuka (Bed Sheets)',
          service: 'wash_iron',
          quantity: 4,
          pricePerItem: 3000,
          totalPrice: 12000
        },
        {
          id: generateUniqueId('item'),
          itemType: 'Blanket Kubwa',
          service: 'wash_only',
          quantity: 1,
          pricePerItem: 10000,
          totalPrice: 10000
        }
      ],
      totalAmount: 22000,
      deposit: 10000,
      balanceDue: 12000,
      paymentStatus: 'partial',
      stage: 'washing',
      notes: 'Kuna doa la kahawa kwenye shuka la bluu',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      promisedDate: 'Kesho saa 8 mchana',
      isSynced: false
    },
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry',
      orderNumber: 'ORD-502',
      tagNumber: 'LN-102',
      customerName: 'Eng. Michael',
      customerPhone: '0789234567',
      items: [
        {
          id: generateUniqueId('item'),
          itemType: 'Suti (Coat + Suruali)',
          service: 'dry_clean',
          quantity: 2,
          pricePerItem: 12000,
          totalPrice: 24000
        },
        {
          id: generateUniqueId('item'),
          itemType: 'Mashati ya Mikono Mirefu',
          service: 'wash_iron',
          quantity: 3,
          pricePerItem: 2000,
          totalPrice: 6000
        }
      ],
      totalAmount: 30000,
      deposit: 30000,
      balanceDue: 0,
      paymentStatus: 'paid',
      stage: 'ready',
      notes: 'Ameshalipa yote kwa M-Pesa',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      promisedDate: 'Leo saa 10 jioni',
      readyAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: false
    }
  ];

  await db.laundryOrders.bulkPut(laundryOrders);

  // 5. Wakala Day Opening and Transactions
  const todayDate = new Date().toISOString().split('T')[0];
  const openingDayLog: WakalaDayLog = {
    id: generateUniqueId('wlog'),
    branchId: 'branch_wakala',
    date: todayDate,
    openingCash: 500000,
    openingFloatMpesa: 1500000,
    openingFloatTigo: 800000,
    openingFloatAirtel: 600000,
    openingFloatHalopesa: 300000,
    openingFloatBank: 1000000,
    calculatedCash: 500000,
    calculatedFloats: {
      mpesa: 1500000,
      tigo: 800000,
      airtel: 600000,
      halopesa: 300000,
      bank: 1000000
    },
    status: 'open',
    notes: 'Kuanza kazi vizuri asubuhi',
    createdAt: new Date().toISOString(),
    isSynced: true
  };

  await db.wakalaDayLogs.put(openingDayLog);

  const sampleWakalaTxs: WakalaTransaction[] = [
    {
      id: generateUniqueId('wtx'),
      branchId: 'branch_wakala',
      transactionNumber: 'TX-701',
      provider: 'mpesa',
      type: 'withdrawal',
      amount: 100000,
      fee: 0,
      commission: 1200,
      customerPhone: '0754123456',
      receiptNumber: 'VOD9812903',
      cashierName: 'Rashid Bakari',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: false
    },
    {
      id: generateUniqueId('wtx'),
      branchId: 'branch_wakala',
      transactionNumber: 'TX-702',
      provider: 'tigo',
      type: 'deposit',
      amount: 50000,
      fee: 0,
      commission: 650,
      customerPhone: '0715887766',
      receiptNumber: 'TIG4492019',
      cashierName: 'Rashid Bakari',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSynced: false
    }
  ];

  await db.wakalaTransactions.bulkPut(sampleWakalaTxs);

  console.log('Database initialization completed successfully!');
};
