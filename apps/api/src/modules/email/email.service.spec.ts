import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EMAIL_ADAPTER_TOKEN } from './adapters/email.adapter.interface';
import { RecordingAdapter } from './adapters/recording.adapter';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('EmailService', () => {
  let service: EmailService;
  let adapter: RecordingAdapter;

  const mockTx = {
    emailOutbox: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as Prisma.TransactionClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EMAIL_ADAPTER_TOKEN,
          useClass: RecordingAdapter,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    adapter = module.get<RecordingAdapter>(EMAIL_ADAPTER_TOKEN);
    vi.clearAllMocks();
  });

  describe('queueEmail', () => {
    it('should create an outbox record with valid template variables', async () => {
      const orgId = 'org-1';
      const to = 'test@example.com';
      const template = 'password-reset';
      const variables = { resetUrl: 'https://example.com/reset' };

      const mockOutboxId = 'outbox-1';
      (mockTx.emailOutbox.create as any).mockResolvedValue({ id: mockOutboxId });

      const resultId = await service.queueEmail(mockTx, orgId, to, template, variables);

      expect(resultId).toBe(mockOutboxId);
      expect(mockTx.emailOutbox.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          payload: JSON.stringify({
            to,
            templateId: template,
            variables,
          }),
        },
      });
    });

    it('should throw validation error for invalid variables', async () => {
      const orgId = 'org-1';
      const to = 'test@example.com';
      const template = 'password-reset';
      const variables = { invalidUrl: 'not-a-url' }; // Missing resetUrl

      await expect(
        service.queueEmail(mockTx, orgId, to, template, variables as any)
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.emailOutbox.create).not.toHaveBeenCalled();
    });

    it('should throw validation error for invalid template ID', async () => {
      const orgId = 'org-1';
      const to = 'test@example.com';
      const template = 'non-existent' as any;
      const variables = {};

      await expect(
        service.queueEmail(mockTx, orgId, to, template, variables)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatchEmail', () => {
    it('should send email and mark as delivered if outbox is pending', async () => {
      const payload = {
        to: 'test@example.com',
        templateId: 'password-reset',
        variables: { resetUrl: 'https://example.com/reset' },
      };

      const outboxRecord = {
        id: 'outbox-1',
        organizationId: 'org-1',
        payload: JSON.stringify(payload),
        deliveredAt: null,
      };

      (mockTx.emailOutbox.findUnique as any).mockResolvedValue(outboxRecord);
      (mockTx.emailOutbox.update as any).mockResolvedValue({ ...outboxRecord, deliveredAt: new Date() });

      await service.dispatchEmail(mockTx, 'outbox-1');

      const sentEmails = adapter.getOutbox();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]).toEqual(payload);

      expect(mockTx.emailOutbox.update).toHaveBeenCalledWith({
        where: { id: 'outbox-1' },
        data: { deliveredAt: expect.any(Date) },
      });
    });

    it('should not send email if already delivered', async () => {
      const outboxRecord = {
        id: 'outbox-1',
        organizationId: 'org-1',
        payload: JSON.stringify({}),
        deliveredAt: new Date(), // Already delivered
      };

      (mockTx.emailOutbox.findUnique as any).mockResolvedValue(outboxRecord);

      await service.dispatchEmail(mockTx, 'outbox-1');

      const sentEmails = adapter.getOutbox();
      expect(sentEmails).toHaveLength(0); // Not sent
      expect(mockTx.emailOutbox.update).not.toHaveBeenCalled();
    });
  });
});
