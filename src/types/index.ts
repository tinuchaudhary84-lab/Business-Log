export type Language = 'en' | 'gu';
export type ThemeMode = 'light' | 'dark';

export type RepairStatus =
  | 'Pending'
  | 'Checking'
  | 'Waiting for Spare Parts'
  | 'Under Repair'
  | 'Completed'
  | 'Delivered';

export type PaymentMethod = 'Cash' | 'UPI' | 'Other';

export type BusinessType = string;

export interface BusinessTypeOption {
  id: string;
  labelEn: string;
  labelGu: string;
}

export interface SparePartItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  type: 'created' | 'status' | 'repair' | 'payment' | 'note' | 'delivered';
  title: string;
  details: string;
  actor?: string;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  complaintDate: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  complaintDetails: string;
  receivedAccessories: string;
  initialCondition: string;
  estimatedCost: number;
  customerRemarks: string;
  productPhoto?: string; // compressed Data URL

  // Repairing Job Management
  repairStartDate: string;
  problemFound: string;
  repairWorkDetails: string;
  spareParts: SparePartItem[];
  sparePartsCost: number;
  labourCharges: number;
  totalRepairCost: number;
  technicianName: string;
  status: RepairStatus;
  deliveryDate: string;

  // Payments
  payments: PaymentRecord[];

  // Permanent History
  history: HistoryEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPart {
  id: string;
  name: string;
  defaultCost: number;
}

export interface CustomCatalog {
  products: string[];
  accessories: string[];
  faults: string[];
  spareParts: CatalogPart[];
}

export interface BusinessSettings {
  id: 'app-settings';
  shopName: string;
  ownerName: string;
  shopPhone: string;
  shopAddress: string;
  businessType: BusinessType;
  complaintPrefix?: string;
  nextSequenceNumber: number;
  receiptTerms: string;
  defaultTechnician: string;
  language: Language;
  theme: ThemeMode;
  setupCompleted: boolean;
  goHomeOnSave?: boolean;
  customCatalog?: CustomCatalog;
  businessTypeOptions?: BusinessTypeOption[];
}

export type AppTab = 'dashboard' | 'complaints' | 'customers' | 'reports' | 'settings';
