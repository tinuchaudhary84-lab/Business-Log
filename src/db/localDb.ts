import { DEFAULT_SETTINGS, getSampleSeedData } from '../data/presets';
import { BusinessSettings, Complaint, Customer } from '../types';

const DB_NAME = 'SmartComplaintRepairDB';
const DB_VERSION = 1;
const STORE_COMPLAINTS = 'complaints';
const STORE_CUSTOMERS = 'customers';
const STORE_SETTINGS = 'settings';
const INITIALIZED_FLAG = 'smart_repair_initialized_v1';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_COMPLAINTS)) {
        db.createObjectStore(STORE_COMPLAINTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
        db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open database'));
    };
  });
  return dbPromise;
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function initializeDatabase(): Promise<{
  complaints: Complaint[];
  customers: Customer[];
  settings: BusinessSettings;
}> {
  let settingsList = await getAllFromStore<BusinessSettings>(STORE_SETTINGS);
  let settings = settingsList[0];

  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    await putInStore(STORE_SETTINGS, settings);
  } else if (
    !settings.customCatalog ||
    !settings.businessTypeOptions ||
    settings.goHomeOnSave === undefined
  ) {
    const { createCatalogFromBusinessType, DEFAULT_BUSINESS_TYPES } = await import('../data/presets');
    settings = {
      ...settings,
      goHomeOnSave: settings.goHomeOnSave !== undefined ? settings.goHomeOnSave : true,
      customCatalog:
        settings.customCatalog ||
        createCatalogFromBusinessType(settings.businessType || 'appliances'),
      businessTypeOptions:
        settings.businessTypeOptions && settings.businessTypeOptions.length > 0
          ? settings.businessTypeOptions
          : DEFAULT_BUSINESS_TYPES,
    };
    await putInStore(STORE_SETTINGS, settings);
  }

  let complaints = await getAllFromStore<Complaint>(STORE_COMPLAINTS);
  let customers = await getAllFromStore<Customer>(STORE_CUSTOMERS);

  const alreadyInitialized = localStorage.getItem(INITIALIZED_FLAG) === 'true';
  if (!alreadyInitialized && complaints.length === 0 && customers.length === 0) {
    const seed = getSampleSeedData();
    for (const cust of seed.customers) {
      await putInStore(STORE_CUSTOMERS, cust);
    }
    for (const cmp of seed.complaints) {
      await putInStore(STORE_COMPLAINTS, cmp);
    }
    complaints = seed.complaints;
    customers = seed.customers;
    localStorage.setItem(INITIALIZED_FLAG, 'true');
  }

  complaints.sort((a, b) => b.complaintDate.localeCompare(a.complaintDate) || b.createdAt.localeCompare(a.createdAt));
  customers.sort((a, b) => a.name.localeCompare(b.name));

  return { complaints, customers, settings };
}

export async function saveComplaint(complaint: Complaint): Promise<void> {
  await putInStore(STORE_COMPLAINTS, complaint);
}

export async function removeComplaint(id: string): Promise<void> {
  await deleteFromStore(STORE_COMPLAINTS, id);
}

export async function saveCustomer(customer: Customer): Promise<void> {
  await putInStore(STORE_CUSTOMERS, customer);
}

export async function removeCustomer(id: string): Promise<void> {
  await deleteFromStore(STORE_CUSTOMERS, id);
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  await putInStore(STORE_SETTINGS, settings);
}

export async function clearAllBusinessData(): Promise<void> {
  await clearStore(STORE_COMPLAINTS);
  await clearStore(STORE_CUSTOMERS);
  localStorage.setItem(INITIALIZED_FLAG, 'true');
}

export async function restoreDemoSampleData(): Promise<{
  complaints: Complaint[];
  customers: Customer[];
}> {
  await clearStore(STORE_COMPLAINTS);
  await clearStore(STORE_CUSTOMERS);
  const seed = getSampleSeedData();
  for (const cust of seed.customers) {
    await putInStore(STORE_CUSTOMERS, cust);
  }
  for (const cmp of seed.complaints) {
    await putInStore(STORE_COMPLAINTS, cmp);
  }
  localStorage.setItem(INITIALIZED_FLAG, 'true');
  return seed;
}

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  settings: BusinessSettings;
  customers: Customer[];
  complaints: Complaint[];
}

export async function createFullBackup(): Promise<BackupPayload> {
  const [complaints, customers, settingsList] = await Promise.all([
    getAllFromStore<Complaint>(STORE_COMPLAINTS),
    getAllFromStore<Customer>(STORE_CUSTOMERS),
    getAllFromStore<BusinessSettings>(STORE_SETTINGS),
  ]);
  return {
    app: 'Smart Complaint & Repairing Manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsList[0] || DEFAULT_SETTINGS,
    customers,
    complaints,
  };
}

export async function restoreFromBackup(payload: BackupPayload): Promise<{
  complaints: Complaint[];
  customers: Customer[];
  settings: BusinessSettings;
}> {
  if (!payload || !Array.isArray(payload.complaints) || !Array.isArray(payload.customers)) {
    throw new Error('Invalid backup structure');
  }
  await clearStore(STORE_COMPLAINTS);
  await clearStore(STORE_CUSTOMERS);

  for (const cust of payload.customers) {
    await putInStore(STORE_CUSTOMERS, cust);
  }
  for (const cmp of payload.complaints) {
    await putInStore(STORE_COMPLAINTS, cmp);
  }
  const restoredSettings: BusinessSettings = {
    ...DEFAULT_SETTINGS,
    ...(payload.settings || {}),
    id: 'app-settings',
  };
  await putInStore(STORE_SETTINGS, restoredSettings);
  localStorage.setItem(INITIALIZED_FLAG, 'true');

  return initializeDatabase();
}

export function formatComplaintNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `${String(seq).padStart(4, '0')}-${year}`;
}

export function getComplaintTotalBill(c: Complaint): number {
  if (c.totalRepairCost > 0) return c.totalRepairCost;
  if (c.sparePartsCost > 0 || c.labourCharges > 0) return c.sparePartsCost + c.labourCharges;
  return c.estimatedCost || 0;
}

export function getComplaintPaidAmount(c: Complaint): number {
  return (c.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function getComplaintPendingAmount(c: Complaint): number {
  const total = getComplaintTotalBill(c);
  const paid = getComplaintPaidAmount(c);
  return Math.max(0, total - paid);
}

export function compressImageFile(file: File, maxDim = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
