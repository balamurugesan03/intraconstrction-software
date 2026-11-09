/**
 * Mobile version of client/src/config/resources.jsx — same fields, filters and workflow actions,
 * but list rows are described by card(r) instead of table columns.
 *
 *  card(r)            → { title, sub, status, amount, amountTone, meta: [], progress, image, badge }
 *  rowActions(r, ctx) → workflow actions (same as web; ctx.nav takes web paths)
 *  detailActions      → extra actions only on the detail screen
 *  related(r, ctx)    → links to filtered lists on the detail screen
 */
import * as C from '../lib/constants';
import { money, number, fmtDate, monthLabel, overdue, refName } from '../lib/format';

export { monthLabel };

/* ---------------- shared ref definitions ---------------- */
const codeName = (o) => (o ? `${o.code ? `${o.code} · ` : ''}${o.name || o.title || ''}` : '');
export const REF = {
  project: { module: 'projects', endpoint: '/projects', label: codeName, sub: (o) => o.client?.name },
  client: { module: 'clients', endpoint: '/clients', label: codeName, sub: (o) => o.phone },
  lead: { module: 'leads', endpoint: '/leads', label: codeName, sub: (o) => `${o.status} · ${o.phone}` },
  siteVisit: { module: 'siteVisits', endpoint: '/site-visits', label: (o) => `${o.code} · ${fmtDate(o.date)}`, sub: (o) => o.client?.name || o.lead?.name },
  boq: { module: 'boq', endpoint: '/boq', label: codeName },
  material: { module: 'materials', endpoint: '/materials', label: (o) => o.name, sub: (o) => `${o.code} · ${o.category} · ₹${o.rate}/${o.unit}` },
  vendor: { module: 'vendors', endpoint: '/vendors', label: codeName, sub: (o) => o.category },
  subcontractor: { module: 'subcontractors', endpoint: '/subcontractors', label: (o) => `${o.code} · ${o.company || o.name}`, sub: (o) => o.trade },
  worker: { module: 'workers', endpoint: '/workers', label: codeName, sub: (o) => `${o.trade} · ₹${o.dailyWage}/day` },
  workOrder: { module: 'workOrders', endpoint: '/work-orders', label: codeName, sub: (o) => o.subcontractor?.name },
  materialRequest: { module: 'materialRequests', endpoint: '/material-requests', label: (o) => o.code },
  staff: { endpoint: '/users/lookup', lookup: true, label: (o) => o.name, sub: (o) => o.role },
  task: { module: 'tasks', endpoint: '/tasks', label: codeName },
  room: { module: 'rooms', endpoint: '/rooms', label: (o) => o.name },
  quotation: { module: 'quotations', endpoint: '/quotations', label: (o) => `${o.code} v${o.version} · ${o.title}`, sub: (o) => o.client?.name },
  employee: { module: 'employees', endpoint: '/employees', label: codeName, sub: (o) => [o.designation, o.department].filter(Boolean).join(' · ') },
};

const projectField = (extra = {}) => ({ name: 'project', label: 'Project', type: 'ref', ref: REF.project, required: true, ...extra });
const go = (ctx, url, body, success) => ctx.action.mutate({ url, body, success });
const pname = (r) => (r.project ? r.project.name : null);
const party = (r) => r.client?.name || r.vendor?.name || r.subcontractor?.name || r.worker?.name || r.employee?.name;

const lineTotal = (r) => (Number(r.quantity) || 0) * (Number(r.rate) || 0);
const itemsBase = (extra = []) => [
  { name: 'description', label: 'Description', required: true },
  ...extra,
  { name: 'unit', label: 'Unit', type: 'select', options: C.UNITS, default: 'Sqft', half: true },
  { name: 'quantity', label: 'Qty', type: 'number', half: true },
  { name: 'rate', label: 'Rate', type: 'number', half: true },
  { name: 'amount', label: 'Amount', computed: lineTotal, half: true },
];
const gstSummary = (v, extra = {}) => {
  const sub = (v.items || []).reduce((s, r) => s + lineTotal(r), 0);
  const disc = (sub * (Number(v.discountPercent) || 0)) / 100;
  const taxable = sub - disc;
  const gst = (taxable * (Number(v.gstPercent) || 0)) / 100;
  const ret = (sub * (Number(v.retentionPercent) || 0)) / 100;
  return [
    { label: 'Subtotal', value: money(sub, true) },
    extra.discount && { label: `Discount (${v.discountPercent || 0}%)`, value: `- ${money(disc, true)}` },
    { label: `GST (${v.gstPercent || 0}%)`, value: money(gst, true) },
    extra.retention && Number(v.retentionPercent) > 0 && { label: `Retention (${v.retentionPercent}%)`, value: `- ${money(ret, true)}` },
    { label: 'Grand Total', value: money(taxable + gst - ret, true), strong: true },
  ].filter(Boolean);
};

/* =====================================================================
 * SALES & CRM
 * ===================================================================== */
export const leads = {
  key: 'leads', endpoint: '/leads', module: 'leads', icon: 'locate-outline',
  title: 'Leads', singular: 'Lead', searchPlaceholder: 'Search name, phone, location…',
  emptyText: 'Add your first enquiry to start the Lead → Project flow.',
  card: (r) => ({
    title: r.name, sub: [r.code, r.phone, r.location].filter(Boolean).join(' · '), status: r.status, amount: r.budget && money(r.budget),
    meta: [r.projectType, r.source, r.assignedTo?.name, r.followUpDate && `${overdue(r.followUpDate) && !['Won', 'Lost'].includes(r.status) ? '⚠ ' : ''}Follow-up ${fmtDate(r.followUpDate, 'dd MMM')}`],
  }),
  filters: [
    { name: 'status', label: 'Status', options: C.LEAD_STATUS },
    { name: 'projectType', label: 'Type', options: C.PROJECT_TYPES },
    { name: 'source', label: 'Source', options: C.LEAD_SOURCES },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, section: 'Contact' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, section: 'Contact' },
    { name: 'email', label: 'Email', type: 'email', section: 'Contact' },
    { name: 'company', label: 'Company', section: 'Contact' },
    { name: 'projectType', label: 'Project type', type: 'select', options: C.PROJECT_TYPES, required: true, default: 'Interior', section: 'Requirement' },
    { name: 'budget', label: 'Budget', type: 'currency', section: 'Requirement' },
    { name: 'location', label: 'Site location', section: 'Requirement' },
    { name: 'requirement', label: 'Requirement', type: 'textarea', section: 'Requirement' },
    { name: 'source', label: 'Source', type: 'select', options: C.LEAD_SOURCES, default: 'Walk-in', section: 'Follow-up' },
    { name: 'status', label: 'Status', type: 'select', options: C.LEAD_STATUS, default: 'New', section: 'Follow-up' },
    { name: 'assignedTo', label: 'Assigned to', type: 'ref', ref: REF.staff, section: 'Follow-up' },
    { name: 'followUpDate', label: 'Next follow-up', type: 'date', section: 'Follow-up' },
    { name: 'lostReason', label: 'Reason lost', placeholder: 'Price, timeline, went with competitor…', showIf: (v) => v.status === 'Lost', section: 'Follow-up' },
    { name: 'notes', label: 'Notes', type: 'textarea', section: 'Follow-up' },
  ],
  rowActions: (r, ctx) => [
    r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) },
    ctx.can('activities', 'edit') && !['Won', 'Lost'].includes(r.status) && { label: 'Log call / follow-up', icon: 'chatbubbles-outline', onClick: () => ctx.nav(`/crm/activities?create=1&lead=${r._id}`) },
    !r.client && ctx.can('clients', 'edit') && { label: 'Convert to client', icon: 'person-add-outline', onClick: () => go(ctx, `/leads/${r._id}/convert`, null, 'Client created from lead') },
    ctx.can('siteVisits', 'edit') && { label: 'Schedule site visit', icon: 'calendar-outline', onClick: () => ctx.nav(`/site-visits?create=1&lead=${r._id}`) },
    r.client && ctx.can('boq', 'edit') && { label: 'Prepare BOQ', icon: 'calculator-outline', onClick: () => ctx.nav(`/boq?create=1&lead=${r._id}&client=${r.client._id || r.client}&projectType=${r.projectType}`) },
    !['Won', 'Lost'].includes(r.status) && ctx.can('leads', 'edit') && { label: 'Mark as lost', icon: 'close-circle-outline', danger: true, onClick: () => ctx.action.mutate({ url: `/leads/${r._id}`, method: 'put', body: { status: 'Lost' }, success: 'Lead marked lost' }) },
  ],
  related: (r) => [
    { label: 'Follow-ups', path: `/crm/activities?lead=${r._id}`, module: 'activities' },
    r.client && { label: 'Client 360°', path: `/clients/${r.client._id || r.client}`, module: 'clients' },
  ],
};

export const clients = {
  key: 'clients', endpoint: '/clients', module: 'clients', icon: 'people-outline',
  title: 'Clients', singular: 'Client', searchPlaceholder: 'Search name, phone, city…',
  card: (r) => ({ title: r.name, sub: [r.code, r.company].filter(Boolean).join(' · '), meta: [r.phone, r.city, r.email] }),
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'company', label: 'Company' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'city', label: 'City' },
    { name: 'gstin', label: 'GSTIN' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [
    r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) },
    ctx.can('activities', 'edit') && { label: 'Log call / follow-up', icon: 'chatbubbles-outline', onClick: () => ctx.nav(`/crm/activities?create=1&client=${r._id}`) },
    ctx.can('siteVisits', 'edit') && { label: 'Schedule site visit', icon: 'calendar-outline', onClick: () => ctx.nav(`/site-visits?create=1&client=${r._id}`) },
    ctx.can('boq', 'edit') && { label: 'Prepare BOQ', icon: 'calculator-outline', onClick: () => ctx.nav(`/boq?create=1&client=${r._id}`) },
  ],
  related: (r) => [
    { label: 'Projects', path: `/projects?client=${r._id}`, module: 'projects' },
    { label: 'Quotations', path: `/quotations?client=${r._id}`, module: 'quotations' },
    { label: 'Follow-ups', path: `/crm/activities?client=${r._id}`, module: 'activities' },
    { label: 'Site visits', path: `/site-visits?client=${r._id}`, module: 'siteVisits' },
    { label: 'Bills & invoices', path: `/finance/bills?client=${r._id}`, module: 'bills' },
    { label: 'Payments', path: `/finance/payments?client=${r._id}`, module: 'payments' },
    { label: 'Service tickets', path: `/crm/tickets?client=${r._id}`, module: 'tickets' },
  ],
};

