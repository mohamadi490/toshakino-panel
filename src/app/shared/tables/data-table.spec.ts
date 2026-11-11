import { TestBed } from '@angular/core/testing';
import { DataTableComponent, TableColumn } from './data-table';

interface Row {
  id: number;
  name: string;
}
const cols: TableColumn<Row>[] = [{ key: 'name', header: 'نام', cell: (r) => r.name }];

async function render(inputs: Record<string, unknown>) {
  const f = TestBed.createComponent(DataTableComponent<Row>);
  f.componentRef.setInput('columns', cols);
  f.componentRef.setInput('rowKey', (r: Row) => r.id);
  for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
  await f.whenStable();
  return f;
}

describe('DataTableComponent', () => {
  it('renders rows', async () => {
    const f = await render({
      rows: [
        { id: 1, name: 'الف' },
        { id: 2, name: 'ب' },
      ],
    });
    expect((f.nativeElement as HTMLElement).querySelectorAll('tbody tr').length).toBe(2);
  });
  it('renders the empty state', async () => {
    const f = await render({ rows: [], emptyText: 'خالی' });
    expect((f.nativeElement as HTMLElement).textContent).toContain('خالی');
  });
  it('renders skeleton rows while loading with no data', async () => {
    const f = await render({ rows: [], loading: true });
    expect(
      (f.nativeElement as HTMLElement).querySelectorAll('.animate-pulse').length,
    ).toBeGreaterThan(0);
  });
  it('renders an error with a retry button that emits', async () => {
    const f = await render({ error: 'خطا' });
    const el = f.nativeElement as HTMLElement;
    let retried = false;
    f.componentInstance.retry.subscribe(() => (retried = true));
    expect(el.querySelector('[role=alert]')?.textContent).toContain('خطا');
    el.querySelector('button')!.click();
    expect(retried).toBe(true);
  });
});
