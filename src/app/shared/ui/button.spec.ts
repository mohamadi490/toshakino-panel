import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button';

@Component({
  imports: [ButtonComponent],
  template: `<button app-button type="button" [loading]="loading()" [disabled]="off()">x</button>`,
})
class Host {
  readonly loading = signal(false);
  readonly off = signal(false);
}

describe('ButtonComponent', () => {
  async function setup() {
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    return { f, btn: (f.nativeElement as HTMLElement).querySelector('button')! };
  }

  it('is enabled by default', async () => expect((await setup()).btn.disabled).toBe(false));

  it('honours an external disabled and the loading state independently', async () => {
    const { f, btn } = await setup();
    f.componentInstance.off.set(true);
    await f.whenStable();
    expect(btn.disabled).toBe(true);
    f.componentInstance.off.set(false);
    f.componentInstance.loading.set(true);
    await f.whenStable();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    f.componentInstance.loading.set(false);
    await f.whenStable();
    expect(btn.disabled).toBe(false);
  });
});
