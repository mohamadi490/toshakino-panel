import { TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart';

async function render(data: { label: string; value: number }[]) {
  const f = TestBed.createComponent(BarChartComponent);
  f.componentRef.setInput('data', data);
  f.componentRef.setInput('ariaLabel', 'فروش روزانه');
  f.componentRef.setInput('format', (n: number) => `#${n}`);
  await f.whenStable();
  return f.nativeElement as HTMLElement;
}

describe('BarChartComponent', () => {
  it('renders nothing for empty data (no decorative placeholder)', async () => {
    expect((await render([])).querySelector('svg')).toBeNull();
  });

  it('scales bar heights to the maximum value', async () => {
    const el = await render([
      { label: 'الف', value: 10 },
      { label: 'ب', value: 5 },
      { label: 'ج', value: 0 },
    ]);
    const h = Array.from(el.querySelectorAll('rect')).map((r) => Number(r.getAttribute('height')));
    expect(h[0]).toBeGreaterThan(h[1]!);
    expect(h[1]! / h[0]!).toBeCloseTo(0.5, 1);
    expect(h[2]).toBe(0);
  });

  it('keeps a tiny non-zero value visible', async () => {
    const el = await render([
      { label: 'الف', value: 100000 },
      { label: 'ب', value: 1 },
    ]);
    expect(Number(el.querySelectorAll('rect')[1]!.getAttribute('height'))).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('draws flat bars when every value is zero', async () => {
    const el = await render([
      { label: 'الف', value: 0 },
      { label: 'ب', value: 0 },
    ]);
    expect(
      Array.from(el.querySelectorAll('rect')).every((r) => r.getAttribute('height') === '0'),
    ).toBe(true);
  });

  it('exposes exact values to assistive tech and names the chart', async () => {
    const el = await render([{ label: 'الف', value: 7 }]);
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('فروش روزانه');
    expect(el.querySelector('table.sr-only')!.textContent).toContain('#7');
  });

  it('thins axis labels for long series', async () => {
    const data = Array.from({ length: 30 }, (_, i) => ({ label: `d${i}`, value: i }));
    const el = await render(data);
    expect(el.querySelectorAll('text').length).toBeLessThanOrEqual(10);
    expect(el.querySelectorAll('rect').length).toBe(30);
  });
});
