export const ROLES = [
  'Super Admin',
  'Admin',
  'Project Manager',
  'Site Engineer',
  'Site Supervisor',
  'Estimator',
  'Purchase Manager',
  'Accountant',
  'Designer',
  'Store Manager',
  'HR Manager',
  'Contractor',
  'Worker',
  'Client',
];

export const EXTERNAL_ROLES = ['Client', 'Contractor', 'Worker'];

const PM = 'Project Manager';
const SE = 'Site Engineer';
const SS = 'Site Supervisor';
const EST = 'Estimator';
const PUR = 'Purchase Manager';
const ACC = 'Accountant';
const DES = 'Designer';
const STO = 'Store Manager';
const HR = 'HR Manager';
const CON = 'Contractor';
const WRK = 'Worker';
const CLI = 'Client';
const STAFF = [PM, SE, SS, EST, PUR, ACC, DES, STO, HR];

// API data access per module. Super Admin has full access; Admin has everything except Users & Roles.
// Which modules appear in each role's sidebar is decided separately by ROLE_MENU below.
export const PERMISSIONS = {
  dashboard: { view: [...STAFF, CON, WRK, CLI], edit: [] },
  pipeline: { view: [PM, EST, ACC, DES], edit: [] },
  users: { view: [], edit: [] },
  leads: { view: [PM, EST, DES], edit: [PM, EST] },
  activities: { view: [PM, EST, DES, ACC], edit: [PM, EST, DES] },
  clients: { view: [PM, EST, ACC, DES, SE], edit: [PM, EST, ACC] },
  siteVisits: { view: [PM, EST, SE, DES], edit: [PM, EST, SE, DES] },
  boq: { view: [PM, EST, ACC], edit: [PM, EST] },
  quotations: { view: [PM, EST, ACC, CLI], edit: [PM, EST] },
  projects: { view: [...STAFF, CON, CLI], edit: [PM] },
  tasks: { view: [PM, SE, SS, DES, CON, WRK], edit: [PM, SE, SS] },
  dailyReports: { view: [PM, SE, SS, ACC, CLI], edit: [PM, SE, SS] },
  tickets: { view: [PM, SE, SS, DES, CLI], edit: [PM, SE, SS, CLI] },
  rooms: { view: [PM, DES, SE, EST, CLI], edit: [PM, DES] },
  documents: { view: [...STAFF, CLI, CON], edit: [...STAFF] },
  materials: { view: [PM, SE, SS, EST, PUR, STO, ACC], edit: [PUR, STO] },
  materialRequests: { view: [PM, SE, SS, PUR, STO], edit: [PM, SE, SS, PUR, STO] },
  stock: { view: [PM, SE, SS, PUR, STO, ACC], edit: [SE, SS, PUR, STO] },
  vendors: { view: [PUR, ACC, PM, STO], edit: [PUR] },
  rfqs: { view: [PUR, PM, ACC], edit: [PUR] },
  purchaseOrders: { view: [PUR, ACC, PM, STO, SE], edit: [PUR, STO] },
  workers: { view: [PM, SE, SS, ACC], edit: [PM, SE, SS] },
  attendance: { view: [PM, SE, SS, ACC], edit: [PM, SE, SS] },
  subcontractors: { view: [PM, SE, ACC, PUR], edit: [PM] },
  workOrders: { view: [PM, SE, ACC, CON], edit: [PM] },
  measurements: { view: [PM, SE, EST, ACC, CON, CLI], edit: [PM, SE] },
  bills: { view: [ACC, PM, PUR, CLI, CON], edit: [ACC] },
  payments: { view: [ACC, PM], edit: [ACC] },
  expenses: { view: [ACC, PM, SE], edit: [ACC, PM, SE] },
  reports: { view: [PM, ACC, PUR, STO, EST], edit: [] },
  employees: { view: [HR, ACC], edit: [HR] },
  staffAttendance: { view: [HR, ACC], edit: [HR] },
  // Every staff member applies for their own leave; the route scope limits what each one sees.
  leaves: { view: [...STAFF], edit: [...STAFF] },
  payroll: { view: [HR, ACC], edit: [HR, ACC] },
  advances: { view: [HR, ACC], edit: [HR, ACC] },
};

