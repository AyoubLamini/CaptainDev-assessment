import { Injectable, Logger } from '@nestjs/common';
import { EmailAdapter } from './email.adapter.interface';
import { TemplateId, TemplateVariables } from '../schemas/templates';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter implements EmailAdapter {
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly senderEmail = process.env.EMAIL_SENDER || 'no-reply@nova.dev';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not defined.');
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail<T extends TemplateId>(
    to: string,
    templateId: T,
    variables: TemplateVariables<T>,
  ): Promise<void> {
    try {
      const subject = this.getSubject(templateId);
      const html = this.getHtml(templateId, variables);

      const response = await this.resend.emails.send({
        from: this.senderEmail,
        to,
        subject,
        html,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getSubject(templateId: TemplateId): string {
    switch (templateId) {
      case 'initial-owner-invitation':
      case 'collaborator-invitation':
        return 'You have been invited to join NOVA';
      case 'password-reset':
        return 'Reset your NOVA password';
      default:
        return 'Notification from NOVA';
    }
  }

  private getHtml<T extends TemplateId>(templateId: T, variables: TemplateVariables<T>): string {
    const baseStyle = 'font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;';
    const buttonStyle = 'background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; text-align: center;';

    if (templateId === 'initial-owner-invitation' || templateId === 'collaborator-invitation') {
      const v = variables as any;
      return `
        <div style="${baseStyle}">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Welcome to NOVA</h2>
          <p>You have been invited to join <strong>${v.organizationName}</strong> on NOVA.</p>
          <p style="margin: 30px 0;">
            <a href="${v.inviteUrl}" style="${buttonStyle}">Accept Invitation</a>
          </p>
          <p style="font-size: 14px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `;
    } else if (templateId === 'password-reset') {
      const v = variables as any;
      return `
        <div style="${baseStyle}">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Password Reset</h2>
          <p>You recently requested to reset your password for your NOVA account. Click the button below to reset it.</p>
          <p style="margin: 30px 0;">
            <a href="${v.resetUrl}" style="${buttonStyle}">Reset Password</a>
          </p>
          <p style="font-size: 14px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `;
    }
    return '';
  }
}
