import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, TONES } from '../lib/theme';
import { STATUS_TONE } from '../lib/constants';

export { C };

/* ---------------- layout ---------------- */
export function Screen({ children, refreshing, onRefresh, padded = true, footer, scroll = true }) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded && { padding: 16 }, { paddingBottom: (footer ? 16 : insets.bottom + 24) }]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.brand} colors={[C.brand]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : <View style={[{ flex: 1 }, padded && { padding: 16 }]}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {body}
      {footer && <View style={[s.footer, { paddingBottom: insets.bottom + 10 }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress }) {
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }, style]}>{children}</Pressable>;
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }, style]}>
      <Text style={s.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Row({ children, style, gap = 8 }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 10 }} />;
}

/* ---------------- text & badges ---------------- */
export function Badge({ children, tone = 'slate' }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={[s.badgeText, { color: t.fg }]} numberOfLines={1}>{children}</Text>
    </View>
  );
}
export const StatusBadge = ({ value }) => (value ? <Badge tone={STATUS_TONE[value] || 'slate'}>{value}</Badge> : null);

export function Progress({ value = 0, style }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <View style={s.progressTrack}><View style={[s.progressBar, { width: `${v}%`, backgroundColor: v >= 100 ? C.success : C.brand }]} /></View>
      <Text style={{ fontSize: 11, color: C.text2, width: 34, textAlign: 'right' }}>{Math.round(v)}%</Text>
    </View>
  );
}

export function KeyValue({ label, value, children }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      {children || <Text style={s.kvValue} selectable>{value == null || value === '' ? '—' : String(value)}</Text>}
    </View>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'brand', onPress }) {
  const t = TONES[tone] || TONES.brand;
  return (
    <Card style={s.stat} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
        {icon && <View style={[s.statIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={14} color={t.fg} /></View>}
      </Row>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>{value ?? '—'}</Text>
      {hint ? <Text style={s.statHint} numberOfLines={1}>{hint}</Text> : null}
    </Card>
  );
}

export function Grid({ children, cols = 2 }) {
  const items = Array.isArray(children) ? children.filter(Boolean).flat() : [children];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
      {items.map((c, i) => <View key={i} style={{ width: `${100 / cols}%`, padding: 5 }}>{c}</View>)}
    </View>
  );
}

/* ---------------- buttons & inputs ---------------- */
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }) {
  const v = BTN[variant] || BTN.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: v.bg, borderColor: v.border }, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} /> : null}
      {title ? <Text style={[s.btnText, small && { fontSize: 13 }, { color: v.fg }]} numberOfLines={1}>{title}</Text> : null}
    </Pressable>
  );
}
const BTN = {
  primary: { bg: C.brand, fg: '#fff', border: C.brand },
  secondary: { bg: '#fff', fg: C.text, border: C.border },
  soft: { bg: C.brandSoft, fg: C.brandDark, border: C.brandSoft },
  danger: { bg: '#fff', fg: C.danger, border: '#fecaca' },
  success: { bg: C.success, fg: '#fff', border: C.success },
  ghost: { bg: 'transparent', fg: C.brandDark, border: 'transparent' },
};

export function Input({ style, multiline, ...props }) {
  return (
    <TextInput
      placeholderTextColor={C.muted}
      style={[s.input, multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }, props.editable === false && { backgroundColor: C.divider, color: C.text2 }, style]}
      multiline={multiline}
      {...props}
    />
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…' }) {
  return (
    <View style={s.search}>
      <Ionicons name="search" size={17} color={C.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} style={{ flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 }} returnKeyType="search" autoCorrect={false} />
      {value ? <Pressable onPress={() => onChangeText('')} hitSlop={10}><Ionicons name="close-circle" size={17} color={C.muted} /></Pressable> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, count }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.brand, borderColor: C.brand }]}>
      <Text style={[s.chipText, active && { color: '#fff' }]} numberOfLines={1}>{label}{count != null ? `  ${count}` : ''}</Text>
    </Pressable>
  );
}

export function Field({ label, required, error, hint, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}{required ? <Text style={{ color: C.danger }}> *</Text> : null}</Text> : null}
      {children}
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------------- states ---------------- */
export function Loader({ style }) {
  return <View style={[{ padding: 40, alignItems: 'center' }, style]}><ActivityIndicator color={C.brand} size="large" /></View>;
}

