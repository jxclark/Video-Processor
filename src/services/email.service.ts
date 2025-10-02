import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'coder@weirdlookingjay.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

export class EmailService {
  /**
   * Send email verification
   */
  static async sendVerificationEmail(email: string, name: string, token: string) {
    try {
      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Verify your email address',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎬 Video Processor</h1>
                </div>
                <div class="content">
                  <h2>Hi ${name},</h2>
                  <p>Thanks for signing up! Please verify your email address to get started.</p>
                  <p>Click the button below to verify your email:</p>
                  <a href="${verifyUrl}" class="button">Verify Email Address</a>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #6b7280;">${verifyUrl}</p>
                  <p>This link will expire in 24 hours.</p>
                  <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Video Processor. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      });

      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, name: string, token: string) {
    try {
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset your password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎬 Video Processor</h1>
                </div>
                <div class="content">
                  <h2>Hi ${name},</h2>
                  <p>We received a request to reset your password.</p>
                  <p>Click the button below to reset your password:</p>
                  <a href="${resetUrl}" class="button">Reset Password</a>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
                  <div class="warning">
                    <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                  </div>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Video Processor. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      });

      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInviteEmail(
    email: string, 
    inviterName: string, 
    organizationName: string, 
    role: string, 
    token: string
  ) {
    try {
      const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `You've been invited to join ${organizationName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎬 Video Processor</h1>
                </div>
                <div class="content">
                  <h2>You've been invited!</h2>
                  <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Video Processor.</p>
                  
                  <div class="info-box">
                    <p style="margin: 0;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                  </div>

                  <p>Click the button below to accept the invitation and create your account:</p>
                  <a href="${inviteUrl}" class="button">Accept Invitation</a>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #6b7280;">${inviteUrl}</p>
                  <p>This invitation will expire in 7 days.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Video Processor. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      });

      console.log(`Team invite email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send team invite email:', error);
      throw error;
    }
  }
}
