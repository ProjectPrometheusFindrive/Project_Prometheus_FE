import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Table from './Table';
import useTableSelection from '../hooks/useTableSelection';

function TableWithSelection({ rows, columns }) {
  const selection = useTableSelection(rows, 'id');
  return <Table columns={columns} data={rows} selection={selection} />;
}

describe('Table', () => {
  const rows = [
    { id: 'a', name: 'Alpha', value: 20 },
    { id: 'b', name: 'Beta', value: 10 },
  ];
  const columns = [
    { key: 'select', label: '선택' },
    { key: 'name', label: '이름' },
    { key: 'value', label: '값', sortable: true },
  ];

  it('sorts by column when clicking sort toggle', () => {
    const { container } = render(<Table columns={columns} data={rows} />);
    const toggle = screen.getByRole('button', { name: /값 정렬 토글/i });
    // First click: asc (10, 20)
    fireEvent.click(toggle);
    let bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows[0].textContent).toContain('Beta');
    // Second click: desc (20, 10)
    fireEvent.click(toggle);
    bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows[0].textContent).toContain('Alpha');
  });

  it('selects all rows via header checkbox', () => {
    render(<TableWithSelection rows={rows} columns={columns} />);
    const headerCheckbox = screen.getByRole('checkbox', { name: '현재 목록 전체 선택' });
    fireEvent.click(headerCheckbox);
    const rowChecks = screen.getAllByRole('checkbox');
    // first checkbox is header; others are rows
    expect(rowChecks[1]).toBeChecked();
    expect(rowChecks[2]).toBeChecked();
  });
});

