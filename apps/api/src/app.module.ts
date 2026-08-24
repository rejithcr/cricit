import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchesModule } from './matches/matches.module';

@Module({
  imports: [MatchesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
