import { format, formatDistanceToNowStrict, isValid } from 'date-fns';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const money = (v, exact = false) => (v == null || v === '' ? '—' : (exact ? inr2 : inr).format(Number(v) || 0));

/** ₹12.5L / ₹1.2Cr style for KPI cards */
export function moneyShort(v) {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}K`;
  return `${s}₹${Math.round(a)}`;
}

export const number = (v) => (v == null || v === '' ? '—' : num.format(Number(v) || 0));

const toDate = (v) => (v ? new Date(v) : null);
export const fmtDate = (v, f = 'dd MMM yyyy') => {
  const d = toDate(v);
  return d && isValid(d) ? format(d, f) : '—';
};
export const fmtDateTime = (v) => fmtDate(v, 'dd MMM yyyy, hh:mm a');
export const ago = (v) => {
  const d = toDate(v);
  return d && isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : '';
};
/** yyyy-mm-dd (calendar day in UTC, matching how the API stores dates) */
export const dateInput = (v) => {
  const d = toDate(v);
  return d && isValid(d) ? d.toISOString().slice(0, 10) : '';
};
export const today = () => new Date().toISOString().slice(0, 10);
export const monthLabel = (m) => fmtDate(m ? `${m}-01T00:00:00` : null, 'MMMM yyyy');

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

export const isImage = (u = '') => /\.(png|jpe?g|gif|webp|avif|heic)$/i.test(u);
export const overdue = (d) => !!d && new Date(d) < new Date(new Date().toDateString());

/** Label for a populated reference object */
export const refName = (o) => {
  if (!o || typeof o !== 'object') return '';
  const main = o.name || o.title || o.company || o.email || '';
  return o.code ? `${o.code} · ${main}` : main;
};
