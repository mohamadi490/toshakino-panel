import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Copies backend `fieldErrors` onto matching form controls as a `server` error.
 * Returns the keys that matched no control so callers can show them in a summary.
 */
export function applyFieldErrors(form: FormGroup, fieldErrors: Record<string, string[]>): string[] {
  const unmatched: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const control = form.get(field);
    if (control && messages.length > 0) {
      control.setErrors({ ...(control.errors ?? {}), server: messages[0] });
      control.markAsTouched();
    } else {
      unmatched.push(field);
    }
  }
  return unmatched;
}

const MESSAGES: Record<string, (e: unknown) => string> = {
  required: () => 'این فیلد الزامی است.',
  email: () => 'ایمیل معتبر نیست.',
  pattern: () => 'قالب واردشده معتبر نیست.',
  minlength: (e) => `حداقل ${(e as { requiredLength: number }).requiredLength} کاراکتر وارد کنید.`,
  maxlength: (e) => `حداکثر ${(e as { requiredLength: number }).requiredLength} کاراکتر مجاز است.`,
  contact: () => 'حداقل یکی از ایمیل یا موبایل را وارد کنید.',
};

export function firstErrorMessage(control: AbstractControl | null): string {
  if (!control || !control.errors || !(control.touched || control.dirty)) return '';
  const errors = control.errors;
  if (typeof errors['server'] === 'string') return errors['server'];
  for (const key of Object.keys(errors)) {
    const fn = MESSAGES[key];
    if (fn) return fn(errors[key]);
  }
  return 'مقدار واردشده معتبر نیست.';
}
