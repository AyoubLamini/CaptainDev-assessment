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
    if (templateId === 'initial-owner-invitation' || templateId === 'collaborator-invitation') {
      const v = variables as any;
      return `<p>You have been invited to join ${v.organizationName} on NOVA.</p><p><a href="${v.inviteUrl}">Accept Invitation</a></p>`;
    } else if (templateId === 'password-reset') {
      const v = variables as any;
      return `<p>You requested a password reset. <a href="${v.resetUrl}">Click here to reset your password</a>.</p>`;
    }
    return '';
  }
}
