import { AbstractControl, ValidationErrors } from '@angular/forms';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Latin lowercase slug: letters, digits and single hyphens. Empty is allowed (combine with required). */
export function slugValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  return v === '' || SLUG_PATTERN.test(v) ? null : { slug: true };
}

/** Contract pattern for image/canonical URLs: `^https?://\S+$`. Empty is allowed. */
export const HTTP_URL_PATTERN = /^https?:\/\/\S+$/;
export function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').trim();
  return v === '' || HTTP_URL_PATTERN.test(v) ? null : { url: true };
}
