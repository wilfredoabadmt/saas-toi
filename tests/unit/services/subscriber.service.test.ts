import { describe, it, expect } from 'vitest';
import { calculatePaymentStatus } from '@/services/subscriber.service';

describe('SubscriberService helper: calculatePaymentStatus', () => {
  it('should return overdue if due date is in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const dateStr = pastDate.toISOString().split('T')[0]!;

    expect(calculatePaymentStatus(dateStr)).toBe('overdue');
  });

  it('should return due_soon if due date is within 5 days', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const dateStr = soonDate.toISOString().split('T')[0]!;

    expect(calculatePaymentStatus(dateStr)).toBe('due_soon');
  });

  it('should return current if due date is more than 5 days in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    expect(calculatePaymentStatus(dateStr)).toBe('current');
  });
});
