import {
  BusinessSettings,
  BusinessType,
  BusinessTypeOption,
  Complaint,
  CustomCatalog,
  Customer,
} from '../types';

export interface BusinessPreset {
  products: string[];
  accessories: string[];
  faults: string[];
  spareParts: string[];
}

export const DEFAULT_BUSINESS_TYPES: BusinessTypeOption[] = [
  { id: 'electronics', labelEn: 'Electronics Repairing', labelGu: 'ઇલેક્ટ્રોનિક્સ રિપેરીંગ' },
  { id: 'machinery', labelEn: 'Machinery Repairing', labelGu: 'મશીનરી રિપેરીંગ' },
  { id: 'appliances', labelEn: 'AC / Fridge / Washing Machine', labelGu: 'AC / ફ્રિજ / વોશિંગ મશીન' },
  { id: 'electrical', labelEn: 'Electrical Work', labelGu: 'ઇલેક્ટ્રિકલ કામ' },
  { id: 'other', labelEn: 'Other Service Business', labelGu: 'અન્ય ધંધો / સર્વિસ' },
];

export const BUSINESS_PRESETS: Record<string, BusinessPreset> = {
  electronics: {
    products: ['LED TV', 'Laptop', 'Desktop PC', 'Amplifier', 'Home Theater', 'Printer', 'CCTV DVR'],
    accessories: ['Power Adapter', 'Remote', 'HDMI Cable', 'Carry Bag', 'Stand/Base'],
    faults: ['No Power / Dead', 'No Display', 'Sound Distortion', 'Port Damaged', 'Overheating'],
    spareParts: ['Power Supply Board', 'Capacitor Kit', 'HDMI Port', 'Cooling Fan', 'Main IC'],
  },
  machinery: {
    products: ['Submersible Pump', 'Air Compressor', 'Welding Machine', 'Generator', 'Lathe Motor', 'Chaff Cutter'],
    accessories: ['Starter Box', 'Power Cable', 'Pressure Gauge', 'Belt Guard'],
    faults: ['Motor Winding Burnt', 'Bearing Jammed', 'Low Pressure', 'Heavy Vibration', 'Oil Leakage'],
    spareParts: ['Ball Bearing 6205', 'Copper Winding Wire', 'Oil Seal', 'Start Capacitor', 'Carbon Brush Set'],
  },
  appliances: {
    products: ['Split AC', 'Window AC', 'Double Door Fridge', 'Front Load Washing Machine', 'Top Load Washer', 'Microwave Oven'],
    accessories: ['AC Remote', 'Stabilizer', 'Drain Pipe', 'Inlet Hose', 'Shelf Tray'],
    faults: ['No Cooling', 'Water Leakage', 'Drum Not Spinning', 'PCB Error Code', 'Gas Leakage'],
    spareParts: ['R32 Refrigerant Gas', 'Inverter PCB', 'Drain Pump', 'Compressor Relay', 'Thermostat Sensor'],
  },
  electrical: {
    products: ['Inverter UPS', 'Voltage Stabilizer', 'Ceiling Fan', 'Mixer Grinder', 'Induction Cooktop', 'Water Heater'],
    accessories: ['Battery Leads', 'Jar Set', 'Remote', 'Wall Bracket'],
    faults: ['Not Charging', 'Trip / Short Circuit', 'Low Output Voltage', 'Coil Burnt', 'Switch Faulty'],
    spareParts: ['MOSFET Pair', 'Relay 12V', 'Heating Element', 'Fan Capacitor 2.5uF', 'Rotary Switch'],
  },
  other: {
    products: ['Equipment Unit', 'Power Tool', 'Control Panel', 'Commercial Machine', 'Measuring Device'],
    accessories: ['Power Cable', 'Manual', 'Carry Case', 'Adapter'],
    faults: ['Not Starting', 'Intermittent Fault', 'Physical Damage', 'Calibration Needed'],
    spareParts: ['Fuse / MCB', 'Switch Assembly', 'Sensor Module', 'Bearing / Belt'],
  },
};

export function getBusinessTypeOptions(settings?: BusinessSettings): BusinessTypeOption[] {
  if (settings?.businessTypeOptions && settings.businessTypeOptions.length > 0) {
    return settings.businessTypeOptions;
  }
  return DEFAULT_BUSINESS_TYPES;
}

