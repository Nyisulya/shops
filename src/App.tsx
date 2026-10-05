import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/dexie';
import { initializeDatabaseData } from './db/initialData';
import type { BranchType, Sale, LaundryOrder, WakalaTransaction } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { SyncModal } from './components/SyncModal';
import { PinLogin } from './components/Auth/PinLogin';
import { LicenseModal } from './components/Auth/LicenseModal';
import { checkLicenseStatus, type LicenseInfo } from './services/licenseService';

// Phone Shop Components
import { PhonePOS } from './components/PhoneShop/PhonePOS';
import { PhoneInventory } from './components/PhoneShop/PhoneInventory';
import { PhoneRepairs } from './components/PhoneShop/PhoneRepairs';
import { PhoneHistory } from './components/PhoneShop/PhoneHistory';

// Laundry Components
import { LaundryNewOrder } from './components/Laundry/LaundryNewOrder';
import { LaundryPipeline } from './components/Laundry/LaundryPipeline';
import { LaundryHistory } from './components/Laundry/LaundryHistory';

// Wakala Components
import { WakalaQuickLog } from './components/Wakala/WakalaQuickLog';
import { WakalaDayBalance } from './components/Wakala/WakalaDayBalance';
import { WakalaTransactionsList } from './components/Wakala/WakalaTransactionsList';