export const siteVisits = {
  key: 'siteVisits', endpoint: '/site-visits', module: 'siteVisits', icon: 'location-outline',
  title: 'Site Visits', singular: 'Site Visit',
  card: (r) => ({ title: r.client?.name || r.lead?.name || '—', sub: [r.code, fmtDate(r.date)].join(' · '), status: r.status, meta: [r.address, r.visitedBy?.name] }),
  filters: [{ name: 'status', label: 'Status', options: C.SITE_VISIT_STATUS }, { name: 'client', label: 'Client', ref: REF.client, hidden: true }],
  fields: [
    { name: 'lead', label: 'Lead', type: 'ref', ref: REF.lead },
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, help: 'Auto-filled from the lead once converted' },
    { name: 'date', label: 'Visit date', type: 'date', required: true },
    { name: 'visitedBy', label: 'Visited by', type: 'ref', ref: REF.staff },
    { name: 'address', label: 'Site address' },
    { name: 'status', label: 'Status', type: 'select', options: C.SITE_VISIT_STATUS, default: 'Scheduled' },
    { name: 'requirement', label: 'Client requirement', type: 'textarea' },
    { name: 'observations', label: 'Site observations', type: 'textarea' },
    { name: 'measurements', label: 'Measurements', type: 'textarea' },
    { name: 'photos', label: 'Site photos', type: 'files' },
  ],
  rowActions: (r, ctx) => [
    ctx.can('boq', 'edit') && { label: 'Prepare BOQ / estimate', icon: 'calculator-outline', onClick: () => ctx.nav(`/boq?create=1&siteVisit=${r._id}${r.client ? `&client=${r.client._id}` : ''}${r.lead ? `&lead=${r.lead._id}` : ''}`) },
  ],
};

const boqItemCost = (r) => (Number(r.quantity) || 0) * ((Number(r.materialRate) || 0) + (Number(r.labourRate) || 0));
export const boq = {
  key: 'boq', endpoint: '/boq', module: 'boq', icon: 'calculator-outline',
  title: 'BOQ / Estimation', singular: 'BOQ',
  card: (r) => ({ title: r.title, sub: [r.code, r.client?.name].filter(Boolean).join(' · '), status: r.status, amount: money(r.total), meta: [r.projectType, `Cost ${money(r.costTotal)}`, `Margin ${r.profitMargin || 0}%`] }),
  filters: [{ name: 'status', label: 'Status', options: C.BOQ_STATUS }, { name: 'projectType', label: 'Type', options: C.PROJECT_TYPES }],
  fields: [
    { name: 'title', label: 'Estimate title', required: true },
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client },
    { name: 'lead', label: 'Lead', type: 'ref', ref: REF.lead },
    { name: 'siteVisit', label: 'Site visit', type: 'ref', ref: REF.siteVisit },
    { name: 'projectType', label: 'Project type', type: 'select', options: C.PROJECT_TYPES, default: 'Interior' },
    {
      name: 'items', label: 'Estimate items', type: 'items', itemLabel: 'line',
      columns: [
        { name: 'area', label: 'Area / Floor' },
        { name: 'description', label: 'Item description', required: true },
        { name: 'unit', label: 'Unit', type: 'select', options: C.UNITS, default: 'Sqft', half: true },
        { name: 'quantity', label: 'Qty', type: 'number', half: true },
        { name: 'materialRate', label: 'Material rate', type: 'number', half: true },
        { name: 'labourRate', label: 'Labour rate', type: 'number', half: true },
        { name: 'amount', label: 'Cost', computed: boqItemCost },
      ],
      total: boqItemCost,
    },
    { name: 'otherExpenses', label: 'Other expenses (transport, overheads)', type: 'currency', default: 0 },
    { name: 'profitMargin', label: 'Profit margin', type: 'percent', default: 15 },
    { name: 'status', label: 'Status', type: 'select', options: C.BOQ_STATUS, default: 'Draft' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  summary: (v) => {
    const items = v.items || [];
    const mat = items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.materialRate) || 0), 0);
    const lab = items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.labourRate) || 0), 0);
    const cost = mat + lab + (Number(v.otherExpenses) || 0);
    const profit = (cost * (Number(v.profitMargin) || 0)) / 100;
    return [
      { label: 'Material cost', value: money(mat) }, { label: 'Labour cost', value: money(lab) },
      { label: 'Other expenses', value: money(v.otherExpenses || 0) }, { label: 'Total cost', value: money(cost) },
      { label: `Profit (${v.profitMargin || 0}%)`, value: money(profit) }, { label: 'Quotation value (pre-GST)', value: money(cost + profit), strong: true },
    ];
  },
  rowActions: (r, ctx) => [
    ctx.can('quotations', 'edit') && { label: 'Create quotation', icon: 'document-text-outline', onClick: () => ctx.action.mutate({ url: `/boq/${r._id}/quotation`, success: 'Quotation created' }, { onSuccess: (q) => ctx.nav(`/quotations/${q._id}`) }) },
  ],
};

export const quotations = {
  key: 'quotations', endpoint: '/quotations', module: 'quotations', icon: 'document-text-outline',
  title: 'Quotations', singular: 'Quotation',
  card: (r) => ({ title: r.title, sub: `${r.code} v${r.version}${r.client ? ` · ${r.client.name}` : ''}`, status: r.status, amount: money(r.grandTotal), meta: [r.projectType, r.validUntil && `Valid till ${fmtDate(r.validUntil, 'dd MMM')}`] }),
  filters: [{ name: 'status', label: 'Status', options: C.QUOTATION_STATUS }, { name: 'client', label: 'Client', ref: REF.client }],
  canEditRow: (r) => ['Draft', 'Rejected', 'Sent'].includes(r.status),
  fields: [
    { name: 'title', label: 'Title', required: true },
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, required: true },
    { name: 'projectType', label: 'Project type', type: 'select', options: C.PROJECT_TYPES, default: 'Interior' },
    { name: 'siteAddress', label: 'Site address' },
    { name: 'items', label: 'Quotation items', type: 'items', columns: itemsBase([{ name: 'area', label: 'Area' }]), total: lineTotal },
    { name: 'discountPercent', label: 'Discount', type: 'percent', default: 0 },
    { name: 'gstPercent', label: 'GST', type: 'percent', default: 18 },
    { name: 'validUntil', label: 'Valid until', type: 'date' },
    { name: 'terms', label: 'Terms & conditions', type: 'textarea' },
  ],
  summary: (v) => gstSummary(v, { discount: true }),
  afterCreate: (q, ctx) => ctx.nav(`/quotations/${q._id}`),
  detailActions: (q, ctx) => {
    const canEdit = ctx.can('quotations', 'edit');
    const canRespond = ctx.role === 'Client' || canEdit;
    const id = q._id;
    return [
      canEdit && ['Draft', 'Rejected'].includes(q.status) && { label: 'Send to client', icon: 'send-outline', primary: true, onClick: () => go(ctx, `/quotations/${id}/send`, null, 'Marked as sent to client') },
      canRespond && q.status === 'Sent' && { label: 'Approve', icon: 'checkmark-circle-outline', primary: true, onClick: () => go(ctx, `/quotations/${id}/respond`, { action: 'approve' }, 'Quotation approved') },
      canRespond && q.status === 'Sent' && {
        label: 'Reject', icon: 'close-circle-outline', danger: true,
        onClick: async () => {
          const v = await ctx.prompt({ title: 'Reject quotation', submitText: 'Reject', fields: [{ name: 'notes', label: 'Reason / changes required', type: 'textarea' }] });
          if (v) go(ctx, `/quotations/${id}/respond`, { action: 'reject', notes: v.notes }, 'Quotation rejected');
        },
      },
      canEdit && q.status === 'Approved' && {
        label: 'Convert to project', icon: 'folder-open-outline', primary: true,
        onClick: async () => {
          const end = new Date();
          end.setDate(end.getDate() + 90);
          const v = await ctx.prompt({
            title: 'Convert to project', description: `Contract value ${money(q.grandTotal)} will be set from this quotation.`, submitText: 'Create project',
            initial: { name: q.title, startDate: new Date().toISOString(), endDate: end.toISOString(), siteAddress: q.siteAddress, budget: q.boq?.costTotal || Math.round((q.taxable || 0) * 0.8) },
            fields: [
              { name: 'name', label: 'Project name', required: true },
              { name: 'startDate', label: 'Start date', type: 'date' },
              { name: 'endDate', label: 'Expected end date', type: 'date' },
              { name: 'siteAddress', label: 'Site address' },
              { name: 'budget', label: 'Cost budget', type: 'currency' },
              { name: 'manager', label: 'Project manager', type: 'ref', ref: { ...REF.staff, params: { role: 'Project Manager,Admin,Super Admin' } } },
            ],
          });
          if (v) ctx.action.mutate({ url: `/quotations/${id}/convert`, body: { ...v, manager: v.manager || undefined }, success: 'Project created 🎉' }, { onSuccess: (p) => ctx.nav(`/projects/${p._id}`) });
        },
      },
      canEdit && !['Converted', 'Revised'].includes(q.status) && { label: 'New version', icon: 'copy-outline', onClick: () => ctx.action.mutate({ url: `/quotations/${id}/revise`, success: 'New version created' }, { onSuccess: (r) => ctx.nav(`/quotations/${r._id}`, true) }) },
    ];
  },
  related: (q) => [
    q.client && { label: 'Client', path: `/clients/${q.client._id}`, module: 'clients' },
    q.project && { label: 'Project', path: `/projects/${q.project._id || q.project}`, module: 'projects' },
    { label: 'Follow-ups on this quote', path: `/crm/activities?quotation=${q._id}`, module: 'activities' },
  ],
};

