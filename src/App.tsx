import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Globe,
  LayoutDashboard,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react';
import { ComplaintDetailModal } from './components/ComplaintDetailModal';
import { ComplaintFormModal } from './components/ComplaintFormModal';
import { ComplaintsView } from './components/ComplaintsView';
import { CustomersView } from './components/CustomersView';
import { DashboardView } from './components/DashboardView';
import { ReceiptModal } from './components/ReceiptModal';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { createCatalogFromBusinessType, DEFAULT_SETTINGS } from './data/presets';
import {
  BackupPayload,
  clearAllBusinessData,
  createFullBackup,
  initializeDatabase,
  removeComplaint,
  removeCustomer,
  restoreFromBackup,
  saveComplaint,
  saveCustomer,
  saveSettings,
} from './db/localDb';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { getTranslation } from './i18n/translations';
import {
  AppTab,
  BusinessSettings,
  BusinessType,
  BusinessTypeOption,
  Complaint,
  CustomCatalog,
  Customer,
} from './types';
import { exportToExcelWorkbook } from './utils/exports';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);

  const [formOpen, setFormOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [receiptComplaint, setReceiptComplaint] = useState<Complaint | null>(null);

  const isOnline = useOnlineStatus();
  const lang = settings.language || 'en';
  const theme = settings.theme || 'light';
  const t = getTranslation(lang);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Register PWA service worker if supported
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          registerSW({ immediate: true });
        })
        .catch(() => {
          // Ignore SW registration error in restricted preview environments
        });
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const data = await initializeDatabase();
      setComplaints(data.complaints);
      setCustomers(data.customers);
      setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveSettings = async (next: BusinessSettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const handleToggleLanguage = async () => {
    const nextLang = lang === 'en' ? 'gu' : 'en';
    await handleSaveSettings({ ...settings, language: nextLang });
  };

  const handleToggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    await handleSaveSettings({ ...settings, theme: nextTheme });
  };

  const handleSelectBusinessType = async (businessType: BusinessType) => {
    await handleSaveSettings({
      ...settings,
      businessType,
      customCatalog: createCatalogFromBusinessType(businessType),
      setupCompleted: true,
    });
  };

  const handleUpdateCatalog = async (customCatalog: CustomCatalog) => {
    await handleSaveSettings({
      ...settings,
      customCatalog,
    });
  };

  const handleUpdateBusinessTypes = async (
    businessTypeOptions: BusinessTypeOption[],
    activeType?: BusinessType
  ) => {
    await handleSaveSettings({
      ...settings,
      businessTypeOptions,
      businessType: activeType || settings.businessType,
    });
  };

  const handleSaveComplaint = async (complaint: Complaint, isNew: boolean) => {
    await saveComplaint(complaint);

    // Ensure customer exists or update customer record
    const existingCust = customers.find(
      (c) =>
        c.id === complaint.customerId ||
        (complaint.mobileNumber && c.mobileNumber === complaint.mobileNumber)
    );
    const now = new Date().toISOString();
    if (!existingCust) {
      const newCust: Customer = {
        id: complaint.customerId,
        name: complaint.customerName,
        mobileNumber: complaint.mobileNumber,
        address: complaint.address,
        createdAt: now,
        updatedAt: now,
      };
      await saveCustomer(newCust);
      setCustomers((prev) =>
        [...prev, newCust].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else if (
      existingCust.name !== complaint.customerName ||
      existingCust.address !== complaint.address
    ) {
      const updatedCust: Customer = {
        ...existingCust,
        name: complaint.customerName,
        address: complaint.address || existingCust.address,
        updatedAt: now,
      };
      await saveCustomer(updatedCust);
      setCustomers((prev) =>
        prev.map((c) => (c.id === updatedCust.id ? updatedCust : c))
      );
    }

    if (isNew) {
      setComplaints((prev) => [complaint, ...prev]);
      await handleSaveSettings({
        ...settings,
        nextSequenceNumber: (settings.nextSequenceNumber || 1) + 1,
      });
    } else {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaint.id ? complaint : c))
      );
      if (selectedComplaint?.id === complaint.id) {
        setSelectedComplaint(complaint);
      }
    }

    if (settings.goHomeOnSave !== false) {
      setSelectedComplaint(null);
      setActiveTab('dashboard');
    }
  };

  const handleUpdateComplaint = async (updated: Complaint) => {
    await saveComplaint(updated);
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setSelectedComplaint(updated);
  };

  const handleDeleteComplaint = async (id: string) => {
    await removeComplaint(id);
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    if (selectedComplaint?.id === id) setSelectedComplaint(null);
  };

  const handleSaveCustomer = async (customer: Customer) => {
    await saveCustomer(customer);
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      const next = exists
        ? prev.map((c) => (c.id === customer.id ? customer : c))
        : [...prev, customer];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    await removeCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const handleBackupJson = async () => {
    const payload = await createFullBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `smart-repair-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJson = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as BackupPayload;
    const restored = await restoreFromBackup(parsed);
    setComplaints(restored.complaints);
    setCustomers(restored.customers);
    setSettings(restored.settings);
  };

  const handleClearAllData = async () => {
    await clearAllBusinessData();
    setComplaints([]);
    setCustomers([]);
    await handleSaveSettings({ ...settings, nextSequenceNumber: 1 });
  };

  const navItems: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'complaints', label: t.nav.complaints, icon: ClipboardList },
    { id: 'customers', label: t.nav.customers, icon: Users },
    { id: 'reports', label: t.nav.reports, icon: BarChart3 },
    { id: 'settings', label: t.nav.settings, icon: SettingsIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 justify-between">
        <div className="space-y-6">
          <div className="px-2 pt-1">
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
              {t.appName}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingComplaint(null);
              setFormOpen(true);
            }}
            className="w-full min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.newComplaint}</span>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[44px] px-3 rounded-xl text-sm font-medium flex items-center gap-3 transition cursor-pointer ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleToggleLanguage}
              className="min-h-[42px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'ગુજરાતી' : 'English'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleTheme}
              className="min-h-[42px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Header (h-12 = 48px) */}
      <header className="no-print lg:hidden sticky top-0 z-30 h-12 px-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
          {t.shortTitle}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
          >
            {lang === 'en' ? 'ગુજ' : 'EN'}
          </button>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingComplaint(null);
              setFormOpen(true);
            }}
            className="min-h-[36px] px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newComplaint}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="no-print flex-1 lg:pl-64 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              complaints={complaints}
              settings={settings}
              lang={lang}
              onNewComplaint={() => {
                setEditingComplaint(null);
                setFormOpen(true);
              }}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              onOpenReceipt={(c) => setReceiptComplaint(c)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onExportExcel={() =>
                exportToExcelWorkbook(complaints, customers, settings.shopName)
              }
              onBackupJson={handleBackupJson}
              onSelectBusinessType={handleSelectBusinessType}
              onUpdateBusinessTypes={handleUpdateBusinessTypes}
            />
          )}

          {activeTab === 'complaints' && (
            <ComplaintsView
              complaints={complaints}
              settings={settings}
              lang={lang}
              onNewComplaint={() => {
                setEditingComplaint(null);
                setFormOpen(true);
              }}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              onOpenReceipt={(c) => setReceiptComplaint(c)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              complaints={complaints}
              settings={settings}
              lang={lang}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              complaints={complaints}
              customers={customers}
              settings={settings}
              lang={lang}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              onOpenReceipt={(c) => setReceiptComplaint(c)}
              onExportExcel={() =>
                exportToExcelWorkbook(complaints, customers, settings.shopName)
              }
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              lang={lang}
              theme={theme}
              onSaveSettings={handleSaveSettings}
              onBackupJson={handleBackupJson}
              onRestoreJson={handleRestoreJson}
              onClearAllData={handleClearAllData}
              onGoHome={() => setActiveTab('dashboard')}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Thumb Navigation (h-14 = 56px) */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 pb-safe bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="no-print fixed bottom-16 lg:bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white px-3 py-1.5 text-xs font-medium shadow-lg border border-slate-700">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.offline.offlineBadge}</span>
        </div>
      )}

      {/* Modals */}
      {formOpen && (
        <ComplaintFormModal
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingComplaint(null);
          }}
          onSave={handleSaveComplaint}
          onUpdateCatalog={handleUpdateCatalog}
          settings={settings}
          customers={customers}
          existingComplaint={editingComplaint}
          lang={lang}
        />
      )}

      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          settings={settings}
          lang={lang}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={handleUpdateComplaint}
          onUpdateCatalog={handleUpdateCatalog}
          onDelete={handleDeleteComplaint}
          onEditBasic={(c) => {
            setEditingComplaint(c);
            setFormOpen(true);
          }}
          onOpenReceipt={(c) => setReceiptComplaint(c)}
          onGoHome={() => {
            setSelectedComplaint(null);
            setActiveTab('dashboard');
          }}
        />
      )}

      {receiptComplaint && (
        <ReceiptModal
          complaint={receiptComplaint}
          settings={settings}
          lang={lang}
          onClose={() => setReceiptComplaint(null)}
        />
      )}
    </div>
  );
}
