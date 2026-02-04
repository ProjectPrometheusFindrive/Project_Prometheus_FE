import { describe, it, expect } from 'vitest';
import { computeContractStatus } from './contracts';

describe('contracts.computeContractStatus', () => {
  const now = new Date('2026-02-04T12:00:00Z');

  it('prefers server status', () => {
    const r = { contractStatus: '대여중' };
    expect(computeContractStatus(r, now)).toBe('대여중');
  });

  it('normalizes legacy status 예약 to 예약확정', () => {
    const r = { contractStatus: '예약' };
    expect(computeContractStatus(r, now)).toBe('예약확정');
  });

  it('normalizes legacy status 완료 to 종결', () => {
    const r = { contractStatus: '완료' };
    expect(computeContractStatus(r, now)).toBe('종결');
  });

  it('falls back to 종결 when returnedAt is in the past', () => {
    const r = { returnedAt: '2026-02-03T00:00:00Z' };
    expect(computeContractStatus(r, now)).toBe('종결');
  });

  it('returns empty when status is missing', () => {
    expect(computeContractStatus({}, now)).toBe('');
  });
});
