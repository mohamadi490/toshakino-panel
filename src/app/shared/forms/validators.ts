import { AbstractControl, ValidationErrors } from '@angular/forms';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Latin lowercase slug: letters, digits and single hyphens. Empty is allowed (combine with required). */
export function slugValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  return v === '' || SLUG_PATTERN.test(v) ? null : { slug: true };
}
