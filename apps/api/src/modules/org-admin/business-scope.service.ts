import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BusinessScopeType, BusinessScopeStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusinessScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async createScope(params: {
    organizationId: string;
    companyId: string;
    type: BusinessScopeType;
    name: string;
    externalId?: string;
    location?: string;
    responsiblePerson?: string;
    createdById: string;
    id?: string;
  }) {
    const {
      organizationId,
      companyId,
      type,
      name,
      createdById,
      id
    } = params;
    
    const scopeId = id || randomUUID();
    
    const payload: Prisma.BusinessScopeUncheckedCreateInput = {
      id: scopeId,
      organizationId,
      companyId,
      type,
      name: name.trim(),
      createdById,
      status: 'ACTIVE',
    };
    if (typeof params.externalId === 'string') payload.externalId = params.externalId.trim();
    if (typeof params.location === 'string') payload.location = params.location.trim();
    if (typeof params.responsiblePerson === 'string') payload.responsiblePerson = params.responsiblePerson.trim();

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      try {
        return await tx.businessScope.create({
          data: payload,
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existingScope = await tx.businessScope.findFirst({
            where: {
              organizationId,
              companyId,
              type,
              name: name.trim(),
              externalId: payload.externalId || '',
            },
          });
          throw new ConflictException({
            message: 'A Business Scope with these details already exists.',
            scope: existingScope,
          });
        }
        throw error;
      }
    });
  }
  async updateScope(organizationId: string, companyId: string, scopeId: string, name: string) {
    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      // First check if scope exists and belongs to the company
      const scope = await tx.businessScope.findFirst({
        where: {
          id: scopeId,
          companyId,
          organizationId,
        },
      });

      if (!scope) {
        throw new ConflictException('Business Scope not found.');
      }

      try {
        return await tx.businessScope.update({
          where: {
            organizationId_id: {
              organizationId,
              id: scopeId,
            }
          },
          data: { name: name.trim() },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          throw new ConflictException('A Business Scope with these details already exists.');
        }
        throw error;
      }
    });
  }
}
