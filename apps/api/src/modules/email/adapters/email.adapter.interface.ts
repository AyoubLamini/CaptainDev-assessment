import { TemplateId, TemplateVariables } from '../schemas/templates';

export const EMAIL_ADAPTER_TOKEN = Symbol('EMAIL_ADAPTER_TOKEN');

export interface EmailAdapter {
  sendEmail<T extends TemplateId>(
    to: string,
    templateId: T,
    variables: TemplateVariables<T>,
  ): Promise<void>;
}
