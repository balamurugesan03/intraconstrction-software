import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button, C, Field, Input, Row, SearchBar, Sheet, toast } from './ui';
import { errMsg, fileUrl, get, uploadFiles } from '../lib/api';
import { dateInput, fmtDate, getPath, isImage, money, monthLabel } from '../lib/format';
import { useDebounce } from '../lib/hooks';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/* =====================================================================
 * value <-> payload conversion (same rules as the web form)
 * ===================================================================== */
function toFormValue(field, raw) {
  if (field.type === 'ref') return raw === null && field.ref?.nullLabel ? null : idOf(raw) ?? '';
  if (field.type === 'multiref') return (raw || []).map(idOf);
  if (field.type === 'date') return dateInput(raw);
  if (field.type === 'items') {
    return (raw || []).map((row) => {
      const out = { ...row };
      for (const c of field.columns) if (!c.computed) out[c.name] = toFormValue(c, row[c.name]);
      return out;
    });
  }
  if (field.type === 'files') return raw || [];
  return raw ?? (field.type === 'checkbox' ? false : '');
}

// Blank optional dropdowns must not reach the server as '' (an invalid enum value): on create they are
// left out so the model default applies, on edit they are cleared with null.
function toPayload(field, v, isNew) {
  if (field.type === 'select' && v === '') return isNew ? undefined : null;
  if (['ref', 'date', 'number', 'currency', 'percent', 'month'].includes(field.type) && v === '') return null;
  if (field.type === 'items') {
    return (v || []).map((row) => {
      const out = { ...row };
      for (const c of field.columns) {
        if (c.computed) continue;
        out[c.name] = toPayload(c, row[c.name], isNew);
      }
      return out;
    });
  }
  return v;
}

const isRequired = (f, isNew) => f.required || (isNew && f.requiredOnCreate);

export function buildInitial(fields, record, defaults = {}) {
  const v = {};
  for (const f of fields) {
    const raw = record ? getPath(record, f.name) : defaults[f.name] ?? f.default;
    v[f.name] = toFormValue(f, typeof raw === 'function' ? raw() : raw);
  }
  return v;
}

