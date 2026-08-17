import { Profile } from "./types";

export interface RankInfo {
  tier: number;            // 1 - 8
  title: string;           // Rank title
  aka: string;             // Arena moniker / alias
  badgeEmoji: string;      // Visual badge icon
  minRating: number;       // Minimum required Dynamic Performance Index (DPI)
  nextTierRating: number;  // Minimum DPI for next rank tier
  minGamesRequired: number; // Minimum matches played required
  progressPercent: number; // 0 - 100 progress percentage to next tier
  description: string;     // Short description of status in draughts
  
  // Dynamic factors breakdown
  dpi: number;             // Dynamic Performance Index (Combined score)
  baseRating: number;      // Core ELO Rating
  streakBonus: number;     // Bonus from consecutive win streak
  frequencyBonus: number;  // Bonus from recent match activity / frequency
  gapBonus: number;        // Bonus from defeating higher-rated opponents
}

export const GHANAIAN_RANKS: Omit<RankInfo, "progressPercent" | "dpi" | "baseRating" | "streakBonus" | "frequencyBonus" | "gapBonus">[] = [
  {
    tier: 1,
    title: "Draft Learner",
    aka: "Spot Starter",
    badgeEmoji: "🪵",
    minRating: 0,
    nextTierRating: 1080,
    minGamesRequired: 0,
    description: "New draughts player getting started on the board.",
  },
  {
    tier: 2,
    title: "Base Challenger",
    aka: "Base Player",
    badgeEmoji: "🥉",
    minRating: 1080,
    nextTierRating: 1220,
    minGamesRequired: 3,
    description: "Regular player at local draughts clubs and arenas.",
  },
  {
    tier: 3,
    title: "Spot Champion",
    aka: "Spot Hero",
    badgeEmoji: "🥈",
    minRating: 1220,
    nextTierRating: 1380,
    minGamesRequired: 8,
    description: "Dominates local match tables and spot challenges.",
  },
  {
    tier: 4,
    title: "Town Master",
    aka: "Town Champion",
    badgeEmoji: "🥇",
    minRating: 1380,
    nextTierRating: 1550,
    minGamesRequired: 15,
    description: "Renowned neighborhood tactician and compulsory capture expert.",
  },
  {
    tier: 5,
    title: "Regional Giant",
    aka: "Region Master",
    badgeEmoji: "💎",
    minRating: 1550,
    nextTierRating: 1720,
    minGamesRequired: 25,
    description: "Feared across regional tournament leagues and wager arenas.",
  },
  {
    tier: 6,
    title: "Arena Damii Master",
    aka: "National Master",
    badgeEmoji: "👑",
    minRating: 1720,
    nextTierRating: 1880,
    minGamesRequired: 40,
    description: "Elite draughts master recognized across the platform.",
  },
  {
    tier: 7,
    title: "Opana Grandmaster",
    aka: "Opana",
    badgeEmoji: "🔥",
    minRating: 1880,
    nextTierRating: 2050,
    minGamesRequired: 60,
    description: "Grandmaster status with flying king mastery and legendary instinct.",
  },
  {
    tier: 8,
    title: "Champion of Champions",
    aka: "Okonkwo",
    badgeEmoji: "⚡",
    minRating: 2050,
    nextTierRating: 9999,
    minGamesRequired: 80,
    description: "The supreme legend of 10x10 Damii Draughts.",
  },
];

/**
 * Dynamically calculates a player's rank based on composite factors:
 * 1. Base ELO Rating
 * 2. Win Streak Bonus
 * 3. Match Frequency / Recency Bonus
 * 4. Opponent Rating Gap Quality
 */
