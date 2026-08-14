import { dbRepository } from "./db-client";
import { League, LeagueMatch, LeagueParticipant, TournamentFormat, PrizeDistribution } from "./types";

export const leagueService = {
  async listLeagues(): Promise<League[]> {
    return dbRepository.listLeagues();
  },

  async getLeagueDetails(leagueId: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const matches = await dbRepository.getLeagueMatches(leagueId);

    return { league, participants, matches };
  },

  async createLeague(
    facilitatorToken: string,
    facilitatorName: string,
    title: string,
    description: string,
    entryFeePoints: number,
    prizePoolPoints: number,
    maxParticipants = 8,
    options?: {
      format?: TournamentFormat;
      isPrivate?: boolean;
      inviteCode?: string;
      requiresApproval?: boolean;
      scheduleDate?: string;
      scheduleTime?: string;
      gameDays?: string;
      turnTimerSeconds?: number;
      prizeDistribution?: PrizeDistribution;
      rulesNotes?: string;
    }
  ): Promise<League> {
    const profile = await dbRepository.getProfile(facilitatorToken);
    if (!profile) throw new Error("Facilitator profile not found");

    const now = new Date().toISOString();
    const id = `league-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const generatedInviteCode = options?.inviteCode?.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const chosenFormat: TournamentFormat = options?.format || "single_elimination";

    const defaultDistribution: PrizeDistribution = options?.prizeDistribution || {
      first: 60,
      second: 30,
      third: 10,
    };

    const league: League = {
      id,
      title: title.trim(),
      description: description.trim(),
      entryFeeMarbles: 0,
      entryFeePoints: Math.max(0, entryFeePoints),
      prizePoolPoints: Math.max(0, prizePoolPoints),
      status: "registration",
      format: chosenFormat,
      facilitatorToken,
      facilitatorName: profile.username || facilitatorName,
      maxParticipants: [4, 8, 16, 32].includes(maxParticipants) ? maxParticipants : 8,
      participantCount: 0,
      winnerToken: null,
      winnerName: null,
      runnerUpToken: null,
      runnerUpName: null,
      thirdPlaceToken: null,
      thirdPlaceName: null,
      isPrivate: Boolean(options?.isPrivate),
      inviteCode: options?.isPrivate ? generatedInviteCode : undefined,
      requiresApproval: Boolean(options?.requiresApproval),
      scheduleDate: options?.scheduleDate || "Saturdays & Sundays",
      scheduleTime: options?.scheduleTime || "18:00 GMT",
      gameDays: options?.gameDays || "Match Days: Sat & Sun",
      turnTimerSeconds: options?.turnTimerSeconds || 60,
      roundsCount: 0,
      prizeDistribution: defaultDistribution,
      rulesNotes: options?.rulesNotes || "Standard 10x10 Ghanaian Damii rules apply. Turn clock strictly enforced.",
      createdAt: now,
      updatedAt: now,
    };

    await dbRepository.saveLeague(league);

    // Auto-register facilitator as approved participant #1 with Seed #1
    const facilitatorParticipant: LeagueParticipant = {
      id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      leagueId: id,
      userToken: facilitatorToken,
      username: profile.username,
      status: "approved",
      seed: 1,
      checkedIn: true,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: now,
    };
    await dbRepository.addLeagueParticipant(facilitatorParticipant);

    return league;
  },

  async updateLeagueSettings(
    facilitatorOrAdminToken: string,
    leagueId: string,
    updates: Partial<League>
  ) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "super_admin" &&
        profile.role !== "organizer" &&
        profile.role !== "facilitator" &&
        league.facilitatorToken !== facilitatorOrAdminToken)
    ) {
      throw new Error("Unauthorized. Only the tournament organizer or platform admin can update settings.");
    }

    if (updates.title) league.title = updates.title.trim();
    if (updates.description) league.description = updates.description.trim();
    if (updates.scheduleDate) league.scheduleDate = updates.scheduleDate;
    if (updates.scheduleTime) league.scheduleTime = updates.scheduleTime;
    if (updates.gameDays) league.gameDays = updates.gameDays;
    if (updates.rulesNotes !== undefined) league.rulesNotes = updates.rulesNotes;
    if (updates.turnTimerSeconds) league.turnTimerSeconds = updates.turnTimerSeconds;
    if (updates.isPrivate !== undefined) league.isPrivate = updates.isPrivate;
    if (updates.inviteCode !== undefined) league.inviteCode = updates.inviteCode.toUpperCase();
    if (updates.requiresApproval !== undefined) league.requiresApproval = updates.requiresApproval;

    await dbRepository.saveLeague(league);
    return league;
  },

  async joinLeague(userToken: string, leagueId: string, providedInviteCode?: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");
    if (league.status !== "registration") throw new Error("League registration is closed");

    // Validate private invitation code if required
    if (league.isPrivate) {
      const codeInput = (providedInviteCode || "").trim().toUpperCase();
      if (!codeInput || codeInput !== (league.inviteCode || "").trim().toUpperCase()) {
        throw new Error("Invalid Tournament Invitation Code");
      }
    }

    const profile = await dbRepository.getProfile(userToken);
    if (!profile) throw new Error("User profile not found. Please log in first.");

    if (profile.role === "admin" || profile.role === "super_admin") {
      throw new Error("Administrator accounts serve as league facilitators and regulators. Admin accounts cannot register or compete as tournament players.");
    }

    if (league.entryFeePoints > 0 && profile.points < league.entryFeePoints) {
      throw new Error(`Insufficient Points. Entry fee is ${league.entryFeePoints} Points.`);
    }

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    if (participants.some((p) => p.userToken === userToken)) {
      throw new Error("You are already registered or applied for this league");
    }

    const approvedCount = participants.filter((p) => p.status !== "rejected").length;
    if (approvedCount >= league.maxParticipants) {
      throw new Error("League participant capacity reached");
    }

    // Deduct entry fee if required & record transaction ledger
    if (league.entryFeePoints > 0) {
      await dbRepository.updateProfileBalance(userToken, -league.entryFeePoints);
      await dbRepository.createTransaction({
        id: `tx-league-entry-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userToken,
        type: "league_fee",
        currency: "points",
        amount: -league.entryFeePoints,
        reference: league.id,
        status: "completed",
        metaJson: JSON.stringify({ leagueTitle: league.title }),
        createdAt: new Date().toISOString(),
      });
    }

    const initialStatus = league.requiresApproval ? "pending" : "approved";
    const nextSeed = participants.length + 1;

    const participant: LeagueParticipant = {
      id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      leagueId,
      userToken,
      username: profile.username,
      status: initialStatus,
      seed: nextSeed,
      checkedIn: false,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: new Date().toISOString(),
    };

    await dbRepository.addLeagueParticipant(participant);

    // Auto-generate bracket if capacity is filled with approved players
    const allApproved = (await dbRepository.getLeagueParticipants(leagueId)).filter((p) => p.status === "approved");
    if (allApproved.length >= league.maxParticipants) {
      await this.generateTournamentBracket(leagueId);
    }

    return { participant, totalJoined: allApproved.length, status: initialStatus };
  },

  async togglePlayerCheckIn(userToken: string, leagueId: string) {
    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const part = participants.find((p) => p.userToken === userToken);
    if (!part) throw new Error("Participant record not found in this tournament");

    part.checkedIn = !part.checkedIn;
    await dbRepository.addLeagueParticipant(part);
    return part;
  },

  async reseedParticipants(facilitatorOrAdminToken: string, leagueId: string, orderedUserTokens: string[]) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "super_admin" &&
        profile.role !== "organizer" &&
        profile.role !== "facilitator" &&
        league.facilitatorToken !== facilitatorOrAdminToken)
    ) {
      throw new Error("Unauthorized to reseed participants");
    }

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    for (let i = 0; i < orderedUserTokens.length; i++) {
      const token = orderedUserTokens[i];
      const part = participants.find((p) => p.userToken === token);
      if (part) {
        part.seed = i + 1;
        await dbRepository.addLeagueParticipant(part);
      }
    }

    return dbRepository.getLeagueParticipants(leagueId);
  },

  async approveApplicant(facilitatorToken: string, participantId: string) {
    const allParticipants = Array.from((await dbRepository.getLeagueParticipants("")).values());
    const part = allParticipants.find((p) => p.id === participantId);
    if (!part) throw new Error("Participant application not found");

    const league = await dbRepository.getLeague(part.leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorToken);
    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "super_admin" &&
        profile.role !== "organizer" &&
        profile.role !== "facilitator" &&
        league.facilitatorToken !== facilitatorToken)
    ) {
      throw new Error("Unauthorized. Only the tournament organizer can approve applications.");
    }

    const updated = await dbRepository.updateParticipantStatus(participantId, "approved");

    // Check if bracket generation threshold met
    const allApproved = (await dbRepository.getLeagueParticipants(league.id)).filter((p) => p.status === "approved");
    if (allApproved.length >= league.maxParticipants) {
      await this.generateTournamentBracket(league.id);
    }

    return updated;
  },

  async rejectApplicant(facilitatorToken: string, participantId: string) {
    const allParticipants = Array.from((await dbRepository.getLeagueParticipants("")).values());
    const part = allParticipants.find((p) => p.id === participantId);
    if (!part) throw new Error("Participant application not found");

    const league = await dbRepository.getLeague(part.leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorToken);
    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "super_admin" &&
        profile.role !== "organizer" &&
        profile.role !== "facilitator" &&
        league.facilitatorToken !== facilitatorToken)
    ) {
      throw new Error("Unauthorized. Only the tournament organizer can reject applications.");
    }

    // Refund entry fee if rejected by facilitator
    if (league.entryFeePoints > 0) {
      await dbRepository.updateProfileBalance(part.userToken, league.entryFeePoints);
      await dbRepository.createTransaction({
        id: `tx-league-refund-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userToken: part.userToken,
        type: "league_fee",
        currency: "points",
        amount: league.entryFeePoints,
        reference: league.id,
        status: "completed",
        metaJson: JSON.stringify({ note: "Entry fee refunded after application rejection" }),
        createdAt: new Date().toISOString(),
      });
    }

    return dbRepository.updateParticipantStatus(participantId, "rejected");
  },

  async addParticipantManual(organizerToken: string, leagueId: string, usernameToAdd: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const organizer = await dbRepository.getProfile(organizerToken);
    if (
      !organizer ||
      (organizer.role !== "admin" &&
        organizer.role !== "super_admin" &&
        organizer.role !== "organizer" &&
        organizer.role !== "facilitator" &&
        league.facilitatorToken !== organizerToken)
    ) {
      throw new Error("Unauthorized. Only tournament organizers can add players manually.");
    }

    const cleanName = usernameToAdd.trim();
    if (!cleanName) throw new Error("Player username is required");

    let playerProfile = await dbRepository.findProfileByUsername(cleanName);
    if (!playerProfile) {
      const generatedToken = `player-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      playerProfile = await dbRepository.createRegisteredProfile(generatedToken, cleanName, "123456");
    }

    const existingParticipants = await dbRepository.getLeagueParticipants(leagueId);
    if (existingParticipants.some((p) => p.userToken === playerProfile!.token)) {
      throw new Error(`Player '${cleanName}' is already registered in this tournament`);
    }

    const nextSeed = existingParticipants.length + 1;
    const participant: LeagueParticipant = {
      id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      leagueId,
      userToken: playerProfile.token,
      username: playerProfile.username,
      status: "approved",
      seed: nextSeed,
      checkedIn: true,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: new Date().toISOString(),
    };

    await dbRepository.addLeagueParticipant(participant);
    return participant;
  },

  async cancelTournament(organizerToken: string, leagueId: string, reason?: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const organizer = await dbRepository.getProfile(organizerToken);
    if (
      !organizer ||
      (organizer.role !== "admin" &&
        organizer.role !== "super_admin" &&
        organizer.role !== "organizer" &&
        organizer.role !== "facilitator" &&
        league.facilitatorToken !== organizerToken)
    ) {
      throw new Error("Unauthorized. Only the tournament organizer or admin can cancel this tournament.");
    }

    league.status = "cancelled";
    if (reason) league.rulesNotes = `${league.rulesNotes || ""}\n[CANCELLED]: ${reason}`.trim();
    await dbRepository.saveLeague(league);

    // Refund all participants if entry fee was paid
    if (league.entryFeePoints > 0) {
      const participants = await dbRepository.getLeagueParticipants(leagueId);
      for (const p of participants) {
        if (p.status !== "rejected") {
          await dbRepository.updateProfileBalance(p.userToken, league.entryFeePoints);
          await dbRepository.createTransaction({
            id: `tx-league-cancel-refund-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            userToken: p.userToken,
            type: "league_fee",
            currency: "points",
            amount: league.entryFeePoints,
            reference: league.id,
            status: "completed",
            metaJson: JSON.stringify({ note: `Refund due to tournament cancellation: ${reason || "Cancelled by Organizer"}` }),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return league;
  },

  async generateTournamentBracket(leagueId: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const allParticipants = await dbRepository.getLeagueParticipants(leagueId);
    const participants = allParticipants.filter((p) => p.status === "approved" || !p.status);
    if (participants.length < 2) throw new Error("Need at least 2 approved participants to generate bracket");

    // Sort by seed if assigned, otherwise shuffle
    const sortedParticipants = [...participants].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      return 0.5 - Math.random();
    });

    if (league.format === "round_robin") {
      return this.generateRoundRobinBracket(league, sortedParticipants);
    } else if (league.format === "double_elimination") {
      return this.generateDoubleEliminationBracket(league, sortedParticipants);
    } else if (league.format === "swiss") {
      return this.generateSwissBracket(league, sortedParticipants);
    } else {
      return this.generateSingleEliminationBracket(league, sortedParticipants);
    }
  },

  async generateSingleEliminationBracket(league: League, participants: LeagueParticipant[]) {
    const matches: LeagueMatch[] = [];
    const now = new Date().toISOString();

    let matchCounter = 1;
    for (let i = 0; i < participants.length; i += 2) {
      const p1 = participants[i];
      const p2 = participants[i + 1] || null;

      const match: LeagueMatch = {
        id: `match-${league.id}-r1-m${matchCounter}`,
        leagueId: league.id,
        round: 1,
        matchNumber: matchCounter,
        bracketType: "winners",
        player1Token: p1 ? p1.userToken : null,
        player1Name: p1 ? p1.username : "BYE",
        player1Score: 0,
        player2Token: p2 ? p2.userToken : null,
        player2Name: p2 ? p2.username : "BYE",
        player2Score: 0,
        winnerToken: !p2 && p1 ? p1.userToken : null, // Automatic bye victory
        roomCode: null,
        status: !p2 && p1 ? "completed" : "pending",
        createdAt: now,
      };
      matches.push(match);
      matchCounter++;
    }

    league.status = "active";
    league.roundsCount = Math.ceil(Math.log2(participants.length));
    await dbRepository.saveLeague(league);
    await dbRepository.setLeagueMatches(matches);

    return matches;
  },

  async generateNextSwissRoundMatches(league: League, nextRound: number) {
    const participants = await dbRepository.getLeagueParticipants(league.id);
    const previousMatches = await dbRepository.getLeagueMatches(league.id);
    const now = new Date().toISOString();

    // Sort by pointsScore descending
    const sorted = [...participants].sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0));

    // Track played pairs
    const playedSet = new Set<string>();
    for (const m of previousMatches) {
      if (m.player1Token && m.player2Token) {
        playedSet.add(`${m.player1Token}:${m.player2Token}`);
        playedSet.add(`${m.player2Token}:${m.player1Token}`);
      }
    }

    const unassigned = [...sorted];
    const newMatches: LeagueMatch[] = [];
    let matchCounter = 1;

    while (unassigned.length >= 2) {
      const p1 = unassigned.shift()!;
      let pairedIndex = -1;

      for (let i = 0; i < unassigned.length; i++) {
        const candidate = unassigned[i];
        if (!playedSet.has(`${p1.userToken}:${candidate.userToken}`)) {
          pairedIndex = i;
          break;
        }
      }

      // If everyone remaining has already played p1, pick nearest candidate
      if (pairedIndex === -1) pairedIndex = 0;

      const p2 = unassigned.splice(pairedIndex, 1)[0];

      const match: LeagueMatch = {
        id: `match-${league.id}-swiss-r${nextRound}-m${matchCounter}`,
        leagueId: league.id,
        round: nextRound,
        matchNumber: matchCounter,
        bracketType: "swiss",
        player1Token: p1.userToken,
        player1Name: p1.username,
        player1Score: 0,
        player2Token: p2.userToken,
        player2Name: p2.username,
        player2Score: 0,
        winnerToken: null,
        roomCode: null,
        status: "pending",
        createdAt: now,
      };
      newMatches.push(match);
      matchCounter++;
    }

    // Odd player gets BYE (+3 pts)
    if (unassigned.length === 1) {
      const byePlayer = unassigned[0];
      byePlayer.pointsScore = (byePlayer.pointsScore || 0) + 3;
      byePlayer.winsCount = (byePlayer.winsCount || 0) + 1;
      await dbRepository.addLeagueParticipant(byePlayer);

      const byeMatch: LeagueMatch = {
        id: `match-${league.id}-swiss-r${nextRound}-m${matchCounter}`,
        leagueId: league.id,
        round: nextRound,
        matchNumber: matchCounter,
        bracketType: "swiss",
        player1Token: byePlayer.userToken,
        player1Name: byePlayer.username,
        player1Score: 0,
        player2Token: null,
        player2Name: "BYE",
        player2Score: 0,
        winnerToken: byePlayer.userToken,
        roomCode: null,
        status: "completed",
        createdAt: now,
      };
      newMatches.push(byeMatch);
    }

    await dbRepository.setLeagueMatches(newMatches);
    return newMatches;
  },

  async generateDoubleEliminationBracket(league: League, participants: LeagueParticipant[]) {
    const matches: LeagueMatch[] = [];
    const now = new Date().toISOString();

    let matchCounter = 1;
    for (let i = 0; i < participants.length; i += 2) {
      const p1 = participants[i];
      const p2 = participants[i + 1] || null;

      const match: LeagueMatch = {
        id: `match-${league.id}-wb-r1-m${matchCounter}`,
        leagueId: league.id,
        round: 1,
        matchNumber: matchCounter,
        bracketType: "winners",
        player1Token: p1 ? p1.userToken : null,
        player1Name: p1 ? p1.username : "BYE",
        player1Score: 0,
        player2Token: p2 ? p2.userToken : null,
        player2Name: p2 ? p2.username : "BYE",
        player2Score: 0,
        winnerToken: !p2 && p1 ? p1.userToken : null,
        roomCode: null,
        status: !p2 && p1 ? "completed" : "pending",
        createdAt: now,
      };
      matches.push(match);
      matchCounter++;
    }

    league.status = "active";
    league.roundsCount = Math.ceil(Math.log2(participants.length)) * 2;
    await dbRepository.saveLeague(league);
    await dbRepository.setLeagueMatches(matches);

    return matches;
  },

  async generateRoundRobinBracket(league: League, participants: LeagueParticipant[]) {
    const matches: LeagueMatch[] = [];
    const now = new Date().toISOString();
    const list = [...participants];
    if (list.length % 2 !== 0) {
      list.push({
        id: "bye-player",
        leagueId: league.id,
        userToken: "bye-token",
        username: "BYE",
        joinedAt: now,
      });
    }

    const n = list.length;
    const rounds = n - 1;
    const half = n / 2;
    let globalMatchCount = 1;

    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < half; i++) {
        const p1 = list[i];
        const p2 = list[n - 1 - i];

        if (p1.userToken === "bye-token" || p2.userToken === "bye-token") continue;

        const match: LeagueMatch = {
          id: `match-${league.id}-rr-r${round}-m${globalMatchCount}`,
          leagueId: league.id,
          round,
          matchNumber: globalMatchCount,
          bracketType: "round_robin",
          player1Token: p1.userToken,
          player1Name: p1.username,
          player1Score: 0,
          player2Token: p2.userToken,
          player2Name: p2.username,
          player2Score: 0,
          winnerToken: null,
          roomCode: null,
          status: "pending",
          createdAt: now,
        };
        matches.push(match);
        globalMatchCount++;
      }
      // Rotate array items keeping index 0 fixed
      list.splice(1, 0, list.pop()!);
    }

    league.status = "active";
    league.roundsCount = rounds;
    await dbRepository.saveLeague(league);
    await dbRepository.setLeagueMatches(matches);

    return matches;
  },

  async generateSwissBracket(league: League, participants: LeagueParticipant[]) {
    const matches: LeagueMatch[] = [];
    const now = new Date().toISOString();

    // Round 1 paired by seed
    let matchCounter = 1;
    for (let i = 0; i < participants.length; i += 2) {
      const p1 = participants[i];
      const p2 = participants[i + 1] || null;

      const match: LeagueMatch = {
        id: `match-${league.id}-swiss-r1-m${matchCounter}`,
        leagueId: league.id,
        round: 1,
        matchNumber: matchCounter,
        bracketType: "swiss",
        player1Token: p1 ? p1.userToken : null,
        player1Name: p1 ? p1.username : "BYE",
        player1Score: 0,
        player2Token: p2 ? p2.userToken : null,
        player2Name: p2 ? p2.username : "BYE",
        player2Score: 0,
        winnerToken: !p2 && p1 ? p1.userToken : null,
        roomCode: null,
        status: !p2 && p1 ? "completed" : "pending",
        createdAt: now,
      };
      matches.push(match);
      matchCounter++;
    }

    league.status = "active";
    league.roundsCount = Math.max(3, Math.ceil(Math.log2(participants.length)));
    await dbRepository.saveLeague(league);
    await dbRepository.setLeagueMatches(matches);

    return matches;
  },

  async generateNextSwissRoundMatches(league: League, nextRound: number) {
    const participants = await dbRepository.getLeagueParticipants(league.id);
    const previousMatches = await dbRepository.getLeagueMatches(league.id);
    const now = new Date().toISOString();

    const sorted = [...participants].sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0));

    const playedSet = new Set<string>();
    for (const m of previousMatches) {
      if (m.player1Token && m.player2Token) {
        playedSet.add(`${m.player1Token}:${m.player2Token}`);
        playedSet.add(`${m.player2Token}:${m.player1Token}`);
      }
    }

    const unassigned = [...sorted];
    const newMatches: LeagueMatch[] = [];
    let matchCounter = 1;

    while (unassigned.length >= 2) {
      const p1 = unassigned.shift()!;
      let pairedIndex = -1;

      for (let i = 0; i < unassigned.length; i++) {
        const candidate = unassigned[i];
        if (!playedSet.has(`${p1.userToken}:${candidate.userToken}`)) {
          pairedIndex = i;
          break;
        }
      }

      if (pairedIndex === -1) pairedIndex = 0;

      const p2 = unassigned.splice(pairedIndex, 1)[0];

      const match: LeagueMatch = {
        id: `match-${league.id}-swiss-r${nextRound}-m${matchCounter}`,
        leagueId: league.id,
        round: nextRound,
        matchNumber: matchCounter,
        bracketType: "swiss",
        player1Token: p1.userToken,
        player1Name: p1.username,
        player1Score: 0,
        player2Token: p2.userToken,
        player2Name: p2.username,
        player2Score: 0,
        winnerToken: null,
        roomCode: null,
        status: "pending",
        createdAt: now,
      };
      newMatches.push(match);
      matchCounter++;
    }

    if (unassigned.length === 1) {
      const byePlayer = unassigned[0];
      byePlayer.pointsScore = (byePlayer.pointsScore || 0) + 3;
      byePlayer.winsCount = (byePlayer.winsCount || 0) + 1;
      await dbRepository.addLeagueParticipant(byePlayer);

      const byeMatch: LeagueMatch = {
        id: `match-${league.id}-swiss-r${nextRound}-m${matchCounter}`,
        leagueId: league.id,
        round: nextRound,
        matchNumber: matchCounter,
        bracketType: "swiss",
        player1Token: byePlayer.userToken,
        player1Name: byePlayer.username,
        player1Score: 0,
        player2Token: null,
        player2Name: "BYE",
        player2Score: 0,
        winnerToken: byePlayer.userToken,
        roomCode: null,
        status: "completed",
        createdAt: now,
      };
      newMatches.push(byeMatch);
    }

    await dbRepository.setLeagueMatches(newMatches);
    return newMatches;
  },

  async startLeagueMatchRoom(playerToken: string, matchId: string) {
    const allMatches = await dbRepository.getLeagueMatches("");
    const matchesList = await dbRepository.getLeagueMatches(allMatches[0]?.leagueId || "");
    const match = matchesList.find((m) => m.id === matchId);
    if (!match) throw new Error("League match not found");

    if (match.player1Token !== playerToken && match.player2Token !== playerToken) {
      throw new Error("You are not a registered contestant in this match");
    }

    if (match.roomCode) {
      return { match, roomCode: match.roomCode };
    }

    // Create a live match arena room
    const roomCode = `TM${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const initialBoard = JSON.stringify(Array(100).fill(null));

    const newRoom = {
      code: roomCode,
      hostName: match.player1Name || "Player 1",
      hostToken: match.player1Token || playerToken,
      guestName: match.player2Name || "Player 2",
      guestToken: match.player2Token || null,
      boardJson: initialBoard,
      turn: "white" as const,
      forcedFrom: null,
      winner: null,
      status: "playing" as const,
      mode: "league" as const,
      wagerAmount: 0,
      escrowId: null,
      leagueId: match.leagueId,
      matchId: match.id,
      moveCount: 0,
      resultApplied: 0,
      lastMoveTime: Date.now(),
      disconnectTime: null,
      disconnectedPlayer: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbRepository.saveRoom(newRoom);

    match.roomCode = roomCode;
    match.status = "in_progress";
    await dbRepository.saveLeagueMatch(match);

    return { match, roomCode };
  },

  async submitLeagueMatchResult(
    facilitatorOrAdminToken: string,
    matchId: string,
    winnerToken: string | "draw",
    disputeNotes?: string
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const matchesList = await dbRepository.getLeagueMatches("");
    const match = matchesList.find((m) => m.id === matchId);
    if (!match) throw new Error("Match not found");

    const league = await dbRepository.getLeague(match.leagueId);
    if (!league) throw new Error("League not found");

    if (
      profile.role !== "admin" &&
      profile.role !== "super_admin" &&
      league.facilitatorToken !== facilitatorOrAdminToken
    ) {
      throw new Error("Only the tournament facilitator or an admin can verify match results");
    }

    if (winnerToken === "draw") {
      match.winnerToken = null;
      match.status = "completed";
      if (disputeNotes) match.disputeNotes = disputeNotes;
    } else {
      match.winnerToken = winnerToken;
      match.status = "completed";
      if (disputeNotes) match.disputeNotes = disputeNotes;
    }

    await dbRepository.saveLeagueMatch(match);

    // Update player scores / statistics for Round Robin & Swiss
    if (league.format === "round_robin" || league.format === "swiss") {
      const participants = await dbRepository.getLeagueParticipants(league.id);
      const p1 = participants.find((p) => p.userToken === match.player1Token);
      const p2 = participants.find((p) => p.userToken === match.player2Token);

      if (winnerToken === "draw") {
        if (p1) { p1.pointsScore = (p1.pointsScore || 0) + 1; p1.drawsCount = (p1.drawsCount || 0) + 1; await dbRepository.addLeagueParticipant(p1); }
        if (p2) { p2.pointsScore = (p2.pointsScore || 0) + 1; p2.drawsCount = (p2.drawsCount || 0) + 1; await dbRepository.addLeagueParticipant(p2); }
      } else if (winnerToken === match.player1Token) {
        if (p1) { p1.pointsScore = (p1.pointsScore || 0) + 3; p1.winsCount = (p1.winsCount || 0) + 1; await dbRepository.addLeagueParticipant(p1); }
        if (p2) { p2.lossesCount = (p2.lossesCount || 0) + 1; await dbRepository.addLeagueParticipant(p2); }
      } else if (winnerToken === match.player2Token) {
        if (p2) { p2.pointsScore = (p2.pointsScore || 0) + 3; p2.winsCount = (p2.winsCount || 0) + 1; await dbRepository.addLeagueParticipant(p2); }
        if (p1) { p1.lossesCount = (p1.lossesCount || 0) + 1; await dbRepository.addLeagueParticipant(p1); }
      }
    }

    // Evaluate round completion and tournament progression
    const currentMatches = await dbRepository.getLeagueMatches(league.id);
    const activeRound = match.round;
    const roundMatches = currentMatches.filter((m) => m.round === activeRound);
    const allRoundDone = roundMatches.every((m) => m.status === "completed");

    if (allRoundDone) {
      if (league.format === "round_robin") {
        const totalRounds = league.roundsCount || 3;
        if (activeRound >= totalRounds) {
          await this.finalizeRoundRobinTournament(league);
        }
      } else if (league.format === "swiss") {
        const totalRounds = league.roundsCount || 3;
        if (activeRound >= totalRounds) {
          await this.finalizeRoundRobinTournament(league);
        } else {
          // Generate next Swiss round with Swiss pairing
          await this.generateNextSwissRoundMatches(league, activeRound + 1);
        }
      } else {
        // Single Elimination / Double Elimination
        const roundWinners = roundMatches.map((m) => m.winnerToken).filter(Boolean) as string[];

        if (roundWinners.length === 1) {
          // Tournament Champion Decided!
          const grandWinnerToken = roundWinners[0];
          const runnerUpToken = roundMatches.find((m) => m.winnerToken === grandWinnerToken)
            ? (roundMatches[0].player1Token === grandWinnerToken ? roundMatches[0].player2Token : roundMatches[0].player1Token)
            : null;

          await this.payoutTournamentPrizePool(league, grandWinnerToken, runnerUpToken, null);
        } else if (roundWinners.length > 1) {
          // Generate Next Round
          const nextRound = activeRound + 1;
          const nextMatches: LeagueMatch[] = [];
          let nextMatchNum = 1;

          for (let i = 0; i < roundWinners.length; i += 2) {
            const w1Token = roundWinners[i];
            const w2Token = roundWinners[i + 1] || null;
            const p1 = await dbRepository.getProfile(w1Token);
            const p2 = w2Token ? await dbRepository.getProfile(w2Token) : null;

            const nMatch: LeagueMatch = {
              id: `match-${league.id}-r${nextRound}-m${nextMatchNum}`,
              leagueId: league.id,
              round: nextRound,
              matchNumber: nextMatchNum,
              bracketType: match.bracketType,
              player1Token: w1Token,
              player1Name: p1 ? p1.username : "TBD",
              player1Score: 0,
              player2Token: w2Token,
              player2Name: p2 ? p2.username : "BYE",
              player2Score: 0,
              winnerToken: !w2Token ? w1Token : null,
              roomCode: null,
              status: !w2Token ? "completed" : "pending",
              createdAt: new Date().toISOString(),
            };
            nextMatches.push(nMatch);
            nextMatchNum++;
          }
          await dbRepository.setLeagueMatches(nextMatches);
        }
      }
    }

    return { match, league };
  },

  async finalizeRoundRobinTournament(league: League) {
    const participants = await dbRepository.getLeagueParticipants(league.id);
    const sorted = [...participants].sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0));

    const first = sorted[0]?.userToken || null;
    const second = sorted[1]?.userToken || null;
    const third = sorted[2]?.userToken || null;

    await this.payoutTournamentPrizePool(league, first, second, third);
  },

  async payoutTournamentPrizePool(
    league: League,
    winnerToken: string | null,
    runnerUpToken?: string | null,
    thirdPlaceToken?: string | null
  ) {
    const winnerProfile = winnerToken ? await dbRepository.getProfile(winnerToken) : null;
    const runnerUpProfile = runnerUpToken ? await dbRepository.getProfile(runnerUpToken) : null;
    const thirdPlaceProfile = thirdPlaceToken ? await dbRepository.getProfile(thirdPlaceToken) : null;

    league.status = "completed";
    league.winnerToken = winnerToken;
    league.winnerName = winnerProfile ? winnerProfile.username : "Champion";
    league.runnerUpToken = runnerUpToken || null;
    league.runnerUpName = runnerUpProfile ? runnerUpProfile.username : "Runner-Up";
    league.thirdPlaceToken = thirdPlaceToken || null;
    league.thirdPlaceName = thirdPlaceProfile ? thirdPlaceProfile.username : "3rd Place";

    await dbRepository.saveLeague(league);

    // Calculate payouts according to Prize Distribution percentages after platform fee
    const settings = await dbRepository.getAdminSettings();
    const tournamentFeePercent = settings.tournamentFeePercent ?? 10;
    const totalPrize = league.prizePoolPoints;

    if (totalPrize > 0) {
      const platformFee = Math.round((totalPrize * tournamentFeePercent) / 100);
      const netPrizePool = totalPrize - platformFee;

      if (platformFee > 0) {
        await dbRepository.createTransaction({
          id: `tx-league-fee-${Date.now()}`,
          userToken: "system-house",
          type: "platform_fee",
          currency: "points",
          amount: platformFee,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ leagueTitle: league.title, totalPrize, tournamentFeePercent }),
          createdAt: new Date().toISOString(),
        });
      }

      const dist = league.prizeDistribution || { first: 60, second: 30, third: 10 };

      // 1st Place Payout
      if (winnerToken) {
        const firstAmount = Math.round((netPrizePool * dist.first) / 100);
        await dbRepository.updateProfileBalance(winnerToken, firstAmount);
        await dbRepository.createTransaction({
          id: `tx-league-prize-1st-${Date.now()}`,
          userToken: winnerToken,
          type: "league_prize",
          currency: "points",
          amount: firstAmount,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ rank: "1st Place (Champion)", leagueTitle: league.title, platformFee, netPrizePool }),
          createdAt: new Date().toISOString(),
        });
      }

      // 2nd Place Payout
      if (runnerUpToken) {
        const secondAmount = Math.round((netPrizePool * dist.second) / 100);
        await dbRepository.updateProfileBalance(runnerUpToken, secondAmount);
        await dbRepository.createTransaction({
          id: `tx-league-prize-2nd-${Date.now()}`,
          userToken: runnerUpToken,
          type: "league_prize",
          currency: "points",
          amount: secondAmount,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ rank: "2nd Place (Runner-Up)", leagueTitle: league.title, platformFee, netPrizePool }),
          createdAt: new Date().toISOString(),
        });
      }

      // 3rd Place Payout
      if (thirdPlaceToken) {
        const thirdAmount = Math.round((netPrizePool * dist.third) / 100);
        await dbRepository.updateProfileBalance(thirdPlaceToken, thirdAmount);
        await dbRepository.createTransaction({
          id: `tx-league-prize-3rd-${Date.now()}`,
          userToken: thirdPlaceToken,
          type: "league_prize",
          currency: "points",
          amount: thirdAmount,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ rank: "3rd Place", leagueTitle: league.title, platformFee, netPrizePool }),
          createdAt: new Date().toISOString(),
        });
      }
    }
  },
};
