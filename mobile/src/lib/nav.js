/**
 * The resource configs and server notifications use the web app's paths (e.g. "/site-visits?create=1&lead=…").
 * toHref() turns those into mobile routes so the same links work in both apps.
 */
export const LIST_PATHS = {
  '/leads': 'leads',
  '/crm/activities': 'activities',
  '/clients': 'clients',
  '/site-visits': 'siteVisits',
  '/boq': 'boq',
  '/quotations': 'quotations',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/site-reports': 'dailyReports',
  '/interior': 'rooms',
  '/documents': 'documents',
  '/crm/tickets': 'tickets',
  '/inventory/materials': 'materials',
  '/inventory/requests': 'materialRequests',
  '/inventory/movements': 'stockTxns',
  '/purchase/vendors': 'vendors',
  '/purchase/rfqs': 'rfqs',
  '/purchase/orders': 'purchaseOrders',
  '/workforce/workers': 'workers',
  '/workforce/register': 'attendanceRegister',
  '/workforce/subcontractors': 'subcontractors',
  '/workforce/work-orders': 'workOrders',
  '/measurements': 'measurements',
  '/finance/bills': 'bills',
  '/finance/payments': 'payments',
  '/finance/expenses': 'expenses',
  '/hr/employees': 'employees',
  '/hr/leaves': 'leaves',
  '/hr/advances': 'advances',
  '/hr/payroll': 'payroll',
  '/users': 'users',
};

const SCREENS = {
  '/': '/',
  '/workflow': '/workflow',
  '/inventory/stock': '/stock',
  '/workforce/attendance': '/attendance',
  '/hr/attendance': '/staff-attendance',
  '/hr/me': '/my-hr',
  '/reports': '/reports',
  '/notifications': '/alerts',
  '/settings': '/profile',
};

const qs = (obj) => {
  const s = Object.entries(obj).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return s ? `?${s}` : '';
};

export function toHref(webPath = '/') {
  const [rawPath, query = ''] = webPath.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const params = Object.fromEntries(new URLSearchParams(query));
  delete params.tab;

  if (SCREENS[path]) return SCREENS[path] + qs(params);

  const slip = path.match(/^\/hr\/payslips\/([^/]+)\/([^/]+)$/);
  if (slip) return `/payslip/${slip[1]}/${slip[2]}`;

  if (LIST_PATHS[path]) {
    const key = LIST_PATHS[path];
    if (params.create) {
      delete params.create;
      return `/r/${key}/form${qs(params)}`;
    }
    return `/r/${key}${qs(params)}`;
  }

  // "<list path>/<id>" → detail screen
  const i = path.lastIndexOf('/');
  const base = path.slice(0, i);
  const id = path.slice(i + 1);
  if (LIST_PATHS[base]) return `/r/${LIST_PATHS[base]}/${id}`;
  return '/';
}

/** Mobile list / detail / form hrefs */
export const listHref = (key, filters = {}) => `/r/${key}${qs(filters)}`;
export const detailHref = (key, id) => `/r/${key}/${id}`;
export const formHref = (key, params = {}) => `/r/${key}/form${qs(params)}`;
