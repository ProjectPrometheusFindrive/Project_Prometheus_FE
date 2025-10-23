import { describe, it, expect } from 'vitest';
import { getManagementStage } from './managementStage';

describe('managementStage.getManagementStage', () => {
  it('normalizes known legacy labels', () => {
    const a = { managementStage: '대여 중' };
    expect(getManagementStage(a)).toBe('대여중');
  });

  it('prioritizes vehicle rental status', () => {
    const a = { vehicleStatus: '예약중' };
    expect(getManagementStage(a)).toBe('예약중');
  });

  it('returns 수리/점검 중 when diagnostics exist', () => {
    const a = { diagnosticCodes: [{ code: 'P0420' }] };
    expect(getManagementStage(a)).toBe('수리/점검 중');
  });

  it('returns 입고 대상 when no deviceSerial', () => {
    const a = { deviceSerial: '' };
    expect(getManagementStage(a)).toBe('입고 대상');
  });

  it('falls back to 기본 when unknown', () => {
    const a = {};
    expect(getManagementStage(a)).toBeTypeOf('string');
  });
});