export const activities = {
  key: 'activities', endpoint: '/activities', module: 'activities', icon: 'chatbubbles-outline',
  title: 'Follow-ups', singular: 'Activity', createLabel: 'Log activity', searchPlaceholder: 'Search subject, outcome…',
  emptyText: 'Log a call or meeting from a lead or client to start the follow-up trail.',
  card: (r) => ({
    title: r.subject, sub: [r.type, fmtDate(r.date, 'dd MMM'), r.lead?.name || r.client?.name].filter(Boolean).join(' · '),
    badge: r.status === 'Open' ? { text: 'Pending', tone: 'amber' } : { text: 'Done', tone: 'green' },
    meta: [r.outcome, r.status === 'Open' && r.nextFollowUp && `${overdue(r.nextFollowUp) ? '⚠ ' : ''}Next: ${fmtDate(r.nextFollowUp, 'dd MMM')}${r.nextAction ? ` · ${r.nextAction}` : ''}`, r.by?.name],
  }),
  filters: [
    { name: 'status', label: 'Follow-up', options: [{ value: 'Open', label: 'Pending' }, { value: 'Done', label: 'Done' }] },
    { name: 'type', label: 'Type', options: C.ACTIVITY_TYPES },
    { name: 'lead', label: 'Lead', ref: REF.lead },
  ],
  defaults: () => ({ date: new Date().toISOString() }),
  fields: [
    { name: 'type', label: 'Type', type: 'select', options: C.ACTIVITY_TYPES, default: 'Call' },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'subject', label: 'Subject', required: true, placeholder: 'e.g. Discussed revised kitchen layout' },
    { name: 'lead', label: 'Lead', type: 'ref', ref: REF.lead, help: 'Pick a lead or a client (at least one)' },
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, help: 'Auto-filled from the lead once converted' },
    { name: 'quotation', label: 'About quotation', type: 'ref', ref: { ...REF.quotation, params: (v) => ({ client: v.client || undefined }) } },
    { name: 'outcome', label: 'Outcome / notes', type: 'textarea' },
    { name: 'nextFollowUp', label: 'Next follow-up', type: 'date', help: 'Updates the lead and shows in notifications' },
    { name: 'nextAction', label: 'Next action', placeholder: 'e.g. Call back with revised quote' },
  ],
  rowActions: (r, ctx) => [
    r.status === 'Open' && ctx.can('activities', 'edit') && { label: 'Mark follow-up done', icon: 'checkmark-done-outline', onClick: () => ctx.action.mutate({ url: `/activities/${r._id}`, method: 'put', body: { status: 'Done' }, success: 'Follow-up closed' }) },
    r.client && ctx.can('clients') && { label: 'Open client 360°', icon: 'eye-outline', onClick: () => ctx.nav(`/clients/${r.client._id}`) },
    r.quotation && ctx.can('quotations') && { label: 'View quotation', icon: 'document-text-outline', onClick: () => ctx.nav(`/quotations/${r.quotation._id}`) },
  ],
};

export const tickets = {
  key: 'tickets', endpoint: '/tickets', module: 'tickets', icon: 'help-buoy-outline',
  title: 'Service & Complaints', singular: 'Ticket', createLabel: 'Raise ticket', searchPlaceholder: 'Search issue, location…',
  emptyText: 'Raise a ticket when a client reports a snag or complaint.',
  card: (r) => ({
    title: r.title, sub: [r.code, r.client?.name, pname(r)].filter(Boolean).join(' · '), status: r.status,
    meta: [r.category, r.priority, r.location, r.assignedTo?.name, r.dueDate && `${overdue(r.dueDate) && ['Open', 'In Progress'].includes(r.status) ? '⚠ ' : ''}By ${fmtDate(r.dueDate, 'dd MMM')}`],
  }),
  filters: [
    { name: 'status', label: 'Status', options: C.TICKET_STATUS },
    { name: 'priority', label: 'Priority', options: C.PRIORITIES },
    { name: 'category', label: 'Category', options: C.TICKET_CATEGORIES },
    { name: 'project', label: 'Project', ref: REF.project },
  ],
  fields: [
    { name: 'title', label: 'Issue', required: true, placeholder: 'e.g. Wardrobe shutter not aligned' },
    projectField({ required: false, help: 'Pick a project or a client. The client is taken from the project' }),
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, showIf: (v) => !v.project, staffOnly: true },
    { name: 'category', label: 'Category', type: 'select', options: C.TICKET_CATEGORIES, default: 'Complaint' },
    { name: 'priority', label: 'Priority', type: 'select', options: C.PRIORITIES, default: 'Medium' },
    { name: 'location', label: 'Location / area', placeholder: 'e.g. Master bedroom' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'photos', label: 'Photos', type: 'files' },
    { name: 'assignedTo', label: 'Assign to', type: 'ref', ref: { ...REF.staff, params: { role: 'Project Manager,Site Engineer,Site Supervisor,Designer' } }, staffOnly: true },
    { name: 'dueDate', label: 'Resolve by', type: 'date', staffOnly: true },
    { name: 'status', label: 'Status', type: 'select', options: C.TICKET_STATUS, default: 'Open', staffOnly: true },
    { name: 'resolution', label: 'Resolution', type: 'textarea', showIf: (v) => ['Resolved', 'Closed'].includes(v.status), staffOnly: true },
  ],
  rowActions: (r, ctx) => [
    ctx.can('tasks', 'edit') && r.project && !r.task && ['Open', 'In Progress'].includes(r.status) && { label: 'Create rework task', icon: 'construct-outline', onClick: () => go(ctx, `/tickets/${r._id}/task`, null, 'Rework task created on the project') },
    r.task && ctx.can('tasks') && { label: `Rework task ${r.task.code} · ${r.task.status}`, icon: 'list-outline', onClick: () => ctx.nav(`/tasks/${r.task._id}`) },
    r.status === 'Resolved' && ctx.can('tasks', 'edit') && { label: 'Close ticket', icon: 'checkmark-done-outline', onClick: () => ctx.action.mutate({ url: `/tickets/${r._id}`, method: 'put', body: { status: 'Closed' }, success: 'Ticket closed' }) },
  ],
};

/* =====================================================================
 * PROJECTS
 * ===================================================================== */
export const projects = {
  key: 'projects', endpoint: '/projects', module: 'projects', icon: 'folder-open-outline',
  title: 'Projects', singular: 'Project',
  card: (r) => ({ title: r.name, sub: [r.code, r.client?.name].filter(Boolean).join(' · '), status: r.status, amount: r.contractValue != null ? money(r.contractValue) : null, progress: r.progress, meta: [r.projectType, r.manager?.name, r.endDate && `Due ${fmtDate(r.endDate, 'dd MMM yy')}`] }),
  filters: [{ name: 'status', label: 'Status', options: C.PROJECT_STATUS }, { name: 'projectType', label: 'Type', options: C.PROJECT_TYPES }, { name: 'client', label: 'Client', ref: REF.client, hidden: true }],
  fields: [
    { name: 'name', label: 'Project name', required: true, section: 'Project' },
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, required: true, section: 'Project' },
    { name: 'projectType', label: 'Project type', type: 'select', options: C.PROJECT_TYPES, default: 'Interior', section: 'Project' },
    { name: 'siteAddress', label: 'Site address', section: 'Project' },
    { name: 'city', label: 'City', section: 'Project' },
    { name: 'status', label: 'Status', type: 'select', options: C.PROJECT_STATUS, default: 'Planning', section: 'Project' },
    { name: 'startDate', label: 'Start date', type: 'date', section: 'Schedule & Budget' },
    { name: 'endDate', label: 'Expected end date', type: 'date', section: 'Schedule & Budget' },
    { name: 'contractValue', label: 'Contract value (client)', type: 'currency', section: 'Schedule & Budget' },
    { name: 'budget', label: 'Cost budget', type: 'currency', section: 'Schedule & Budget' },
    { name: 'manager', label: 'Project manager', type: 'ref', ref: { ...REF.staff, params: { role: 'Project Manager,Admin,Super Admin' } }, section: 'Team' },
    { name: 'team', label: 'Team members', type: 'multiref', ref: REF.staff, section: 'Team' },
    { name: 'description', label: 'Description', type: 'textarea', section: 'Team' },
  ],
  afterCreate: (p, ctx) => ctx.nav(`/projects/${p._id}`),
};

export const tasks = {
  key: 'tasks', endpoint: '/tasks', module: 'tasks', icon: 'checkbox-outline',
  title: 'Tasks', singular: 'Task',
  card: (r) => ({
    title: r.title, sub: [r.code, pname(r), r.area].filter(Boolean).join(' · '), status: r.status, progress: r.progress,
    meta: [r.priority, r.assignedTo?.name, r.dueDate && `${overdue(r.dueDate) && r.status !== 'Done' ? '⚠ ' : ''}Due ${fmtDate(r.dueDate, 'dd MMM')}`, r.dependsOn?.length ? `Depends on ${r.dependsOn.map((d) => d.code).join(', ')}` : null],
  }),
  filters: [
    { name: 'project', label: 'Project', ref: REF.project },
    { name: 'status', label: 'Status', options: C.TASK_STATUS },
    { name: 'priority', label: 'Priority', options: C.PRIORITIES },
  ],
  fields: [
    projectField(),
    { name: 'title', label: 'Task title', required: true },
    { name: 'area', label: 'Floor / Area', placeholder: 'e.g. Kitchen, First Floor' },
    { name: 'assignedTo', label: 'Assign to', type: 'ref', ref: { ...REF.staff, params: { role: 'Project Manager,Site Engineer,Site Supervisor,Designer,Worker,Contractor' } } },
    { name: 'team', label: 'Team / Crew', placeholder: 'e.g. Carpentry team' },
    { name: 'priority', label: 'Priority', type: 'select', options: C.PRIORITIES, default: 'Medium' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: C.TASK_STATUS, default: 'To Do' },
    { name: 'progress', label: 'Progress', type: 'percent', default: 0, min: 0, max: 100 },
    { name: 'dependsOn', label: 'Depends on', type: 'multiref', ref: { ...REF.task, params: (v) => ({ project: v.project }) }, help: 'Task cannot start until these are done' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [
    r.status === 'To Do' && ctx.can('tasks', 'edit') && { label: 'Start task', icon: 'play-circle-outline', onClick: () => ctx.action.mutate({ url: `/tasks/${r._id}`, method: 'put', body: { status: 'In Progress' }, success: 'Task started' }) },
    r.status !== 'Done' && ctx.can('tasks', 'edit') && {
      label: 'Update progress', icon: 'speedometer-outline',
      onClick: async () => {
        const v = await ctx.prompt({ title: `Progress · ${r.title}`, initial: { progress: r.progress || 0 }, fields: [{ name: 'progress', label: 'Progress', type: 'percent', min: 0, max: 100 }] });
        if (v) ctx.action.mutate({ url: `/tasks/${r._id}`, method: 'put', body: { progress: Number(v.progress) || 0 }, success: 'Progress updated' });
      },
    },
    r.status !== 'Done' && ctx.can('tasks', 'edit') && { label: 'Mark done', icon: 'checkmark-circle-outline', onClick: () => ctx.action.mutate({ url: `/tasks/${r._id}`, method: 'put', body: { status: 'Done' }, success: 'Task completed' }) },
  ],
};

export const dailyReports = {
  key: 'dailyReports', endpoint: '/daily-reports', module: 'dailyReports', icon: 'clipboard-outline',
  title: 'Daily Site Reports', singular: 'Daily Report', createLabel: 'New site report',
  card: (r) => ({ title: pname(r) || '—', sub: [r.code, fmtDate(r.date), r.submittedBy?.name].filter(Boolean).join(' · '), status: r.status, meta: [r.workDone, r.labourCount != null && `${r.labourCount} labour`, r.issues && '⚠ Issue reported'], image: r.photos?.[0] }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'status', label: 'Status', options: ['Submitted', 'Reviewed'] }],
  defaults: () => ({ date: new Date().toISOString() }),
  fields: [
    projectField(),
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'weather', label: 'Weather', type: 'select', options: ['Clear', 'Cloudy', 'Rainy', 'Hot'], default: 'Clear' },
    { name: 'labourCount', label: 'Labour on site', type: 'number' },
    { name: 'workDone', label: 'Work completed today', type: 'textarea', required: true },
    { name: 'workPending', label: 'Work pending', type: 'textarea' },
    { name: 'materialsUsed', label: 'Materials used', type: 'textarea' },
    { name: 'instructions', label: 'Site instructions', type: 'textarea' },
    { name: 'issues', label: 'Issues / hindrances', type: 'textarea' },
    { name: 'progress', label: 'Overall progress', type: 'percent', min: 0, max: 100, help: 'Leave blank to use current project progress' },
    { name: 'status', label: 'Status', type: 'select', options: ['Submitted', 'Reviewed'], default: 'Submitted' },
    { name: 'photos', label: 'Site photos / videos', type: 'files' },
  ],
};

