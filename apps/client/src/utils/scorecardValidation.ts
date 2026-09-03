export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type ValidationRule = (innings: any, matchRules?: any) => { errors: string[]; warnings: string[] };

function oversToLegalBalls(overs: number): number {
  return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
}

const overallScoreMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const batterRuns = innings.batting?.reduce((sum: number, b: any) => sum + (b.runs || 0), 0) || 0;
  const extrasTotal = innings.extras?.total || 0;
  
  if (batterRuns + extrasTotal !== innings.score) {
    errors.push(`Total score (${innings.score}) does not match sum of batter runs (${batterRuns}) + extras (${extrasTotal}).`);
  }
  return { errors, warnings: [] };
};

const extrasMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const { byes = 0, legByes = 0, wides = 0, noBalls = 0, total = 0 } = innings.extras || {};
  
  if (byes + legByes + wides + noBalls !== total) {
    errors.push(`Extras total (${total}) does not match sum of byes, legByes, wides, noBalls.`);
  }
  return { errors, warnings: [] };
};

const wicketsMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const outBatters = innings.batting?.filter((b: any) => b.out).length || 0;
  
  if (outBatters !== innings.wickets) {
    errors.push(`Total wickets (${innings.wickets}) does not match number of out batters (${outBatters}).`);
  }
  
  if (innings.wickets > 10) {
    errors.push(`Wickets (${innings.wickets}) cannot exceed 10.`);
  }
  
  return { errors, warnings: [] };
};

const bowlingRunsMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const bowlerRuns = innings.bowling?.reduce((sum: number, b: any) => sum + (b.runs || 0), 0) || 0;
  const { byes = 0, legByes = 0 } = innings.extras || {};
  
  if (bowlerRuns + byes + legByes !== innings.score) {
    errors.push(`Total score (${innings.score}) does not match sum of bowler runs (${bowlerRuns}) + byes (${byes}) + legByes (${legByes}).`);
  }
  return { errors, warnings: [] };
};

const bowlingWicketsMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const bowlerWickets = innings.bowling?.reduce((sum: number, b: any) => sum + (b.wickets || 0), 0) || 0;
  
  if (bowlerWickets > innings.wickets) {
    errors.push(`Bowler wickets (${bowlerWickets}) cannot exceed total innings wickets (${innings.wickets}).`);
  }
  return { errors, warnings: [] };
};

const bowlingOversMatchRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  const totalBowlerBalls = innings.bowling?.reduce((sum: number, b: any) => sum + oversToLegalBalls(b.overs || 0), 0) || 0;
  const inningsBalls = oversToLegalBalls(innings.overs || 0);
  
  if (totalBowlerBalls !== inningsBalls) {
    errors.push(`Total innings overs (${innings.overs}) does not match sum of bowler overs.`);
  }
  return { errors, warnings: [] };
};

const maxOversPerBowlerRule: ValidationRule = (innings, matchRules) => {
  const errors: string[] = [];
  const totalOvers = matchRules?.totalOvers || 20;
  const maxOversPerBowler = Math.ceil(totalOvers / 5);
  
  innings.bowling?.forEach((b: any) => {
    if ((b.overs || 0) > maxOversPerBowler) {
      errors.push(`Bowler (ID: ${b.playerId}) has bowled ${b.overs} overs, which exceeds the max allowed (${maxOversPerBowler}).`);
    }
  });
  
  return { errors, warnings: [] };
};

const nonNegativeRule: ValidationRule = (innings) => {
  const errors: string[] = [];
  
  if (innings.score < 0 || innings.wickets < 0 || innings.overs < 0) {
    errors.push('Innings totals cannot be negative.');
  }
  
  innings.batting?.forEach((b: any) => {
    if (b.runs < 0 || b.balls < 0 || b.fours < 0 || b.sixes < 0) {
      errors.push(`Batter (ID: ${b.playerId}) has negative stats.`);
    }
  });
  
  innings.bowling?.forEach((b: any) => {
    if (b.overs < 0 || b.maidens < 0 || b.runs < 0 || b.wickets < 0 || b.wides < 0 || b.noBalls < 0) {
      errors.push(`Bowler (ID: ${b.playerId}) has negative stats.`);
    }
  });
  
  const { byes = 0, legByes = 0, wides = 0, noBalls = 0, total = 0 } = innings.extras || {};
  if (byes < 0 || legByes < 0 || wides < 0 || noBalls < 0 || total < 0) {
    errors.push('Extras cannot be negative.');
  }
  
  return { errors, warnings: [] };
};

const rules: ValidationRule[] = [
  overallScoreMatchRule,
  extrasMatchRule,
  wicketsMatchRule,
  bowlingRunsMatchRule,
  bowlingWicketsMatchRule,
  bowlingOversMatchRule,
  maxOversPerBowlerRule,
  nonNegativeRule
];

export function validateScorecard(innings: any, matchRules?: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const rule of rules) {
    const result = rule(innings, matchRules);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
