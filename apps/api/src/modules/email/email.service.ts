import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { EMAIL_ADAPTER_TOKEN, EmailAdapter } from './adapters/email.adapter.interface';
import { EmailTemplates, TemplateId, TemplateVariables } from './schemas/templates';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_ADAPTER_TOKEN)
    private readonly emailAdapter: EmailAdapter,
  ) {}

  /**
   * Validate payload and persist to EmailOutbox within the provided transaction.
   * This does NOT dispatch the email externally.
   * Dispatch must happen after the transaction commits to avoid sending emails for rolled-back transactions.
   */
  async queueEmail<T extends TemplateId>(
    tx: Prisma.TransactionClient,
    organizationId: string,
    to: string,
    templateId: T,
    variables: TemplateVariables<T>,
  ): Promise<string> {
    const schema = EmailTemplates[templateId];
    if (!schema) {
      throw new BadRequestException(`Invalid template ID: ${templateId}`);
    }

    const validationResult = schema.safeParse(variables);
    if (!validationResult.success) {
      throw new BadRequestException(`Invalid payload for template ${templateId}`);
    }

    const payloadData = {
      to,
      templateId,
      variables: validationResult.data,
    };

    const outbox = await tx.emailOutbox.create({
      data: {
        organizationId,
        payload: JSON.stringify(payloadData),
      },
    });

    return outbox.id;
  }

  /**
   * Dispatch an email that was previously queued in the outbox.
   * Handles idempotency by checking `deliveredAt`.
   */
  async dispatchEmail(tx: Prisma.TransactionClient, outboxId: string): Promise<void> {
    const outbox = await tx.emailOutbox.findUnique({
      where: { id: outboxId },
    });

    if (!outbox) {
      throw new BadRequestException('Outbox record not found');
    }

    if (outbox.deliveredAt) {
      // Idempotent: already delivered
      return;
    }

    const payloadData = JSON.parse(outbox.payload);
    const { to, templateId, variables } = payloadData;

    try {
      await this.emailAdapter.sendEmail(to, templateId as TemplateId, variables);

      await tx.emailOutbox.update({
        where: { id: outboxId },
        data: { deliveredAt: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Failed to dispatch email outbox ${outboxId}: ${error.message}`);
      // Throw so the caller knows dispatch failed, allowing them to retry later
      throw error;
    }
  }

  /**
   * Legacy wrapper as requested by spec signature:
   * 1. Validate payload
   * 2. Persist to EmailOutbox via `tx`
   * 3. Schedule for post-commit dispatch (returning outbox ID so caller can dispatch after commit)
   */
  async sendEmail<T extends TemplateId>(
    tx: Prisma.TransactionClient,
    organizationId: string,
    to: string,
    templateId: T,
    variables: TemplateVariables<T>,
  ): Promise<string> {
    return this.queueEmail(tx, organizationId, to, templateId, variables);
  }
}
