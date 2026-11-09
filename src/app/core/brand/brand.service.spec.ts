import { TestBed } from '@angular/core/testing';
import { BrandService, isValidHex } from './brand.service';

describe('BrandService', () => {
  it('validates HEX colours strictly', () => {
    expect(isValidHex('#3f4c9a')).toBe(true);
    expect(isValidHex('red')).toBe(false);
    expect(isValidHex('#fff')).toBe(false);
    expect(isValidHex('url(javascript:alert(1))')).toBe(false);
  });

  it('applies valid colours and ignores invalid ones; reset removes them', () => {
    const svc = TestBed.inject(BrandService);
    svc.apply({
      primaryColor: '#112233',
      secondaryColor: 'expression(evil)',
      logoUrl: 'http://insecure/logo.png',
    });
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--brand-primary')).toBe('#112233');
    expect(style.getPropertyValue('--brand-secondary')).toBe('');
    expect(svc.logoUrl()).toBeNull();
    svc.reset();
    expect(style.getPropertyValue('--brand-primary')).toBe('');
  });
});
