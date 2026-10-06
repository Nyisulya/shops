import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { App as CapApp } from '@capacitor/app';
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
import { BossReports } from './components/BossDashboard/BossReports';
import { BossInventoryControl } from './components/BossDashboard/BossInventoryControl';
import { BossSecurity } from './components/BossDashboard/BossSecurity';
import { BranchComparison } from './components/BossDashboard/BranchComparison';
import { DataManagement } from './components/BossDashboard/DataManagement';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [currentBranchType, setCurrentBranchType] = useState<BranchType>(() => {
    return (localStorage.getItem('active_auth_branch') as BranchType) || 'phone';
  });
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    return localStorage.getItem('active_branch_id') || 'branch_phone_1';
  });
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => checkLicenseStatus());

  // Double-tap back button to exit app states
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressRef = useRef<number>(0);

  // Initialize DB data once and re-check license periodically
  useEffect(() => {
    initializeDatabaseData();
    const interval = setInterval(() => {
      setLicenseInfo(checkLicenseStatus());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Hardware Back Button (Double Tap to Exit) Handler
  useEffect(() => {
    let backListener: any = null;

    const setupBackHandler = async () => {
      backListener = await CapApp.addListener('backButton', () => {
        // 1. If any modal is open, close it first
        if (isReceiptOpen) {
          setIsReceiptOpen(false);
          return;
        }
        if (isSyncModalOpen) {
          setIsSyncModalOpen(false);
          return;
        }
        if (isLicenseModalOpen) {
          setIsLicenseModalOpen(false);
          return;
        }

        // 2. Double-tap to exit check
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          // Second tap within 2 seconds -> Exit app!
          CapApp.exitApp();
        } else {
          // First tap -> Don't exit, show toast
          lastBackPressRef.current = now;
          setShowExitToast(true);
          setTimeout(() => setShowExitToast(false), 2000);
        }
      });
    };

    setupBackHandler();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [isReceiptOpen, isSyncModalOpen, isLicenseModalOpen]);

  const branches = useLiveQuery(async () => db.branches.toArray(), []) || [];
  const laundryOrders = useLiveQuery(async () => db.laundryOrders.toArray(), []) || [];
  const readyLaundryCount = laundryOrders.filter(o => o.stage === 'ready').length;

  const handleLoginSuccess = (branchType: BranchType, branchId?: string) => {
    setIsAuthenticated(true);
    setCurrentBranchType(branchType);
    if (branchId) setCurrentBranchId(branchId);
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('active_auth_branch', branchType);
    if (branchId) localStorage.setItem('active_branch_id', branchId);

    if (branchType === 'phone') setActiveTab('pos');
    else if (branchType === 'laundry') setActiveTab('new_order');
    else if (branchType === 'wakala') setActiveTab('quick_log');
    else if (branchType === 'boss' || branchType === 'admin') setActiveTab('overview');
  };

  const handleLockScreen = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is_authenticated');
  };

  const handleBranchChange = (newType: BranchType, newBranchId?: string) => {
    setCurrentBranchType(newType);
    if (newBranchId) setCurrentBranchId(newBranchId);
    localStorage.setItem('active_auth_branch', newType);
    if (newBranchId) localStorage.setItem('active_branch_id', newBranchId);

    if (newType === 'phone') setActiveTab('pos');
    else if (newType === 'laundry') setActiveTab('new_order');
    else if (newType === 'wakala') setActiveTab('quick_log');
    else if (newType === 'boss' || newType === 'admin') setActiveTab('overview');
  };

  // Guard for Boss: redirect away from admin-only tabs
  useEffect(() => {
    if (currentBranchType === 'boss' && (activeTab === 'security' || activeTab === 'data_backup')) {
      setActiveTab('overview');
    }
  }, [currentBranchType, activeTab]);

  const handleSaleComplete = (sale: Sale) => {
    const activeBranch = branches.find(b => b.id === sale.branchId || b.id === currentBranchId);
    setReceiptData({
      type: 'phone_sale',
      title: 'Risiti ya Mauzo (Sale Receipt)',
      branchName: activeBranch?.name || 'Duka la Simu & Vifaa',
      branchPhone: activeBranch?.phone || '+255 712 345 678',
      branchLocation: activeBranch?.location || 'Mwanza Branch',
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
    const activeBranch = branches.find(b => b.id === order.branchId || b.id === currentBranchId);
    setReceiptData({
      type: 'laundry_order',
      title: 'Tag ya Nguo (Laundry Slip)',
      branchName: activeBranch?.name || 'GGS Laundry Service',
      branchPhone: activeBranch?.phone || '0685947264',
      branchLocation: activeBranch?.location || 'Mwanza Branch',
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
      <>
        <PinLogin 
          onLoginSuccess={handleLoginSuccess}
          targetBranchType={currentBranchType}
          targetBranchId={currentBranchId}
        />
        {showExitToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-slate-100 px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-150">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold">Bonyeza tena kurudi nyuma ili kutoka</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        currentBranchType={currentBranchType}
        currentBranchId={currentBranchId}
        onSelectBranch={handleBranchChange}
        branches={branches}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onLockScreen={handleLockScreen}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Subscription Expiring Soon Alert Banner (Shown to Boss & Admin if <= 3 days) */}
      {licenseInfo.isExpiringSoon && (currentBranchType === 'boss' || currentBranchType === 'admin') && (
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
            {activeTab === 'history' && <PhoneHistory onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Branch 2: GGS Laundry Service */}
        {currentBranchType === 'laundry' && (
          <>
            {activeTab === 'new_order' && <LaundryNewOrder onOrderComplete={handleLaundryOrderComplete} branchId={currentBranchId} />}
            {activeTab === 'orders_list' && <LaundryHistory onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Branch 3: M-Pesa & Wakala Kiosk */}
        {currentBranchType === 'wakala' && (
          <>
            {activeTab === 'quick_log' && <WakalaQuickLog onTxComplete={handleWakalaTxComplete} branchId={currentBranchId} />}
            {activeTab === 'day_balance' && <WakalaDayBalance />}
            {activeTab === 'tx_history' && <WakalaTransactionsList onOpenReceipt={handleGenericOpenReceipt} />}
          </>
        )}

        {/* Boss Dashboard (Business only: Matawi, Ripoti & Faida, Stoo & Bei) */}
        {currentBranchType === 'boss' && (
          <>
            {activeTab === 'overview' && (
              <BossOverview
                onSelectBranch={handleBranchChange}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onNavigateTab={setActiveTab}
                onOpenReceipt={handleGenericOpenReceipt}
              />
            )}
            {activeTab === 'reports' && <BossReports />}
            {activeTab === 'inventory' && <BossInventoryControl />}
            {activeTab === 'comparison' && <BranchComparison />}
          </>
        )}

        {/* Super Admin Dashboard (Full Access: Matawi, Ripoti, Stoo, PIN & Usalama, Backup & Mfumo) */}
        {currentBranchType === 'admin' && (
          <>
            {activeTab === 'overview' && (
              <BossOverview
                onSelectBranch={handleBranchChange}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onNavigateTab={setActiveTab}
                onOpenReceipt={handleGenericOpenReceipt}
              />
            )}
            {activeTab === 'reports' && <BossReports />}
            {activeTab === 'inventory' && <BossInventoryControl />}
            {activeTab === 'security' && <BossSecurity />}
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

      {/* Double back-press exit toast notification */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-slate-100 px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-150">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold">Bonyeza tena kurudi nyuma ili kutoka</span>
        </div>
      )}
    </div>
  );
};
export default App;


