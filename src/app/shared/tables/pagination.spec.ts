import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination';

describe('PaginationComponent', () => {
  it('is hidden for a single page', async () => {
    const f = TestBed.createComponent(PaginationComponent);
    f.componentRef.setInput('page', 1);
    f.componentRef.setInput('totalPages', 1);
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });
  it('emits neighbouring pages and disables the edges', async () => {
    const f = TestBed.createComponent(PaginationComponent);
    f.componentRef.setInput('page', 1);
    f.componentRef.setInput('totalPages', 3);
    await f.whenStable();
    const [prev, next] = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(prev!.disabled).toBe(true);
    const emitted: number[] = [];
    f.componentInstance.pageChange.subscribe((p) => emitted.push(p));
    next!.click();
    expect(emitted).toEqual([2]);
  });
});
