import { describe, it, expect } from 'vitest';
import { applyColumnFilters } from './filtering';

describe('applyColumnFilters', () => {
  const data = [
    { id: 1, name: 'Alpha', count: 10, date: '2024-01-10', enabled: true, tags: 'A' },
    { id: 2, name: 'beta', count: 5, date: '2024-02-20', enabled: false, tags: 'B' },
    { id: 3, name: 'Gamma', count: 30, date: '2024-03-05', enabled: null, tags: 'A' },
  ];
  const columns = [
    { key: 'name', filterType: 'text' },
    { key: 'count', filterType: 'number-range' },
    { key: 'date', filterType: 'date-range' },
    { key: 'enabled', filterType: 'boolean' },
    { key: 'tags', filterType: 'multi-select' },
  ];

  it('filters by text contains case-insensitive', () => {
    const filters = { name: { type: 'text', value: 'alp' } };
    const res = applyColumnFilters(data, filters, columns);
    expect(res.map((r) => r.id)).toEqual([1]);
  });

  it('filters by number range inclusive', () => {
    const filters = { count: { type: 'number-range', min: 6, max: 30 } };
    const res = applyColumnFilters(data, filters, columns);
    expect(res.map((r) => r.id)).toEqual([1, 3]);
  });

  it('filters by date range inclusive', () => {
    const filters = { date: { type: 'date-range', from: '2024-02-01', to: '2024-02-28' } };
    const res = applyColumnFilters(data, filters, columns);
    expect(res.map((r) => r.id)).toEqual([2]);
  });

  it('filters by boolean including unknown', () => {
    const filters = { enabled: { type: 'boolean', value: 'unknown' } };
    const res = applyColumnFilters(data, filters, columns);
    expect(res.map((r) => r.id)).toEqual([3]);
  });

  it('filters by multi-select OR', () => {
    const filters = { tags: { type: 'multi-select', values: ['A'], op: 'OR' } };
    const res = applyColumnFilters(data, filters, columns);
    expect(res.map((r) => r.id)).toEqual([1, 3]);
  });
});

