import { z } from 'zod';

export const InvitationTemplateSchema = z.object({
  organizationName: z.string().min(1),
  inviterName: z.string().optional(),
  inviteUrl: z.string().url(),
});

export const PasswordResetTemplateSchema = z.object({
  resetUrl: z.string().url(),
});

export const EmailTemplates = {
  'initial-owner-invitation': InvitationTemplateSchema,
  'collaborator-invitation': InvitationTemplateSchema,
  'password-reset': PasswordResetTemplateSchema,
} as const;

export type TemplateId = keyof typeof EmailTemplates;
export type TemplateVariables<T extends TemplateId> = z.infer<typeof EmailTemplates[T]>;