export const rooms = {
  key: 'rooms', endpoint: '/rooms', module: 'rooms', icon: 'bed-outline',
  title: 'Interior Design', singular: 'Room / Area',
  card: (r) => ({
    title: r.name, sub: [r.roomType, pname(r), r.areaSqft && `${r.areaSqft} sqft`].filter(Boolean).join(' · '), status: r.designStatus, image: r.designImages?.[0],
    meta: [r.designer?.name && `Designer: ${r.designer.name}`, `${r.materials?.length || 0} materials · ${r.furniture?.length || 0} furniture`, r.designStatus === 'Changes Requested' && r.revisions?.length ? `“${r.revisions[r.revisions.length - 1].notes}”` : null],
  }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'designStatus', label: 'Status', options: C.DESIGN_STATUS }],
  fields: [
    projectField({ section: 'Room' }),
    { name: 'name', label: 'Room / area name', required: true, section: 'Room' },
    { name: 'roomType', label: 'Room type', type: 'select', options: C.ROOM_TYPES, default: 'Living Room', section: 'Room' },
    { name: 'areaSqft', label: 'Area (sqft)', type: 'number', section: 'Room' },
    { name: 'designer', label: 'Designer', type: 'ref', ref: { ...REF.staff, params: { role: 'Designer' } }, section: 'Room' },
    { name: 'designStatus', label: 'Design status', type: 'select', options: C.DESIGN_STATUS, default: 'Concept', section: 'Room' },
    { name: 'designImages', label: 'Design references / 3D views', type: 'files', section: 'Design' },
    {
      name: 'materials', label: 'Material selection', type: 'items', itemLabel: 'material', section: 'Design',
      columns: [
        { name: 'item', label: 'Item' }, { name: 'specification', label: 'Specification / finish' },
        { name: 'brand', label: 'Brand' }, { name: 'quantity', label: 'Qty', type: 'number', half: true },
        { name: 'unit', label: 'Unit', type: 'select', options: C.UNITS, default: 'Nos', half: true },
      ],
    },
    {
      name: 'furniture', label: 'Furniture items', type: 'items', itemLabel: 'furniture', section: 'Design',
      columns: [
        { name: 'name', label: 'Item' }, { name: 'specification', label: 'Specification' },
        { name: 'quantity', label: 'Qty', type: 'number', default: 1, half: true }, { name: 'cost', label: 'Unit cost', type: 'number', half: true },
        { name: 'total', label: 'Total', computed: (r) => (Number(r.quantity) || 0) * (Number(r.cost) || 0) },
      ],
      total: (r) => (Number(r.quantity) || 0) * (Number(r.cost) || 0),
    },
    { name: 'customWork', label: 'Custom work', type: 'textarea', section: 'Design' },
  ],
  rowActions: (r, ctx) => {
    const canDesign = ctx.can('rooms', 'edit');
    const canApprove = ['Client', 'Project Manager', 'Designer'].includes(ctx.role) || ctx.isAdmin;
    return [
      canDesign && ['Concept', 'In Design', 'Changes Requested'].includes(r.designStatus) && { label: 'Send for client approval', icon: 'send-outline', onClick: () => go(ctx, `/rooms/${r._id}/submit`, null, 'Sent for client approval') },
      canApprove && r.designStatus === 'Pending Approval' && { label: 'Approve design', icon: 'checkmark-circle-outline', onClick: () => go(ctx, `/rooms/${r._id}/respond`, { action: 'approve' }, 'Design approved') },
      canApprove && r.designStatus === 'Pending Approval' && {
        label: 'Request changes', icon: 'chatbox-ellipses-outline',
        onClick: async () => {
          const v = await ctx.prompt({ title: `Request changes · ${r.name}`, fields: [{ name: 'comments', label: 'What should change?', type: 'textarea', required: true, placeholder: 'e.g. Change laminate to walnut…' }] });
          if (v) go(ctx, `/rooms/${r._id}/respond`, { action: 'changes', comments: v.comments }, 'Changes requested — designer notified');
        },
      },
    ];
  },
};

export const documents = {
  key: 'documents', endpoint: '/documents', module: 'documents', icon: 'images-outline',
  title: 'Documents & Photos', singular: 'Document', createLabel: 'Upload',
  card: (r) => ({ title: r.title, sub: [r.category, pname(r), r.room?.name].filter(Boolean).join(' · '), image: r.fileUrl, file: r.fileUrl, meta: [fmtDate(r.createdAt), r.uploadedBy?.name, r.notes] }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'category', label: 'Category', options: C.DOCUMENT_CATEGORIES }],
  fields: [
    { name: 'fileUrl', label: 'File', type: 'file', required: true, onSelect: (f, v) => (f ? { fileName: f.name, mimeType: f.mimeType, size: f.size, title: v.title || (f.name || '').replace(/\.[^.]+$/, '') } : {}) },
    { name: 'title', label: 'Title', required: true },
    { name: 'category', label: 'Category', type: 'select', options: C.DOCUMENT_CATEGORIES, default: 'Site Photo' },
    projectField({ required: false }),
    { name: 'room', label: 'Room (interior)', type: 'ref', ref: { ...REF.room, params: (v) => ({ project: v.project }) } },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'fileName', hidden: true }, { name: 'mimeType', hidden: true }, { name: 'size', hidden: true },
  ],
};

/* =====================================================================
 * INVENTORY & PURCHASE
 * ===================================================================== */
