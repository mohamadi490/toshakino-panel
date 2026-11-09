import { TestBed } from '@angular/core/testing';
import { APPEARANCE_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system and resolves to light/dark', () => {
    const svc = TestBed.inject(ThemeService);
    expect(svc.preference()).toBe('system');
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'));
  });

  it('persists an explicit choice and applies it to <html>', () => {
    const svc = TestBed.inject(ThemeService);
    svc.set('dark');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    svc.set('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
