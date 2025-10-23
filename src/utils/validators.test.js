import { describe, it, expect } from 'vitest';
import { normalizeKoreanPlate, isValidKoreanPlate } from './validators';

describe('validators - Korean plates', () => {
  it('normalizes hyphens and spaces', () => {
    expect(normalizeKoreanPlate('12 가-3456')).toBe('12가3456');
  });

  it('validates core formats', () => {
    expect(isValidKoreanPlate('12가3456')).toBe(true);
    expect(isValidKoreanPlate('123가4567')).toBe(true);
  });

  it('validates with region prefix', () => {
    expect(isValidKoreanPlate('서울12가3456')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(isValidKoreanPlate('ABC1234')).toBe(false);
  });
});

