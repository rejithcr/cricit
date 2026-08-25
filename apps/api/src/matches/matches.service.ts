import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ScoringGateway } from './scoring.gateway';
import { applyDeliveryToMatch } from '@cricit/scoring-engine';

@Injectable()
export class MatchesService {
  private history = new Map<number, any[]>();
  
  constructor(private readonly scoringGateway: ScoringGateway) {}
  getMatches(status?: string) {
    const filePath = path.join(__dirname, '..', '..', '..','src', 'data', 'matches.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const matches = JSON.parse(fileData);

    if (status) {
      return matches.filter((match: any) => match.status === status);
    }
    return matches;
  }

  getMatchById(id: number) {
    const filePath = path.join(__dirname, '..', '..', '..','src', 'data', 'matches.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const matches = JSON.parse(fileData);
    const match = matches.find((m: any) => m.matchId === id);
    if (!match) {
      throw new Error('Match not found');
    }
    return match;
  }

  processEvent(id: number, action: string, scorerId: string, data?: any) {
    const filePath = path.join(__dirname, '..', '..', '..','src', 'data', 'matches.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const matches = JSON.parse(fileData);
    const matchIndex = matches.findIndex((m: any) => m.matchId === id);
    
    if (matchIndex === -1) {
      throw new Error('Match not found');
    }
    
    if (matches[matchIndex].scorerId !== scorerId) {
      throw new Error('Unauthorized');
    }

    const currentMatch = matches[matchIndex];
    let updatedMatch;

    if (action === 'undo') {
      const matchHistory = this.history.get(id) || [];
      if (matchHistory.length === 0) {
        throw new Error('No history to undo');
      }
      updatedMatch = matchHistory.pop();
    } else if (action === 'ball') {
      // Save deep clone of current state to history
      const matchHistory = this.history.get(id) || [];
      matchHistory.push(JSON.parse(JSON.stringify(currentMatch)));
      this.history.set(id, matchHistory);

      updatedMatch = applyDeliveryToMatch(currentMatch, data);
    } else if (action === 'new_bowler') {
      // data: { bowlerId: number }
      updatedMatch = JSON.parse(JSON.stringify(currentMatch));
      const innings = updatedMatch.innings[updatedMatch.innings.length - 1];
      if (innings) {
        // Clear previous current bowler flag
        innings.bowling.forEach((b: any) => { b.isCurrentBowler = false; });
        // Find or create bowler record
        let bowlerRecord = innings.bowling.find((b: any) => b.playerId === data.bowlerId);
        if (!bowlerRecord) {
          bowlerRecord = { playerId: data.bowlerId, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 };
          innings.bowling.push(bowlerRecord);
        }
        bowlerRecord.isCurrentBowler = true;
      }
    } else {
      throw new Error('Invalid action');
    }

    matches[matchIndex] = updatedMatch;
    fs.writeFileSync(filePath, JSON.stringify(matches, null, 2), 'utf8');

    // Broadcast the event
    this.scoringGateway.broadcastMatchEvent(id, { matchId: id, action, data });

    return updatedMatch;
  }
}

