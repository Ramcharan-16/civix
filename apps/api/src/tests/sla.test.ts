import { describe, it, expect } from 'vitest';

function calculateExtendedDeadline(deadlineAt: Date, holdDurationMs: number): Date {
  return new Date(deadlineAt.getTime() + holdDurationMs);
}

describe('SLA Tests', () => {
  it('should calculate extended deadline correctly', () => {
    const original = new Date('2026-08-30T10:00:00Z');
    const extended = calculateExtendedDeadline(original, 2 * 60 * 60 * 1000);
    expect(extended.toISOString()).toBe('2026-08-30T12:00:00.000Z');
  });
});
