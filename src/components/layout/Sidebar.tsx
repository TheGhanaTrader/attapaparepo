import { LayoutDashboard, Package, PlusSquare, ShoppingCart, RotateCcw, Users, BarChart2, Upload, Settings, ScrollText, Truck as TruckIcon, LogOut, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Page =
  | 'dashboard' | 'inventory' | 'add-product' | 'sales-history'
  | 'sell' | 'fair-guys' | 'returns' | 'reports' | 'bulk-upload'
  | 'audit-logs' | 'settings' | 'stock-intake';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItem {
  page: Page;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  ceoOnly?: boolean;
  dividerBefore?: boolean;
}

const navItems: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, ceoOnly: true },
  { page: 'sell', label: 'Scan to Sell', icon: Zap },
  { page: 'inventory', label: 'Inventory', icon: Package, ceoOnly: true, dividerBefore: true },
  { page: 'add-product', label: 'Add Product', icon: PlusSquare, ceoOnly: true },
  { page: 'stock-intake', label: 'Stock Intake', icon: TruckIcon, ceoOnly: true },
  { page: 'bulk-upload', label: 'Bulk Upload', icon: Upload, ceoOnly: true },
  { page: 'sales-history', label: 'Sales History', icon: ShoppingCart, ceoOnly: true, dividerBefore: true },
  { page: 'returns', label: 'Returns', icon: RotateCcw, ceoOnly: true },
  { page: 'fair-guys', label: 'Fair Guys', icon: Users, ceoOnly: true },
  { page: 'reports', label: 'Reports', icon: BarChart2, ceoOnly: true, dividerBefore: true },
  { page: 'audit-logs', label: 'Audit Logs', icon: ScrollText, ceoOnly: true },
  { page: 'settings', label: 'Settings', icon: Settings, ceoOnly: true },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const isCeo = profile?.role === 'ceo';

  const visibleItems = navItems.filter(item => !item.ceoOnly || isCeo);

  return (
    <aside className="w-64 min-h-screen bg-navy-900 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm">A</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">ATTAPAPA</h1>
            <p className="text-navy-300 text-xs mt-0.5">Auto Lights</p>
          </div>
        </div>
      </div>

      {/* User badge */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-lg bg-navy-800 border border-navy-700">
        <p className="text-white text-sm font-semibold truncate">{profile?.full_name || 'User'}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
          isCeo
            ? 'bg-amber-400/20 text-amber-300'
            : 'bg-emerald-400/20 text-emerald-300'
        }`}>
          {isCeo ? 'CEO / Admin' : 'Sales Staff'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <div key={item.page}>
              {item.dividerBefore && (
                <div className="border-t border-navy-700 my-2" />
              )}
              <button
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group mb-0.5 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-navy-300 hover:bg-navy-700 hover:text-white'
                }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-navy-400 group-hover:text-white'} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={14} className="text-white/60" />}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-navy-700">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:bg-red-900/40 hover:text-red-300 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
