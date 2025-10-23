import { describe, it, expect } from 'vitest';
import { computeContractStatus, toDate } from './contracts';

describe('contracts.computeContractStatus', () => {
  const now = new Date('2025-01-10T12:00:00Z');

  it('returns 완료 when returnedAt in past', () => {
    const r = { returnedAt: '2025-01-09T12:00:00Z' };
    expect(computeContractStatus(r, now)).toBe('완료');
  });

  it('returns 도난의심 when reportedStolen', () => {
    const r = { reportedStolen: true };
    expect(computeContractStatus(r, now)).toBe('도난의심');
  });

  it('returns 반납지연 when now > end and not returned', () => {
    const r = { rentalPeriod: { start: '2025-01-01', end: '2025-01-05' } };
    expect(computeContractStatus(r, now)).toBe('반납지연');
  });

  it('returns 대여중 when now within start..end', () => {
    const r = { rentalPeriod: { start: '2025-01-01', end: '2025-01-20' } };
    expect(computeContractStatus(r, now)).toBe('대여중');
  });

  it('returns 사고접수 when accidentReported', () => {
    const r = { accidentReported: true };
    expect(computeContractStatus(r, now)).toBe('사고접수');
  });

  it('returns 예약 중 when start in future', () => {
    const r = { rentalPeriod: { start: '2025-02-01', end: '2025-02-03' } };
    expect(computeContractStatus(r, now)).toBe('예약 중');
  });
});

