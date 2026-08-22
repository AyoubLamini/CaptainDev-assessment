import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyStatus, BusinessScopeStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(organizationId: string, name: string, id?: string) {
    const companyId = id || randomUUID();
    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      return tx.company.create({
        data: {
          id: companyId,
          organizationId,
          name,
          status: CompanyStatus.ACTIVE,
        },
      });
    });
  }

  async updateCompany(organizationId: string, id: string, name: string, status?: CompanyStatus) {
    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const company = await tx.company.findUnique({
        where: {
          organizationId_id: { organizationId, id },
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return tx.company.update({
        where: {
          organizationId_id: { organizationId, id },
        },
        data: {
          name,
          ...(status && { status }),
        },
      });
    });
  }

  async deactivateCompany(organizationId: string, id: string) {
    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const company = await tx.company.findUnique({
        where: {
          organizationId_id: { organizationId, id },
        },
        include: {
          scopes: true,
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      const hasActiveScopes = company.scopes.some(scope => scope.status === BusinessScopeStatus.ACTIVE);
      if (hasActiveScopes) {
        throw new ConflictException('Cannot deactivate company with active business scopes');
      }

      return tx.company.update({
        where: {
          organizationId_id: { organizationId, id },
        },
        data: {
          status: CompanyStatus.INACTIVE,
        },
      });
    });
  }

  async getCompanies(organizationId: string, membership?: any) {
    const grants = membership?.grants as { scopes?: string[] } | null | undefined;
    const isRestrictedUser = membership?.role === 'USER' && grants && Array.isArray(grants.scopes);
    const allowedScopeIds: string[] | undefined = isRestrictedUser ? grants!.scopes : undefined;

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const companies = await tx.company.findMany({
        where: { organizationId },
        include: {
          scopes: allowedScopeIds
            ? { where: { id: { in: allowedScopeIds } } }
            : true
        }
      });

      // If user has scope restrictions, only return companies that have at least one authorized scope
      if (allowedScopeIds) {
        return companies.filter(c => c.scopes.length > 0);
      }

      return companies;
    });
  }
}
