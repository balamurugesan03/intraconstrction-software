/** Same module groups as the web sidebar (client/src/config/nav.js). `to` is the web path; see lib/nav.js */
export const MENU = [
  {
    group: 'Overview',
    items: [
      { to: '/workflow', label: 'Business Flow', icon: 'git-network-outline', module: 'pipeline' },
    ],
  },
  {
    group: 'Sales & CRM',
    items: [
      { to: '/leads', label: 'Leads', icon: 'locate-outline', module: 'leads' },
      { to: '/crm/activities', label: 'Follow-ups', icon: 'chatbubbles-outline', module: 'activities' },
      { to: '/clients', label: 'Clients', icon: 'people-outline', module: 'clients' },
      { to: '/site-visits', label: 'Site Visits', icon: 'location-outline', module: 'siteVisits' },
      { to: '/boq', label: 'BOQ / Estimation', icon: 'calculator-outline', module: 'boq' },
      { to: '/quotations', label: 'Quotations', icon: 'document-text-outline', module: 'quotations' },
    ],
  },
  {
    group: 'Projects',
    items: [
      { to: '/projects', label: 'Projects', icon: 'folder-open-outline', module: 'projects' },
      { to: '/tasks', label: 'Tasks & Work Plan', icon: 'checkbox-outline', module: 'tasks' },
      { to: '/site-reports', label: 'Daily Site Reports', icon: 'clipboard-outline', module: 'dailyReports' },
      { to: '/interior', label: 'Interior Design', icon: 'bed-outline', module: 'rooms' },
      { to: '/documents', label: 'Documents & Photos', icon: 'images-outline', module: 'documents' },
      { to: '/crm/tickets', label: 'Service & Complaints', icon: 'help-buoy-outline', module: 'tickets' },
    ],
  },
  {
    group: 'Materials & Purchase',
    items: [
      { to: '/inventory/stock', label: 'Stock', icon: 'layers-outline', module: 'stock' },
      { to: '/inventory/movements', label: 'Stock Movements', icon: 'swap-horizontal-outline', module: 'stock' },
      { to: '/inventory/requests', label: 'Material Requests', icon: 'add-circle-outline', module: 'materialRequests' },
      { to: '/purchase/orders', label: 'Purchase Orders', icon: 'cart-outline', module: 'purchaseOrders' },
      { to: '/purchase/rfqs', label: 'RFQ', icon: 'paper-plane-outline', module: 'rfqs' },
      { to: '/purchase/vendors', label: 'Vendors', icon: 'storefront-outline', module: 'vendors' },
      { to: '/inventory/materials', label: 'Material Master', icon: 'cube-outline', module: 'materials' },
    ],
  },
  {
    group: 'Workforce',
    items: [
      { to: '/workforce/attendance', label: 'Mark Attendance', icon: 'calendar-outline', module: 'attendance' },
      { to: '/workforce/register', label: 'Attendance Register', icon: 'list-outline', module: 'attendance' },
      { to: '/workforce/workers', label: 'Workers', icon: 'hammer-outline', module: 'workers' },
      { to: '/workforce/subcontractors', label: 'Subcontractors', icon: 'briefcase-outline', module: 'subcontractors' },
      { to: '/workforce/work-orders', label: 'Work Orders', icon: 'document-attach-outline', module: 'workOrders' },
      { to: '/measurements', label: 'Measurement Book', icon: 'resize-outline', module: 'measurements' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/finance/bills', label: 'Bills & Invoices', icon: 'receipt-outline', module: 'bills' },
      { to: '/finance/payments', label: 'Payments', icon: 'wallet-outline', module: 'payments' },
      { to: '/finance/expenses', label: 'Expenses', icon: 'cash-outline', module: 'expenses' },
    ],
  },
  {
    group: 'HR & Payroll',
    items: [
      { to: '/hr/me', label: 'My HR', icon: 'person-circle-outline', module: 'leaves' },
      { to: '/hr/employees', label: 'Employees', icon: 'id-card-outline', module: 'employees' },
      { to: '/hr/attendance', label: 'Staff Attendance', icon: 'time-outline', module: 'staffAttendance' },
      { to: '/hr/leaves', label: 'Leave', icon: 'calendar-clear-outline', module: 'leaves' },
      { to: '/hr/payroll', label: 'Payroll', icon: 'document-text-outline', module: 'payroll' },
      { to: '/hr/advances', label: 'Salary Advances', icon: 'cash-outline', module: 'advances' },
    ],
  },
  {
    group: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: 'bar-chart-outline', module: 'reports' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/users', label: 'Users & Roles', icon: 'people-circle-outline', module: 'users' },
    ],
  },
];