// Boss Dashboard Components
import { BossOverview } from './components/BossDashboard/BossOverview';
import { BranchComparison } from './components/BossDashboard/BranchComparison';
import { DataManagement } from './components/BossDashboard/DataManagement';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [currentBranchType, setCurrentBranchType] = useState<BranchType>(() => {
    return (localStorage.getItem('active_auth_branch') as BranchType) || 'phone';
  });
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => checkLicenseStatus());

  // Initialize DB data once and re-check license periodically
  useEffect(() => {
    initializeDatabaseData();
    const interval = setInterval(() => {
      setLicenseInfo(checkLicenseStatus());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const branches = useLiveQuery(async () => db.branches.toArray(), []) || [];
  const laundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []) || [];
  const readyLaundryCount = laundryOrders.filter(o => o.stage === 'ready').length;

  const handleLoginSuccess = (branchType: BranchType) => {
    setIsAuthenticated(true);
    setCurrentBranchType(branchType);
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('active_auth_branch', branchType);

    if (branchType === 'phone') setActiveTab('pos');
    else if (branchType === 'laundry') setActiveTab('new_order');
    else if (branchType === 'wakala') setActiveTab('quick_log');
    else if (branchType === 'boss') setActiveTab('overview');
  };

  const handleLockScreen = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is_authenticated');
  };

  const handleBranchTypeChange = (newType: BranchType) => {
    setCurrentBranchType(newType);
    localStorage.setItem('active_auth_branch', newType);
    if (newType === 'phone') setActiveTab('pos');
    else if (newType === 'laundry') setActiveTab('new_order');
    else if (newType === 'wakala') setActiveTab('quick_log');
    else if (newType === 'boss') setActiveTab('overview');
  };

  const handleSaleComplete = (sale: Sale) => {
    setReceiptData({
      type: 'phone_sale',
      title: 'Risiti ya Mauzo (Sale Receipt)',
      branchName: 'Duka la Simu & Vifaa',
      branchPhone: '+255 712 345 678',
      branchLocation: 'Mwenge / Mlimani City Branch',
      receiptNumber: sale.saleNumber,
      createdAt: sale.createdAt,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      items: sale.items.map(i => ({
        name: i.productName,
        qty: i.quantity,
        price: i.unitPrice,
        total: i.totalPrice,
        imei: i.imei
      })),
      totalAmount: sale.totalAmount,
      discount: sale.discount,
      paidAmount: sale.finalAmount,
      paymentMethod: sale.paymentMethod,
      cashierName: sale.cashierName
    });
    setIsReceiptOpen(true);
  };

  const handleLaundryOrderComplete = (order: LaundryOrder) => {
    setReceiptData({
      type: 'laundry_order',
      title: 'Tag ya Nguo (Laundry Slip)',
      branchName: 'GGS Laundry Service',
      branchPhone: '0685947264',
      branchLocation: 'Mahinakati Mwanza',
      receiptNumber: order.orderNumber,
      tagNumber: order.tagNumber,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map(i => ({
        name: i.itemType,
        qty: i.quantity,
        price: i.pricePerItem,
        total: i.totalPrice
      })),
      totalAmount: order.totalAmount,
      discount: order.discount,
      paidAmount: order.deposit,
      balanceDue: order.balanceDue,
      promisedDate: order.promisedDate,
      notes: order.notes
    });
    setIsReceiptOpen(true);
  };

  const handleWakalaTxComplete = (tx: WakalaTransaction) => {
    const isLipa = tx.withdrawalMethod === 'lipa_namba';
    setReceiptData({
      type: 'wakala_tx',
      title: isLipa ? 'Stakabadhi ya Lipa Namba (Transaction Slip)' : 'Stakabadhi ya Wakala (Transaction Slip)',
      branchName: 'Wakala Kiosk (M-Pesa & Banks)',
      branchPhone: '+255 784 567 890',
      branchLocation: 'Kinondoni Manyanya Branch',
      receiptNumber: tx.transactionNumber,
      createdAt: tx.createdAt,
      customerPhone: tx.customerPhone,
      items: [
        {
          name: `Muamala: ${tx.type === 'withdrawal' ? (isLipa ? 'Kutoa kwa Lipa Namba' : 'Kutoa Pesa') : 'Kuweka Pesa'} (${tx.provider.toUpperCase()})`,
          qty: 1,
          price: tx.amount,
          total: tx.amount
        },
        ...(tx.wakalaFee ? [{
          name: 'Ada ya Wakala (Wakala Anachukua)',
          qty: 1,
          price: tx.wakalaFee,
          total: tx.wakalaFee
        }] : [])
      ],
      totalAmount: tx.totalCollectedFromCustomer || tx.amount,
      paidAmount: tx.totalCollectedFromCustomer || tx.amount,
      paymentMethod: isLipa ? `${tx.provider.toUpperCase()} LIPA` : tx.provider.toUpperCase(),
      cashierName: tx.cashierName,
      notes: tx.receiptNumber ? `Ref SMS: ${tx.receiptNumber}` : undefined
    });
    setIsReceiptOpen(true);
  };

  const handleGenericOpenReceipt = (data: any) => {
    setReceiptData(data);
    setIsReceiptOpen(true);
  };

  // If license is expired, show full-screen lock!
  if (licenseInfo.isExpired) {
    return (
      <LicenseModal
        isOpen={true}
        isEnforcedLock={true}
        onSuccess={() => setLicenseInfo(checkLicenseStatus())}
      />
    );
  }

  // If not authenticated, render 4-digit PIN login screen
  if (!isAuthenticated) {
    return (
      <PinLogin 
        onLoginSuccess={handleLoginSuccess}
        targetBranchType={currentBranchType}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        currentBranchType={currentBranchType}
        onSelectBranchType={handleBranchTypeChange}
        branches={branches}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onLockScreen={handleLockScreen}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Subscription Expiring Soon Alert Banner (if <= 3 days) */}
      {licenseInfo.isExpiringSoon && (
        <div 
          onClick={() => setIsLicenseModalOpen(true)}
          className="bg-amber-500/20 border-b border-amber-500/40 px-3.5 py-1.5 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-amber-500/30 transition-colors"
        >
          <span>⚠️ Zimebaki siku {licenseInfo.daysRemaining} tu kabla ya leseni ya mwezi kwisha. Bonyeza hapa kuongeza.</span>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-3.5 pt-3.5">
        
        {/* Branch 1: Duka la Simu & Vifaa */}
        {currentBranchType === 'phone' && (
          <>
            {activeTab === 'pos' && <PhonePOS onSaleComplete={handleSaleComplete} />}
            {activeTab === 'inventory' && <PhoneInventory />}
            {activeTab === 'repairs' && <PhoneRepairs onOpenReceipt={handleGenericOpenReceipt} />}
            {activeTab === 'history' && <PhoneHistory onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Branch 2: GGS Laundry Service */}
        {currentBranchType === 'laundry' && (
          <>
            {activeTab === 'new_order' && <LaundryNewOrder onOrderComplete={handleLaundryOrderComplete} />}
            {activeTab === 'pipeline' && <LaundryPipeline onOpenReceipt={handleGenericOpenReceipt} />}
            {activeTab === 'orders_list' && <LaundryHistory onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Branch 3: M-Pesa & Wakala Kiosk */}
        {currentBranchType === 'wakala' && (
          <>
            {activeTab === 'quick_log' && <WakalaQuickLog onTxComplete={handleWakalaTxComplete} />}
            {activeTab === 'day_balance' && <WakalaDayBalance />}
            {activeTab === 'tx_history' && <WakalaTransactionsList onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Boss Central Dashboard */}
        {currentBranchType === 'boss' && (
          <>
            {activeTab === 'overview' && (
              <BossOverview
                onSelectBranch={handleBranchTypeChange}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
            )}
            {activeTab === 'comparison' && <BranchComparison />}
            {activeTab === 'data_backup' && <DataManagement />}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        branchType={currentBranchType}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        readyLaundryCount={readyLaundryCount}
      />

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
      />

      {/* Evening Cloud Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* License / Subscription Management Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onSuccess={() => setLicenseInfo(checkLicenseStatus())}
      />
    </div>
  );
};
export default App;


