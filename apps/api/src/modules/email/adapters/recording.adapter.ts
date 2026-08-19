import { Injectable } from '@nestjs/common';
import { EmailAdapter } from './email.adapter.interface';
import { TemplateId, TemplateVariables } from '../schemas/templates';

@Injectable()
export class RecordingAdapter implements EmailAdapter {
  private readonly outbox: Array<{
    to: string;
    templateId: TemplateId;
    variables: any;
  }> = [];

  async sendEmail<T extends TemplateId>(
    to: string,
    templateId: T,
    variables: TemplateVariables<T>,
  ): Promise<void> {
    this.outbox.push({ to, templateId, variables });
  }

  getOutbox() {
    return this.outbox;
  }

  clear() {
    this.outbox.length = 0;
  }
}
