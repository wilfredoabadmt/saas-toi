import { db, ensureMigrationsRun } from '@/db/client';
import { users } from '@/db/schema/users';
import { passwordResets } from '@/db/schema/password-resets';
import { ApiError } from '@/lib/api-errors';
import { EmailService } from './email.service';
import { AuthService } from './auth.service';
import { eq, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';

export class PasswordResetService {
  /**
   * Requests a password reset token and sends email.
   */
  static async requestReset(email: string) {
    await ensureMigrationsRun();
    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      // Return true silently to avoid email enumeration attacks
      return { success: true, message: 'Si el correo está registrado, se enviará el enlace de recuperación' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins TTL

    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-toi-ssd.89.116.29.168.sslip.io';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await EmailService.sendPasswordReset(user.email, resetUrl);

    return { success: true, message: 'Enlace de recuperación enviado' };
  }

  /**
   * Verifies if a reset token is valid.
   */
  static async verifyToken(token: string) {
    await ensureMigrationsRun();

    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.token, token),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!reset) {
      throw new ApiError('FORBIDDEN', 'El enlace de recuperación es inválido o ha expirado', 403);
    }

    return reset;
  }

  /**
   * Confirms password reset with new password.
   */
  static async confirmReset(token: string, newPassword: string) {
    await ensureMigrationsRun();
    const reset = await this.verifyToken(token);

    const newHash = AuthService.hashPassword(newPassword);

    // Update user password
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));

    // Mark token as used
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, reset.id));

    return { success: true, message: 'Contraseña actualizada con éxito' };
  }
}
