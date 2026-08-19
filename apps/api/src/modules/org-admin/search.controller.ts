import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';

@Controller('org-admin/:organizationId/search')
@UseGuards(OrgAdminGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Param('organizationId') organizationId: string,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const skipVal = skip ? parseInt(skip, 10) : 0;
    const takeVal = take ? parseInt(take, 10) : 20;
    
    // Fallbacks if parsing fails to avoid NaN passing to Prisma skip/take
    const finalSkip = isNaN(skipVal) ? 0 : skipVal;
    const finalTake = isNaN(takeVal) ? 20 : takeVal;

    return this.searchService.search(organizationId, q || '', finalSkip, finalTake);
  }
}