export function buildPayload(fields, values, hidden = {}, isNew = false) {
  const out = { ...hidden };
  for (const f of fields) {
    if (f.showIf && !f.showIf(values)) continue;
    if (f.readOnly) continue;
    const v = toPayload(f, values[f.name], isNew);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

/* =====================================================================
 * Form hook + renderer
 * ===================================================================== */
export function useForm(fields, record, defaults, hidden = {}) {
  const [values, setValues] = useState(() => buildInitial(fields, record, defaults));
  const [errors, setErrors] = useState({});
  const set = (name, v, obj, field) => {
    setValues((s) => {
      const next = { ...s, [name]: v };
      if (field?.onSelect && obj !== undefined) Object.assign(next, field.onSelect(obj, next) || {});
      return next;
    });
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const visible = fields.filter((f) => !(f.name in hidden) && !f.hidden && (!f.showIf || f.showIf(values)));
  const validate = () => {
    const errs = {};
    for (const f of visible) {
      const v = values[f.name];
      if (isRequired(f, !record) && (v === '' || v == null || (Array.isArray(v) && !v.length))) errs[f.name] = `${f.label} is required`;
      if (f.type === 'items') {
        (v || []).forEach((row, i) => f.columns.forEach((c) => {
          if (c.required && !c.computed && (row[c.name] === '' || row[c.name] == null)) errs[f.name] = `${f.itemLabel || 'Item'} ${i + 1}: ${c.label} is required`;
        }));
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) toast.error(Object.values(errs)[0]);
    return !Object.keys(errs).length;
  };
  const payload = () => buildPayload(fields, values, hidden, !record);
  return { values, setValues, set, errors, visible, validate, payload };
}

export function FormFields({ form, record, summary, hidden = {} }) {
  const { values, set, errors, visible } = form;
  const sections = useMemo(() => {
    const out = [];
    for (const f of visible) {
      const s = f.section || '';
      let sec = out.find((x) => x.name === s);
      if (!sec) out.push((sec = { name: s, fields: [] }));
      sec.fields.push(f);
    }
    return out;
  }, [visible]);
  const sum = summary?.({ ...hidden, ...values });

  return (
    <View>
      {sections.map((sec) => (
        <View key={sec.name || '_'} style={sec.name ? { marginBottom: 6 } : null}>
          {sec.name ? <Text style={st.section}>{sec.name}</Text> : null}
          {sec.fields.map((f) => (
            <Field key={f.name} label={f.type === 'items' || f.type === 'checkbox' ? null : f.label} required={isRequired(f, !record)} error={errors[f.name]} hint={f.help}>
              {f.type === 'items' ? (
                <ItemsEditor field={f} rows={values[f.name]} initialRows={record?.[f.name]} onChange={(rows) => set(f.name, rows)} />
              ) : (
                <Control field={f} value={values[f.name]} values={values} initial={record ? getPath(record, f.name) : undefined} onChange={(v, obj) => set(f.name, v, obj, f)} />
              )}
            </Field>
          ))}
        </View>
      ))}
      {sum?.length > 0 && <SummaryBox items={sum} />}
    </View>
  );
}

export function SummaryBox({ items }) {
  return (
    <View style={st.summary}>
      {items.map((s) => (
        <View key={s.label} style={[st.sumRow, s.strong && st.sumStrong]}>
          <Text style={[{ color: C.text2, fontSize: 14 }, s.strong && { color: C.text, fontWeight: '700', fontSize: 15 }]}>{s.label}</Text>
          <Text style={[{ color: C.text, fontSize: 14 }, s.strong && { fontWeight: '700', fontSize: 16 }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

/* =====================================================================
 * Controls
 * ===================================================================== */
export function Control({ field, value, onChange, values, initial }) {
  const disabled = field.readOnly || (field.disabledIf && field.disabledIf(values));
  switch (field.type) {
    case 'textarea':
      return <Input multiline value={value ?? ''} onChangeText={onChange} placeholder={field.placeholder} editable={!disabled} />;
    case 'select':
      return <SelectPicker label={field.label} options={typeof field.options === 'function' ? field.options(values) : field.options} value={value ?? ''} onChange={onChange} allowEmpty={!field.required} disabled={disabled} />;
    case 'ref':
    case 'multiref':
      return (
        <RefPicker
          label={field.label}
          refDef={field.ref}
          params={typeof field.ref.params === 'function' ? field.ref.params(values) : field.ref.params}
          multiple={field.type === 'multiref'}
          value={value}
          initial={initial}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'checkbox':
      return (
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text2 }}>{field.label}</Text>
            {field.checkboxLabel ? <Text style={{ fontSize: 13, color: C.muted }}>{field.checkboxLabel}</Text> : null}
          </View>
          <Switch value={!!value} onValueChange={onChange} trackColor={{ true: C.gold, false: C.border }} thumbColor="#fff" disabled={disabled} />
        </Row>
      );
    case 'date':
      return <DateInput value={value} onChange={onChange} disabled={disabled} />;
    case 'month':
      return <MonthPicker value={value} onChange={onChange} />;
    case 'files':
      return <FilesInput value={value || []} onChange={onChange} />;
    case 'file':
      return <FileInput value={value} onChange={onChange} />;
    case 'number':
    case 'currency':
    case 'percent':
      return (
        <View style={{ justifyContent: 'center' }}>
          {field.type === 'currency' && <Text style={st.prefix}>₹</Text>}
          <Input
            keyboardType="decimal-pad"
            value={value === '' || value == null ? '' : String(value)}
            onChangeText={(t) => {
              const clean = t.replace(/[^0-9.-]/g, '');
              if (clean === '' || clean === '-') return onChange('');
              if (/\.$/.test(clean) || /\.\d*0$/.test(clean)) return onChange(clean); // keep "12." / "1.50" while typing
              const n = Number(clean);
              onChange(Number.isNaN(n) ? '' : n);
            }}
            onBlur={() => { if (typeof value === 'string' && value !== '') onChange(Number(value) || 0); }}
            placeholder={field.placeholder}
            editable={!disabled}
            style={[field.type === 'currency' && { paddingLeft: 26 }, field.type === 'percent' && { paddingRight: 30 }]}
          />
          {field.type === 'percent' && <Text style={[st.prefix, { left: undefined, right: 12 }]}>%</Text>}
        </View>
      );
    default:
      return (
        <Input
          value={value ?? ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          editable={!disabled}
          secureTextEntry={field.type === 'password'}
          keyboardType={field.type === 'email' ? 'email-address' : field.type === 'tel' ? 'phone-pad' : 'default'}
          autoCapitalize={['email', 'password'].includes(field.type) ? 'none' : 'sentences'}
          autoCorrect={!['email', 'password', 'tel'].includes(field.type)}
        />
      );
  }
}

function PickerButton({ text, placeholder, onPress, onClear, disabled, icon = 'chevron-down' }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[st.picker, disabled && { backgroundColor: C.divider }]}>
      <Text style={[{ flex: 1, fontSize: 15, color: text ? C.text : C.muted }]} numberOfLines={2}>{text || placeholder}</Text>
      {onClear && text && !disabled ? (
        <Pressable onPress={onClear} hitSlop={10}><Ionicons name="close-circle" size={18} color={C.muted} /></Pressable>
      ) : <Ionicons name={icon} size={18} color={C.muted} />}
    </Pressable>
  );
}

/* ---------------- select ---------------- */
const optValue = (o) => (typeof o === 'object' ? o.value : o);
const optLabel = (o) => (typeof o === 'object' ? o.label : o);

export function SelectPicker({ label, options = [], value, onChange, allowEmpty, disabled, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => optValue(o) === value);
  const list = allowEmpty ? [{ value: '', label: '— None —' }, ...options] : options;
  return (
    <>
      <PickerButton text={current ? optLabel(current) : ''} placeholder={placeholder} onPress={() => setOpen(true)} disabled={disabled} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={list}
          keyExtractor={(o) => String(optValue(o))}
          renderItem={({ item }) => {
            const active = optValue(item) === value;
            return (
              <Pressable onPress={() => { onChange(optValue(item)); setOpen(false); }} style={[st.option, active && { backgroundColor: C.brandLight }]}>
                <Text style={{ flex: 1, fontSize: 15, color: C.text }}>{optLabel(item)}</Text>
                {active && <Ionicons name="checkmark" size={18} color={C.brand} />}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </>
  );
}

/* ---------------- reference (searchable, server-backed) ---------------- */
const labelCache = new Map();
const defaultLabel = (o) => {
  if (!o || typeof o !== 'object') return '';
  const main = o.name || o.title || o.email || '';
  return o.code ? `${o.code} · ${main}` : main;
};
const remember = (o, labelOf = defaultLabel) => {
  if (o && typeof o === 'object' && o._id) labelCache.set(String(o._id), labelOf(o));
};

export function RefPicker({ label, refDef, params, value, onChange, multiple, initial, disabled, placeholder = 'Select…' }) {
  const { endpoint, lookup, nullLabel } = refDef;
  const labelOf = refDef.label || defaultLabel;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const [, force] = useState(0);

  useEffect(() => {
    (Array.isArray(initial) ? initial : [initial]).forEach((o) => remember(o, labelOf));
    force((n) => n + 1);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isFetching } = useQuery({
    queryKey: [endpoint, { ...params, q: lookup ? undefined : dq, limit: lookup ? 500 : 30, _sel: 1 }],
    queryFn: () => get(endpoint, { ...params, q: lookup ? undefined : dq || undefined, limit: lookup ? 500 : 30 }),
    enabled: open || (!!lookup && !!value && (!Array.isArray(value) || value.length > 0)),
    staleTime: 30_000,
  });
  let options = data?.items || [];
  if (lookup && dq) options = options.filter((o) => labelOf(o).toLowerCase().includes(dq.toLowerCase()));
  options.forEach((o) => remember(o, labelOf));

  const ids = multiple ? value || [] : value ? [value] : [];
  const missing = ids.filter((id) => !labelCache.has(String(id)));
  const { data: fetched } = useQuery({
    queryKey: [endpoint, 'byId', missing[0]],
    queryFn: () => get(`${endpoint}/${missing[0]}`),
    enabled: !lookup && missing.length > 0,
    retry: false,
  });
  if (fetched) remember(fetched, labelOf);

  const labelFor = (id) => labelCache.get(String(id)) || '…';
  const select = (o) => {
    if (multiple) {
      const cur = value || [];
      onChange(cur.includes(o._id) ? cur.filter((x) => x !== o._id) : [...cur, o._id], o);
    } else {
      onChange(o ? o._id : nullLabel ? null : '', o);
      setOpen(false);
      setQ('');
    }
  };

  const display = multiple ? (ids.length ? ids.map(labelFor).join(', ') : '') : value ? labelFor(value) : value === null && nullLabel ? nullLabel : '';

  return (
    <>
      <PickerButton
        text={display}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
        onClear={() => onChange(multiple ? [] : nullLabel ? null : '', null)}
        disabled={disabled}
        icon="search"
      />
      <Sheet visible={open} onClose={() => { setOpen(false); setQ(''); }} title={label} full footer={multiple ? <Button title={`Done${ids.length ? ` (${ids.length})` : ''}`} onPress={() => setOpen(false)} style={{ flex: 1 }} /> : null}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><SearchBar value={q} onChangeText={setQ} placeholder="Type to search…" /></View>
        {isFetching && !options.length ? <ActivityIndicator color={C.brand} style={{ marginTop: 24 }} /> : (
          <FlatList
            data={nullLabel && !multiple ? [{ _id: '__null', __null: true }, ...options] : options}
            keyExtractor={(o) => o._id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: C.muted, marginTop: 24 }}>No results</Text>}
            renderItem={({ item }) => {
              if (item.__null) {
                return (
                  <Pressable onPress={() => select(null)} style={[st.option, value === null && { backgroundColor: C.brandLight }]}>
                    <Text style={{ flex: 1, fontSize: 15, color: C.text }}>{nullLabel}</Text>
                  </Pressable>
                );
              }
              const active = ids.includes(item._id);
              const sub = refDef.sub?.(item);
              return (
                <Pressable onPress={() => select(item)} style={[st.option, active && { backgroundColor: C.brandLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: C.text }} numberOfLines={1}>{labelOf(item)}</Text>
                    {sub ? <Text style={{ fontSize: 12, color: C.text2 }} numberOfLines={1}>{sub}</Text> : null}
                  </View>
                  {active && <Ionicons name={multiple ? 'checkbox' : 'checkmark'} size={18} color={C.brand} />}
                </Pressable>
              );
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/* ---------------- date / month ---------------- */
export function DateInput({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  const pick = (_e, d) => {
    if (Platform.OS === 'android') setOpen(false);
    if (d) onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };
  if (Platform.OS === 'web') {
    return <Input value={value || ''} onChangeText={onChange} placeholder="YYYY-MM-DD" editable={!disabled} />;
  }
  return (
    <>
      <PickerButton text={value ? fmtDate(`${value}T00:00:00`, 'dd MMM yyyy') : ''} placeholder="Pick a date" onPress={() => setOpen(true)} onClear={() => onChange('')} disabled={disabled} icon="calendar-outline" />
      {open && Platform.OS === 'android' && <DateTimePicker value={date} mode="date" onChange={pick} />}
      {Platform.OS === 'ios' && (
        <Sheet visible={open} onClose={() => setOpen(false)} title="Pick a date" footer={<Button title="Done" onPress={() => setOpen(false)} style={{ flex: 1 }} />}>
          <DateTimePicker value={date} mode="date" display="inline" onChange={pick} accentColor={C.brand} themeVariant="light" />
        </Sheet>
      )}
    </>
  );
}

function MonthPicker({ value, onChange }) {
  const months = useMemo(() => {
    const out = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < 24; i++) {
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ value: m, label: monthLabel(m) });
      d.setMonth(d.getMonth() - 1);
    }
    return out;
  }, []);
  return <SelectPicker label="Month" options={months} value={value} onChange={onChange} />;
}

/* ---------------- uploads ---------------- */
async function pickFiles({ camera, multiple, documents }) {
  if (documents) {
    const r = await DocumentPicker.getDocumentAsync({ multiple, copyToCacheDirectory: true });
    if (r.canceled) return [];
    return r.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, file: a.file }));
  }
  if (camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error('Camera permission is needed to take photos');
      return [];
    }
  }
  const opts = { mediaTypes: ['images', 'videos'], quality: 0.7, allowsMultipleSelection: multiple && !camera };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled) return [];
  return r.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `photo-${Date.now()}-${i}.${a.type === 'video' ? 'mp4' : 'jpg'}`, mimeType: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'), size: a.fileSize, file: a.file }));
}

function useUploader(onDone) {
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const run = async (opts) => {
    setMenu(false);
    try {
      const files = await pickFiles(opts);
      if (!files.length) return;
      setBusy(true);
      onDone(await uploadFiles(files));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, menu, setMenu, run };
}

function UploadMenu({ up, multiple }) {
  return (
    <Sheet visible={up.menu} onClose={() => up.setMenu(false)} title="Add file">
      <Pressable style={st.option} onPress={() => up.run({ camera: true })}><Ionicons name="camera-outline" size={20} color={C.brand} /><Text style={st.optText}>Take photo</Text></Pressable>
      <Pressable style={st.option} onPress={() => up.run({ multiple })}><Ionicons name="images-outline" size={20} color={C.brand} /><Text style={st.optText}>Photo / video from gallery</Text></Pressable>
      <Pressable style={st.option} onPress={() => up.run({ documents: true, multiple })}><Ionicons name="document-outline" size={20} color={C.brand} /><Text style={st.optText}>Document (PDF, etc.)</Text></Pressable>
    </Sheet>
  );
}

export function FilesInput({ value, onChange }) {
  const up = useUploader((files) => onChange([...value, ...files.map((f) => f.url)]));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {value.map((u) => (
        <View key={u} style={st.thumb}>
          <Thumb url={u} />
          <Pressable onPress={() => onChange(value.filter((x) => x !== u))} style={st.thumbX} hitSlop={6}><Ionicons name="close" size={12} color="#fff" /></Pressable>
        </View>
      ))}
      <Pressable onPress={() => up.setMenu(true)} style={[st.thumb, st.addThumb]}>
        {up.busy ? <ActivityIndicator color={C.brand} /> : <Ionicons name="camera-outline" size={22} color={C.brand} />}
        <Text style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{up.busy ? 'Uploading' : 'Add'}</Text>
      </Pressable>
      <UploadMenu up={up} multiple />
    </View>
  );
}

export function FileInput({ value, onChange }) {
  const up = useUploader((files) => onChange(files[0]?.url, files[0]));
  return (
    <View style={{ gap: 8 }}>
      {value ? (
        <Pressable onPress={() => Linking.openURL(fileUrl(value))} style={[st.picker, { gap: 10 }]}>
          {isImage(value) ? <Image source={{ uri: fileUrl(value) }} style={{ width: 36, height: 36, borderRadius: 6 }} /> : <Ionicons name="document-text-outline" size={22} color={C.brand} />}
          <Text style={{ flex: 1, color: C.brandDark }} numberOfLines={1}>{value.split('/').pop()}</Text>
        </Pressable>
      ) : null}
      <Button variant="secondary" icon={up.busy ? undefined : 'cloud-upload-outline'} loading={up.busy} title={value ? 'Replace file' : 'Choose file / take photo'} onPress={() => up.setMenu(true)} />
      <UploadMenu up={up} />
    </View>
  );
}

export function Thumb({ url, size = 76 }) {
  if (isImage(url)) return <Image source={{ uri: fileUrl(url) }} style={{ width: size, height: size, borderRadius: 10 }} />;
  return (
    <Pressable onPress={() => Linking.openURL(fileUrl(url))} style={{ width: size, height: size, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.divider }}>
      <Ionicons name={/\.(mp4|mov|m4v|webm)$/i.test(url) ? 'videocam-outline' : 'document-text-outline'} size={24} color={C.text2} />
    </Pressable>
  );
}

/* ---------------- line items ---------------- */
export function ItemsEditor({ field, rows = [], onChange, initialRows = [] }) {
  const cols = field.columns;
  const blank = () => Object.fromEntries(cols.filter((c) => !c.computed).map((c) => [c.name, c.default ?? '']));
  const update = (i, name, v, obj) => {
    onChange(rows.map((r, idx) => {
      if (idx !== i) return r;
      const row = { ...r, [name]: v };
      const col = cols.find((c) => c.name === name);
      if (col?.onSelect && obj) Object.assign(row, col.onSelect(obj, row));
      return row;
    }));
  };
  const total = field.total ? rows.reduce((s, r) => s + (Number(field.total(r)) || 0), 0) : null;

  return (
    <View>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text2 }}>{field.label}</Text>
        {total != null && <Text style={{ fontSize: 13, color: C.text2 }}>Total <Text style={{ fontWeight: '700', color: C.text }}>{money(total)}</Text></Text>}
      </Row>
      {rows.map((row, i) => (
        <View key={row._id || i} style={st.itemCard}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.brandDark }}>#{i + 1} {field.itemLabel || 'item'}</Text>
            <Pressable onPress={() => onChange(rows.filter((_, idx) => idx !== i))} hitSlop={10}><Ionicons name="trash-outline" size={18} color={C.danger} /></Pressable>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {cols.map((c) => (
              <View key={c.name} style={{ width: c.third ? '33.33%' : c.half ? '50%' : '100%', paddingHorizontal: 4, marginBottom: 8 }}>
                <Text style={st.itemLabel}>{c.label}</Text>
                {c.computed ? (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, paddingVertical: 10 }}>{money(c.computed(row))}</Text>
                ) : (
                  <Control field={c} value={row[c.name]} values={row} initial={initialRows[i]?.[c.name]} onChange={(v, obj) => update(i, c.name, v, obj)} />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
      {!rows.length && <Text style={{ color: C.muted, textAlign: 'center', paddingVertical: 10 }}>No items yet</Text>}
      <Button variant="soft" icon="add" title={`Add ${field.itemLabel || 'item'}`} onPress={() => onChange([...rows, blank()])} small />
    </View>
  );
}

const st = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', color: C.brandDark, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 10 },
  summary: { backgroundColor: C.brandLight, borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: C.brandSoft },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  sumStrong: { borderTopWidth: 1, borderTopColor: C.brandSoft, marginTop: 6, paddingTop: 8 },
  prefix: { position: 'absolute', left: 12, zIndex: 1, color: C.muted, fontSize: 15 },
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 44, paddingVertical: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  optText: { fontSize: 15, color: C.text },
  thumb: { width: 76, height: 76, borderRadius: 10, overflow: 'hidden' },
  thumbX: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 2 },
  addThumb: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brandLight },
  itemCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginBottom: 10, backgroundColor: '#fcfcfd' },
  itemLabel: { fontSize: 11, color: C.text2, marginBottom: 4 },
});
