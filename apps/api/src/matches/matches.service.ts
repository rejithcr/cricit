import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ScoringGateway } from './scoring.gateway';
import { applyDeliveryToMatch } from '../scoring-engine';

/**
 * Builds the scorecard snapshot broadcast to all viewers on each event.
 * MVP approach: full snapshot per event. Migrate to minimal delta in Phase 4.
 */
function buildScorecardSnapshot(match: any): any {
  return {
    matchId: match.matchId,
    status: match.status,
    result: match.result,
    teams: match.teams,
    innings: match.innings?.map((inn: any) => ({
      teamId: inn.teamId,
      score: inn.score,
      wickets: inn.wickets,
      overs: inn.overs,
      extras: inn.extras,
      batting: inn.batting,
      bowling: inn.bowling,
      fallOfWickets: inn.fallOfWickets,
      complete: inn.complete ?? false,
    })),
    commentary: (match.commentary ?? []).slice(0, 10),
  };
}

function oversToLegalBalls(overs: number): number {
  return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
}

function ballsRemaining(overs: number, totalOvers: number): number {
  return totalOvers * 6 - oversToLegalBalls(overs);
}

/**
 * Computes the winner description string for a completed match.
 */
function computeResult(match: any): string {
  const [inn1, inn2] = match.innings;
  if (!inn1 || !inn2) return 'Match complete';

  const team1 = match.teams.find((t: any) => t.teamId === inn1.teamId)?.teamName ?? 'Team 1';
  const team2 = match.teams.find((t: any) => t.teamId === inn2.teamId)?.teamName ?? 'Team 2';

  if (inn2.score > inn1.score) {
    const wicketsLeft = (match.rules?.maxWickets ?? 10) - inn2.wickets;
    const ballsLeft = ballsRemaining(inn2.overs, match.rules?.totalOvers ?? 20);
    return `${team2} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''} (${ballsLeft} ball${ballsLeft !== 1 ? 's' : ''} remaining)`;
  } else if (inn1.score > inn2.score) {
    const margin = inn1.score - inn2.score;
    return `${team1} won by ${margin} run${margin !== 1 ? 's' : ''}`;
  }
  return 'Match tied';
}

function startNextInnings(match: any) {
  const currentInnings = match.innings[match.innings.length - 1];
  const nextTeamId = match.teams.find((t: any) => t.teamId !== currentInnings.teamId).teamId;
  const battingTeam = match.teams.find((t: any) => t.teamId === nextTeamId);
  const bowlingTeam = match.teams.find((t: any) => t.teamId !== nextTeamId);

  match.innings.push({
    teamId: nextTeamId,
    score: 0,
    wickets: 0,
    overs: 0,
    complete: false,
    batting: [],
    bowling: [],
    extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, total: 0 },
    fallOfWickets: []
  });
}

/**
 * Checks whether the current innings should auto-complete based on overs exhausted.
 * maxWickets is advisory only — scorer decides to end innings via 'end_innings' action.
 */
function applyCompletionRules(match: any): { match: any; inningsJustEnded: boolean; maxWicketsReached: boolean } {
  const rules = match.rules ?? { totalOvers: 20, ballsPerOver: 6, inningsPerTeam: 1, maxWickets: 10 };
  const currentInnings = match.innings[match.innings.length - 1];
  if (!currentInnings || currentInnings.complete) {
    return { match, inningsJustEnded: false, maxWicketsReached: false };
  }

  const oversUsed = oversToLegalBalls(currentInnings.overs);
  const maxBalls = rules.totalOvers * (rules.ballsPerOver ?? 6);
  const oversExhausted = oversUsed >= maxBalls;
  const maxWicketsReached = currentInnings.wickets >= (rules.maxWickets ?? 10);

  if (oversExhausted) {
    // Auto-complete — scorer has no choice when overs are done
    currentInnings.complete = true;
    const totalInningsNeeded = match.teams.length * (rules.inningsPerTeam ?? 1);
    if (match.innings.length >= totalInningsNeeded) {
      match.status = 'completed';
      match.result = computeResult(match);
    } else {
      startNextInnings(match);
    }
    return { match, inningsJustEnded: true, maxWicketsReached };
  }

  // maxWickets reached — warn scorer but do NOT auto-complete
  return { match, inningsJustEnded: false, maxWicketsReached };
}

function endInnings(match: any): any {
  const rules = match.rules ?? { inningsPerTeam: 1 };
  const currentInnings = match.innings[match.innings.length - 1];
  if (currentInnings) currentInnings.complete = true;
  const totalInningsNeeded = match.teams.length * (rules.inningsPerTeam ?? 1);
  if (match.innings.length >= totalInningsNeeded) {
    match.status = 'completed';
    match.result = computeResult(match);
  } else {
    startNextInnings(match);
  }
  return match;
}

@Injectable()
export class MatchesService {
  private history = new Map<number, any[]>();

  constructor(private readonly scoringGateway: ScoringGateway) {}

