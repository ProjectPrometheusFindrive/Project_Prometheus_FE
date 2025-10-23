import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, formatCurrencyDisplay, formatNumberDisplay } from './formatters';

describe('formatters', () => {
  it('formatCurrency adds thousands separators for input strings', () => {
    expect(formatCurrency('1234567')).toBe('1,234,567');
    expect(formatCurrency('001000')).toBe('1,000');
  });
  it('parseCurrency strips commas to number', () => {
    expect(parseCurrency('1,234,567')).toBe(1234567);
    expect(parseCurrency('0')).toBe(0);
  });
  it('formatCurrencyDisplay prefixes with ₩', () => {
    expect(formatCurrencyDisplay(1234)).toBe('₩1,234');
  });
  it('formatNumberDisplay formats numeric string and numbers', () => {
    expect(formatNumberDisplay('1234')).toBe('1,234');
    expect(formatNumberDisplay(98765)).toBe('98,765');
  });
});

