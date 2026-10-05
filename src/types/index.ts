export type BranchType = 'phone' | 'laundry' | 'wakala' | 'boss';

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  code: string;
  location: string;
  managerName: string;
  phone: string;
  lastSyncedAt?: string;
}

export type ProductCategory = 'phone' | 'accessory' | 'spare' | 'other';

export interface Product {
  id: string;
  branchId: string;
  name: string;
  category: ProductCategory;
  imei?: string; // For phones
  model?: string;
  storage?: string; // 64GB, 128GB, etc.
  condition?: 'new' | 'used';
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  warrantyMonths?: number;
  updatedAt: string;
  isSynced: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedImei?: string;
  customPrice?: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imei?: string;
}

export interface Sale {
  id: string;
  branchId: string;
  saleNumber: string;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'cash' | 'mpesa' | 'airtel' | 'tigo' | 'bank' | 'split';
  customerName?: string;
  customerPhone?: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
  isSynced: boolean;
}

export type RepairStatus = 'received' | 'in_progress' | 'ready' | 'delivered';

export interface RepairOrder {
  id: string;
  branchId: string;
  repairNumber: string;
  customerName: string;
  customerPhone: string;
  phoneModel: string;
  imeiOrSerial?: string;
  issueDescription: string;
  sparePartsCost: number;
  laborCost: number;
  totalCost: number;
  deposit: number;
  balanceDue: number;
  status: RepairStatus;
  technician: string;
  notes?: string;
  createdAt: string;
  readyAt?: string;
  deliveredAt?: string;
  isSynced: boolean;
}

// Laundry
export type LaundryStage = 'received' | 'washing' | 'ironing' | 'ready' | 'delivered';
export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface LaundryItem {
  id: string;
  itemType: string; // Shati, Suruali, Suti, Gauni, Blanket, etc.
  service: 'wash_iron' | 'wash_only' | 'iron_only' | 'dry_clean';
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  notes?: string; // e.g. "Kifungo kimekatika", "Doa la wino"
}

export interface LaundryOrder {
  id: string;
  branchId: string;
  orderNumber: string;
  tagNumber: string; // e.g. LN-1042
  customerName: string;
  customerPhone: string;
  items: LaundryItem[];
  subtotal?: number;
  discount?: number;
  totalAmount: number;
  deposit: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  stage: LaundryStage;
  notes?: string;
  createdAt: string;
  promisedDate: string;
  readyAt?: string;
  deliveredAt?: string;
  isSynced: boolean;
}

// Wakala / M-Pesa
export type WakalaProvider = 'mpesa' | 'airtel' | 'tigo' | 'halopesa' | 'crdb' | 'nmb';
export type WakalaTxType = 'deposit' | 'withdrawal' | 'bill_pay' | 'float_transfer';
export type WakalaWithdrawalMethod = 'lipa_namba' | 'agent_kawaida';

export interface WakalaTransaction {
  id: string;
  branchId: string;
  transactionNumber: string;
  provider: WakalaProvider;
  type: WakalaTxType;
  withdrawalMethod?: WakalaWithdrawalMethod; // Lipa Namba vs Kawaida
  amount: number; // Kiasi anachotaka mteja mkononi
  fee: number; // Makato
  wakalaFee?: number; // Ada/Gharama anayochukua Wakala (Wakala Anachukua)
  lipaCharge?: number; // Makato ya mtandao kwa Lipa Namba
  totalCollectedFromCustomer?: number; // amount + wakalaFee
  commission: number; // Tume
  customerPhone?: string;
  receiptNumber?: string;
  cashierName: string;
  createdAt: string;
  isSynced: boolean;
}

export interface WakalaDayLog {
  id: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  openingCash: number;
  openingFloatMpesa: number;
  openingFloatTigo: number;
  openingFloatAirtel: number;
  openingFloatHalopesa: number;
  openingFloatBank: number;
  closingCash?: number;
  closingFloatMpesa?: number;
  closingFloatTigo?: number;
  closingFloatAirtel?: number;
  closingFloatHalopesa?: number;
  closingFloatBank?: number;
  calculatedCash: number;
  calculatedFloats: {
    mpesa: number;
    tigo: number;
    airtel: number;
    halopesa: number;
    bank: number;
  };
  difference?: number; // Over/Short
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
  closedAt?: string;
  isSynced: boolean;
}

// Offline Sync
export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: any;
  timestamp: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: 'boss' | 'phone_attendant' | 'laundry_attendant' | 'wakala_attendant';
  assignedBranchId?: string;
  pin: string;
}
