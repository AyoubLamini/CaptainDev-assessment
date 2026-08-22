import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { Request } from 'express';
import { OrgMemberGuard } from '../access-control/guards/org-member.guard';

@Controller('org-admin/:organizationId/search')
@UseGuards(OrgMemberGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Param('organizationId') organizationId: string,
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const skipVal = skip ? parseInt(skip, 10) : 0;
    const takeVal = take ? parseInt(take, 10) : 20;
    
    // Fallbacks if parsing fails to avoid NaN passing to Prisma skip/take
    const finalSkip = isNaN(skipVal) ? 0 : skipVal;
    const finalTake = isNaN(takeVal) ? 20 : takeVal;

    const membership = (req as any).membership;

    return this.searchService.search(organizationId, membership, q || '', finalSkip, finalTake);
  }
}
