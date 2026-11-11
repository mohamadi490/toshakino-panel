import { FormControl } from '@angular/forms';
import { slugValidator } from './validators';

describe('slugValidator', () => {
  it.each(['soft-mattress', 'a', 'size-90x200', 'x1'])('accepts %s', (v) =>
    expect(slugValidator(new FormControl(v))).toBeNull(),
  );
  it.each(['Soft', 'a b', 'a--b', '-a', 'a-', 'تشک', 'a_b', 'a/b'])('rejects %s', (v) =>
    expect(slugValidator(new FormControl(v))).toEqual({ slug: true }),
  );
  it('allows empty (required handles that)', () =>
    expect(slugValidator(new FormControl(''))).toBeNull());
});
