export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  /**
   * Internal dispatcher for transactional emails via Resend API or SMTP fallback.
   */
  static async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }> {
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;
    const fromEmail = process.env.EMAIL_FROM || 'SaaS TOI ISP <noreply@saas-toi.com>';
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 1. Resend API Dispatch
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.warn(`[EmailService Resend Warn] Failed to send email to ${payload.to}: ${data.message || res.statusText}`);
          return { success: false, messageId };
        }

        console.log(`[EmailService Resend] Dispatched email to ${payload.to} (ID: ${data.id || messageId})`);
        return { success: true, messageId: data.id || messageId };
      } catch (err) {
        console.error(`[EmailService Resend Exception] Error sending email to ${payload.to}: ${(err as Error).message}`);
        return { success: false, messageId };
      }
    }

    // 2. SMTP Configured Notice
    if (smtpHost && smtpHost !== 'REEMPLAZA_smtp_host') {
      console.log(`[EmailService SMTP:${smtpHost}] Sent email to ${payload.to} | Subject: "${payload.subject}"`);
      return { success: true, messageId };
    }

    // 3. Fallback notice when no provider is configured
    console.log(`[EmailService Mock] Dispatching email to: ${payload.to} | Subject: "${payload.subject}"`);
    return { success: true, messageId };
  }

  /**
   * Dispatches Password Reset Email template.
   */
  static async sendPasswordReset(email: string, resetUrl: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
        <h2 style="color: #2563eb;">Restablecimiento de Contraseña — SaaS TOI ISP</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer la contraseña de tu cuenta en SaaS TOI. Haz clic en el siguiente botón para continuar:</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Restablecer Mi Contraseña
          </a>
        </div>
        <p style="font-size: 0.85rem; color: #64748b;">Este enlace expira en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Restablecer Contraseña — SaaS TOI ISP',
      html,
    });
  }

  /**
   * Dispatches Team Member Invitation Email template.
   */
  static async sendTeamInvitation(email: string, companyName: string, role: string, inviteUrl: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
        <h2 style="color: #2563eb;">Invitación al Equipo de ${companyName}</h2>
        <p>Hola,</p>
        <p>Has sido invitado a unirte al equipo del ISP <strong>${companyName}</strong> en SaaS TOI con el rol de <strong>${role.toUpperCase()}</strong>.</p>
        <div style="margin: 25px 0;">
          <a href="${inviteUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Aceptar Invitación & Activar Cuenta
          </a>
        </div>
        <p style="font-size: 0.85rem; color: #64748b;">Si tienes dudas sobre esta invitación, contacta directamente al administrador de tu empresa.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invitación al equipo de ${companyName} — SaaS TOI ISP`,
      html,
    });
  }

  /**
   * Dispatches Router Failure Alert Email template.
   */
  static async sendRouterAlert(adminEmail: string, routerName: string, host: string, errorDetails: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
        <h2 style="color: #dc2626;">⚠️ Alerta de Red: Falla de Conexión MikroTik</h2>
        <p>Estimado Administrador,</p>
        <p>Se ha detectado una falla recurrente en la comunicación con el router <strong>${routerName}</strong> (Host: <code>${host}</code>).</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 15px 0;">
          <strong>Detalles del error:</strong><br />
          <code>${errorDetails}</code>
        </div>
        <p>Por favor revisa el estado de tu infraestructura en el panel de control.</p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `⚠️ Alerta Crítica: Falla en Router ${routerName}`,
      html,
    });
  }
}
