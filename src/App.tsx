import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import AddProductPage from './pages/AddProductPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import SalesScreenPage from './pages/SalesScreenPage';
import FairGuysPage from './pages/FairGuysPage';
import ReturnsPage from './pages/ReturnsPage';
import ReportsPage from './pages/ReportsPage';
import StockIntakePage from './pages/StockIntakePage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';
import BulkUploadPage from './pages/BulkUploadPage';
import AppLayout from './components/layout/AppLayout';

type Page =
  | 'dashboard' | 'inventory' | 'add-product' | 'sales-history'
  | 'sell' | 'fair-guys' | 'returns' | 'reports' | 'bulk-upload'
  | 'audit-logs' | 'settings' | 'stock-intake';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  'add-product': 'Add Product',
  'sales-history': 'Sales History',
  sell: 'Scan to Sell',
  'fair-guys': 'Fair Guys',
  returns: 'Returns',
  reports: 'Reports',
  'bulk-upload': 'Bulk Upload',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
  'stock-intake': 'Stock Intake',
};

function AppInner() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('sell');
  const [inventoryHighlight, setInventoryHighlight] = useState<string | undefined>();

  useEffect(() => {
    if (profile) {
      setPage(profile.role === 'ceo' ? 'dashboard' : 'sell');
    }
  }, [profile?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-medium">Loading ATTAPAPA...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const navigate = (target: string, extra?: string) => {
    if (target === 'inventory' && extra) {
      setInventoryHighlight(extra);
    }
    setPage(target as Page);
  };

  const renderPage = () => {
    const isCeo = profile?.role === 'ceo';

    switch (page) {
      case 'dashboard': return isCeo ? <DashboardPage onNavigate={navigate} /> : null;
      case 'inventory': return isCeo ? <InventoryPage onNavigate={navigate} highlightId={inventoryHighlight} /> : null;
      case 'add-product': return isCeo ? <AddProductPage onNavigate={navigate} /> : null;
      case 'sales-history': return isCeo ? <SalesHistoryPage /> : null;
      case 'sell': return <SalesScreenPage />;
      case 'fair-guys': return isCeo ? <FairGuysPage /> : null;
      case 'returns': return isCeo ? <ReturnsPage /> : null;
      case 'reports': return isCeo ? <ReportsPage /> : null;
      case 'bulk-upload': return isCeo ? <BulkUploadPage /> : null;
      case 'audit-logs': return isCeo ? <AuditLogsPage /> : null;
      case 'settings': return isCeo ? <SettingsPage /> : null;
      case 'stock-intake': return isCeo ? <StockIntakePage /> : null;
      default: return null;
    }
  };

  return (
    <AppLayout currentPage={page} pageTitle={PAGE_TITLES[page] || 'ATTAPAPA'} onNavigate={navigate}>
      {renderPage() ?? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm mt-1">You don't have permission to view this page.</p>
        </div>
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
