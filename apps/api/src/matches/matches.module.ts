import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { ScoringGateway } from './scoring.gateway';

@Module({
  controllers: [MatchesController],
  providers: [MatchesService, ScoringGateway],
})
export class MatchesModule {}
