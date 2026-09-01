export interface BallEvent {
  type: 'legal' | 'wicket' | 'wide' | 'noBall' | 'bye' | 'legBye';
  runs: number; // Runs off the bat or extras
  wicket?: {
    dismissalType: string;
    playerOutId: number;
    fielderId?: number;
    newBatterId?: number; // Incoming batter
  };
}

function oversToLegalBalls(overs: number): number {
  return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
}

function legalBallsToOvers(balls: number): number {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return o + b / 10;
}

export function applyDeliveryToMatch(match: any, event: BallEvent | string): any {
  // Legacy string support just in case, convert to BallEvent
  if (typeof event === 'string') {
    const outcome = event;
    const isWicket = outcome === 'W';
    const isWide = outcome === 'Wd';
    const isNb = outcome === 'Nb';
    let runs = 0;
    if (!isWicket && !isWide && !isNb) runs = parseInt(outcome, 10) || 0;
    
    event = {
      type: isWicket ? 'wicket' : isWide ? 'wide' : isNb ? 'noBall' : 'legal',
      runs: runs,
    } as BallEvent;
  }

  const updatedMatch = JSON.parse(JSON.stringify(match));
  const innings = updatedMatch.innings[updatedMatch.innings.length - 1];
  if (!innings) return updatedMatch;

  const isLegal = event.type === 'legal' || event.type === 'wicket' || event.type === 'bye' || event.type === 'legBye';
  const isExtra = event.type === 'wide' || event.type === 'noBall' || event.type === 'bye' || event.type === 'legBye';
  const isWicket = event.type === 'wicket';

  // 1. Calculate Runs to add to Total Score
  let totalRunsAdded = event.runs;
  if (event.type === 'wide' || event.type === 'noBall') {
    totalRunsAdded += 1; // Base 1 penalty run for Wide/NoBall
  }
  
  innings.score += totalRunsAdded;
  if (isWicket) innings.wickets += 1;

  // 2. Extras Breakdown
  if (isExtra) {
    innings.extras = innings.extras || { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 };
    innings.extras.total += totalRunsAdded;
    if (event.type === 'wide') innings.extras.wides += totalRunsAdded;
    if (event.type === 'noBall') innings.extras.noBalls += totalRunsAdded;
    if (event.type === 'bye') innings.extras.byes += totalRunsAdded;
    if (event.type === 'legBye') innings.extras.legByes += totalRunsAdded;
  }

  // 3. Batting Updates
  const notOutBatters = innings.batting.filter((b: any) => !b.out);
  let striker = notOutBatters.find((b: any) => b.isStriker) || notOutBatters[0];
  let nonStriker = notOutBatters.find((b: any) => !b.isStriker) || notOutBatters[1];

  if (striker) {
    if (event.type === 'legal' || event.type === 'wicket') {
      striker.runs += event.runs;
      striker.balls += 1;
      if (event.runs === 4) striker.fours += 1;
      if (event.runs === 6) striker.sixes += 1;
      striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;
    } else if (event.type === 'bye' || event.type === 'legBye' || event.type === 'noBall') {
      striker.balls += 1; // Batter faced a ball, but didn't score runs off the bat
      striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;
    }

    if (isWicket && event.wicket) {
      // Find the specific player out (could be non-striker in a run out)
      const playerOut = innings.batting.find((b: any) => b.playerId === event.wicket!.playerOutId);
      if (playerOut) {
        playerOut.out = true;
        
        // Format dismissal string
        let dismissalText = event.wicket.dismissalType;
        const bowler = innings.bowling.find((b: any) => b.isCurrentBowler) || innings.bowling[innings.bowling.length - 1];
        
        if (event.wicket.dismissalType === 'Caught') {
          // Attempt to find fielder name
          const team = updatedMatch.teams.find((t: any) => t.teamId !== innings.teamId);
          const fielder = team?.players.find((p: any) => p.playerId === event.wicket!.fielderId);
          dismissalText = `c ${fielder?.playerName || 'Sub'} b ${bowler?.playerName || 'Bowler'}`;
        } else if (event.wicket.dismissalType === 'Bowled') {
          dismissalText = `b ${bowler?.playerName || 'Bowler'}`;
        } else if (event.wicket.dismissalType === 'LBW') {
          dismissalText = `lbw b ${bowler?.playerName || 'Bowler'}`;
        } else if (event.wicket.dismissalType === 'Run Out') {
          const team = updatedMatch.teams.find((t: any) => t.teamId !== innings.teamId);
          const fielder = team?.players.find((p: any) => p.playerId === event.wicket!.fielderId);
          dismissalText = `run out (${fielder?.playerName || 'Fielder'})`;
        }

        playerOut.dismissal = dismissalText;
        playerOut.isStriker = false;

        // Bring in new batter
        if (event.wicket.newBatterId) {
          innings.batting.push({
            playerId: event.wicket.newBatterId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            dismissal: 'not out',
            out: false,
            // If the striker was out, new batter takes strike, unless they crossed (handled in rotation logic)
            isStriker: playerOut.playerId === striker.playerId
          });
          
          // Refresh references
          const newNotOutBatters = innings.batting.filter((b: any) => !b.out);
          striker = newNotOutBatters.find((b: any) => b.isStriker) || newNotOutBatters[0];
          nonStriker = newNotOutBatters.find((b: any) => !b.isStriker) || newNotOutBatters[1];
        }
      }
    } else if (isWicket && !event.wicket) {
       // Legacy wicket
       striker.out = true;
       striker.dismissal = 'Out';
       striker.isStriker = false;
    }
  }

  // 4. Bowling Updates
  const bowler = innings.bowling.find((b: any) => b.isCurrentBowler) || innings.bowling[innings.bowling.length - 1];
  let overComplete = false;

  if (bowler) {
    // Bowlers don't give away runs for byes and leg byes
    if (event.type !== 'bye' && event.type !== 'legBye') {
      bowler.runs += totalRunsAdded;
    }
    
    // Run outs don't credit the bowler
    if (isWicket && event.wicket?.dismissalType !== 'Run Out') {
      bowler.wickets += 1;
    }

    if (isLegal) {
      const currentLegalBalls = oversToLegalBalls(bowler.overs || 0);
      const newLegalBalls = currentLegalBalls + 1;
      bowler.overs = legalBallsToOvers(newLegalBalls);
      overComplete = newLegalBalls % 6 === 0;
    }
    
    const totalBalls = oversToLegalBalls(bowler.overs || 0);
    bowler.economy = totalBalls > 0 ? (bowler.runs / (totalBalls / 6)) : 0;
  }

  // 5. Innings Overs
  if (isLegal) {
    const inningsLegalBalls = oversToLegalBalls(innings.overs || 0);
    innings.overs = legalBallsToOvers(inningsLegalBalls + 1);
  }

  // 6. Strike Rotation
  // XOR: rotate if exactly ONE of (odd runs, over complete) is true.
  // If both are true (odd runs on last ball of over), they cancel out → batter keeps strike.
  if (striker && nonStriker && !isWicket) {
    const runBasedRotate = (event.runs % 2 === 1);
    const shouldRotate = runBasedRotate !== overComplete; // XOR

    if (shouldRotate) {
      striker.isStriker = false;
      nonStriker.isStriker = true;
    }
  }

  // End-of-over rotation for wickets: non-striker swaps end
  if (isWicket && overComplete && nonStriker) {
    // Swap ends: nonStriker becomes the striker for next over
    nonStriker.isStriker = true;
  }

  // 7. Commentary
  if (!updatedMatch.commentary) updatedMatch.commentary = [];
  
  let commText = `${event.runs} run${event.runs !== 1 ? 's' : ''}`;
  if (isWicket) commText = 'Wicket falls!';
  if (event.type === 'wide') commText = `${totalRunsAdded} wide${totalRunsAdded !== 1 ? 's' : ''}`;
  if (event.type === 'noBall') commText = `No ball + ${event.runs} run${event.runs !== 1 ? 's' : ''}`;
  if (event.type === 'bye') commText = `${event.runs} bye${event.runs !== 1 ? 's' : ''}`;
  if (event.type === 'legBye') commText = `${event.runs} leg bye${event.runs !== 1 ? 's' : ''}`;

  updatedMatch.commentary.unshift({
    over: bowler ? bowler.overs : innings.overs,
    text: commText,
    isWicket,
    runs: totalRunsAdded
  });

  return updatedMatch;
}