export function getProfileRank(profile: Partial<Profile> | null | undefined): RankInfo {
  if (!profile) {
    const baseTier = GHANAIAN_RANKS[0];
    return {
      ...baseTier,
      progressPercent: 0,
      dpi: 1000,
      baseRating: 1000,
      streakBonus: 0,
      frequencyBonus: 0,
      gapBonus: 0,
    };
  }

  const baseRating = profile.rating ?? 1000;
  const wins = profile.wins ?? 0;
  const losses = profile.losses ?? 0;
  const draws = profile.draws ?? 0;
  const totalGames = wins + losses + draws;

  const winStreak = profile.winStreak ?? 0;
  const bestStreak = profile.bestStreak ?? 0;
  
  // Calculate match frequency (matches in last 7 days or baseline default)
  const matchesLast7Days = profile.matchesLast7Days ?? (totalGames > 0 ? Math.min(totalGames, 5) : 0);
  const opponentRatingAvg = profile.opponentRatingAvg ?? 1000;

  // 1. Win Streak Bonus (up to +150 DPI)
  const streakBonus = Math.min(150, (winStreak * 18) + (bestStreak >= 3 ? 20 : 0));

  // 2. Match Frequency Bonus (up to +100 DPI)
  const frequencyBonus = Math.min(100, matchesLast7Days * 15);

  // 3. Opponent Quality / Rating Gap Bonus (up to +120 DPI)
  const gapBonus = Math.min(120, Math.max(-40, Math.round((opponentRatingAvg - 1000) * 0.25)));

  // Dynamic Performance Index (DPI)
  const dpi = Math.max(100, Math.round(baseRating + streakBonus + frequencyBonus + gapBonus));

  // Find highest rank tier qualified for by DPI & total games played
  let currentRankIndex = 0;
  for (let i = GHANAIAN_RANKS.length - 1; i >= 0; i--) {
    const tier = GHANAIAN_RANKS[i];
    if (dpi >= tier.minRating && totalGames >= tier.minGamesRequired) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = GHANAIAN_RANKS[currentRankIndex];
  const nextRank = GHANAIAN_RANKS[Math.min(currentRankIndex + 1, GHANAIAN_RANKS.length - 1)];

  // Calculate progress percentage towards next rank tier
  let progressPercent = 100;
  if (currentRankIndex < GHANAIAN_RANKS.length - 1) {
    const ratingRange = Math.max(1, nextRank.minRating - currentRank.minRating);
    const ratingProgress = Math.max(0, dpi - currentRank.minRating);
    progressPercent = Math.min(100, Math.round((ratingProgress / ratingRange) * 100));
  }

  return {
    ...currentRank,
    progressPercent,
    dpi,
    baseRating,
    streakBonus,
    frequencyBonus,
    gapBonus,
  };
}

export interface RatingCalculationResult {
  newRating: number;
  newWins: number;
  newLosses: number;
  newDraws: number;
  newWinStreak: number;
  newBestStreak: number;
  newMatchesLast7Days: number;
  newOpponentRatingAvg: number;
  newTotalOpponentsFaced: number;
  lastMatchAt: string;
  ratingDelta: number;
  expectedScore: number;
  kFactor: number;
}

/**
 * Calculates dynamic ELO updates based on:
 * - Opponent Rating Gap (Expected vs Actual, Upset Multiplier)
 * - Win Streak Multipliers
 * - Match Frequency & Calibration K-Factor
 */
export function calculateDynamicRatingUpdate(
  player: Profile,
  opponent: Profile | null,
  isWin: boolean,
  isDraw: boolean = false
): RatingCalculationResult {
  const playerRating = player.rating || 1000;
  const opponentRating = opponent ? (opponent.rating || 1000) : 1000;
  const totalGames = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);

  // 1. Logistic ELO Expected Score
  const ratingGap = opponentRating - playerRating;
  const expectedScore = 1 / (1 + Math.pow(10, ratingGap / 400));
  const actualScore = isWin ? 1.0 : isDraw ? 0.5 : 0.0;

  // 2. Determine Calibration & Frequency K-Factor
  let kFactor = 32;
  const matchesLast7Days = (player.matchesLast7Days || 0) + 1;
  if (totalGames < 10) {
    kFactor = 40; // New player calibration phase
  } else if (matchesLast7Days >= 5) {
    kFactor = 36; // Active ladder climber boost
  } else if (player.lastMatchAt) {
    const daysSinceLastMatch = (Date.now() - new Date(player.lastMatchAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastMatch > 14) {
      kFactor = 24; // Inactive player lower volatility
    }
  }

  // 3. Opponent Rating Gap Upset Multiplier
  let upsetMultiplier = 1.0;
  if (isWin && ratingGap > 0) {
    // Underdog victory: bonus gain proportional to opponent rating gap
    upsetMultiplier = 1.0 + Math.min(1.0, ratingGap / 400);
  } else if (!isWin && !isDraw && ratingGap < 0) {
    // Favorite defeat: higher loss penalty proportional to negative rating gap
    upsetMultiplier = 1.0 + Math.min(0.5, Math.abs(ratingGap) / 500);
  }

  // 4. Win Streak Multiplier
  let newWinStreak = player.winStreak || 0;
  let newBestStreak = player.bestStreak || 0;
  let streakMultiplier = 1.0;

  if (isWin) {
    newWinStreak += 1;
    newBestStreak = Math.max(newBestStreak, newWinStreak);
    // 10% gain boost per streak level up to 50% max
    streakMultiplier = 1.0 + Math.min(0.5, (newWinStreak - 1) * 0.1);
  } else if (!isDraw) {
    newWinStreak = 0; // Streak reset on loss
  }

  // 5. Calculate Final ELO Delta
  let ratingDelta = Math.round(kFactor * (actualScore - expectedScore) * upsetMultiplier * streakMultiplier);

  // Guarantee minimal feedback (at least +3 on win, at most -2 on draw if heavily favored)
  if (isWin && ratingDelta < 3) ratingDelta = 3;
  if (!isWin && !isDraw && ratingDelta > -3) ratingDelta = -3;

  const newRating = Math.max(100, playerRating + ratingDelta);

  // 6. Update Opponent Quality Tracking
  const prevTotalOpponents = player.totalOpponentsFaced || 0;
  const newTotalOpponentsFaced = prevTotalOpponents + 1;
  const prevAvg = player.opponentRatingAvg || 1000;
  const newOpponentRatingAvg = Math.round(((prevAvg * prevTotalOpponents) + opponentRating) / newTotalOpponentsFaced);

  const now = new Date().toISOString();

  return {
    newRating,
    newWins: (player.wins || 0) + (isWin ? 1 : 0),
    newLosses: (player.losses || 0) + (!isWin && !isDraw ? 1 : 0),
    newDraws: (player.draws || 0) + (isDraw ? 1 : 0),
    newWinStreak,
    newBestStreak,
    newMatchesLast7Days: Math.min(50, matchesLast7Days),
    newOpponentRatingAvg,
    newTotalOpponentsFaced,
    lastMatchAt: now,
    ratingDelta,
    expectedScore,
    kFactor,
  };
}
