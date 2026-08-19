import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, q: string, skip: number = 0, take: number = 20) {
    const companyFilter = q
      ? {
          name: { contains: q, mode: 'insensitive' as const },
        }
      : {};

    const scopeFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { externalId: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [companies, totalCompanies, scopes, totalScopes] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where: {
          organizationId,
          ...companyFilter,
        },
        skip,
        take,
      }),
      this.prisma.company.count({
        where: {
          organizationId,
          ...companyFilter,
        },
      }),
      this.prisma.businessScope.findMany({
        where: {
          organizationId,
          ...scopeFilter,
        },
        skip,
        take,
      }),
      this.prisma.businessScope.count({
        where: {
          organizationId,
          ...scopeFilter,
        },
      }),
    ]);

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
