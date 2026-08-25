import { Controller, Get, Post, Query, Param, Body, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  @Post(':id/events')
  addMatchEvent(
    @Param('id') id: string,
    @Body('action') action: string,
    @Body('scorerId') scorerId: string,
    @Body('data') data?: any,
  ) {
    if (!action || !scorerId) {
      throw new NotFoundException('Action and scorerId are required');
    }
    try {
      return this.matchesService.processEvent(Number(id), action, scorerId, data);
    } catch (e: any) {
      if (e.message === 'Unauthorized') throw new UnauthorizedException('Not authorized to score this match');
      throw new NotFoundException(e.message || 'Error processing event');
    }
  }
}
