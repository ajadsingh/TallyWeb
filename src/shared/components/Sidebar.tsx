import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  BarChart3, ShoppingCart, Package, CreditCard, FileText,
  Calculator, BookOpen, Settings, Building2, LogOut,
  Wallet, ArrowLeftRight, Menu, X, ChevronRight,
} from 'lucide-react';
import AppConfigService from '../../services/config/appConfig';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout?: () => void;
}

type NavItem = { id: string; label: string; Icon: React.ComponentType<{ className?: string }> };

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',   Icon: BarChart3      },
  { id: 'sales',       label: 'Sales',       Icon: ShoppingCart   },
  { id: 'purchases',   label: 'Purchases',   Icon: Package        },
  { id: 'payments',    label: 'Payments',    Icon: ArrowLeftRight },
  { id: 'outstanding', label: 'Outstanding', Icon: Wallet         },
  { id: 'inventory',   label: 'Inventory',   Icon: Package        },
  { id: 'expenses',    label: 'Expenses',    Icon: CreditCard     },
  { id: 'ledger',      label: 'Ledger',      Icon: BookOpen       },
  { id: 'reports',     label: 'Reports',     Icon: FileText       },
  { id: 'gst',         label: 'GST',         Icon: Calculator     },
  { id: 'company',     label: 'Company',     Icon: Building2      },
  { id: 'settings',    label: 'Settings',    Icon: Settings       },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Home',        Icon: BarChart3      },
  { id: 'sales',       label: 'Sales',       Icon: ShoppingCart   },
  { id: 'payments',    label: 'Payments',    Icon: ArrowLeftRight },
  { id: 'outstanding', label: 'Outstanding', Icon: Wallet         },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, drawerOpen]);

  const navigate = (id: string) => {
    onViewChange(id);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    if (onLogout) onLogout();
    else {
      AppConfigService.getInstance().resetConfig();
      window.location.reload();
    }
  };

  const companyName = AppConfigService.getInstance().getCurrentCompany() || 'Tally Web';

  const NavigationDrawerContent = (
    <div className="h-full w-72 bg-white flex flex-col shadow-xl">
      <div
        className="bg-blue-700 px-5 pb-5 flex-shrink-0"
        style={{ paddingTop: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 56px)' : '24px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-14 w-14 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-full text-white/70 hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="text-white font-bold text-base leading-snug">Tally Web</p>
        <p className="text-blue-200 text-xs mt-0.5 truncate">{companyName}</p>
      </div>

      <div className="h-px bg-gray-200 flex-shrink-0" />

      <nav className="flex-1 overflow-y-auto py-2">
        {ALL_NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 text-[15px] transition-colors active:bg-gray-100",
                active ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-blue-700" : "text-gray-500")} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div
        className="border-t border-gray-200 p-4 flex-shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  // ── DESKTOP ────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="fixed top-0 left-0 h-full z-50">
        {NavigationDrawerContent}
      </div>
    );
  }

  // ── MOBILE ─────────────────────────────────────────────────────
  return (
    <>
      {/* Top App Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 bg-blue-700 flex items-center px-1 shadow-md"
        style={{ height: '56px', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-3 rounded-full text-white active:bg-white/20 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-white font-bold text-[18px] flex-1 tracking-wide ml-1">Tally Web</span>
        <p className="text-blue-200 text-xs truncate max-w-[150px] pr-3 text-right leading-tight">
          {companyName.length > 22 ? companyName.slice(0, 22) + String.fromCharCode(8230) : companyName}
        </p>
      </div>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.8 }}
              className="fixed top-0 left-0 h-full z-[70]"
              style={{ width: '280px' }}
            >
              {NavigationDrawerContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex shadow-[0_-1px_6px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {BOTTOM_NAV.map(({ id, label, Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-0.5 relative active:bg-gray-50 transition-colors"
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="bottomNavPill"
                    className="absolute top-2 w-14 h-8 bg-blue-100 rounded-full"
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  />
                )}
              </AnimatePresence>
              <Icon className={cn(
                "h-5 w-5 relative z-10 transition-all duration-150",
                active ? "text-blue-700 scale-110" : "text-gray-500"
              )} />
              <span className={cn(
                "text-[10px] font-semibold relative z-10 transition-colors duration-150 leading-none",
                active ? "text-blue-700" : "text-gray-500"
              )}>
                {label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-0.5 active:bg-gray-50 transition-colors text-gray-500"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none">More</span>
        </button>
      </div>
    </>
  );
};
