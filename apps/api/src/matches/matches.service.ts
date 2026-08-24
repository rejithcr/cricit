import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MatchesService {
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
}
