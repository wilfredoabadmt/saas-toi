import { describe, it, expect, vi } from 'vitest';
import { MikroTikClient } from '@/lib/mikrotik/client';

describe('MikroTikClient Unit Tests', () => {
  it('testConnection should format GET REST request', async () => {
    const res = await MikroTikClient.testConnection({
      host: '192.168.88.1',
      username: 'admin',
      password: 'secret_password',
    });

    expect(res).toBeDefined();
    expect(res.command).toContain('GET https://192.168.88.1:443/rest/system/resource');
    expect(res.success).toBe(true);
  });

  it('setSubscriberServiceStatus should format PATCH REST request for suspension and reactivation', async () => {
    const suspendRes = await MikroTikClient.setSubscriberServiceStatus({
      host: '192.168.88.1',
      username: 'admin',
      password: 'secret_password',
      subscriberIdentifier: '+56912345678',
      disabled: true,
    });

    expect(suspendRes.command).toContain('PATCH');
    expect(suspendRes.command).toContain('disabled": true');
    expect(suspendRes.success).toBe(true);

    const reactivateRes = await MikroTikClient.setSubscriberServiceStatus({
      host: '192.168.88.1',
      username: 'admin',
      password: 'secret_password',
      subscriberIdentifier: '+56912345678',
      disabled: false,
    });

    expect(reactivateRes.command).toContain('disabled": false');
    expect(reactivateRes.success).toBe(true);
  });
});
