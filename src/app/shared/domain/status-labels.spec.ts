import { ORDER_STATUS_LABELS, isCancelStatus, labelOf, toneOf } from './status-labels';

describe('order labels', () => {
  it('labels known keys and falls back to the raw key for unknown ones', () => {
    expect(labelOf(ORDER_STATUS_LABELS, 'shipped')).toBe('ارسال‌شده');
    expect(labelOf(ORDER_STATUS_LABELS, 'brand_new_state')).toBe('brand_new_state');
    expect(labelOf(ORDER_STATUS_LABELS, null)).toBe('—');
  });
  it('maps tones and defaults to neutral', () => {
    expect(toneOf('paid')).toBe('success');
    expect(toneOf('failed')).toBe('danger');
    expect(toneOf('???')).toBe('neutral');
  });
  it('recognises both spellings of cancel', () => {
    expect(isCancelStatus('cancelled')).toBe(true);
    expect(isCancelStatus('canceled')).toBe(true);
    expect(isCancelStatus('shipped')).toBe(false);
  });
});
