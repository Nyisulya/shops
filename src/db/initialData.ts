import { db, generateUniqueId } from './dexie';
import type { Branch, Product, LaundryOrder, WakalaDayLog, WakalaTransaction, RepairOrder, Sale, Expense } from '../types';

export const initializeDatabaseData = async () => {
  // Auto-migrate any legacy items with 'branch_phone' to 'branch_phone_1'
  try {
    await db.products.where('branchId').equals('branch_phone').modify({ branchId: 'branch_phone_1' });
    await db.repairs.where('branchId').equals('branch_phone').modify({ branchId: 'branch_phone_1' });
  } catch (err) {
    console.warn('Branch migration note:', err);
  }

  // Ensure the 3 phone branches always have the updated official names and locations
  await db.branches.put({
    id: 'branch_phone_1',
    name: 'Duka la Soko Kuu',
    type: 'phone',
    code: 'PH-01',
    location: 'Soko Kuu Mwanza',
    managerName: 'Juma Ramadhani',
    phone: '+255 712 345 678',
    lastSyncedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  });

  await db.branches.put({
    id: 'branch_phone_2',
    name: 'Duka la Vunja Bei',
    type: 'phone',
    code: 'PH-02',
    location: 'Vunja Bei Mwanza',
    managerName: 'Bakari Omari',
    phone: '+255 754 112 233',
    lastSyncedAt: new Date(Date.now() - 3600000 * 3).toISOString()
  });

  await db.branches.put({
    id: 'branch_phone_3',
    name: 'Duka la Makoroboi',
    type: 'phone',
    code: 'PH-03',
    location: 'Makoroboi Mwanza',
    managerName: 'Kelvin Massawe',
    phone: '+255 784 990 011',
    lastSyncedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  });

  // Ensure the 4 laundry branches always have the updated official names and locations
  await db.branches.put({
    id: 'branch_laundry_1',
    name: 'GGS Laundry - Machinjioni',
    type: 'laundry',
    code: 'LN-01',
    location: 'Machinjioni Mwanza',
    managerName: 'Neema Joseph',
    phone: '0685947264',
    lastSyncedAt: new Date(Date.now() - 3600000 * 1).toISOString()
  });

  await db.branches.put({
    id: 'branch_laundry_2',
    name: 'GGS Laundry - Mahina kati',
    type: 'laundry',
    code: 'LN-02',
    location: 'Mahina kati Mwanza',
    managerName: 'Grace Emmanuel',
    phone: '0713456789',
    lastSyncedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  });

  await db.branches.put({
    id: 'branch_laundry_3',
    name: 'GGS Laundry - Nyasaka',
    type: 'laundry',
    code: 'LN-03',
    location: 'Nyasaka Mwanza',
    managerName: 'Agnes Charles',
    phone: '0765889900',
    lastSyncedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  });

  await db.branches.put({
    id: 'branch_laundry_4',
    name: 'GGS Laundry - Sahwa',
    type: 'laundry',
    code: 'LN-04',
    location: 'Sahwa Mwanza',
    managerName: 'Beatrice Daniel',
    phone: '0787654321',
    lastSyncedAt: new Date(Date.now() - 3600000 * 1).toISOString()
  });

  const l4OrdersCount = await db.laundryOrders.where('branchId').equals('branch_laundry_4').count();
  if (l4OrdersCount === 0) {
    await db.laundryOrders.put({
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry_4',
      orderNumber: 'ORD-401',
      tagNumber: 'LN4-501',
      customerName: 'Dkt. Mrema',
      customerPhone: '0754882211',
      items: [
        { id: generateUniqueId('item'), itemType: 'Suti Kamili & Mashati', service: 'wash_iron', quantity: 3, pricePerItem: 3500, totalPrice: 10500 },
        { id: generateUniqueId('item'), itemType: 'Pazia Kubwa', service: 'wash_only', quantity: 2, pricePerItem: 5000, totalPrice: 10000 }
      ],
      totalAmount: 20500,
      deposit: 20500,
      balanceDue: 0,
      paymentStatus: 'paid',
      stage: 'ready',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      promisedDate: 'Leo saa 11 jioni',
      readyAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSynced: false
    });
  }

  const branchCount = await db.branches.count();
  if (branchCount >= 8) return; // Already initialized with 8 branches

  console.log('Populating 8 branches (3 Phone, 4 Laundry, 1 Wakala + Boss)...');

  // Clear older minimal data to load complete multi-branch dataset if count is less
  if (branchCount > 0 && branchCount < 8) {
    await db.branches.clear();
    await db.products.clear();
    await db.sales.clear();
    await db.repairs.clear();
    await db.laundryOrders.clear();
    await db.wakalaTransactions.clear();
    await db.wakalaDayLogs.clear();
  }

  // 1. Create 8 Branches
  const branches: Branch[] = [
    // 3 Phone Shops
    {
      id: 'branch_phone_1',
      name: 'Duka la Soko Kuu',
      type: 'phone',
      code: 'PH-01',
      location: 'Soko Kuu Mwanza',
      managerName: 'Juma Ramadhani',
      phone: '+255 712 345 678',
      lastSyncedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'branch_phone_2',
      name: 'Duka la Vunja Bei',
      type: 'phone',
      code: 'PH-02',
      location: 'Vunja Bei Mwanza',
      managerName: 'Bakari Omari',
      phone: '+255 754 112 233',
      lastSyncedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'branch_phone_3',
      name: 'Duka la Makoroboi',
      type: 'phone',
      code: 'PH-03',
      location: 'Makoroboi Mwanza',
      managerName: 'Kelvin Massawe',
      phone: '+255 784 990 011',
      lastSyncedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },

    // 4 Laundry Shops (Mwanza Branches)
    {
      id: 'branch_laundry_1',
      name: 'GGS Laundry - Machinjioni',
      type: 'laundry',
      code: 'LN-01',
      location: 'Machinjioni Mwanza',
      managerName: 'Neema Joseph',
      phone: '0685947264',
      lastSyncedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'branch_laundry_2',
      name: 'GGS Laundry - Mahina kati',
      type: 'laundry',
      code: 'LN-02',
      location: 'Mahina kati Mwanza',
      managerName: 'Grace Emmanuel',
      phone: '0713456789',
      lastSyncedAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'branch_laundry_3',
      name: 'GGS Laundry - Nyasaka',
      type: 'laundry',
      code: 'LN-03',
      location: 'Nyasaka Mwanza',
      managerName: 'Agnes Charles',
      phone: '0765889900',
      lastSyncedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'branch_laundry_4',
      name: 'GGS Laundry - Sahwa',
      type: 'laundry',
      code: 'LN-04',
      location: 'Sahwa Mwanza',
      managerName: 'Beatrice Daniel',
      phone: '0787654321',
      lastSyncedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },

    // 1 Wakala Kiosk
    {
      id: 'branch_wakala_1',
      name: 'Wakala Kiosk - Kinondoni',
      type: 'wakala',
      code: 'WK-01',
      location: 'Kinondoni Manyanya Branch',
      managerName: 'Rashid Bakari',
      phone: '+255 784 567 890',
      lastSyncedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ];

  await db.branches.bulkPut(branches);

  // 2. Products across the 3 Phone Shops
  const products: Product[] = [
    // Shop 1 - Soko Kuu
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone_1',
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
      branchId: 'branch_phone_1',
      name: 'Itel 2160 (Simu ya Tochi)',
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
      branchId: 'branch_phone_1',
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

    // Shop 2 - Vunja Bei
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone_2',
      name: 'Redmi Note 13 (256GB/8GB)',
      category: 'phone',
      model: 'Note 13',
      storage: '256GB',
      condition: 'new',
      imei: '864201938472910',
      costPrice: 480000,
      sellingPrice: 540000,
      stock: 5,
      minStock: 2,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone_2',
      name: 'Oraimo FreePods 4 Wireless Earbuds',
      category: 'accessory',
      model: 'FreePods 4',
      costPrice: 55000,
      sellingPrice: 75000,
      stock: 10,
      minStock: 3,
      warrantyMonths: 12,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone_2',
      name: 'Screen Protector 9D / 10D (Universal)',
      category: 'accessory',
      costPrice: 2000,
      sellingPrice: 8000,
      stock: 60,
      minStock: 15,
      updatedAt: new Date().toISOString(),
      isSynced: true
    },

    // Shop 3 - Makoroboi
    {
      id: generateUniqueId('prod'),
      branchId: 'branch_phone_3',
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
      branchId: 'branch_phone_3',
      name: 'Kioo cha Samsung A12 (Original Replacement)',
      category: 'spare',
      costPrice: 40000,
      sellingPrice: 65000,
      stock: 4,
      minStock: 1,
      updatedAt: new Date().toISOString(),
      isSynced: true
    }
  ];

  await db.products.bulkPut(products);

  // 3. Sample Sales for the Phone Shops
  const sampleSales: Sale[] = [
    {
      id: generateUniqueId('sale'),
      branchId: 'branch_phone_1',
      saleNumber: 'SL-1001',
      items: [
        { productId: products[0].id, productName: products[0].name, category: 'phone', quantity: 1, unitPrice: 430000, totalPrice: 430000, imei: '354892019482012' }
      ],
      totalAmount: 430000,
      discount: 0,
      finalAmount: 430000,
      paymentMethod: 'mpesa',
      customerName: 'Musa Abdallah',
      customerPhone: '0714123456',
      cashierName: 'Juma Ramadhani',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('sale'),
      branchId: 'branch_phone_2',
      saleNumber: 'SL-2001',
      items: [
        { productId: products[3].id, productName: products[3].name, category: 'phone', quantity: 1, unitPrice: 540000, totalPrice: 540000 }
      ],
      totalAmount: 540000,
      discount: 0,
      finalAmount: 540000,
      paymentMethod: 'cash',
      customerName: 'Zainab Rashid',
      customerPhone: '0784992211',
      cashierName: 'Bakari Omari',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: true
    },
    {
      id: generateUniqueId('sale'),
      branchId: 'branch_phone_3',
      saleNumber: 'SL-3001',
      items: [
        { productId: products[6].id, productName: products[6].name, category: 'phone', quantity: 1, unitPrice: 1300000, totalPrice: 1300000 }
      ],
      totalAmount: 1300000,
      discount: 0,
      finalAmount: 1300000,
      paymentMethod: 'bank',
      customerName: 'Dkt. Mwamba',
      customerPhone: '0754009988',
      cashierName: 'Kelvin Massawe',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSynced: true
    }
  ];

  await db.sales.bulkPut(sampleSales);

  // 4. Sample Phone Repairs
  const repairs: RepairOrder[] = [
    {
      id: generateUniqueId('rep'),
      branchId: 'branch_phone_1',
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
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: false
    }
  ];

  await db.repairs.bulkPut(repairs);

  // 5. Sample Laundry Orders across 4 Laundry Shops
  const laundryOrders: LaundryOrder[] = [
    // Laundry 1 - Machinjioni
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry_1',
      orderNumber: 'ORD-101',
      tagNumber: 'LN1-501',
      customerName: 'Mama Ashura',
      customerPhone: '0712998877',
      items: [
        { id: generateUniqueId('item'), itemType: 'Mashuka (Bed Sheets)', service: 'wash_iron', quantity: 4, pricePerItem: 3000, totalPrice: 12000 },
        { id: generateUniqueId('item'), itemType: 'Blanket Kubwa', service: 'wash_only', quantity: 1, pricePerItem: 10000, totalPrice: 10000 }
      ],
      totalAmount: 22000,
      deposit: 10000,
      balanceDue: 12000,
      paymentStatus: 'partial',
      stage: 'washing',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      promisedDate: 'Kesho saa 8 mchana',
      isSynced: false
    },
    // Laundry 2 - Mahina kati
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry_2',
      orderNumber: 'ORD-201',
      tagNumber: 'LN2-502',
      customerName: 'Eng. Michael',
      customerPhone: '0789234567',
      items: [
        { id: generateUniqueId('item'), itemType: 'Suti (Coat + Suruali)', service: 'dry_clean', quantity: 2, pricePerItem: 12000, totalPrice: 24000 },
        { id: generateUniqueId('item'), itemType: 'Mashati ya Mikono Mirefu', service: 'wash_iron', quantity: 3, pricePerItem: 2000, totalPrice: 6000 }
      ],
      totalAmount: 30000,
      deposit: 30000,
      balanceDue: 0,
      paymentStatus: 'paid',
      stage: 'ready',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      promisedDate: 'Leo saa 10 jioni',
      readyAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSynced: false
    },
    // Laundry 3 - Nyasaka
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry_3',
      orderNumber: 'ORD-301',
      tagNumber: 'LN3-503',
      customerName: 'Madam Rhoda',
      customerPhone: '0765123987',
      items: [
        { id: generateUniqueId('item'), itemType: 'Mapazia ya Sebule (Curtains)', service: 'wash_iron', quantity: 6, pricePerItem: 4000, totalPrice: 24000 }
      ],
      totalAmount: 24000,
      deposit: 15000,
      balanceDue: 9000,
      paymentStatus: 'partial',
      stage: 'ironing',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      promisedDate: 'Kesho asubuhi',
      isSynced: false
    },
    // Laundry 4 - Sahwa
    {
      id: generateUniqueId('lnd'),
      branchId: 'branch_laundry_4',
      orderNumber: 'ORD-401',
      tagNumber: 'LN4-504',
      customerName: 'Dkt. Mrema',
      customerPhone: '0754882211',
      items: [
        { id: generateUniqueId('item'), itemType: 'Suti Kamili & Mashati', service: 'wash_iron', quantity: 3, pricePerItem: 3500, totalPrice: 10500 },
        { id: generateUniqueId('item'), itemType: 'Pazia Kubwa', service: 'wash_only', quantity: 2, pricePerItem: 5000, totalPrice: 10000 }
      ],
      totalAmount: 20500,
      deposit: 20500,
      balanceDue: 0,
      paymentStatus: 'paid',
      stage: 'ready',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      promisedDate: 'Leo saa 11 jioni',
      readyAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSynced: false
    }
  ];

  await db.laundryOrders.bulkPut(laundryOrders);

  // 6. Wakala Day Opening and Transactions
  const todayDate = new Date().toISOString().split('T')[0];
  const openingDayLog: WakalaDayLog = {
    id: generateUniqueId('wlog'),
    branchId: 'branch_wakala_1',
    date: todayDate,
    openingCash: 500000,
    // 4 Agent Lines (Kawaida)
    openingFloatMpesaAgent: 800000,
    openingFloatTigoAgent: 500000,
    openingFloatAirtelAgent: 300000,
    openingFloatHalopesaAgent: 200000,
    // 4 Lipa Namba Lines (Merchant)
    openingFloatMpesaLipa: 700000,
    openingFloatTigoLipa: 300000,
    openingFloatAirtelLipa: 300000,
    openingFloatHalopesaLipa: 100000,
    // Compatibility fields
    openingFloatMpesa: 1500000,
    openingFloatTigo: 800000,
    openingFloatAirtel: 600000,
    openingFloatHalopesa: 300000,
    openingFloatBank: 0,
    calculatedCash: 500000,
    calculatedFloats: {
      mpesaAgent: 800000,
      tigoAgent: 500000,
      airtelAgent: 300000,
      halopesaAgent: 200000,
      mpesaLipa: 700000,
      tigoLipa: 300000,
      airtelLipa: 300000,
      halopesaLipa: 100000,
      mpesa: 1500000,
      tigo: 800000,
      airtel: 600000,
      halopesa: 300000,
      bank: 0
    },
    status: 'open',
    notes: 'Kuanza kazi asubuhi (Laini 4 Wakala + Laini 4 Lipa)',
    createdAt: new Date().toISOString(),
    isSynced: true
  };

  await db.wakalaDayLogs.put(openingDayLog);

  const sampleWakalaTxs: WakalaTransaction[] = [
    {
      id: generateUniqueId('wtx'),
      branchId: 'branch_wakala_1',
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
      branchId: 'branch_wakala_1',
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

  // 7. Sample Expenses for Laundry & Other Branches
  const expenseCount = await db.expenses.count();
  if (expenseCount === 0) {
    const sampleExpenses: Expense[] = [
      {
        id: generateUniqueId('exp'),
        branchId: 'branch_laundry_1',
        title: 'Sabuni ya Omo & Jik (Kilo 10)',
        category: 'sabuni_kemikali',
        amount: 25000,
        recordedBy: 'Neema Joseph',
        notes: 'Kwa ajili ya kufulia mashuka na nguo za wateja',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        isSynced: false
      },
      {
        id: generateUniqueId('exp'),
        branchId: 'branch_laundry_1',
        title: 'Umeme wa LUKU (Pasi & Mashine)',
        category: 'umeme_luku',
        amount: 20000,
        recordedBy: 'Neema Joseph',
        notes: 'Units 58 za umeme wa pasi',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        isSynced: false
      },
      {
        id: generateUniqueId('exp'),
        branchId: 'branch_laundry_2',
        title: 'Mifuko ya nailoni ya kufungia nguo (Packaging)',
        category: 'mifuko_packaging',
        amount: 12000,
        recordedBy: 'Grace Emmanuel',
        notes: 'Pcs 200 za mifuko ya suti na nguo',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        isSynced: false
      },
      {
        id: generateUniqueId('exp'),
        branchId: 'branch_laundry_3',
        title: 'Maji ya dumu (Madumu 15)',
        category: 'maji',
        amount: 7500,
        recordedBy: 'Agnes Charles',
        notes: 'Maji safi ya kufulia nguo',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        isSynced: false
      }
    ];
    await db.expenses.bulkPut(sampleExpenses);
  }

  console.log('Successfully initialized all 8 branches database!');
};