export const materials = {
  key: 'materials', endpoint: '/materials', module: 'materials', icon: 'cube-outline',
  title: 'Material Master', singular: 'Material', pageSize: 50,
  card: (r) => ({ title: r.name, sub: [r.code, r.category, r.brand].filter(Boolean).join(' · '), amount: `${money(r.rate)}/${r.unit}`, meta: [r.minStock ? `Min stock ${number(r.minStock)}` : null, r.hsn && `HSN ${r.hsn}`] }),
  filters: [{ name: 'category', label: 'Category', options: C.MATERIAL_CATEGORIES }],
  fields: [
    { name: 'name', label: 'Material name', required: true },
    { name: 'category', label: 'Category', type: 'select', options: C.MATERIAL_CATEGORIES, required: true, default: 'Other' },
    { name: 'unit', label: 'Unit', type: 'select', options: C.UNITS, required: true, default: 'Nos' },
    { name: 'rate', label: 'Standard rate', type: 'currency' },
    { name: 'minStock', label: 'Minimum stock (alert level)', type: 'number' },
    { name: 'brand', label: 'Brand' },
    { name: 'hsn', label: 'HSN code' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
};

const STOCK_LOC = { ...REF.project, nullLabel: 'Main Warehouse' };
export const stockTxns = {
  key: 'stockTxns', endpoint: '/stock/transactions', module: 'stock', icon: 'swap-horizontal-outline',
  title: 'Stock Movements', singular: 'Stock Movement', createLabel: 'Record movement',
  card: (r) => ({
    title: r.material?.name || '—', sub: [r.code, fmtDate(r.date)].join(' · '), status: r.type, amount: `${number(r.quantity)} ${r.material?.unit || ''}`,
    meta: [['Consumption', 'Wastage', 'Transfer'].includes(r.type) && `From ${r.fromProject?.name || 'Main Warehouse'}`, ['Receipt', 'Return', 'Transfer'].includes(r.type) && `To ${r.toProject?.name || 'Main Warehouse'}`, r.value != null && money(r.value), r.remarks],
  }),
  filters: [{ name: 'type', label: 'Type', options: C.STOCK_TXN_TYPES }, { name: 'material', label: 'Material', ref: REF.material }],
  defaults: () => ({ date: new Date().toISOString(), type: 'Consumption' }),
  fields: [
    { name: 'type', label: 'Movement type', type: 'select', options: C.STOCK_TXN_TYPES, required: true },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'material', label: 'Material', type: 'ref', ref: REF.material, required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'rate', label: 'Rate (blank = standard rate)', type: 'currency' },
    { name: 'fromProject', label: 'From location', type: 'ref', ref: STOCK_LOC, default: null, showIf: (v) => ['Consumption', 'Wastage', 'Transfer'].includes(v.type) },
    { name: 'toProject', label: 'To location', type: 'ref', ref: STOCK_LOC, default: null, showIf: (v) => ['Receipt', 'Return', 'Transfer'].includes(v.type) },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
};

const mrItemCols = [
  { name: 'material', label: 'Material', type: 'ref', ref: REF.material, required: true },
  { name: 'quantity', label: 'Quantity', type: 'number', half: true },
  { name: 'remarks', label: 'Remarks', half: true },
];
export const materialRequests = {
  key: 'materialRequests', endpoint: '/material-requests', module: 'materialRequests', icon: 'add-circle-outline',
  title: 'Material Requests', singular: 'Material Request',
  card: (r) => ({ title: pname(r) || 'Main Warehouse', sub: [r.code, r.requestedBy?.name].filter(Boolean).join(' · '), status: r.status, meta: [(r.items || []).map((i) => `${i.material?.name} (${i.quantity} ${i.material?.unit || ''})`).join(', '), r.priority, r.requiredDate && `Needed by ${fmtDate(r.requiredDate, 'dd MMM')}`] }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'status', label: 'Status', options: C.MR_STATUS }],
  canEditRow: (r) => r.status === 'Pending',
  fields: [
    projectField(),
    { name: 'requiredDate', label: 'Required by', type: 'date' },
    { name: 'priority', label: 'Priority', type: 'select', options: C.PRIORITIES, default: 'Medium' },
    { name: 'items', label: 'Materials required', type: 'items', itemLabel: 'material', columns: mrItemCols },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [
    r.status === 'Pending' && ctx.can('materialRequests', 'edit') && { label: 'Approve', icon: 'checkmark-circle-outline', onClick: () => go(ctx, `/material-requests/${r._id}/status`, { status: 'Approved' }, 'Request approved') },
    r.status === 'Pending' && ctx.can('materialRequests', 'edit') && { label: 'Reject', icon: 'close-circle-outline', danger: true, onClick: () => go(ctx, `/material-requests/${r._id}/status`, { status: 'Rejected' }, 'Request rejected') },
    r.status === 'Approved' && ctx.can('purchaseOrders', 'edit') && {
      label: 'Raise purchase order', icon: 'cart-outline',
      onClick: async () => {
        const v = await ctx.prompt({ title: `Raise PO for ${r.code}`, description: `${r.items?.length || 0} item(s)`, submitText: 'Create PO', fields: [{ name: 'vendor', label: 'Vendor', type: 'ref', ref: REF.vendor, required: true }] });
        if (v) ctx.action.mutate({ url: `/material-requests/${r._id}/purchase-order`, body: { vendor: v.vendor }, success: 'Draft purchase order created' }, { onSuccess: (po) => ctx.nav(`/purchase/orders/${po._id}`) });
      },
    },
  ],
};

export const vendors = {
  key: 'vendors', endpoint: '/vendors', module: 'vendors', icon: 'storefront-outline',
  title: 'Vendors', singular: 'Vendor',
  card: (r) => ({ title: r.name, sub: [r.code, r.contactPerson].filter(Boolean).join(' · '), meta: [r.category, r.phone, r.paymentTerms, r.rating ? '★'.repeat(Math.round(r.rating)) : null] }),
  fields: [
    { name: 'name', label: 'Vendor name', required: true },
    { name: 'contactPerson', label: 'Contact person' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'gstin', label: 'GSTIN' },
    { name: 'category', label: 'Supplies (categories)', placeholder: 'e.g. Cement, Steel' },
    { name: 'paymentTerms', label: 'Payment terms', default: '30 days' },
    { name: 'rating', label: 'Rating (0-5)', type: 'number', min: 0, max: 5, default: 4 },
    { name: 'address', label: 'Address', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) }],
  related: (r) => [
    { label: 'Purchase orders', path: `/purchase/orders?vendor=${r._id}`, module: 'purchaseOrders' },
    { label: 'Bills', path: `/finance/bills?vendor=${r._id}`, module: 'bills' },
  ],
};

export const rfqs = {
  key: 'rfqs', endpoint: '/rfqs', module: 'rfqs', icon: 'paper-plane-outline',
  title: 'RFQ', singular: 'RFQ',
  card: (r) => {
    const b = [...(r.responses || [])].filter((x) => x.amount).sort((a, c) => a.amount - c.amount)[0];
    return {
      title: r.title, sub: [r.code, pname(r)].filter(Boolean).join(' · '),
      badge: r.status === 'Closed' && r.selectedVendor ? { text: `Awarded · ${r.selectedVendor.name}`, tone: 'green' } : { text: r.status, tone: r.status === 'Sent' ? 'blue' : 'slate' },
      meta: [`${r.responses?.length || 0}/${r.vendors?.length || 0} quotes`, b && `Best ${money(b.amount)} · ${b.vendor?.name}`, r.dueDate && `Due ${fmtDate(r.dueDate, 'dd MMM')}`],
    };
  },
  filters: [{ name: 'status', label: 'Status', options: C.RFQ_STATUS }],
  canEditRow: (r) => r.status !== 'Closed',
  fields: [
    { name: 'title', label: 'Title', required: true },
    projectField({ required: false }),
    { name: 'dueDate', label: 'Quote due date', type: 'date' },
    { name: 'items', label: 'Materials', type: 'items', itemLabel: 'material', columns: mrItemCols },
    { name: 'vendors', label: 'Invite vendors', type: 'multiref', ref: REF.vendor },
    { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent'], default: 'Draft' },
    {
      name: 'responses', label: 'Vendor quotes received', type: 'items', itemLabel: 'quote',
      columns: [
        { name: 'vendor', label: 'Vendor', type: 'ref', ref: REF.vendor },
        { name: 'amount', label: 'Quoted amount', type: 'number', half: true },
        { name: 'deliveryDays', label: 'Delivery (days)', type: 'number', half: true },
        { name: 'remarks', label: 'Remarks' },
      ],
    },
  ],
  rowActions: (r, ctx) => (r.status !== 'Closed' && ctx.can('purchaseOrders', 'edit') ? (r.responses || []).filter((x) => x.vendor).map((x) => ({
    label: `Award to ${x.vendor.name}${x.amount ? ` (${money(x.amount)})` : ''}`, icon: 'ribbon-outline',
    onClick: () => ctx.action.mutate({ url: `/rfqs/${r._id}/award`, body: { vendor: x.vendor._id }, success: 'Awarded – draft PO created' }, { onSuccess: (po) => ctx.nav(`/purchase/orders/${po._id}`) }),
  })) : []),
};

export const purchaseOrders = {
  key: 'purchaseOrders', endpoint: '/purchase-orders', module: 'purchaseOrders', icon: 'cart-outline',
  title: 'Purchase Orders', singular: 'Purchase Order',
  card: (r) => {
    const q = (r.items || []).reduce((s, i) => s + i.quantity, 0);
    const x = (r.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
    return { title: r.vendor?.name || '—', sub: [r.code, fmtDate(r.orderDate, 'dd MMM'), `→ ${pname(r) || 'Main Warehouse'}`].join(' · '), status: r.status, amount: money(r.total), meta: [`${r.items?.length || 0} item(s)`, q ? `${Math.round((x / q) * 100)}% received` : null] };
  },
  filters: [{ name: 'status', label: 'Status', options: C.PO_STATUS }, { name: 'vendor', label: 'Vendor', ref: REF.vendor }],
  canEditRow: (r) => r.status === 'Draft',
  fields: [
    { name: 'vendor', label: 'Vendor', type: 'ref', ref: REF.vendor, required: true },
    { name: 'project', label: 'Deliver to', type: 'ref', ref: STOCK_LOC, default: null },
    { name: 'orderDate', label: 'Order date', type: 'date', default: () => new Date().toISOString() },
    { name: 'expectedDate', label: 'Expected delivery', type: 'date' },
    {
      name: 'items', label: 'Order items', type: 'items', itemLabel: 'material',
      columns: [
        { name: 'material', label: 'Material', type: 'ref', ref: REF.material, required: true, onSelect: (m) => ({ rate: m.rate }) },
        { name: 'quantity', label: 'Qty', type: 'number', half: true },
        { name: 'rate', label: 'Rate', type: 'number', half: true },
        { name: 'amount', label: 'Amount', computed: lineTotal },
      ],
      total: lineTotal,
    },
    { name: 'gstPercent', label: 'GST', type: 'percent', default: 18 },
    { name: 'notes', label: 'Notes / terms', type: 'textarea' },
  ],
  summary: (v) => gstSummary(v),
  afterCreate: (po, ctx) => ctx.nav(`/purchase/orders/${po._id}`),
  detailActions: (po, ctx) => {
    const canEdit = ctx.can('purchaseOrders', 'edit');
    const id = po._id;
    return [
      canEdit && po.status === 'Draft' && { label: 'Approve PO', icon: 'checkmark-circle-outline', primary: true, onClick: () => go(ctx, `/purchase-orders/${id}/approve`, null, 'PO approved') },
      canEdit && ['Approved', 'Partially Received'].includes(po.status) && {
        label: 'Receive goods (GRN)', icon: 'archive-outline', primary: true,
        onClick: async () => {
          const items = po.items.filter((it) => it.quantity - (it.receivedQty || 0) > 0);
          const v = await ctx.prompt({
            title: 'Receive goods (GRN)', submitText: 'Receive into stock',
            initial: { date: new Date().toISOString(), ...Object.fromEntries(items.map((it) => [`q_${it._id}`, it.quantity - (it.receivedQty || 0)])) },
            fields: [
              { name: 'date', label: 'Receipt date', type: 'date' },
              ...items.map((it) => ({ name: `q_${it._id}`, label: `${it.material?.name || 'Item'} — pending ${number(it.quantity - (it.receivedQty || 0))} ${it.material?.unit || ''}`, type: 'number' })),
            ],
          });
          if (v) {
            const rows = items.map((it) => ({ itemId: it._id, quantity: Number(v[`q_${it._id}`]) || 0 })).filter((x) => x.quantity > 0);
            go(ctx, `/purchase-orders/${id}/receive`, { date: v.date, items: rows }, 'Goods received into stock');
          }
        },
      },
      ctx.can('bills', 'edit') && !['Draft', 'Cancelled'].includes(po.status) && {
        label: 'Book purchase invoice', icon: 'receipt-outline',
        onClick: async () => {
          const v = await ctx.prompt({ title: 'Book purchase invoice', description: `Creates a vendor bill for ${money(po.total)} linked to ${po.code}.`, submitText: 'Create', fields: [{ name: 'partyInvoiceNo', label: "Vendor's invoice number" }] });
          if (v) ctx.action.mutate({ url: `/purchase-orders/${id}/bill`, body: { partyInvoiceNo: v.partyInvoiceNo }, success: 'Purchase invoice created' }, { onSuccess: (b) => ctx.nav(`/finance/bills/${b._id}`) });
        },
      },
      canEdit && po.status === 'Draft' && {
        label: 'Cancel PO', icon: 'ban-outline', danger: true,
        onClick: async () => { if (await ctx.confirm({ title: 'Cancel purchase order?', message: `${po.code} will be cancelled.`, confirmText: 'Cancel PO' })) ctx.action.mutate({ url: `/purchase-orders/${id}`, method: 'put', body: { status: 'Cancelled' }, success: 'PO cancelled' }); },
      },
    ];
  },
};

/* =====================================================================
 * WORKFORCE
 * ===================================================================== */
export const workers = {
  key: 'workers', endpoint: '/workers', module: 'workers', icon: 'hammer-outline',
  title: 'Workers', singular: 'Worker', pageSize: 50,
  card: (r) => ({ title: r.name, sub: [r.code, r.trade, r.phone].filter(Boolean).join(' · '), badge: r.active ? { text: 'Active', tone: 'green' } : { text: 'Inactive', tone: 'slate' }, amount: `${money(r.dailyWage)}/day`, meta: [r.skillType, r.currentProject?.name, r.subcontractor?.name] }),
  filters: [
    { name: 'skillType', label: 'Skill', options: C.SKILL_TYPES },
    { name: 'trade', label: 'Trade', options: C.TRADES },
    { name: 'currentProject', label: 'Site', ref: REF.project },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'trade', label: 'Trade', type: 'select', options: C.TRADES, default: 'Helper' },
    { name: 'skillType', label: 'Skill type', type: 'select', options: C.SKILL_TYPES, default: 'Skilled' },
    { name: 'dailyWage', label: 'Daily wage', type: 'currency', required: true },
    { name: 'otRate', label: 'OT rate / hour', type: 'currency' },
    { name: 'currentProject', label: 'Current site', type: 'ref', ref: REF.project },
    { name: 'subcontractor', label: 'Through contractor', type: 'ref', ref: REF.subcontractor },
    { name: 'idProof', label: 'ID proof no.' },
    { name: 'active', label: 'Active', type: 'checkbox', default: true },
    { name: 'address', label: 'Address', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) }],
  related: (r) => [{ label: 'Attendance register', path: `/workforce/register?worker=${r._id}`, module: 'attendance' }],
};

export const attendanceRegister = {
  key: 'attendanceRegister', endpoint: '/attendance', module: 'attendance', icon: 'calendar-outline',
  title: 'Attendance Register', singular: 'Attendance', creatable: false,
  card: (r) => ({ title: r.worker?.name || '—', sub: [fmtDate(r.date), r.project?.name].filter(Boolean).join(' · '), status: r.status, amount: money(r.wage), meta: [r.worker?.trade, r.otHours ? `OT ${r.otHours} hr` : null, r.payment ? '✓ Paid' : 'Unpaid'] }),
  canEditRow: (r) => !r.payment,
  filters: [{ name: 'project', label: 'Site', ref: REF.project }, { name: 'worker', label: 'Worker', ref: REF.worker }, { name: 'status', label: 'Status', options: ['Present', 'Half Day', 'Absent'] }],
  fields: [
    { name: 'status', label: 'Status', type: 'select', options: ['Present', 'Half Day', 'Absent'] },
    { name: 'otHours', label: 'OT hours', type: 'number' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
};

export const subcontractors = {
  key: 'subcontractors', endpoint: '/subcontractors', module: 'subcontractors', icon: 'briefcase-outline',
  title: 'Subcontractors', singular: 'Subcontractor',
  card: (r) => ({ title: r.company || r.name, sub: [r.code, r.name !== r.company ? r.name : null].filter(Boolean).join(' · '), meta: [r.trade, r.phone, r.gstin && `GSTIN ${r.gstin}`] }),
  fields: [
    { name: 'company', label: 'Company / firm' },
    { name: 'name', label: 'Contact name', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'trade', label: 'Trade', placeholder: 'Carpentry, Electrical, Civil…' },
    { name: 'gstin', label: 'GSTIN' },
    { name: 'pan', label: 'PAN' },
    { name: 'rating', label: 'Rating (0-5)', type: 'number', default: 4 },
    { name: 'bankDetails', label: 'Bank details', type: 'textarea' },
    { name: 'address', label: 'Address', type: 'textarea' },
  ],
  rowActions: (r, ctx) => [r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) }],
  related: (r) => [
    { label: 'Work orders', path: `/workforce/work-orders?subcontractor=${r._id}`, module: 'workOrders' },
    { label: 'Bills', path: `/finance/bills?subcontractor=${r._id}`, module: 'bills' },
  ],
};

export const workOrders = {
  key: 'workOrders', endpoint: '/work-orders', module: 'workOrders', icon: 'document-attach-outline',
  title: 'Work Orders', singular: 'Work Order',
  card: (r) => ({ title: r.title, sub: [r.code, r.subcontractor?.name, pname(r)].filter(Boolean).join(' · '), status: r.status, amount: money(r.contractAmount), progress: r.progress, meta: [r.endDate && `Due ${fmtDate(r.endDate, 'dd MMM yy')}`] }),
  filters: [{ name: 'subcontractor', label: 'Contractor', ref: REF.subcontractor }, { name: 'status', label: 'Status', options: C.WORK_ORDER_STATUS }, { name: 'project', label: 'Project', ref: REF.project }],
  fields: [
    { name: 'title', label: 'Work package title', required: true },
    { name: 'subcontractor', label: 'Subcontractor', type: 'ref', ref: REF.subcontractor, required: true },
    projectField(),
    { name: 'startDate', label: 'Start', type: 'date' },
    { name: 'endDate', label: 'End', type: 'date' },
    { name: 'scope', label: 'Scope of work', type: 'textarea' },
    { name: 'items', label: 'Rate items (contract amount auto-calculated)', type: 'items', columns: itemsBase(), total: lineTotal },
    { name: 'contractAmount', label: 'Lump-sum contract amount', type: 'currency', help: 'Used only when no rate items are entered' },
    { name: 'progress', label: 'Progress', type: 'percent', default: 0 },
    { name: 'status', label: 'Status', type: 'select', options: C.WORK_ORDER_STATUS, default: 'Active' },
  ],
  rowActions: (r, ctx) => [
    ctx.can('measurements', 'edit') && { label: 'Record measurement', icon: 'resize-outline', onClick: () => ctx.nav(`/measurements?create=1&workOrder=${r._id}&project=${r.project?._id}&measurementType=Contractor`) },
  ],
};

const mbQty = (r) => {
  const dims = [r.length, r.breadth, r.height].map(Number).filter((d) => d > 0);
  return dims.length ? (Number(r.nos) || 1) * dims.reduce((a, b) => a * b, 1) : Number(r.quantity) || 0;
};
export const measurements = {
  key: 'measurements', endpoint: '/measurements', module: 'measurements', icon: 'resize-outline',
  title: 'Measurement Book', singular: 'Measurement',
  card: (r) => ({ title: pname(r) || '—', sub: [r.code, fmtDate(r.date)].join(' · '), status: r.status, amount: money(r.total), meta: [r.measurementType === 'Client' ? 'Client billing' : `Contractor · ${r.subcontractor?.name || ''}`, `${r.items?.length || 0} item(s)`, r.bill && `Bill ${r.bill.code}`] }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'measurementType', label: 'For', options: ['Client', 'Contractor'] }, { name: 'status', label: 'Status', options: C.MEASUREMENT_STATUS }],
  canEditRow: (r) => r.status !== 'Billed',
  defaults: () => ({ date: new Date().toISOString() }),
  fields: [
    projectField(),
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'measurementType', label: 'Measurement for', type: 'select', options: [{ value: 'Client', label: 'Client billing' }, { value: 'Contractor', label: 'Contractor billing' }], default: 'Client' },
    { name: 'workOrder', label: 'Work order', type: 'ref', ref: { ...REF.workOrder, params: (v) => ({ project: v.project }) }, showIf: (v) => v.measurementType === 'Contractor' },
    {
      name: 'items', label: 'Measurements', type: 'items', itemLabel: 'measurement',
      columns: [
        { name: 'description', label: 'Description', required: true },
        { name: 'area', label: 'Location', half: true },
        { name: 'unit', label: 'Unit', type: 'select', options: C.UNITS, default: 'Sqft', half: true },
        { name: 'nos', label: 'Nos', type: 'number', default: 1, third: true },
        { name: 'length', label: 'L', type: 'number', third: true },
        { name: 'breadth', label: 'B', type: 'number', third: true },
        { name: 'height', label: 'H/D', type: 'number', third: true },
        { name: 'quantity', label: 'Qty*', type: 'number', third: true },
        { name: 'rate', label: 'Rate', type: 'number', third: true },
        { name: 'amount', label: 'Amount', computed: (r) => mbQty(r) * (Number(r.rate) || 0) },
      ],
      total: (r) => mbQty(r) * (Number(r.rate) || 0),
    },
    { name: 'remarks', label: 'Remarks', type: 'textarea', help: '* Quantity is auto-calculated as Nos × L × B × H when dimensions are entered.' },
  ],
  rowActions: (r, ctx) => [
    r.status === 'Draft' && ctx.can('measurements', 'edit') && { label: 'Verify measurement', icon: 'shield-checkmark-outline', onClick: () => go(ctx, `/measurements/${r._id}/verify`, null, 'Measurement verified') },
    r.status === 'Verified' && ctx.can('measurements', 'edit') && {
      label: r.measurementType === 'Client' ? 'Generate client invoice' : 'Generate contractor bill', icon: 'receipt-outline',
      onClick: () => ctx.action.mutate({ url: `/measurements/${r._id}/bill`, success: 'Bill generated' }, { onSuccess: (b) => ctx.nav(`/finance/bills/${b._id}`) }),
    },
    r.bill && { label: `View bill ${r.bill.code}`, icon: 'eye-outline', onClick: () => ctx.nav(`/finance/bills/${r.bill._id}`) },
  ],
};