export function createCatalogFromBusinessType(type: BusinessType): CustomCatalog {
  const preset = BUSINESS_PRESETS[type] || BUSINESS_PRESETS.other;
  return {
    products: [...preset.products],
    accessories: [...preset.accessories],
    faults: [...preset.faults],
    spareParts: preset.spareParts.map((name, idx) => ({
      id: `cat-${type}-${idx}`,
      name,
      defaultCost: 0,
    })),
  };
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'app-settings',
  shopName: 'Shreeji Repair & Service Center',
  ownerName: 'Rajesh Patel',
  shopPhone: '9825012345',
  shopAddress: 'Shop 12, Station Road, Anand, Gujarat',
  businessType: 'appliances',
  nextSequenceNumber: 6,
  receiptTerms: '1. 30 days warranty on replaced spare parts only.\n2. Please bring this receipt at the time of delivery.\n3. Unclaimed items after 45 days will not be our responsibility.',
  defaultTechnician: 'Mahesh Mistri',
  language: 'en',
  theme: 'light',
  setupCompleted: false,
  goHomeOnSave: true,
  customCatalog: createCatalogFromBusinessType('appliances'),
  businessTypeOptions: DEFAULT_BUSINESS_TYPES,
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function getSampleSeedData(): { customers: Customer[]; complaints: Complaint[] } {
  const now = new Date().toISOString();
  const customers: Customer[] = [
    {
      id: 'cust-1',
      name: 'Kiranbhai Shah',
      mobileNumber: '9824112233',
      address: '14, Sardar Patel Society, Vidyanagar',
      notes: 'Regular customer',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cust-2',
      name: 'Meenaben Desai',
      mobileNumber: '9879045612',
      address: 'B-202, Shantiniketan Flats, Borsad Chokdi',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cust-3',
      name: 'Harshadbhai Prajapati',
      mobileNumber: '9909977881',
      address: 'GIDC Plot 44, Phase 2',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cust-4',
      name: 'Nilesh Parmar',
      mobileNumber: '9725033445',
      address: 'Near Bus Stand, Gamdi',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const complaints: Complaint[] = [
    {
      id: 'cmp-1',
      complaintNumber: '0001-2026',
      complaintDate: daysAgo(5),
      customerId: 'cust-1',
      customerName: 'Kiranbhai Shah',
      mobileNumber: '9824112233',
      address: '14, Sardar Patel Society, Vidyanagar',
      productName: 'LG 1.5 Ton Split AC',
      modelNumber: 'LS-Q18YNZA',
      serialNumber: 'LG409AC8821',
      complaintDetails: 'Indoor unit blinking E5 error and no cooling.',
      receivedAccessories: 'AC Remote, Wall Plate',
      initialCondition: 'Good exterior, dust on filter',
      estimatedCost: 2800,
      customerRemarks: 'Needs urgent repair before weekend.',
      repairStartDate: daysAgo(4),
      problemFound: 'Outdoor inverter PCB communication capacitor weak and low refrigerant pressure.',
      repairWorkDetails: 'Replaced PCB capacitor & topped up R32 gas with pressure testing.',
      spareParts: [
        { id: 'sp-1', name: 'Inverter PCB Capacitor Kit', quantity: 1, unitCost: 650 },
        { id: 'sp-2', name: 'R32 Refrigerant Top-up', quantity: 1, unitCost: 1200 },
      ],
      sparePartsCost: 1850,
      labourCharges: 900,
      totalRepairCost: 2750,
      technicianName: 'Mahesh Mistri',
      status: 'Completed',
      deliveryDate: '',
      payments: [
        {
          id: 'pay-1',
          amount: 1000,
          date: daysAgo(5),
          method: 'UPI',
          note: 'Advance at booking',
          createdAt: now,
        },
      ],
      history: [
        {
          id: 'hist-1',
          timestamp: now,
          date: daysAgo(5),
          type: 'created',
          title: 'Complaint Registered',
          details: 'Logged 0001-2026 for LG 1.5 Ton Split AC with ₹1,000 UPI advance.',
          actor: 'Rajesh Patel',
        },
        {
          id: 'hist-2',
          timestamp: now,
          date: daysAgo(4),
          type: 'repair',
          title: 'Checking & Repair Completed',
          details: 'Replaced PCB capacitor and refilled R32 gas. Ready for customer pickup.',
          actor: 'Mahesh Mistri',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-2',
      complaintNumber: '0002-2026',
      complaintDate: daysAgo(3),
      customerId: 'cust-2',
      customerName: 'Meenaben Desai',
      mobileNumber: '9879045612',
      address: 'B-202, Shantiniketan Flats, Borsad Chokdi',
      productName: 'Samsung Front Load Washing Machine',
      modelNumber: 'WW70T4020EE',
      serialNumber: 'SM70FL1920',
      complaintDetails: 'Water not draining and loud noise during spin cycle.',
      receivedAccessories: 'Inlet Hose',
      initialCondition: 'Minor side scratch',
      estimatedCost: 1800,
      customerRemarks: 'Call before coming or when ready.',
      repairStartDate: daysAgo(2),
      problemFound: 'Drain pump motor jammed due to coin & worn spider bearing.',
      repairWorkDetails: 'Ordered genuine drain pump motor assembly.',
      spareParts: [
        { id: 'sp-3', name: 'Drain Pump Motor', quantity: 1, unitCost: 1150 },
      ],
      sparePartsCost: 1150,
      labourCharges: 600,
      totalRepairCost: 1750,
      technicianName: 'Mahesh Mistri',
      status: 'Waiting for Spare Parts',
      deliveryDate: '',
      payments: [
        {
          id: 'pay-2',
          amount: 500,
          date: daysAgo(3),
          method: 'Cash',
          note: 'Booking advance',
          createdAt: now,
        },
      ],
      history: [
        {
          id: 'hist-3',
          timestamp: now,
          date: daysAgo(3),
          type: 'created',
          title: 'Complaint Registered',
          details: 'Logged 0002-2026 with ₹500 cash advance.',
          actor: 'Rajesh Patel',
        },
        {
          id: 'hist-4',
          timestamp: now,
          date: daysAgo(2),
          type: 'status',
          title: 'Status: Waiting for Spare Parts',
          details: 'Drain pump motor ordered from supplier.',
          actor: 'Mahesh Mistri',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-3',
      complaintNumber: '0003-2026',
      complaintDate: daysAgo(1),
      customerId: 'cust-3',
      customerName: 'Harshadbhai Prajapati',
      mobileNumber: '9909977881',
      address: 'GIDC Plot 44, Phase 2',
      productName: 'Whirlpool 265L Double Door Fridge',
      modelNumber: 'IF INV CNV 278',
      serialNumber: 'WP265DD994',
      complaintDetails: 'Freezer working slightly, lower compartment completely warm.',
      receivedAccessories: 'Power Cord attached',
      initialCondition: 'Clean condition',
      estimatedCost: 1500,
      customerRemarks: '',
      repairStartDate: daysAgo(1),
      problemFound: 'Bimetal defrost thermostat & damper stuck.',
      repairWorkDetails: 'Testing defrost heater coil and replacing bimetal sensor.',
      spareParts: [
        { id: 'sp-4', name: 'Defrost Bimetal Sensor', quantity: 1, unitCost: 420 },
      ],
      sparePartsCost: 420,
      labourCharges: 550,
      totalRepairCost: 970,
      technicianName: 'Suresh Solanki',
      status: 'Under Repair',
      deliveryDate: '',
      payments: [],
      history: [
        {
          id: 'hist-5',
          timestamp: now,
          date: daysAgo(1),
          type: 'created',
          title: 'Complaint Registered',
          details: 'Logged 0003-2026 for Whirlpool Fridge.',
          actor: 'Rajesh Patel',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-4',
      complaintNumber: '0004-2026',
      complaintDate: daysAgo(0),
      customerId: 'cust-4',
      customerName: 'Nilesh Parmar',
      mobileNumber: '9725033445',
      address: 'Near Bus Stand, Gamdi',
      productName: 'Luminous Zelio 1100 Inverter',
      modelNumber: 'ZELIO-1100',
      serialNumber: 'LUM11Z4421',
      complaintDetails: 'Overload beep continuously even with single fan load.',
      receivedAccessories: 'None',
      initialCondition: 'Dusty casing',
      estimatedCost: 950,
      customerRemarks: 'Evening pickup preferred',
      repairStartDate: '',
      problemFound: '',
      repairWorkDetails: '',
      spareParts: [],
      sparePartsCost: 0,
      labourCharges: 0,
      totalRepairCost: 0,
      technicianName: 'Mahesh Mistri',
      status: 'Pending',
      deliveryDate: '',
      payments: [],
      history: [
        {
          id: 'hist-6',
          timestamp: now,
          date: daysAgo(0),
          type: 'created',
          title: 'Complaint Registered',
          details: 'New complaint registered in queue for checking.',
          actor: 'Rajesh Patel',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-5',
      complaintNumber: '0005-2026',
      complaintDate: daysAgo(8),
      customerId: 'cust-1',
      customerName: 'Kiranbhai Shah',
      mobileNumber: '9824112233',
      address: '14, Sardar Patel Society, Vidyanagar',
      productName: 'IFB 20L Solo Microwave',
      modelNumber: '20PM-MEC2',
      serialNumber: 'IFB20M1002',
      complaintDetails: 'Turntable rotating but food not heating.',
      receivedAccessories: 'Glass Plate, Roller Ring',
      initialCondition: 'Normal wear',
      estimatedCost: 1400,
      customerRemarks: '',
      repairStartDate: daysAgo(7),
      problemFound: 'High voltage diode shorted and magnetron weak.',
      repairWorkDetails: 'Replaced HV diode and fuse, tested heating for 5 minutes.',
      spareParts: [
        { id: 'sp-5', name: 'HV Diode & Fuse', quantity: 1, unitCost: 350 },
      ],
      sparePartsCost: 350,
      labourCharges: 550,
      totalRepairCost: 900,
      technicianName: 'Suresh Solanki',
      status: 'Delivered',
      deliveryDate: daysAgo(6),
      payments: [
        {
          id: 'pay-3',
          amount: 900,
          date: daysAgo(6),
          method: 'UPI',
          note: 'Full payment at delivery',
          createdAt: now,
        },
      ],
      history: [
        {
          id: 'hist-7',
          timestamp: now,
          date: daysAgo(8),
          type: 'created',
          title: 'Complaint Registered',
          details: 'Logged 0005-2026 for IFB Microwave.',
          actor: 'Rajesh Patel',
        },
        {
          id: 'hist-8',
          timestamp: now,
          date: daysAgo(6),
          type: 'delivered',
          title: 'Item Delivered & Paid',
          details: 'Delivered to customer after ₹900 UPI payment.',
          actor: 'Rajesh Patel',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return { customers, complaints };
}
