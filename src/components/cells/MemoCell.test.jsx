import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MemoCell from './MemoCell';

describe('MemoCell', () => {
  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<MemoCell id="row1" value="메모" onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: '메모 편집' }));
    expect(onEdit).toHaveBeenCalledWith('row1', '메모');
  });

  it('saves on Enter and cancel on Escape in editing mode', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <MemoCell
        id="row1"
        isEditing
        memoText="초기"
        onSave={onSave}
        onCancel={onCancel}
        onChange={() => {}}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('row1', '초기');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

