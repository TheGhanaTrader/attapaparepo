import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

type Page =
  | 'dashboard' | 'inventory' | 'add-product' | 'sales-history'
  | 'sell' | 'fair-guys' | 'returns' | 'reports' | 'bulk-upload'
  | 'audit-logs' | 'settings' | 'stock-intake';

interface AppLayoutProps {
  children: ReactNode;
  currentPage: Page;
  pageTitle: string;
  onNavigate: (page: Page, extra?: string) => void;
}

export default function AppLayout({ children, currentPage, pageTitle, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={pageTitle} onNavigate={(page, id) => onNavigate(page as Page, id)} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
