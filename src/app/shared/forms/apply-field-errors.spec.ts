import { FormControl, FormGroup, Validators } from '@angular/forms';
import { applyFieldErrors, firstErrorMessage } from './apply-field-errors';

describe('field errors', () => {
  const make = () =>
    new FormGroup({ email: new FormControl(''), name: new FormControl('', Validators.required) });

  it('maps backend fieldErrors to controls and reports unmatched keys', () => {
    const form = make();
    const unmatched = applyFieldErrors(form, { email: ['ایمیل تکراری است'], unknown: ['x'] });
    expect(unmatched).toEqual(['unknown']);
    expect(firstErrorMessage(form.get('email'))).toBe('ایمیل تکراری است');
  });

  it('shows nothing until the control is touched or dirty', () => {
    const c = new FormControl('', Validators.required);
    expect(firstErrorMessage(c)).toBe('');
    c.markAsTouched();
    expect(firstErrorMessage(c)).toBe('این فیلد الزامی است.');
  });
});