/* =====================================================================
 * FINANCE
 * ===================================================================== */
const PAY_CATEGORY = { Client: 'Client Receipt', Vendor: 'Vendor Payment', Contractor: 'Contractor Payment' };
export const bills = {
  key: 'bills', endpoint: '/bills', module: 'bills', icon: 'receipt-outline',
  title: 'Bills & Invoices', singular: 'Bill',
  card: (r) => ({
    title: r.client?.name || r.vendor?.name || r.subcontractor?.name || '—', sub: [r.code, r.billType, fmtDate(r.billDate, 'dd MMM')].join(' · '), status: r.status, amount: money(r.total),
    meta: [pname(r), r.balance > 0 ? `${r.dueDate && new Date(r.dueDate) < new Date() ? '⚠ ' : ''}Balance ${money(r.balance)}` : 'Fully paid', r.partyInvoiceNo && `Ref ${r.partyInvoiceNo}`],
  }),
  filters: [
    { name: 'billType', label: 'Type', options: C.BILL_TYPES },
    { name: 'status', label: 'Status', options: C.BILL_STATUS },
    { name: 'project', label: 'Project', ref: REF.project },
    { name: 'client', label: 'Client', ref: REF.client, hidden: true },
    { name: 'vendor', label: 'Vendor', ref: REF.vendor, hidden: true },
    { name: 'subcontractor', label: 'Contractor', ref: REF.subcontractor, hidden: true },
  ],
  canEditRow: (r) => r.paidAmount === 0 && r.status !== 'Cancelled',
  defaults: () => ({ billDate: new Date().toISOString(), billType: 'Client' }),
  fields: [
    { name: 'billType', label: 'Bill type', type: 'select', options: [{ value: 'Client', label: 'Client invoice (sales)' }, { value: 'Vendor', label: 'Vendor purchase invoice' }, { value: 'Contractor', label: 'Contractor bill' }], required: true },
    projectField({ required: false, help: 'For client invoices pick a project or a client' }),
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, showIf: (v) => v.billType === 'Client', help: 'Auto-filled from project if blank' },
    { name: 'vendor', label: 'Vendor', type: 'ref', ref: REF.vendor, showIf: (v) => v.billType === 'Vendor', required: true },
    { name: 'subcontractor', label: 'Subcontractor', type: 'ref', ref: REF.subcontractor, showIf: (v) => v.billType === 'Contractor', required: true },
    { name: 'partyInvoiceNo', label: "Party's invoice no.", showIf: (v) => v.billType !== 'Client' },
    { name: 'billDate', label: 'Bill date', type: 'date' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'items', label: 'Bill items', type: 'items', columns: itemsBase(), total: lineTotal },
    { name: 'gstPercent', label: 'GST', type: 'percent', default: 18 },
    { name: 'retentionPercent', label: 'Retention', type: 'percent', default: 0 },
    { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Issued', 'Cancelled'], default: 'Issued' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  summary: (v) => gstSummary(v, { retention: true }),
  afterCreate: (b, ctx) => ctx.nav(`/finance/bills/${b._id}`),
  detailActions: (b, ctx) => {
    const isOut = b.billType !== 'Client';
    return [
      ctx.can('payments', 'edit') && b.balance > 0 && !['Draft', 'Cancelled'].includes(b.status) && {
        label: isOut ? 'Record payment' : 'Record receipt', icon: 'wallet-outline', primary: true,
        onClick: async () => {
          const v = await ctx.prompt({
            title: isOut ? 'Record payment' : 'Record receipt', description: `Balance ${money(b.balance)}`, submitText: 'Save',
            initial: { amount: b.balance, date: new Date().toISOString(), mode: 'Bank Transfer' },
            fields: [
              { name: 'amount', label: 'Amount', type: 'currency', required: true },
              { name: 'date', label: 'Date', type: 'date' },
              { name: 'mode', label: 'Mode', type: 'select', options: C.PAYMENT_MODES },
              { name: 'reference', label: 'Reference / UTR / Cheque no.' },
            ],
          });
          if (v) go(ctx, '/payments', { ...v, bill: b._id, category: PAY_CATEGORY[b.billType] }, isOut ? 'Payment recorded' : 'Receipt recorded');
        },
      },
      ctx.can('bills', 'edit') && b.paidAmount === 0 && b.status !== 'Cancelled' && {
        label: 'Cancel bill', icon: 'ban-outline', danger: true,
        onClick: async () => { if (await ctx.confirm({ title: 'Cancel this bill?', message: 'Cancelled bills are excluded from revenue / cost.', confirmText: 'Cancel bill' })) ctx.action.mutate({ url: `/bills/${b._id}`, method: 'put', body: { status: 'Cancelled' }, success: 'Bill cancelled' }); },
      },
    ];
  },
  related: (b) => [
    { label: 'Payments against this bill', path: `/finance/payments?bill=${b._id}`, module: 'payments' },
    b.project && { label: 'Project', path: `/projects/${b.project._id}`, module: 'projects' },
  ],
};

export const payments = {
  key: 'payments', endpoint: '/payments', module: 'payments', icon: 'wallet-outline',
  title: 'Payments', singular: 'Payment',
  card: (r) => ({ title: party(r) || r.category, sub: [r.code, fmtDate(r.date, 'dd MMM yy'), r.mode].filter(Boolean).join(' · '), badge: { text: r.category, tone: r.direction === 'In' ? 'green' : 'red' }, amount: `${r.direction === 'In' ? '+' : '−'} ${money(r.amount)}`, amountTone: r.direction === 'In' ? 'green' : 'red', meta: [r.bill?.code && `Against ${r.bill.code}`, pname(r), r.reference] }),
  filters: [
    { name: 'direction', label: 'Direction', options: [{ value: 'In', label: 'Money in' }, { value: 'Out', label: 'Money out' }] },
    { name: 'category', label: 'Category', options: C.PAYMENT_CATEGORIES },
    { name: 'mode', label: 'Mode', options: C.PAYMENT_MODES },
    { name: 'project', label: 'Project', ref: REF.project, hidden: true },
    { name: 'client', label: 'Client', ref: REF.client, hidden: true },
    { name: 'bill', label: 'Bill', ref: { endpoint: '/bills', label: codeName }, hidden: true },
  ],
  defaults: () => ({ date: new Date().toISOString(), category: 'Client Receipt' }),
  fields: [
    { name: 'category', label: 'Category', type: 'select', options: C.PAYMENT_CATEGORIES, required: true },
    { name: 'date', label: 'Date', type: 'date' },
    {
      name: 'bill', label: 'Against bill', type: 'ref',
      ref: {
        endpoint: '/bills', label: (o) => `${o.code} · ${o.client?.name || o.vendor?.name || o.subcontractor?.name || ''} · balance ${money(o.balance)}`,
        params: (v) => ({ outstanding: 'true', billType: v.category?.startsWith('Client') ? 'Client' : v.category === 'Vendor Payment' ? 'Vendor' : v.category === 'Contractor Payment' ? 'Contractor' : undefined }),
      },
      showIf: (v) => ['Client Receipt', 'Client Advance', 'Vendor Payment', 'Contractor Payment'].includes(v.category),
      onSelect: (b, v) => (b ? { amount: v.amount || b.balance, project: b.project?._id || v.project } : {}),
    },
    projectField({ required: false }),
    { name: 'client', label: 'Client', type: 'ref', ref: REF.client, showIf: (v) => ['Client Advance', 'Other Income'].includes(v.category) && !v.bill },
    { name: 'worker', label: 'Worker', type: 'ref', ref: REF.worker, showIf: (v) => v.category === 'Labour Wages' },
    { name: 'employee', label: 'Employee', type: 'ref', ref: REF.employee, showIf: (v) => ['Salary', 'Salary Advance'].includes(v.category), help: 'Salaries are normally paid from Payroll, advances from Salary Advances' },
    { name: 'amount', label: 'Amount', type: 'currency', required: true },
    { name: 'mode', label: 'Mode', type: 'select', options: C.PAYMENT_MODES, default: 'Bank Transfer' },
    { name: 'reference', label: 'Reference / UTR / Cheque no.' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export const expenses = {
  key: 'expenses', endpoint: '/expenses', module: 'expenses', icon: 'cash-outline',
  title: 'Expenses', singular: 'Expense',
  card: (r) => ({ title: r.description, sub: [r.code, fmtDate(r.date, 'dd MMM yy'), r.category].filter(Boolean).join(' · '), amount: money(r.amount), meta: [pname(r), r.paidTo && `Paid to ${r.paidTo}`, r.mode], image: r.receipt }),
  filters: [{ name: 'project', label: 'Project', ref: REF.project }, { name: 'category', label: 'Category', options: C.EXPENSE_CATEGORIES }],
  defaults: () => ({ date: new Date().toISOString() }),
  fields: [
    projectField({ required: false }),
    { name: 'category', label: 'Category', type: 'select', options: C.EXPENSE_CATEGORIES, default: 'Site Expense' },
    { name: 'description', label: 'Description', required: true },
    { name: 'amount', label: 'Amount', type: 'currency', required: true },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'paidTo', label: 'Paid to' },
    { name: 'mode', label: 'Mode', type: 'select', options: C.PAYMENT_MODES, default: 'Cash' },
    { name: 'receipt', label: 'Receipt', type: 'file' },
  ],
};

/* =====================================================================
 * HR & PAYROLL
 * ===================================================================== */
const SAL = 'Salary (monthly)';
export const employees = {
  key: 'employees', endpoint: '/employees', module: 'employees', icon: 'id-card-outline',
  title: 'Employees', singular: 'Employee', pageSize: 50,
  card: (r) => ({ title: r.name, sub: [r.code, r.designation, r.department].filter(Boolean).join(' · '), status: r.status, amount: r.gross != null ? `${money(r.gross)}/mo` : null, meta: [r.phone, r.reportingTo?.name && `Reports to ${r.reportingTo.name}`, r.user && `Login: ${r.user.role}`] }),
  filters: [{ name: 'department', label: 'Department', options: C.DEPARTMENTS }, { name: 'status', label: 'Status', options: C.EMPLOYEE_STATUS }],
  fields: [
    { name: 'name', label: 'Full name', required: true, section: 'Personal' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, section: 'Personal' },
    { name: 'email', label: 'Email', type: 'email', section: 'Personal' },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], section: 'Personal' },
    { name: 'dob', label: 'Date of birth', type: 'date', section: 'Personal' },
    { name: 'emergencyContact', label: 'Emergency contact', section: 'Personal' },
    { name: 'address', label: 'Address', type: 'textarea', section: 'Personal' },
    { name: 'department', label: 'Department', type: 'select', options: C.DEPARTMENTS, default: 'Projects', section: 'Job' },
    { name: 'designation', label: 'Designation', section: 'Job' },
    { name: 'joiningDate', label: 'Date of joining', type: 'date', section: 'Job' },
    { name: 'reportingTo', label: 'Reports to', type: 'ref', ref: REF.employee, help: 'Approves this employee’s leave', section: 'Job' },
    { name: 'user', label: 'Linked login', type: 'ref', ref: REF.staff, help: 'Lets the employee apply for leave and see payslips', section: 'Job' },
    { name: 'status', label: 'Status', type: 'select', options: C.EMPLOYEE_STATUS, default: 'Active', section: 'Job' },
    { name: 'exitDate', label: 'Last working day', type: 'date', showIf: (v) => v.status !== 'Active', section: 'Job' },
    { name: 'basic', label: 'Basic', type: 'currency', required: true, section: SAL },
    { name: 'hra', label: 'HRA', type: 'currency', default: 0, section: SAL },
    { name: 'allowances', label: 'Other allowances', type: 'currency', default: 0, section: SAL },
    { name: 'professionalTax', label: 'Professional tax / month', type: 'currency', default: 200, section: SAL },
    { name: 'pfApplicable', label: 'PF', type: 'checkbox', checkboxLabel: '12% of basic (capped at ₹15,000)', default: true, section: SAL },
    { name: 'esiApplicable', label: 'ESI', type: 'checkbox', checkboxLabel: '0.75% (gross up to ₹21,000)', default: false, section: SAL },
    { name: 'pan', label: 'PAN', section: 'Statutory & bank' },
    { name: 'aadhaar', label: 'Aadhaar', section: 'Statutory & bank' },
    { name: 'uan', label: 'UAN (PF)', section: 'Statutory & bank' },
    { name: 'esiNo', label: 'ESI no.', section: 'Statutory & bank' },
    { name: 'bankName', label: 'Bank', section: 'Statutory & bank' },
    { name: 'bankAccount', label: 'Account no.', section: 'Statutory & bank' },
    { name: 'ifsc', label: 'IFSC', section: 'Statutory & bank' },
  ],
  summary: (v) => {
    const gross = (Number(v.basic) || 0) + (Number(v.hra) || 0) + (Number(v.allowances) || 0);
    return [{ label: 'Gross / month', value: money(gross) }, { label: 'Gross / year', value: money(gross * 12), strong: true }];
  },
  rowActions: (r, ctx) => [
    r.phone && { label: `Call ${r.phone}`, icon: 'call-outline', onClick: () => ctx.call(r.phone) },
    ctx.can('leaves', 'edit') && { label: 'Apply leave', icon: 'calendar-clear-outline', onClick: () => ctx.nav(`/hr/leaves?create=1&employee=${r._id}`) },
    ctx.can('advances', 'edit') && { label: 'Give salary advance', icon: 'cash-outline', onClick: () => ctx.nav(`/hr/advances?create=1&employee=${r._id}`) },
  ],
  related: (r) => [
    { label: 'Leave history', path: `/hr/leaves?employee=${r._id}`, module: 'leaves' },
    { label: 'Salary advances', path: `/hr/advances?employee=${r._id}`, module: 'advances' },
  ],
};

export const leaves = {
  key: 'leaves', endpoint: '/leaves', module: 'leaves', icon: 'calendar-clear-outline',
  title: 'Leave', singular: 'Leave', createLabel: 'Apply leave',
  card: (r) => ({ title: r.employee?.name || '—', sub: [r.code, r.leaveType].filter(Boolean).join(' · '), status: r.status, amount: `${number(r.days)} day${r.days === 1 ? '' : 's'}`, meta: [r.days > 1 ? `${fmtDate(r.from, 'dd MMM')} – ${fmtDate(r.to)}` : `${fmtDate(r.from)}${r.halfDay ? ' (half)' : ''}`, r.reason, r.approvedBy?.name && `By ${r.approvedBy.name}`] }),
  filters: [
    { name: 'status', label: 'Status', options: C.LEAVE_STATUS },
    { name: 'leaveType', label: 'Type', options: C.LEAVE_TYPES },
    { name: 'employee', label: 'Employee', ref: REF.employee },
  ],
  canEditRow: (r) => r.status === 'Pending',
  fields: [
    { name: 'employee', label: 'Employee', type: 'ref', ref: REF.employee, help: 'Leave blank to apply for yourself', hrOnly: true },
    { name: 'leaveType', label: 'Leave type', type: 'select', options: C.LEAVE_TYPES, default: 'Casual Leave', required: true },
    { name: 'halfDay', label: 'Duration', type: 'checkbox', checkboxLabel: 'Half day', default: false },
    { name: 'from', label: 'From', type: 'date', required: true },
    { name: 'to', label: 'To', type: 'date', showIf: (v) => !v.halfDay, help: 'Leave blank for a single day' },
    { name: 'reason', label: 'Reason', type: 'textarea' },
  ],
  transform: (p) => ({ ...p, to: p.halfDay || !p.to ? p.from : p.to }),
  // ctx.isHR / ctx.myEmployee are filled in by the list & detail screens
  rowActions: (r, ctx) => {
    const mine = r.employee?._id === ctx.myEmployee;
    return [
      r.status === 'Pending' && (ctx.isHR || !mine) && ctx.can('leaves', 'edit') && { label: 'Approve', icon: 'checkmark-circle-outline', onClick: () => go(ctx, `/leaves/${r._id}/approve`, null, 'Leave approved · marked on attendance') },
      r.status === 'Pending' && (ctx.isHR || !mine) && ctx.can('leaves', 'edit') && { label: 'Reject', icon: 'close-circle-outline', danger: true, onClick: () => go(ctx, `/leaves/${r._id}/reject`, null, 'Leave rejected') },
      ['Pending', 'Approved'].includes(r.status) && (ctx.isHR || mine) && { label: 'Cancel leave', icon: 'ban-outline', danger: true, onClick: () => go(ctx, `/leaves/${r._id}/cancel`, null, 'Leave cancelled') },
    ];
  },
};

export const advances = {
  key: 'advances', endpoint: '/advances', module: 'advances', icon: 'cash-outline',
  title: 'Salary Advances', singular: 'Advance', createLabel: 'Give advance',
  card: (r) => ({ title: r.employee?.name || '—', sub: [r.code, fmtDate(r.date, 'dd MMM yy')].join(' · '), badge: r.status === 'Open' ? { text: 'Recovering', tone: 'amber' } : { text: 'Recovered', tone: 'green' }, amount: money(r.amount), meta: [`Instalment ${money(r.installment)}`, `Balance ${money(r.balance)}`, r.payment?.code && `Payment ${r.payment.code}`] }),
  filters: [{ name: 'status', label: 'Status', options: [{ value: 'Open', label: 'Recovering' }, { value: 'Closed', label: 'Recovered' }] }, { name: 'employee', label: 'Employee', ref: REF.employee }],
  defaults: () => ({ date: new Date().toISOString() }),
  canEditRow: (r) => r.recovered === 0,
  fields: [
    { name: 'employee', label: 'Employee', type: 'ref', ref: REF.employee, required: true },
    { name: 'amount', label: 'Amount', type: 'currency', required: true },
    { name: 'installment', label: 'Monthly recovery', type: 'currency', required: true },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'mode', label: 'Paid by', type: 'select', options: C.PAYMENT_MODES, default: 'Bank Transfer' },
    { name: 'reason', label: 'Reason', type: 'textarea' },
  ],
  summary: (v) => (Number(v.amount) > 0 && Number(v.installment) > 0 ? [{ label: 'Recovered over', value: `${Math.ceil(v.amount / v.installment)} month(s)`, strong: true }] : []),
};

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const payroll = {
  key: 'payroll', endpoint: '/payroll', module: 'payroll', icon: 'document-text-outline',
  title: 'Payroll', singular: 'Payroll', createLabel: 'Run payroll',
  formDescription: 'Includes every employee on the rolls that month with their attendance, leave and advance recoveries.',
  card: (r) => ({ title: monthLabel(r.month), sub: [r.code, `${r.lines?.length ?? 0} employees`].join(' · '), status: r.status, amount: money(r.net), meta: [`Gross ${money(r.gross)}`, `Deductions ${money(r.deductions)}`, r.paidAt && `Paid ${fmtDate(r.paidAt)}`] }),
  filters: [{ name: 'status', label: 'Status', options: C.PAYROLL_STATUS }],
  canEditRow: (r) => r.status === 'Draft',
  defaults: () => ({ month: lastMonth() }),
  fields: [
    { name: 'month', label: 'Month', type: 'month', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  afterCreate: (p, ctx) => ctx.nav(`/hr/payroll/${p._id}`),
  detailActions: (p, ctx) => {
    const canEdit = ctx.can('payroll', 'edit');
    const draft = p.status === 'Draft' && canEdit;
    const run = (url, success, body) => go(ctx, `/payroll/${p._id}/${url}`, body, success);
    return [
      draft && {
        label: 'Approve payroll', icon: 'checkmark-circle-outline', primary: true,
        onClick: async () => { if (await ctx.confirm({ title: `Approve payroll for ${monthLabel(p.month)}?`, message: `Net pay ${money(p.net)} for ${p.lines.length} employee(s). Payslips become visible to employees.`, confirmText: 'Approve', destructive: false })) run('approve', 'Payroll approved'); },
      },
      draft && {
        label: 'Recalculate', icon: 'refresh-outline',
        onClick: async () => { if (await ctx.confirm({ title: 'Recalculate payroll?', message: 'Attendance, leave and advances are read again. Bonus and other deductions are kept.', confirmText: 'Recalculate', destructive: false })) run('regenerate', 'Payroll recalculated'); },
      },
      p.status === 'Approved' && canEdit && {
        label: 'Pay salaries', icon: 'wallet-outline', primary: true,
        onClick: async () => {
          const v = await ctx.prompt({
            title: 'Pay salaries', description: `Net ${money(p.net)} — one salary payment per employee is recorded.`, submitText: 'Pay',
            initial: { date: new Date().toISOString(), mode: 'Bank Transfer' },
            fields: [{ name: 'date', label: 'Payment date', type: 'date' }, { name: 'mode', label: 'Mode', type: 'select', options: C.PAYMENT_MODES }, { name: 'reference', label: 'Reference / batch no.' }],
          });
          if (v) run('pay', 'Salaries paid · payments recorded', v);
        },
      },
      p.status === 'Approved' && canEdit && { label: 'Reopen', icon: 'arrow-undo-outline', onClick: () => run('reopen', 'Payroll reopened') },
    ];
  },
};

/* =====================================================================
 * ADMIN
 * ===================================================================== */
export const users = {
  key: 'users', endpoint: '/users', module: 'users', icon: 'people-circle-outline',
  title: 'Users & Roles', singular: 'User',
  card: (r) => ({ title: r.name, sub: r.email, badge: { text: r.role, tone: ['Client', 'Contractor', 'Worker'].includes(r.role) ? 'violet' : r.role?.includes('Admin') ? 'brand' : 'blue' }, meta: [r.designation, r.phone, r.active ? null : 'Disabled', r.lastLogin && `Last login ${fmtDate(r.lastLogin, 'dd MMM')}`] }),
  filters: [{ name: 'role', label: 'Role', options: C.ROLES }],
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email (login)', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: C.ROLES, required: true, default: 'Site Engineer' },
    { name: 'designation', label: 'Designation' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, help: 'Min 6 characters. When editing, leave blank to keep the current password.' },
    { name: 'client', label: 'Linked client (portal)', type: 'ref', ref: REF.client, showIf: (v) => v.role === 'Client' },
    { name: 'subcontractor', label: 'Linked subcontractor', type: 'ref', ref: REF.subcontractor, showIf: (v) => v.role === 'Contractor' },
    { name: 'worker', label: 'Linked worker', type: 'ref', ref: REF.worker, showIf: (v) => v.role === 'Worker' },
    { name: 'active', label: 'Account active', type: 'checkbox', default: true },
  ],
};

export const RESOURCES = {
  leads, clients, siteVisits, boq, quotations, activities, tickets, projects, tasks, dailyReports, rooms, documents,
  materials, stockTxns, materialRequests, vendors, rfqs, purchaseOrders, workers, attendanceRegister, subcontractors,
  workOrders, measurements, bills, payments, expenses, employees, leaves, advances, payroll, users,
};

export { refName };
