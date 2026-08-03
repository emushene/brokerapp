import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, User as UserIcon, Menu, Users, DollarSign, BarChart3, Receipt, Wallet, Package, CreditCard, Shield, FileBarChart } from 'lucide-react';
import { useAuth } from './AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Submissions', path: '/submissions', icon: FileText },
    { label: 'Statements', path: '/financials', icon: DollarSign },
    { label: 'Settlements', path: '/settlements', icon: CreditCard },
    { label: 'Pay Slips', path: '/payslips', icon: Receipt },
    { label: 'Advances', path: '/advances', icon: Wallet },
    { label: 'Promotional Gifts', path: '/promotional-gifts', icon: Package },
    { label: 'Reports & Balances', path: '/reports', icon: FileBarChart },
    { label: 'Manage Advisors', path: '/advisors', icon: Users },
    { label: 'Performance', path: '/performance', icon: BarChart3 },
  ];


  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased selection:bg-blue-600/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0f172a]/80 backdrop-blur-md hidden md:flex flex-col">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 border border-slate-700/80 p-2 rounded-lg text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-white block leading-none">BrokerApp</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Enterprise Platform</span>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b0f19]/40">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-between px-3.5 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150 border border-transparent hover:border-rose-500/20 group"
          >
            <span className="font-medium">Sign Out</span>
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0b0f19]">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0f172a]/60 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="md:hidden flex items-center gap-3">
            <Menu className="text-slate-400 w-5 h-5 cursor-pointer" />
            <span className="font-semibold text-sm text-white">BrokerApp</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user?.email}</p>
              <p className="text-[10px] text-slate-500 font-medium">Authorized Administrator</p>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded-full border border-slate-700/80 text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
