import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  it('renders children when open and closes on ESC', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="테스트 모달">
        <div>내용</div>
      </Modal>
    );
    expect(screen.getByText('내용')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

