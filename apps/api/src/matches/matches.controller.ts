import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  getMatches(@Query('status') status?: string) {
    return this.matchesService.getMatches(status);
  }

  @Get(':id')
  getMatchById(@Param('id') id: string) {
    try {
      return this.matchesService.getMatchById(Number(id));
    } catch (e) {
      throw new NotFoundException('Match not found');
    }
  }
}