  getMatches(status?: string) {
    const filePath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'matches.json');
    const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (status) return matches.filter((m: any) => m.status === status);
    return matches;
  }

  getMatchById(id: number) {
    const filePath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'matches.json');
    const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const match = matches.find((m: any) => m.matchId === id);
    if (!match) throw new Error('Match not found');
    return match;
  }

  processEvent(id: number, action: string, scorerId: string, data?: any) {
    const filePath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'matches.json');
    const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const matchIndex = matches.findIndex((m: any) => m.matchId === id);

    if (matchIndex === -1) throw new Error('Match not found');
    if (matches[matchIndex].scorerId !== scorerId) throw new Error('Unauthorized');

    const currentMatch = matches[matchIndex];
    let updatedMatch: any;

    if (action === 'undo') {
      const matchHistory = this.history.get(id) ?? [];
      if (matchHistory.length === 0) throw new Error('No history to undo');
      updatedMatch = matchHistory.pop();
    } else if (action === 'ball') {
      const matchHistory = this.history.get(id) ?? [];
      matchHistory.push(JSON.parse(JSON.stringify(currentMatch)));
      this.history.set(id, matchHistory);

      const withDelivery = applyDeliveryToMatch(currentMatch, data);

      // Check completion rules — only overs exhaustion auto-ends innings
      const { match: withCompletion, inningsJustEnded, maxWicketsReached } = applyCompletionRules(withDelivery);
      updatedMatch = withCompletion;

      // Attach advisory flags for the client to act on
      (updatedMatch as any).__inningsJustEnded = inningsJustEnded;
      (updatedMatch as any).__maxWicketsReached = maxWicketsReached;
    } else if (action === 'end_innings') {
      const matchHistory = this.history.get(id) ?? [];
      matchHistory.push(JSON.parse(JSON.stringify(currentMatch)));
      this.history.set(id, matchHistory);
      updatedMatch = endInnings(JSON.parse(JSON.stringify(currentMatch)));
    } else if (action === 'toss') {
      // data: { wonBy: number, decision: 'bat' | 'bowl' }
      updatedMatch = JSON.parse(JSON.stringify(currentMatch));
      updatedMatch.status = 'live';
      updatedMatch.toss = { wonBy: data.wonBy, decision: data.decision };
      
      const firstBattingTeamId = data.decision === 'bat' 
        ? data.wonBy 
        : updatedMatch.teams.find((t: any) => t.teamId !== data.wonBy).teamId;

      updatedMatch.innings = [{
        teamId: firstBattingTeamId,
        score: 0,
        wickets: 0,
        overs: 0,
        complete: false,
        batting: [],
        bowling: [],
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, total: 0 },
        fallOfWickets: []
      }];
    } else if (action === 'start_innings') {
      // data: { strikerId, nonStrikerId, bowlerId }
      updatedMatch = JSON.parse(JSON.stringify(currentMatch));
      const innings = updatedMatch.innings[updatedMatch.innings.length - 1];
      if (innings) {
        innings.batting = [
          { playerId: data.strikerId, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, dismissal: 'not out', out: false, isStriker: true },
          { playerId: data.nonStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, dismissal: 'not out', out: false, isStriker: false }
        ];
        innings.bowling = [
          { playerId: data.bowlerId, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0, isCurrentBowler: true }
        ];
      }
    } else if (action === 'new_bowler') {
      // data: { bowlerId: number }
      updatedMatch = JSON.parse(JSON.stringify(currentMatch));
      const innings = updatedMatch.innings[updatedMatch.innings.length - 1];
      if (innings) {
        innings.bowling.forEach((b: any) => { b.isCurrentBowler = false; });
        let bowlerRecord = innings.bowling.find((b: any) => b.playerId === data.bowlerId);
        if (!bowlerRecord) {
          bowlerRecord = { playerId: data.bowlerId, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 };
          innings.bowling.push(bowlerRecord);
        }
        bowlerRecord.isCurrentBowler = true;
      }
    } else if (action === 'reset_match') {
      updatedMatch = JSON.parse(JSON.stringify(currentMatch));
      updatedMatch.status = 'scheduled';
      delete updatedMatch.toss;
      delete updatedMatch.result;
      updatedMatch.innings = [];
      updatedMatch.commentary = [];
      this.history.delete(id);
    } else {
      throw new Error('Invalid action');
    }

    matches[matchIndex] = updatedMatch;
    // Strip internal advisory flags before persisting
    const flags = {
      inningsJustEnded: (updatedMatch as any).__inningsJustEnded ?? false,
      maxWicketsReached: (updatedMatch as any).__maxWicketsReached ?? false,
    };
    delete (updatedMatch as any).__inningsJustEnded;
    delete (updatedMatch as any).__maxWicketsReached;

    fs.writeFileSync(filePath, JSON.stringify(matches, null, 2), 'utf8');

    const snapshot = buildScorecardSnapshot(updatedMatch);
    this.scoringGateway.broadcastMatchEvent(id, { matchId: id, action, snapshot, ...flags });

    return updatedMatch;
  }
}
