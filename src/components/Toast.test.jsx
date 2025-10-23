import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  it('renders message and closes on click', () => {
    const onClose = vi.fn();
    render(<Toast message="Hello" onClose={onClose} duration={0} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