export function Empty({ icon = 'file-tray-outline', title, description, action }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={s.emptyIcon}><Ionicons name={icon} size={28} color={C.brand} /></View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center' }}>{title}</Text>
      {description ? <Text style={{ fontSize: 13, color: C.text2, textAlign: 'center', marginTop: 4 }}>{description}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorView({ error, onRetry }) {
  return <Empty icon="cloud-offline-outline" title="Could not load" description={error?.response?.data?.message || error?.message} action={onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />} />;
}

/* ---------------- bottom sheet ---------------- */
export function Sheet({ visible, onClose, title, children, footer, full }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.sheet, full && { height: '88%' }, { paddingBottom: insets.bottom + 8 }]}>
          <View style={s.sheetHandle} />
          {title ? (
            <Row style={{ paddingHorizontal: 16, paddingBottom: 8, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, flex: 1 }} numberOfLines={1}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12}><Ionicons name="close" size={22} color={C.text2} /></Pressable>
            </Row>
          ) : null}
          <View style={full ? { flex: 1 } : { maxHeight: 560 }}>{children}</View>
          {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', gap: 10 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Button row at the bottom of a sheet whose body scrolls */
Sheet.Footer = function SheetFooter({ children }) {
  return <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }}>{children}</View>;
};

/** Pressable list row used in menus and action sheets */
export function ListRow({ icon, label, sub, onPress, danger, right, tone }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.listRow, pressed && { backgroundColor: C.divider }]}>
      {icon ? <View style={[s.rowIcon, tone && { backgroundColor: (TONES[tone] || TONES.brand).bg }]}><Ionicons name={icon} size={18} color={danger ? C.danger : tone ? (TONES[tone] || TONES.brand).fg : C.brandDark} /></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[{ fontSize: 15, color: C.text }, danger && { color: C.danger }]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={{ fontSize: 12, color: C.text2, marginTop: 1 }} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={17} color={C.muted} /> : null)}
    </Pressable>
  );
}

/* ---------------- toast + confirm ---------------- */
const ToastCtx = createContext({ show: () => {} });
let globalToast = () => {};
export const toast = {
  success: (m) => globalToast(m, 'success'),
  error: (m) => globalToast(m, 'error'),
};

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef();
  const show = useCallback((text, type = 'success') => {
    clearTimeout(timer.current);
    setMsg({ text, type });
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null)), type === 'error' ? 4000 : 2400);
  }, [anim]);
  useEffect(() => { globalToast = show; }, [show]);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={[s.toast, { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }, msg.type === 'error' && { backgroundColor: '#7f1d1d' }]}>
          <Ionicons name={msg.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, flex: 1 }}>{msg.text}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

/** Promise-based confirm dialog */
export const confirm = ({ title = 'Are you sure?', message, confirmText = 'OK', destructive = true } = {}) =>
  new Promise((resolve) => {
    if (Platform.OS === 'web') return resolve(globalThis.confirm?.(`${title}\n${message || ''}`) ?? true);
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.8 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start', maxWidth: 200 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.divider, overflow: 'hidden' },
  progressBar: { height: 6, borderRadius: 3 },
  kv: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  kvLabel: { fontSize: 12, color: C.muted, marginBottom: 2 },
  kvValue: { fontSize: 15, color: C.text },
  stat: { padding: 12 },
  statLabel: { fontSize: 12, color: C.text2, flex: 1 },
  statIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 21, fontWeight: '700', color: C.text, marginTop: 6 },
  statHint: { fontSize: 11, color: C.muted, marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  btnSmall: { height: 34, paddingHorizontal: 12, borderRadius: 9 },
  btnText: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 44, fontSize: 15, color: C.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  chip: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', maxWidth: 220 },
  chipText: { fontSize: 13, color: C.text2, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: C.text2, marginBottom: 6 },
  error: { fontSize: 12, color: C.danger, marginTop: 4 },
  hint: { fontSize: 12, color: C.muted, marginTop: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, zIndex: 999, elevation: 10 },
});
