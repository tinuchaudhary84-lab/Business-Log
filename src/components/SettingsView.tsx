import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Download,
  MessageCircle,
  Moon,
  Plus,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  createCatalogFromBusinessType,
  getBusinessTypeOptions,
} from '../data/presets';
import { formatComplaintNumber } from '../db/localDb';
import { getBusinessTypeLabel, getTranslation } from '../i18n/translations';
import {
  BusinessSettings,
  BusinessType,
  BusinessTypeOption,
  CatalogPart,
  CustomCatalog,
  Language,
  ThemeMode,
} from '../types';
import { normalizePhoneForWhatsApp } from '../utils/exports';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  settings: BusinessSettings;
  lang: Language;
  theme: ThemeMode;
  onSaveSettings: (next: BusinessSettings) => Promise<void>;
  onBackupJson: () => Promise<void>;
  onRestoreJson: (file: File) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onGoHome: () => void;
}

type CatalogTab = 'spareParts' | 'products' | 'faults';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  lang,
  theme,
  onSaveSettings,
  onBackupJson,
  onRestoreJson,
  onClearAllData,
  onGoHome,
}) => {
  const t = getTranslation(lang);

  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [businessType, setBusinessType] = useState<BusinessType>(settings.businessType);
  const [nextSequenceNumber, setNextSequenceNumber] = useState(
    String(settings.nextSequenceNumber)
  );
  const [defaultTechnician, setDefaultTechnician] = useState(
    settings.defaultTechnician
  );
  const [receiptTermsList, setReceiptTermsList] = useState<string[]>(() =>
    (settings.receiptTerms || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const [newReceiptTerm, setNewReceiptTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Catalog Manager State
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('spareParts');
  const [newItemName, setNewItemName] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [newBusinessTypeName, setNewBusinessTypeName] = useState('');
  const [shareWhatsAppPhone, setShareWhatsAppPhone] = useState('');
  const [copiedAppLink, setCopiedAppLink] = useState(false);

  const businessOptions = getBusinessTypeOptions(settings);
  const catalog: CustomCatalog =
    settings.customCatalog || createCatalogFromBusinessType(settings.businessType);

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTerms = [...receiptTermsList];
    if (newReceiptTerm.trim()) {
      finalTerms.push(newReceiptTerm.trim());
      setReceiptTermsList(finalTerms);
      setNewReceiptTerm('');
    }
    const cleanedTerms = finalTerms.map((s) => s.trim()).filter(Boolean).join('\n');
    await onSaveSettings({
      ...settings,
      shopName: shopName.trim() || settings.shopName,
      ownerName: ownerName.trim(),
      shopPhone: shopPhone.trim(),
      shopAddress: shopAddress.trim(),
      businessType,
      nextSequenceNumber: Math.max(1, Number(nextSequenceNumber) || 1),
      defaultTechnician: defaultTechnician.trim(),
      receiptTerms: cleanedTerms,
      setupCompleted: true,
    });
    if (settings.goHomeOnSave !== false) {
      onGoHome();
      return;
    }
    showToast(t.settings.savedSuccess);
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    if (catalogTab === 'spareParts') {
      const priceNum = Math.max(0, Number(newPartPrice) || 0);
      const newPart: CatalogPart = {
        id: `cat-part-${Date.now()}`,
        name: trimmed,
        defaultCost: priceNum,
      };
      await onSaveSettings({
        ...settings,
        customCatalog: {
          ...catalog,
          spareParts: [...catalog.spareParts, newPart],
        },
      });
    } else {
      const existing = catalog[catalogTab];
      if (!existing.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
        await onSaveSettings({
          ...settings,
          customCatalog: {
            ...catalog,
            [catalogTab]: [...existing, trimmed],
          },
        });
      }
    }
    setNewItemName('');
    setNewPartPrice('');
  };

  const handleRemoveCatalogPart = async (partId: string) => {
    await onSaveSettings({
      ...settings,
      customCatalog: {
        ...catalog,
        spareParts: catalog.spareParts.filter((p) => p.id !== partId),
      },
    });
  };

  const handleRemoveCatalogString = async (
    key: 'products' | 'faults',
    item: string
  ) => {
    await onSaveSettings({
      ...settings,
      customCatalog: {
        ...catalog,
        [key]: catalog[key].filter((x) => x !== item),
      },
    });
  };

  const handleAddReceiptTerm = async () => {
    const trimmed = newReceiptTerm.trim();
    if (!trimmed) return;
    const nextList = [...receiptTermsList, trimmed];
    setReceiptTermsList(nextList);
    setNewReceiptTerm('');
    await onSaveSettings({
      ...settings,
      receiptTerms: nextList.join('\n'),
    });
    showToast(t.settings.savedSuccess);
  };

  const handleUpdateReceiptTerm = (idx: number, val: string) => {
    setReceiptTermsList((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleRemoveReceiptTerm = async (idx: number) => {
    const nextList = receiptTermsList.filter((_, i) => i !== idx);
    setReceiptTermsList(nextList);
    await onSaveSettings({
      ...settings,
      receiptTerms: nextList.map((s) => s.trim()).filter(Boolean).join('\n'),
    });
    showToast(t.settings.savedSuccess);
  };

  const handleAddBusinessType = async () => {
    const trimmed = newBusinessTypeName.trim();
    if (!trimmed) return;
    const newOption: BusinessTypeOption = {
      id: `custom-${Date.now()}`,
      labelEn: trimmed,
      labelGu: trimmed,
    };
    const nextOptions = [...businessOptions, newOption];
    setBusinessType(newOption.id);
    setNewBusinessTypeName('');
    await onSaveSettings({
      ...settings,
      businessType: newOption.id,
      businessTypeOptions: nextOptions,
      setupCompleted: true,
    });
    showToast(t.settings.savedSuccess);
  };

  const handleRemoveBusinessType = async (idToRemove: string) => {
    if (businessOptions.length <= 1) return;
    const nextOptions = businessOptions.filter((o) => o.id !== idToRemove);
    const nextActive =
      businessType === idToRemove ? nextOptions[0].id : businessType;
    setBusinessType(nextActive);
    await onSaveSettings({
      ...settings,
      businessType: nextActive,
      businessTypeOptions: nextOptions,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onRestoreJson(file);
      showToast(t.settings.restoreSuccess);
    } catch {
      showToast(t.settings.restoreError);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.settings.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.settings.subtitle}
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Language & Theme */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t.settings.preferences}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              {t.settings.languageLabel}
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onSaveSettings({ ...settings, language: 'en' })}
                className={`min-h-[42px] rounded-lg text-xs font-semibold transition cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onSaveSettings({ ...settings, language: 'gu' })}
                className={`min-h-[42px] rounded-lg text-xs font-semibold transition cursor-pointer ${
                  lang === 'gu'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              {t.settings.themeLabel}
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onSaveSettings({ ...settings, theme: 'light' })}
                className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t.settings.lightMode}</span>
              </button>
              <button
                type="button"
                onClick={() => onSaveSettings({ ...settings, theme: 'dark' })}
                className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t.settings.darkMode}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.settings.goHomeOnSaveLabel}
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => onSaveSettings({ ...settings, goHomeOnSave: true })}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                settings.goHomeOnSave !== false
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.settings.onLabel}
            </button>
            <button
              type="button"
              onClick={() => onSaveSettings({ ...settings, goHomeOnSave: false })}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                settings.goHomeOnSave === false
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.settings.offLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Parts & Quick Items Manager (Add & Remove) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.catalogTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.settings.catalogDesc}
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(
            [
              { id: 'spareParts', label: t.settings.catalogParts },
              { id: 'products', label: t.settings.catalogProducts },
              { id: 'faults', label: t.settings.catalogFaults },
            ] as { id: CatalogTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCatalogTab(tab.id)}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                catalogTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddCatalogItem} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={t.settings.addItemPlaceholder}
            className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            required
          />
          {catalogTab === 'spareParts' && (
            <input
              type="number"
              min="0"
              value={newPartPrice}
              onChange={(e) => setNewPartPrice(e.target.value)}
              placeholder={t.settings.partPricePlaceholder}
              className="sm:w-36 min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
            />
          )}
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.settings.addItemBtn}</span>
          </button>
        </form>

        {/* Item List with Remove */}
        <div className="flex flex-wrap gap-2">
          {catalogTab === 'spareParts'
            ? catalog.spareParts.map((part) => (
                <div
                  key={part.id}
                  className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {part.name}
                  </span>
                  {part.defaultCost > 0 && (
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      ₹{part.defaultCost}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCatalogPart(part.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                    title={t.settings.removeItem}
                    aria-label={t.settings.removeItem}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            : catalog[catalogTab].map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCatalogString(catalogTab, item)}
                    className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                    title={t.settings.removeItem}
                    aria-label={t.settings.removeItem}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
        </div>
      </div>

      {/* Workshop Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t.settings.shopProfile}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.shopName}
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.businessType}
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {businessOptions.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {lang === 'gu' ? bt.labelGu : bt.labelEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.ownerName}
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.shopPhone}
            </label>
            <input
              type="tel"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
            />
          </div>
        </div>

        {/* Add / Remove Business Types */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.settings.manageBusinessTypes}
          </div>
          <div className="flex flex-wrap gap-2">
            {businessOptions.map((bt) => {
              const active = businessType === bt.id;
              return (
                <div
                  key={bt.id}
                  className={`inline-flex items-center rounded-lg border text-xs overflow-hidden ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setBusinessType(bt.id)}
                    className="px-3 py-1.5 font-medium cursor-pointer"
                  >
                    {lang === 'gu' ? bt.labelGu : bt.labelEn}
                  </button>
                  {businessOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBusinessType(bt.id)}
                      className={`px-1.5 py-1.5 cursor-pointer ${
                        active
                          ? 'hover:bg-blue-700 text-white'
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                      }`}
                      title={t.settings.removeItem}
                      aria-label={t.settings.removeItem}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newBusinessTypeName}
              onChange={(e) => setNewBusinessTypeName(e.target.value)}
              placeholder={t.settings.newBusinessTypePlaceholder}
              className="flex-1 min-h-[40px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <button
              type="button"
              onClick={handleAddBusinessType}
              className="min-h-[40px] px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.settings.addItemBtn}</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t.settings.shopAddress}
          </label>
          <input
            type="text"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.nextSeq}
            </label>
            <input
              type="number"
              min="1"
              value={nextSequenceNumber}
              onChange={(e) => setNextSequenceNumber(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
            />
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              {formatComplaintNumber(Math.max(1, Number(nextSequenceNumber) || 1))}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.settings.defaultTech}
            </label>
            <input
              type="text"
              value={defaultTechnician}
              onChange={(e) => setDefaultTechnician(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            {t.settings.receiptTerms}
          </label>
          {receiptTermsList.length > 0 && (
            <div className="space-y-2">
              {receiptTermsList.map((term, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => handleUpdateReceiptTerm(idx, e.target.value)}
                    className="flex-1 min-h-[40px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveReceiptTerm(idx)}
                    className="min-h-[40px] px-3 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                    title={t.settings.removeItem}
                    aria-label={t.settings.removeItem}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.settings.removeItem}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newReceiptTerm}
              onChange={(e) => setNewReceiptTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddReceiptTerm();
                }
              }}
              placeholder={t.settings.newTermPlaceholder}
              className="flex-1 min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
            <button
              type="button"
              onClick={handleAddReceiptTerm}
              className="min-h-[42px] px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t.settings.addItemBtn}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
          >
            {t.actions.save}
          </button>
        </div>
      </form>

      {/* Offline Backup & Data Management */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t.settings.dataManagement}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t.settings.backupDesc}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onBackupJson}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.actions.backupData}</span>
          </button>

          <label className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>{t.actions.restoreData}</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="min-h-[44px] px-4 rounded-xl border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.settings.clearAllData}</span>
          </button>
        </div>

        {confirmClearOpen && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 space-y-3">
            <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-medium">
              {t.settings.confirmClear}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onClearAllData();
                  setConfirmClearOpen(false);
                }}
                className="min-h-[40px] px-4 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
              >
                {t.actions.delete}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="min-h-[40px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
              >
                {t.actions.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* App Download & WhatsApp Send Link (Bottom of Settings) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {lang === 'gu'
                ? 'એપ ડાઉનલોડ અને WhatsApp લિંક શેર'
                : 'Download App & Send Link on WhatsApp'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'gu'
                ? 'એપની લિંક WhatsApp પર મોકલો અથવા મોબાઇલમાં હોમ સ્ક્રીન પર એપ ડાઉનલોડ / ઇન્સ્ટોલ કરો.'
                : 'Send the app link via WhatsApp or download and install the app directly on your device.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {lang === 'gu'
                ? 'WhatsApp મોબાઇલ નંબર (વૈકલ્પિક)'
                : 'WhatsApp Mobile Number (Optional)'}
            </label>
            <input
              type="tel"
              value={shareWhatsAppPhone}
              onChange={(e) => setShareWhatsAppPhone(e.target.value)}
              placeholder={lang === 'gu' ? 'દા.ત. 9825012345 (ખાલી રાખો તો લિસ્ટ ખુલશે)' : 'e.g. 9825012345 (blank to pick contact)'}
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {lang === 'gu' ? 'એપ લિંક' : 'App Link'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.origin : ''}
                className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-600 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopiedAppLink(true);
                    setTimeout(() => setCopiedAppLink(false), 2000);
                  } catch {
                    setCopiedAppLink(false);
                  }
                }}
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedAppLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'gu' ? 'કોપી થયું' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{lang === 'gu' ? 'કોપી' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {(() => {
            const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const phone = normalizePhoneForWhatsApp(shareWhatsAppPhone);
            const msg =
              lang === 'gu'
                ? `*${settings.shopName || t.appName}*\nમોબાઇલમાં એપ ડાઉનલોડ / ઇન્સ્ટોલ કરવા માટે નીચેની લિંક Chrome બ્રાઉઝરમાં ખોલો:\n${appUrl}`
                : `*${settings.shopName || t.appName}*\nOpen this link in Chrome / Safari to download & install the app:\n${appUrl}`;
            const waHref = phone
              ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
              : `https://wa.me/?text=${encodeURIComponent(msg)}`;
            return (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{t.actions.sendWhatsAppLink}</span>
              </a>
            );
          })()}

          <div className="flex-1">
            <PWAInstallButton label={t.actions.installApp} lang={lang} showInstalledBadge />
          </div>
        </div>
      </div>
    </div>
  );
};
