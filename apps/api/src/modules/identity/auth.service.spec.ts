import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';

vi.mock('argon2', () => ({
  verify: vi.fn(),
  hash: vi.fn(),
  argon2id: 2,
}));

describe('AuthService', () => {
  let authService: AuthService;
  let identityService: IdentityService;
  let emailService: EmailService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: IdentityService,
          useValue: {
            findByEmailWithPassword: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            session: {
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            passwordResetToken: {
              create: vi.fn(),
              findUnique: vi.fn(),
              deleteMany: vi.fn(),
            },
            passwordCredential: {
              upsert: vi.fn(),
              update: vi.fn(),
            },
            organization: {
              upsert: vi.fn().mockResolvedValue({ id: 'SYSTEM' }),
            },
            $transaction: vi.fn(async (cb) => {
              const tx = (prisma as any).__tx || {
                passwordResetToken: {
                  create: vi.fn(),
                  deleteMany: vi.fn(),
                },
                passwordCredential: {
                  upsert: vi.fn(),
                  update: vi.fn(),
                },
                session: {
                  deleteMany: vi.fn(),
                },
                organization: {
                  upsert: vi.fn().mockResolvedValue({ id: 'SYSTEM' }),
                },
              };
              (prisma as any).__tx = tx;
              return await cb(tx);
            }),
            executeAsTenant: vi.fn(async (tenantId, cb) => {
              const tx = (prisma as any).__tx || {
                passwordResetToken: {
                  create: vi.fn(),
                  deleteMany: vi.fn(),
                },
                passwordCredential: {
                  upsert: vi.fn(),
                  update: vi.fn(),
                },
                session: {
                  deleteMany: vi.fn(),
                },
                organization: {
                  upsert: vi.fn().mockResolvedValue({ id: 'SYSTEM' }),
                },
              };
              (prisma as any).__tx = tx;
              return await cb(tx);
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            queueEmail: vi.fn().mockResolvedValue('outbox-1'),
            dispatchEmail: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    identityService = module.get<IdentityService>(IdentityService);
    emailService = module.get<EmailService>(EmailService);
    prisma = module.get<PrismaService>(PrismaService);

    delete (prisma as any).__tx;
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login matrix', () => {
    it('Valid Login: Existing email, correct password -> returns session', async () => {
      identityService.findByEmailWithPassword = vi.fn().mockResolvedValue({
        id: 'user-1',
        passwordCredential: { passwordHash: 'mock-hash' },
      });
      const argon2 = await import('argon2');
      (argon2.verify as any).mockResolvedValue(true);
      
      const session = await authService.login('test@test.com', 'correctpassword');
      expect(session).toBeDefined();
    });

    it('Invalid Email: Non-existent email -> throws UnauthorizedException', async () => {
      identityService.findByEmailWithPassword = vi.fn().mockResolvedValue(null);
      await expect(authService.login('wrong@test.com', 'password')).rejects.toThrow('Invalid email or password');
    });

    it('Invalid Password: Existing email, wrong password -> throws UnauthorizedException', async () => {
      identityService.findByEmailWithPassword = vi.fn().mockResolvedValue({
        id: 'user-1',
        passwordCredential: { passwordHash: 'mock-hash' },
      });
      const argon2 = await import('argon2');
      (argon2.verify as any).mockResolvedValue(false);
      await expect(authService.login('test@test.com', 'wrongpassword')).rejects.toThrow('Invalid email or password');
    });
  });

  describe('password reset matrix', () => {
    it('Forgot Password (Valid): Existing email -> Neutral success message, email sent', async () => {
      identityService.findByEmailWithPassword = vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      const res = await authService.requestPasswordReset('test@test.com');
      expect(res).toEqual({ message: 'If an account with that email exists, we sent a reset link.' });
      
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      
      expect(emailService.queueEmail).toHaveBeenCalled();
      const tx = (prisma as any).__tx;
      expect(tx.passwordResetToken.create).toHaveBeenCalled();
    });

    it('Forgot Password (Invalid): Non-existent email -> Neutral success message, no email sent', async () => {
      identityService.findByEmailWithPassword = vi.fn().mockResolvedValue(null);
      const res = await authService.requestPasswordReset('wrong@test.com');
      expect(res).toEqual({ message: 'If an account with that email exists, we sent a reset link.' });
      
      await new Promise(resolve => setImmediate(resolve));
      
      expect(emailService.queueEmail).not.toHaveBeenCalled();
    });

    it('Reset Password (Valid): Valid token, new password -> 200 OK, password updated, token deleted, sessions revoked', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      prisma.passwordResetToken.findUnique = vi.fn().mockResolvedValue({
        id: 'mock-token-hash',
        identityId: 'user-1',
        expiresAt: futureDate,
      });

      const res = await authService.resetPassword('valid-token', 'new-pass');
      expect(res).toEqual({ success: true });
      expect(prisma.$transaction).toHaveBeenCalled();
      const tx = (prisma as any).__tx;
      expect(tx.passwordCredential.update).toHaveBeenCalled();
      expect(tx.passwordResetToken.deleteMany).toHaveBeenCalled();
      expect(tx.session.deleteMany).toHaveBeenCalled();
    });

    it('Reset Password (Invalid): Expired or invalid token -> 400 Bad Request (neutral error)', async () => {
      prisma.passwordResetToken.findUnique = vi.fn().mockResolvedValue(null);
      await expect(authService.resetPassword('invalid-token', 'new-pass')).rejects.toThrow('Invalid or expired token');

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      prisma.passwordResetToken.findUnique = vi.fn().mockResolvedValue({
        id: 'mock-token-hash',
        identityId: 'user-1',
        expiresAt: pastDate,
      });
      await expect(authService.resetPassword('expired-token', 'new-pass')).rejects.toThrow('Invalid or expired token');
    });
  });
});
