import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '@/services/email.service';

describe('EmailService Unit Tests', () => {
  it('sendPasswordReset should format HTML email payload and send successfully', async () => {
    const res = await EmailService.sendPasswordReset('user@isp.com', 'https://saas-toi-ssd.89.116.29.168.sslip.io/reset-password?token=mock_token');
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.messageId).toContain('msg_');
  });

  it('sendTeamInvitation should format team invite email payload', async () => {
    const res = await EmailService.sendTeamInvitation('technician@isp.com', 'FiberSpeed ISP', 'technician', 'https://saas-toi-ssd.89.116.29.168.sslip.io/accept-invite');
    expect(res.success).toBe(true);
  });

  it('sendRouterAlert should format network error alert payload', async () => {
    const res = await EmailService.sendRouterAlert('admin@isp.com', 'Core CCR2004', '192.168.88.1', 'HTTP 504 Gateway Timeout');
    expect(res.success).toBe(true);
  });
});
