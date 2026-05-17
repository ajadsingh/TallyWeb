import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  BarChart3,
  ShoppingCart,
  Package,
  CreditCard,
  FileText,
  Calculator,
  BookOpen,
  Settings,
  Building2,
  LogOut,
  Wallet,
  MoreHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import AppConfigService from '../../services/config/appConfig';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout?: () => void;
}

interface SidebarLinkProps {
  link: {
    label: string;
    href?: string;
    icon: React.ReactNode;
    onClick?: () => void;
  };
  className?: string;
  open?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = React.memo(({ link, className, open = true }) => {
  return (
    <button
      onClick={link.onClick}
      className={cn(
        "flex items-center group/sidebar py-3 rounded-lg transition-all duration-300 ease-out w-full",
        "hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-[1.02]",
        open ? "gap-3 px-3 text-left" : "justify-center px-0",
        className
      )}
      title={!open ? link.label : undefined}
    >
      <div className={cn(
        "shrink-0 transition-all duration-300 ease-out group-hover/sidebar:scale-110 flex items-center justify-center",
        !open && "w-full"
      )}>
        {link.icon}
      </div>
      <motion.span
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          x: open ? 0 : -10,
          width: open ? "auto" : 0,
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 }
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition-transform duration-300 ease-out whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
    </button>
  );
});

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const hoverTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = React.useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback to the old method if no onLogout prop is provided
      const appConfig = AppConfigService.getInstance();
      appConfig.resetConfig();
      window.location.reload();
    }
  }, [onLogout]);

  // Handle mouse enter/leave for hover effect with proper debouncing
  const handleMouseEnter = React.useCallback(() => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, 100);
    }
  }, [isMobile]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  }, [isMobile]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  const links = React.useMemo(() => [
    {
      label: "Dashboard",
      id: "dashboard",
      icon: <BarChart3 className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "dashboard" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('dashboard');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Sales",
      id: "sales",
      icon: <ShoppingCart className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "sales" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('sales');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Purchases",
      id: "purchases",
      icon: <Package className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "purchases" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('purchases');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Payments",
      id: "payments",
      icon: <ArrowLeftRight className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "payments" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('payments');
        if (isMobile) setOpen(false);
      }
    },,
    {
      label: "Inventory",
      id: "inventory",
      icon: <Package className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "inventory" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('inventory');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Expenses",
      id: "expenses",
      icon: <CreditCard className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "expenses" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('expenses');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Reports",
      id: "reports",
      icon: <FileText className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "reports" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('reports');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "GST",
      id: "gst",
      icon: <Calculator className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "gst" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('gst');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Ledger",
      id: "ledger",
      icon: <BookOpen className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "ledger" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('ledger');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Outstanding",
      id: "outstanding",
      icon: <Wallet className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "outstanding" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('outstanding');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Company",
      id: "company",
      icon: <Building2 className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "company" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('company');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Settings",
      id: "settings",
      icon: <Settings className={cn("h-5 w-5 shrink-0 transition-colors", currentView === "settings" ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200")} />,
      onClick: () => {
        onViewChange('settings');
        if (isMobile) setOpen(false);
      }
    },
  ], [onViewChange, isMobile, currentView]);

  // ── Mobile nav items ────────────────────────────────────────────────────────
  type NavItem = { id: string; label: string; Icon: React.ComponentType<{ className?: string }> };

  const BOTTOM_NAV_PRIMARY: NavItem[] = [
    { id: 'dashboard',   label: 'Home',        Icon: BarChart3    },
    { id: 'sales',       label: 'Sales',       Icon: ShoppingCart },
    { id: 'payments',    label: 'Payments',    Icon: ArrowLeftRight },
    { id: 'outstanding', label: 'Outstanding', Icon: Wallet       },
  ];

  const MORE_NAV_ITEMS: NavItem[] = [
    { id: 'purchases', label: 'Purchases', Icon: Package       },
    { id: 'inventory', label: 'Inventory', Icon: Package       },
    { id: 'expenses',  label: 'Expenses',  Icon: CreditCard    },
    { id: 'ledger',    label: 'Ledger',    Icon: BookOpen      },
    { id: 'reports',   label: 'Reports',   Icon: FileText      },
    { id: 'gst',       label: 'GST',       Icon: Calculator    },
    { id: 'company',   label: 'Company',   Icon: Building2     },
    { id: 'settings',  label: 'Settings',  Icon: Settings      },
  ];

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      {!isMobile && (
        <motion.div
          initial={false}
          animate={{ width: open ? 256 : 64 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed top-0 left-0 h-full bg-gray-50 dark:bg-neutral-800 z-50 border-r border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-lg"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ justifyContent: open ? 'flex-start' : 'center' }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex items-center space-x-2 w-full"
                >
                  <motion.div animate={{ scale: open ? 1 : 1.1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                    <Building2 className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <motion.span
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20, width: open ? 'auto' : 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 } }}
                    className="font-medium text-black dark:text-white text-lg whitespace-nowrap overflow-hidden"
                  >
                    Tally Web
                  </motion.span>
                </motion.div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <div className={cn('space-y-1', open ? 'px-3' : 'px-2')}>
                {links.map((link, idx) => (
                  <motion.div
                    key={idx}
                    initial={false}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(
                      'rounded-lg transition-all duration-200',
                      currentView === link.id && 'bg-blue-100 dark:bg-blue-900/50 shadow-sm',
                      !open && currentView === link.id && 'ring-2 ring-blue-500 ring-offset-1'
                    )}
                  >
                    <SidebarLink
                      link={link}
                      open={open}
                      className={cn(currentView === link.id && 'text-blue-600 dark:text-blue-400 font-medium')}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
              <SidebarLink
                open={open}
                link={{
                  label: 'Admin',
                  icon: (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                      A
                    </div>
                  ),
                  onClick: handleLogout,
                }}
              />
              <motion.div
                initial={false}
                animate={{ opacity: open ? 1 : 0, height: open ? 'auto' : 0, marginTop: open ? 8 : 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 } }}
                className="px-3 overflow-hidden"
              >
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors w-full py-2 hover:bg-red-50 rounded-lg px-2"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Logout</span>
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Mobile: Bottom Tab Bar + More Sheet ── */}
      {isMobile && (
        <>
          {/* Fixed bottom tab bar */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex"
            style={{ height: '60px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {BOTTOM_NAV_PRIMARY.map(({ id, label, Icon }) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  onClick={() => { onViewChange(id); setShowMore(false); }}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-gray-50 ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-all duration-150 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-medium leading-none mt-0.5">{label}</span>
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />}
                </button>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setShowMore(v => !v)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-gray-50 ${
                showMore ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <MoreHorizontal className={`h-5 w-5 transition-all duration-150 ${showMore ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium leading-none mt-0.5">More</span>
              {showMore && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          </div>

          {/* More bottom sheet */}
          <AnimatePresence>
            {showMore && (
              <>
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/40 z-[60]"
                  onClick={() => setShowMore(false)}
                />
                <motion.div
                  key="sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                  className="fixed left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl"
                  style={{ bottom: '60px' }}
                >
                  <div className="p-5 pb-6">
                    {/* Drag handle */}
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Modules</p>
                    <div className="grid grid-cols-4 gap-2">
                      {MORE_NAV_ITEMS.map(({ id, label, Icon }) => {
                        const isActive = currentView === id;
                        return (
                          <button
                            key={id}
                            onClick={() => { onViewChange(id); setShowMore(false); }}
                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all active:scale-95 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Footer row */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow">
                          A
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Admin</p>
                          <p className="text-xs text-gray-400">Tally Web</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowMore(false); handleLogout(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold active:bg-red-100"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
};
