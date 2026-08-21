import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, membership: any, q: string, skip: number = 0, take: number = 20) {
    const grants = membership?.grants as { scopes?: string[] } | null;
    let allowedScopes: string[] | undefined = undefined;

    if (membership?.role !== 'OWNER' && grants && Array.isArray(grants.scopes)) {
      allowedScopes = grants.scopes;
    }

    const companyFilter = q
      ? {
          name: { contains: q, mode: 'insensitive' as const },
        }
      : {};

    const finalCompanyFilter = allowedScopes
      ? { ...companyFilter, scopes: { some: { id: { in: allowedScopes } } } }
      : companyFilter;

    const scopeFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { externalId: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const finalScopeFilter = allowedScopes
      ? { ...scopeFilter, id: { in: allowedScopes } }
      : scopeFilter;

    const [companies, totalCompanies, scopes, totalScopes] = await this.prisma.executeAsTenant(organizationId, async (tx) => {
      // For multiple queries, we can just execute them in parallel or sequentially inside the tx context
      // Note: prisma client inside `$transaction` doesn't support nested `$transaction([])`. So we just await Promise.all
      return Promise.all([
        tx.company.findMany({
          where: {
            organizationId,
            ...finalCompanyFilter,
          },
          skip,
          take,
        }),
        tx.company.count({
          where: {
            organizationId,
            ...finalCompanyFilter,
          },
        }),
        tx.businessScope.findMany({
          where: {
            organizationId,
            ...finalScopeFilter,
          },
          skip,
          take,
        }),
        tx.businessScope.count({
          where: {
            organizationId,
            ...finalScopeFilter,
          },
        }),
      ]);
    });

    return {
      companies: {
        data: companies,
        totalCount: totalCompanies,
      },
      scopes: {
        data: scopes,
        totalCount: totalScopes,
      },
    };
  }
}
