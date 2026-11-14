/** Open string key: the backend owns the state machines; the UI only labels keys it knows. */
export type StatusKey = string;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  confirmed: 'تأییدشده',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  returned: 'مرجوع‌شده',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  initiated: 'آغاز‌شده',
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  cancelled: 'لغوشده',
  refunded: 'بازپرداخت‌شده',
};

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار ارسال',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  returned: 'مرجوع‌شده',
};

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<string, Tone> = {
  paid: 'success',
  delivered: 'success',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  pending: 'warning',
  initiated: 'warning',
  failed: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  returned: 'danger',
  refunded: 'neutral',
};

export const toneOf = (key: StatusKey): Tone => TONES[key] ?? 'neutral';

export const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-muted text-muted',
};

export const labelOf = (
  labels: Record<string, string>,
  key: StatusKey | null | undefined,
): string => (key ? (labels[key] ?? key) : '—');

/** Cancelling is a separate permission (`orders.cancel`) from other status changes. */
export const isCancelStatus = (key: StatusKey): boolean =>
  key === 'cancelled' || key === 'canceled';