/**
 * Sidebar menu per role: the modules each role works with day to day.
 * PERMISSIONS above still decides which data a role can read/write through the API
 * (e.g. an Accountant must look up employees while running payroll), but a module only
 * appears in the sidebar, the search palette and as a page when it is listed here too.
 * Only the Super Admin sees every module.
 */
export const ROLE_MENU = {
  Admin: Object.keys(PERMISSIONS).filter((m) => m !== 'users'),
  [PM]: [
    'dashboard', 'pipeline', 'leads', 'activities', 'clients', 'siteVisits', 'boq', 'quotations',
    'projects', 'tasks', 'dailyReports', 'rooms', 'documents', 'tickets',
    'materialRequests', 'stock', 'purchaseOrders',
    'workers', 'attendance', 'subcontractors', 'workOrders', 'measurements',
    'bills', 'payments', 'expenses', 'reports', 'leaves',
  ],
  [SE]: [
    'dashboard', 'projects', 'tasks', 'dailyReports', 'siteVisits', 'documents', 'tickets',
    'materialRequests', 'stock', 'workers', 'attendance', 'measurements', 'expenses', 'leaves',
  ],
  [SS]: [
    'dashboard', 'projects', 'tasks', 'dailyReports', 'documents', 'tickets',
    'materialRequests', 'stock', 'workers', 'attendance', 'leaves',
  ],
  [EST]: [
    'dashboard', 'pipeline', 'leads', 'activities', 'clients', 'siteVisits', 'boq', 'quotations',
    'projects', 'materials', 'measurements', 'reports', 'leaves',
  ],
  [PUR]: [
    'dashboard', 'projects', 'materialRequests', 'stock', 'purchaseOrders', 'rfqs', 'vendors', 'materials',
    'bills', 'reports', 'leaves',
  ],
  [ACC]: [
    'dashboard', 'clients', 'quotations', 'projects', 'purchaseOrders', 'vendors',
    'bills', 'payments', 'expenses', 'payroll', 'advances', 'reports', 'leaves',
  ],
  [DES]: ['dashboard', 'leads', 'activities', 'clients', 'siteVisits', 'projects', 'tasks', 'rooms', 'documents', 'tickets', 'leaves'],
  [STO]: ['dashboard', 'projects', 'stock', 'materialRequests', 'purchaseOrders', 'vendors', 'materials', 'reports', 'leaves'],
  [HR]: ['dashboard', 'employees', 'staffAttendance', 'leaves', 'payroll', 'advances'],
  [CON]: ['dashboard', 'projects', 'tasks', 'workOrders', 'measurements', 'bills', 'documents'],
  [WRK]: ['dashboard', 'tasks'],
  [CLI]: ['dashboard', 'projects', 'quotations', 'dailyReports', 'rooms', 'documents', 'measurements', 'bills', 'tickets'],
};

export const isSuperAdmin = (role) => role === 'Super Admin';

/** Admin-level data scope (sees every project, every employee's records). */
export const isAdmin = (role) => role === 'Super Admin' || role === 'Admin';

/** HR managers (and admins) see every employee's leave and payroll records. */
export const isHR = (role) => isAdmin(role) || role === HR;

/** API access. Super Admin: everything. Admin: everything except user & role management. */
export const hasPermission = (role, module, action = 'view') => {
  if (isSuperAdmin(role)) return true;
  if (role === 'Admin') return module !== 'users';
  return (PERMISSIONS[module]?.[action] || []).includes(role);
};

/** Whether the module appears in the role's sidebar / search / page routes. */
export const inMenu = (role, module) => {
  if (isSuperAdmin(role)) return true;
  return hasPermission(role, module, 'view') && (ROLE_MENU[role] || []).includes(module);
};

/** Resolved access map for one role, sent to the browser by /auth/me. */
export const accessFor = (role) =>
  Object.fromEntries(
    Object.keys(PERMISSIONS).map((m) => [m, { view: hasPermission(role, m, 'view'), edit: hasPermission(role, m, 'edit'), menu: inMenu(role, m) }]),
  );
