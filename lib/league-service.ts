import { dbRepository } from "./db-client";
import { securityService } from "./security";
import {
  League,
  LeagueMatch,
  LeagueParticipant,
  TournamentFormat,
  PrizeDistribution,
  TournamentRuleVariations,
  TournamentCustomConstraints,
} from "./types";
import { notificationService } from "./notification-service";
import { createBoard } from "./damii-rules";

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
      minParticipants?: number;
      prizeDistribution?: PrizeDistribution;
      rulesNotes?: string;
      ruleVariations?: TournamentRuleVariations;
      customConstraints?: TournamentCustomConstraints;
    }
  ): Promise<League> {
    const profile = await dbRepository.getProfile(facilitatorToken);
    if (!profile) throw new Error("Facilitator profile not found");

    const validatedPrizePool = Math.max(0, prizePoolPoints);

    // Facilitator fund verification: Facilitator must hold at least prizePoolPoints in balance
    if (validatedPrizePool > 0) {
      if ((profile.points || 0) < validatedPrizePool) {
        throw new Error(
          `Insufficient funds. Facilitator must hold at least ${validatedPrizePool.toLocaleString()} Points in account to seed this prize pool.`
        );
      }
      // Escrow / lock facilitator's prize pool
      await dbRepository.updateProfileBalance(facilitatorToken, -validatedPrizePool);
      await dbRepository.createTransaction({
        id: `tx-league-pool-lock-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userToken: facilitatorToken,
        type: "league_fee",
        currency: "points",
        amount: -validatedPrizePool,
        reference: `seed-${Date.now()}`,
        status: "completed",
        metaJson: JSON.stringify({ note: `Prize pool locked for tournament: ${title.trim()}` }),
        createdAt: new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const id = `league-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const generatedInviteCode = options?.inviteCode?.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const chosenFormat: TournamentFormat = options?.format || "single_elimination";

    const defaultDistribution: PrizeDistribution = options?.prizeDistribution || {
      first: 60,
      second: 30,
      third: 10,
    };

    const minPart = options?.minParticipants ?? (maxParticipants === 4 ? 2 : maxParticipants === 16 ? 8 : maxParticipants === 32 ? 16 : 4);

    const league: League = {
      id,
      title: title.trim(),
      description: description.trim(),
      entryFeeMarbles: 0,
      entryFeePoints: Math.max(0, entryFeePoints),
      prizePoolPoints: validatedPrizePool,
      status: "registration",
      format: chosenFormat,
      facilitatorToken,
      facilitatorName: profile.username || facilitatorName,
      minParticipants: minPart,
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
      rulesNotes: options?.rulesNotes || "Standard 10x10 Damii rules apply. Turn clock strictly enforced.",
      ruleVariations: options?.ruleVariations,
      customConstraints: options?.customConstraints,
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
    if (!profile) throw new Error("Unauthorized profile");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized. Organizers can only update settings for their own tournaments.");
    }

    if (updates.title) league.title = updates.title.trim();
    if (updates.description) league.description = updates.description.trim();
    if (updates.scheduleDate) league.scheduleDate = updates.scheduleDate;
    if (updates.scheduleTime) league.scheduleTime = updates.scheduleTime;
    if (updates.gameDays) league.gameDays = updates.gameDays;
    if (updates.rulesNotes !== undefined) league.rulesNotes = updates.rulesNotes;
    if (updates.ruleVariations !== undefined) league.ruleVariations = updates.ruleVariations;
    if (updates.customConstraints !== undefined) league.customConstraints = updates.customConstraints;
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

    // Check custom tournament rating constraints
    if (league.customConstraints?.minRatingRequired && (profile.rating || 1000) < league.customConstraints.minRatingRequired) {
      throw new Error(
        `Rating requirement not met. Minimum rating required is ${league.customConstraints.minRatingRequired} DPI (Your rating: ${profile.rating || 1000} DPI).`
      );
    }
    if (league.customConstraints?.maxRatingCap && (profile.rating || 1000) > league.customConstraints.maxRatingCap) {
      throw new Error(
        `Rating cap exceeded. Maximum rating allowed is ${league.customConstraints.maxRatingCap} DPI (Your rating: ${profile.rating || 1000} DPI).`
      );
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
      await dbRepository.writeLedger([
        {
          userId: userToken,
          accountType: "available",
          entryType: "league_fee",
          amount: String(-league.entryFeePoints),
          referenceType: "league",
          referenceId: league.id,
        },
        {
          userId: userToken,
          accountType: "escrow",
          entryType: "league_fee",
          amount: String(league.entryFeePoints),
          referenceType: "league",
          referenceId: league.id,
        },
      ]).catch(() => []);
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
    if (!profile) throw new Error("Unauthorized profile");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only reseed participants in their own tournaments.");
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
    const allParticipants = await dbRepository.getLeagueParticipants("");
    const part = allParticipants.find((p) => p.id === participantId);
    if (!part) throw new Error("Participant application not found");

    const league = await dbRepository.getLeague(part.leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorToken);
    if (!profile) throw new Error("Unauthorized profile");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only approve applications for their own tournaments.");
    }

    const updated = await dbRepository.updateParticipantStatus(participantId, "approved");

    // Notify applicant of approval
    notificationService.sendNotification({
      userToken: part.userToken,
      username: part.username,
      type: "tournament_match",
      title: `🎉 Registration Approved: ${league.title}`,
      message: `Your registration for "${league.title}" has been approved! Prepare for bracket generation.`,
      link: `/leagues`,
      actionLabel: "View Tournament",
      actionPayload: { leagueId: league.id },
    }).catch(() => {});

    // Check if bracket generation threshold met
    const allApproved = (await dbRepository.getLeagueParticipants(league.id)).filter((p) => p.status === "approved");
    if (allApproved.length >= league.maxParticipants) {
      await this.generateTournamentBracket(league.id);
    }

    return updated;
  },

  async rejectApplicant(facilitatorToken: string, participantId: string) {
    const allParticipants = await dbRepository.getLeagueParticipants("");
    const part = allParticipants.find((p) => p.id === participantId);
    if (!part) throw new Error("Participant application not found");

    const league = await dbRepository.getLeague(part.leagueId);
    if (!league) throw new Error("League not found");

    const profile = await dbRepository.getProfile(facilitatorToken);
    if (!profile) throw new Error("Unauthorized profile");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only reject applications for their own tournaments.");
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

    const result = await dbRepository.updateParticipantStatus(participantId, "rejected");

    // Notify applicant of rejection & refund
    notificationService.sendNotification({
      userToken: part.userToken,
      username: part.username,
      type: "tournament_match",
      title: `⚠️ Registration Update: ${league.title}`,
      message: `Your registration application for "${league.title}" was not approved. Any entry fees have been refunded.`,
      link: `/leagues`,
      actionLabel: "View Tournaments",
      actionPayload: { leagueId: league.id },
    }).catch(() => {});

    return result;
  },

  async addParticipantManual(organizerToken: string, leagueId: string, usernameToAdd: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const organizer = await dbRepository.getProfile(organizerToken);
    if (!organizer) throw new Error("Unauthorized profile");

    const isAdmin = organizer.role === "admin" || organizer.role === "super_admin";
    const isOwner = league.facilitatorToken === organizerToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only add players to their own tournaments.");
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

  async cancelTournament(organizerToken: string, leagueId: string, reason?: string, adminApproved = false) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const organizer = await dbRepository.getProfile(organizerToken);
    if (!organizer) throw new Error("Organizer profile not found");

    const isAdmin = organizer.role === "admin" || organizer.role === "super_admin";
    const isOwner = league.facilitatorToken === organizerToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only cancel their own tournaments.");
    }

    // Administrative review requirement: If tournament is already active, require admin approval
    if (league.status === "active" && !isAdmin && !adminApproved) {
      throw new Error("Administrative review required: Active tournament cancellations require platform administrator approval.");
    }

    league.status = "cancelled";
    if (reason) league.rulesNotes = `${league.rulesNotes || ""}\n[CANCELLED]: ${reason}`.trim();
    await dbRepository.saveLeague(league);

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const approvedParticipants = participants.filter((p) => p.status === "approved" || !p.status);
    const minRequired = league.minParticipants ?? 4;
    const metMinQuorum = approvedParticipants.length >= minRequired;

    // 1. Refund all participants 100% of their entry fee
    if (league.entryFeePoints > 0) {
      for (const p of participants) {
        if (p.status !== "rejected" && p.status !== "disqualified") {
          await dbRepository.updateProfileBalance(p.userToken, league.entryFeePoints);
          await dbRepository.createTransaction({
            id: `tx-league-cancel-refund-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            userToken: p.userToken,
            type: "league_fee",
            currency: "points",
            amount: league.entryFeePoints,
            reference: league.id,
            status: "completed",
            metaJson: JSON.stringify({ note: `100% Entry fee refund due to tournament cancellation: ${reason || "Cancelled by Organizer"}` }),
            createdAt: new Date().toISOString(),
          });

          await dbRepository.writeLedger([
            {
              userId: p.userToken,
              accountType: "escrow",
              entryType: "league_fee",
              amount: String(-league.entryFeePoints),
              referenceType: "league",
              referenceId: league.id,
            },
            {
              userId: p.userToken,
              accountType: "available",
              entryType: "league_fee",
              amount: String(league.entryFeePoints),
              referenceType: "league",
              referenceId: league.id,
            },
          ]).catch(() => []);

          // Notify participant
          notificationService.sendNotification({
            userToken: p.userToken,
            username: p.username,
            type: "tournament_match",
            title: `⚠️ Tournament Cancelled: ${league.title}`,
            message: `"${league.title}" has been cancelled (${reason || "Organizer cancelled"}). Your ${league.entryFeePoints} Points entry fee has been refunded.`,
            link: "/leagues",
            actionLabel: "View Tournaments",
          }).catch(() => {});
        }
      }
    }

    // 2. Facilitator cancellation handling & 5% cancellation fee:
    // If the tournament met the minimum viable quorum and was cancelled by facilitator, charge 5% cancellation fee.
    // If it failed to meet the minimum viable quorum, refund 100% of prize pool with 0% cancellation fee.
    if (league.prizePoolPoints > 0) {
      const now = new Date().toISOString();
      if (metMinQuorum && !isAdmin) {
        const cancellationFeePercent = 5;
        const cancellationFee = Math.round((league.prizePoolPoints * cancellationFeePercent) / 100);
        const facilitatorRefund = league.prizePoolPoints - cancellationFee;

        // Refund 95% of prize pool to facilitator
        if (facilitatorRefund > 0) {
          await dbRepository.updateProfileBalance(league.facilitatorToken, facilitatorRefund);
          await dbRepository.createTransaction({
            id: `tx-league-fac-refund-${Date.now()}`,
            userToken: league.facilitatorToken,
            type: "league_fee",
            currency: "points",
            amount: facilitatorRefund,
            reference: league.id,
            status: "completed",
            metaJson: JSON.stringify({ note: `Prize pool refund (net of 5% cancellation fee): ${reason || "Facilitator cancellation"}` }),
            createdAt: now,
          });
        }

        // Charge 5% cancellation fee to system platform fee
        if (cancellationFee > 0) {
          await dbRepository.createTransaction({
            id: `tx-league-cancel-fee-${Date.now()}`,
            userToken: "platform-treasury",
            type: "platform_fee",
            currency: "points",
            amount: cancellationFee,
            reference: league.id,
            status: "completed",
            metaJson: JSON.stringify({ note: "5% Facilitator tournament cancellation fee", cancellationFeePercent, totalPrize: league.prizePoolPoints }),
            createdAt: now,
          });

          await dbRepository.writeLedger([
            {
              userId: league.facilitatorToken,
              accountType: "escrow",
              entryType: "league_fee",
              amount: String(-league.prizePoolPoints),
              referenceType: "league",
              referenceId: league.id,
            },
            {
              userId: league.facilitatorToken,
              accountType: "available",
              entryType: "league_fee",
              amount: String(facilitatorRefund),
              referenceType: "league",
              referenceId: league.id,
            },
            {
              userId: "platform-treasury",
              accountType: "available",
              entryType: "platform_fee",
              amount: String(cancellationFee),
              referenceType: "league",
              referenceId: league.id,
            },
          ]).catch(() => []);
        }
      } else {
        // Full 100% refund of prize pool (below minimum viable quorum or admin cancelled)
        await dbRepository.updateProfileBalance(league.facilitatorToken, league.prizePoolPoints);
        await dbRepository.createTransaction({
          id: `tx-league-fac-full-refund-${Date.now()}`,
          userToken: league.facilitatorToken,
          type: "league_fee",
          currency: "points",
          amount: league.prizePoolPoints,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ note: `100% Prize pool refund (waived cancellation fee - quorum not met): ${reason || "Cancelled"}` }),
          createdAt: now,
        });

        await dbRepository.writeLedger([
          {
            userId: league.facilitatorToken,
            accountType: "escrow",
            entryType: "league_fee",
            amount: String(-league.prizePoolPoints),
            referenceType: "league",
            referenceId: league.id,
          },
          {
            userId: league.facilitatorToken,
            accountType: "available",
            entryType: "league_fee",
            amount: String(league.prizePoolPoints),
            referenceType: "league",
            referenceId: league.id,
          },
        ]).catch(() => []);
      }
    }

    return league;
  },

  async resizeTournament(facilitatorOrAdminToken: string, leagueId: string, newMaxParticipants: number) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const caller = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!caller) throw new Error("Caller profile not found");

    const isAdmin = caller.role === "admin" || caller.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only resize their own tournaments.");
    }

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const approved = participants.filter((p) => p.status === "approved" || !p.status);
    const minRequired = league.minParticipants ?? 4;

    if (approved.length < minRequired) {
      throw new Error(
        `Cannot resize tournament: Minimum viable player quorum not met (Found ${approved.length}, minimum required is ${minRequired}).`
      );
    }

    if (newMaxParticipants < approved.length) {
      throw new Error(`Cannot resize below current number of approved players (${approved.length}).`);
    }

    league.maxParticipants = newMaxParticipants;
    await dbRepository.saveLeague(league);

    // If new max is reached, auto-generate bracket
    if (approved.length >= newMaxParticipants) {
      await this.generateTournamentBracket(leagueId);
    }

    return league;
  },

  async autoCheckTournamentFilling(leagueId: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league || league.status !== "registration") return league;

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const approved = participants.filter((p) => p.status === "approved" || !p.status);
    const minRequired = league.minParticipants ?? 4;

    if (approved.length >= minRequired) {
      // Allow starting with resized bracket
      if (approved.length < league.maxParticipants) {
        league.maxParticipants = approved.length;
        await dbRepository.saveLeague(league);
      }
      return this.generateTournamentBracket(leagueId);
    } else {
      // Auto-cancel with 100% refunds and waived cancellation fee
      return this.cancelTournament(
        league.facilitatorToken,
        leagueId,
        `Auto-cancelled at registration deadline: minimum viable player quorum (${minRequired}) not reached.`
      );
    }
  },

  async disqualifyParticipant(
    adminOrFacilitatorToken: string,
    leagueId: string,
    participantToken: string,
    reason: string,
    evidence?: string,
    promoteNextEligible = true
  ) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const caller = await dbRepository.getProfile(adminOrFacilitatorToken);
    if (!caller) throw new Error("Caller profile not found");

    const isAdmin = caller.role === "admin" || caller.role === "super_admin";
    const isOwner = league.facilitatorToken === adminOrFacilitatorToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only disqualify participants from their own tournaments.");
    }

    // Administrative review requirement: If tournament is active, require admin review
    if (league.status === "active" && !isAdmin) {
      throw new Error("Administrative review required: Active tournament disqualifications require administrator authorization.");
    }

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    const target = participants.find((p) => p.userToken === participantToken);
    if (!target) throw new Error("Participant not found in tournament");

    target.status = "disqualified";
    target.disqualificationReason = reason;
    target.disqualificationEvidence = evidence || "Evidence recorded in audit log";
    target.disqualifiedAt = new Date().toISOString();
    await dbRepository.addLeagueParticipant(target);

    // If matches are active in single elimination, forfeit target's current match to promote opponent
    const matches = await dbRepository.getLeagueMatches(leagueId);
    for (const m of matches) {
      if (m.status === "pending" || m.status === "in_progress") {
        if (m.player1Token === participantToken) {
          m.winnerToken = promoteNextEligible ? m.player2Token : null;
          m.status = "completed";
          m.disputeNotes = `Player 1 disqualified: ${reason}`;
          await dbRepository.saveLeagueMatch(m);
        } else if (m.player2Token === participantToken) {
          m.winnerToken = promoteNextEligible ? m.player1Token : null;
          m.status = "completed";
          m.disputeNotes = `Player 2 disqualified: ${reason}`;
          await dbRepository.saveLeagueMatch(m);
        }
      }
    }

    return target;
  },

  async generateTournamentBracket(leagueId: string, callerToken?: string) {
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    if (callerToken) {
      const profile = await dbRepository.getProfile(callerToken);
      if (!profile) throw new Error("Unauthorized profile");
      const isAdmin = profile.role === "admin" || profile.role === "super_admin";
      const isOwner = league.facilitatorToken === callerToken;
      if (!isAdmin && !isOwner) {
        throw new Error("Unauthorized: Organizers can only generate brackets for their own tournaments.");
      }
    }

    const allParticipants = await dbRepository.getLeagueParticipants(leagueId);
    const participants = allParticipants.filter((p) => p.status === "approved" || !p.status);
    if (participants.length < 2) throw new Error("Need at least 2 approved participants to generate bracket");

    // Deduct 10% platform fee upon tournament commencement if not already charged
    if (!league.platformFeeCharged && league.prizePoolPoints > 0) {
      const settings = await dbRepository.getAdminSettings();
      const tournamentFeePercent = settings.tournamentFeePercent ?? 10;
      const platformFee = Math.round((league.prizePoolPoints * tournamentFeePercent) / 100);

      if (platformFee > 0) {
        await dbRepository.createTransaction({
          id: `tx-league-commence-fee-${Date.now()}`,
          userToken: "platform-treasury",
          type: "platform_fee",
          currency: "points",
          amount: platformFee,
          reference: league.id,
          status: "completed",
          metaJson: JSON.stringify({ note: "10% Platform fee charged upon tournament commencement", totalPrize: league.prizePoolPoints, tournamentFeePercent }),
          createdAt: new Date().toISOString(),
        });

        await dbRepository.writeLedger([
          {
            userId: "platform-treasury",
            accountType: "available",
            entryType: "platform_fee",
            amount: String(platformFee),
            referenceType: "league",
            referenceId: league.id,
          },
        ]).catch(() => []);
      }
      league.platformFeeCharged = true;
    }

    league.status = "active";
    await dbRepository.saveLeague(league);

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

    const count = participants.length;
    // Calculate smallest power of 2 >= count
    let bracketSize = 2;
    while (bracketSize < count) {
      bracketSize *= 2;
    }
    const totalRounds = Math.log2(bracketSize);

    // Standard tournament seed pairings for bracketSize (e.g. for 8: [1,8], [4,5], [2,7], [3,6])
    const generateSeeds = (num: number): number[] => {
      let rounds = Math.log2(num) - 1;
      let pls = [1, 2];
      for (let i = 0; i < rounds; i++) {
        const next: number[] = [];
        const sum = pls.length * 2 + 1;
        for (const p of pls) {
          next.push(p);
          next.push(sum - p);
        }
        pls = next;
      }
      return pls;
    };

    const seedOrder = generateSeeds(bracketSize);
    // Create map from seed (1-indexed) to participant
    const seedMap = new Map<number, LeagueParticipant>();
    participants.forEach((p, idx) => {
      seedMap.set(p.seed || idx + 1, p);
    });

    // 1. Pre-generate ALL matches across all rounds in the tree
    for (let r = 1; r <= totalRounds; r++) {
      const matchesInRound = bracketSize / Math.pow(2, r);
      for (let m = 1; m <= matchesInRound; m++) {
        const matchId = `match-${league.id}-r${r}-m${m}`;
        const match: LeagueMatch = {
          id: matchId,
          leagueId: league.id,
          round: r,
          matchNumber: m,
          bracketType: r === totalRounds ? "final" : "winners",
          player1Token: null,
          player1Name: null,
          player1Score: 0,
          player2Token: null,
          player2Name: null,
          player2Score: 0,
          winnerToken: null,
          roomCode: null,
          status: "pending",
          createdAt: now,
        };
        matches.push(match);
      }
    }

    // 2. Populate Round 1 seeded players
    const r1Matches = matches.filter((m) => m.round === 1);
    for (let i = 0; i < r1Matches.length; i++) {
      const match = r1Matches[i];
      const s1 = seedOrder[i * 2];
      const s2 = seedOrder[i * 2 + 1];

      const p1 = seedMap.get(s1) || null;
      const p2 = seedMap.get(s2) || null;

      match.player1Token = p1 ? p1.userToken : null;
      match.player1Name = p1 ? p1.username : null;
      match.player2Token = p2 ? p2.userToken : null;
      match.player2Name = p2 ? p2.username : null;

      if (p1 && !p2) {
        // P1 gets a BYE
        match.winnerToken = p1.userToken;
        match.status = "completed";
        match.disputeNotes = "Auto-advanced via Round 1 BYE";
      } else if (!p1 && p2) {
        // P2 gets a BYE
        match.winnerToken = p2.userToken;
        match.status = "completed";
        match.disputeNotes = "Auto-advanced via Round 1 BYE";
      } else if (!p1 && !p2) {
        match.status = "completed";
      } else {
        match.status = "pending";
      }
    }

    // 3. Propagate any BYE winners from Round 1 into Round 2 slots immediately
    for (let r = 1; r < totalRounds; r++) {
      const currentRMatches = matches.filter((m) => m.round === r);
      const nextRMatches = matches.filter((m) => m.round === r + 1);

      for (const m of currentRMatches) {
        if (m.status === "completed" && m.winnerToken) {
          const targetMatchNum = Math.ceil(m.matchNumber / 2);
          const targetMatch = nextRMatches.find((nm) => nm.matchNumber === targetMatchNum);
          if (targetMatch) {
            const winnerName = m.winnerToken === m.player1Token ? m.player1Name : m.player2Name;
            if (m.matchNumber % 2 === 1) {
              targetMatch.player1Token = m.winnerToken;
              targetMatch.player1Name = winnerName;
            } else {
              targetMatch.player2Token = m.winnerToken;
              targetMatch.player2Name = winnerName;
            }
          }
        }
      }
    }

    league.status = "active";
    league.roundsCount = totalRounds;
    await dbRepository.saveLeague(league);
    await dbRepository.setLeagueMatches(matches);

    // Notify registered players that active round 1 matches are scheduled
    for (const m of r1Matches) {
      if (m.player1Token && m.player2Token && m.status === "pending") {
        notificationService.sendNotification({
          userToken: m.player1Token,
          username: m.player1Name,
          type: "tournament_match",
          title: `🏆 Tournament Round 1 Ready: ${league.title}`,
          message: `Your match against ${m.player2Name} is queued. Head to the tournament bracket to play!`,
          link: `/leagues`,
          actionLabel: "View Bracket",
        }).catch(() => {});
        notificationService.sendNotification({
          userToken: m.player2Token,
          username: m.player2Name,
          type: "tournament_match",
          title: `🏆 Tournament Round 1 Ready: ${league.title}`,
          message: `Your match against ${m.player1Name} is queued. Head to the tournament bracket to play!`,
          link: `/leagues`,
          actionLabel: "View Bracket",
        }).catch(() => {});
      }
    }

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

    // Notify registered players that active round matches are ready
    for (const m of newMatches) {
      if (m.player1Token && m.player2Token && m.status === "pending") {
        notificationService.sendNotification({
          userToken: m.player1Token,
          username: m.player1Name,
          type: "tournament_match",
          title: `🏆 Round ${nextRound} Ready: ${league.title}`,
          message: `Your Round ${nextRound} match against ${m.player2Name} is ready! Check the bracket to begin.`,
          link: `/leagues`,
          actionLabel: "View Match",
          actionPayload: { leagueId: league.id, round: nextRound },
        }).catch(() => {});
        notificationService.sendNotification({
          userToken: m.player2Token,
          username: m.player2Name,
          type: "tournament_match",
          title: `🏆 Round ${nextRound} Ready: ${league.title}`,
          message: `Your Round ${nextRound} match against ${m.player1Name} is ready! Check the bracket to begin.`,
          link: `/leagues`,
          actionLabel: "View Match",
          actionPayload: { leagueId: league.id, round: nextRound },
        }).catch(() => {});
      }
    }

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
    const initialBoard = JSON.stringify(createBoard());

    const league = await dbRepository.getLeague(match.leagueId);

    const newRoom: Room = {
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
      ruleVariations: league?.ruleVariations,
      customConstraints: league?.customConstraints,
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

    // Dispatch in-app notification with audio chime and direct arena link to opponent
    const opponentToken = match.player1Token === playerToken ? match.player2Token : match.player1Token;
    const opponentName = match.player1Token === playerToken ? match.player2Name : match.player1Name;
    const launcherName = match.player1Token === playerToken ? match.player1Name : match.player2Name;

    if (opponentToken) {
      notificationService.sendNotification({
        userToken: opponentToken,
        username: opponentName || "Contestant",
        type: "tournament_match",
        title: "🏆 Tournament Game Started!",
        message: `${launcherName} has launched your tournament match room (${roomCode}). Enter the Arena to play!`,
        link: `/arena?code=${roomCode}`,
        actionLabel: "Enter Match Arena",
        actionPayload: { roomCode, matchId: match.id, leagueId: match.leagueId },
      });
    }

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

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;
    const isContestant =
      match.player1Token === facilitatorOrAdminToken ||
      match.player2Token === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner && !isContestant) {
      throw new Error("Unauthorized: Only tournament organizer, administrator, or active match contestants can report match results");
    }

    // -------------------------------------------------------------------------
    // 1. KNOCKOUT TIEBREAKER RESOLUTION (Single / Double Elimination)
    // -------------------------------------------------------------------------
    if (winnerToken === "draw" && (league.format === "single_elimination" || league.format === "double_elimination" || !league.format)) {
      // In knockout brackets, a drawn game MUST trigger an instant Sudden Death Blitz Tiebreaker Playoff
      // to determine who advances to the next round.
      const currentTiebreakerCount = ((match.player1Score || 0) + (match.player2Score || 0)) + 1;
      match.player1Score = (match.player1Score || 0) + 1;
      match.player2Score = (match.player2Score || 0) + 1;

      // Swap starting colors for fair competitive balance in playoff
      const isSwapped = currentTiebreakerCount % 2 === 1;
      const hostToken = isSwapped ? (match.player2Token || match.player1Token || "") : (match.player1Token || "");
      const hostName = isSwapped ? (match.player2Name || "Player 2") : (match.player1Name || "Player 1");
      const guestToken = isSwapped ? match.player1Token : match.player2Token;
      const guestName = isSwapped ? match.player1Name : match.player2Name;

      const tiebreakerRoomCode = `TB${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const initialBoard = JSON.stringify(createBoard());

      const tiebreakerRoom: Room = {
        code: tiebreakerRoomCode,
        hostName,
        hostToken,
        guestName,
        guestToken,
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
        ruleVariations: league.ruleVariations,
        customConstraints: {
          ...league.customConstraints,
          turnTimerSeconds: 30, // Blitz tiebreaker turn clock
        },
        moveCount: 0,
        resultApplied: 0,
        lastMoveTime: Date.now(),
        disconnectTime: null,
        disconnectedPlayer: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbRepository.saveRoom(tiebreakerRoom);

      match.roomCode = tiebreakerRoomCode;
      match.status = "in_progress";
      match.winnerToken = null;
      match.disputeNotes = disputeNotes || `⚡ Match Drawn (Game ${currentTiebreakerCount}) — Sudden Death Blitz Tiebreaker #${currentTiebreakerCount} initiated with swapped colors (30s clock).`;

      await dbRepository.saveLeagueMatch(match);

      // Dispatch urgent in-app push notifications to both players
      if (match.player1Token) {
        notificationService.sendNotification({
          userToken: match.player1Token,
          username: match.player1Name,
          type: "tournament_match",
          title: `⚡ Sudden Death Blitz Tiebreaker #${currentTiebreakerCount}!`,
          message: `Your knockout match in ${league.title} was drawn. Enter the Sudden Death Tiebreaker arena (${tiebreakerRoomCode}) now with swapped sides (30s clock) to decide who advances!`,
          link: `/arena?code=${tiebreakerRoomCode}&mode=league`,
          actionLabel: "Launch Tiebreaker",
          actionPayload: { roomCode: tiebreakerRoomCode, matchId: match.id, leagueId: match.leagueId, isTiebreaker: true },
        }).catch(() => {});
      }

      if (match.player2Token) {
        notificationService.sendNotification({
          userToken: match.player2Token,
          username: match.player2Name,
          type: "tournament_match",
          title: `⚡ Sudden Death Blitz Tiebreaker #${currentTiebreakerCount}!`,
          message: `Your knockout match in ${league.title} was drawn. Enter the Sudden Death Tiebreaker arena (${tiebreakerRoomCode}) now with swapped sides (30s clock) to decide who advances!`,
          link: `/arena?code=${tiebreakerRoomCode}&mode=league`,
          actionLabel: "Launch Tiebreaker",
          actionPayload: { roomCode: tiebreakerRoomCode, matchId: match.id, leagueId: match.leagueId, isTiebreaker: true },
        }).catch(() => {});
      }

      return { match, league, isTiebreaker: true, tiebreakerRoomCode };
    }

    // -------------------------------------------------------------------------
    // 2. DECISIVE WINNER OR TABLE/SWISS DRAW OUTCOME
    // -------------------------------------------------------------------------
    if (winnerToken === "draw") {
      match.winnerToken = null;
      match.status = "completed";
      match.disputeNotes = disputeNotes || "Match drawn by mutual agreement (+1 pt awarded to each player in tournament standings).";
    } else {
      match.winnerToken = winnerToken;
      match.status = "completed";
      if (disputeNotes) match.disputeNotes = disputeNotes;
    }

    await dbRepository.saveLeagueMatch(match);

    const winnerName =
      winnerToken === "draw"
        ? null
        : winnerToken === match.player1Token
        ? match.player1Name
        : match.player2Name;

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

    // Evaluate progression for Single Elimination / Double Elimination
    const currentMatches = await dbRepository.getLeagueMatches(league.id);
    const activeRound = match.round;
    const totalRounds = league.roundsCount || Math.ceil(Math.log2(league.maxParticipants || 8));

    if (league.format === "single_elimination" || !league.format) {
      if (activeRound < totalRounds && winnerToken && winnerToken !== "draw") {
        // INSTANT WINNER PROGRESSION to next level in bracket
        const targetMatchNum = Math.ceil(match.matchNumber / 2);
        let targetMatch = currentMatches.find(
          (m) => m.round === activeRound + 1 && m.matchNumber === targetMatchNum
        );

        if (!targetMatch) {
          // Create next match if not pre-generated
          targetMatch = {
            id: `match-${league.id}-r${activeRound + 1}-m${targetMatchNum}`,
            leagueId: league.id,
            round: activeRound + 1,
            matchNumber: targetMatchNum,
            bracketType: activeRound + 1 === totalRounds ? "final" : "winners",
            player1Token: null,
            player1Name: null,
            player1Score: 0,
            player2Token: null,
            player2Name: null,
            player2Score: 0,
            winnerToken: null,
            roomCode: null,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
        }

        if (match.matchNumber % 2 === 1) {
          targetMatch.player1Token = winnerToken;
          targetMatch.player1Name = winnerName;
        } else {
          targetMatch.player2Token = winnerToken;
          targetMatch.player2Name = winnerName;
        }

        // If both players are now in place for the next match, notify them & schedule if same day
        if (targetMatch.player1Token && targetMatch.player2Token) {
          targetMatch.status = "pending";
          if (!targetMatch.scheduledTime) {
            // Default 10-minute break for same-day rounds
            const autoTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            targetMatch.scheduledTime = autoTime;
          }

          notificationService.sendNotification({
            userToken: targetMatch.player1Token,
            username: targetMatch.player1Name,
            type: "tournament_match",
            title: `🏆 Round ${activeRound + 1} Match Ready: ${league.title}`,
            message: `You advanced! Your match against ${targetMatch.player2Name} is set. Head to the tournament board to compete.`,
            link: `/leagues`,
            actionLabel: "View Match",
            actionPayload: { matchId: targetMatch.id, leagueId: league.id },
          }).catch(() => {});

          notificationService.sendNotification({
            userToken: targetMatch.player2Token,
            username: targetMatch.player2Name,
            type: "tournament_match",
            title: `🏆 Round ${activeRound + 1} Match Ready: ${league.title}`,
            message: `You advanced! Your match against ${targetMatch.player1Name} is set. Head to the tournament board to compete.`,
            link: `/leagues`,
            actionLabel: "View Match",
            actionPayload: { matchId: targetMatch.id, leagueId: league.id },
          }).catch(() => {});
        }

        await dbRepository.saveLeagueMatch(targetMatch);
      } else if (activeRound >= totalRounds && winnerToken && winnerToken !== "draw") {
        // Tournament Grand Final Concluded!
        const grandWinnerToken = winnerToken;
        const runnerUpToken =
          match.player1Token === grandWinnerToken ? match.player2Token : match.player1Token;

        await this.payoutTournamentPrizePool(league, grandWinnerToken, runnerUpToken, null);
      }
    } else if (league.format === "round_robin" || league.format === "swiss") {
      const roundMatches = currentMatches.filter((m) => m.round === activeRound);
      const allRoundDone = roundMatches.every((m) => m.status === "completed");

      if (allRoundDone) {
        if (activeRound >= (league.roundsCount || 3)) {
          await this.finalizeRoundRobinTournament(league);
        } else if (league.format === "swiss") {
          await this.generateNextSwissRoundMatches(league, activeRound + 1);
        }
      }
    }

    return { match, league };
  },

  async scheduleMatch(
    facilitatorOrAdminToken: string,
    matchId: string,
    scheduledTimeIso: string
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const matchesList = await dbRepository.getLeagueMatches("");
    const match = matchesList.find((m) => m.id === matchId);
    if (!match) throw new Error("Match not found");

    const league = await dbRepository.getLeague(match.leagueId);
    if (!league) throw new Error("League not found");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only schedule matches for their own tournaments.");
    }

    match.scheduledTime = scheduledTimeIso;
    await dbRepository.saveLeagueMatch(match);

    // Notify participants
    if (match.player1Token) {
      notificationService.sendNotification({
        userToken: match.player1Token,
        username: match.player1Name,
        type: "tournament_match",
        title: `⏰ Match Scheduled: ${league.title}`,
        message: `Your Round ${match.round} Match #${match.matchNumber} is scheduled for ${new Date(scheduledTimeIso).toLocaleString()}.`,
        link: `/leagues`,
        actionLabel: "View Schedule",
      }).catch(() => {});
    }

    if (match.player2Token) {
      notificationService.sendNotification({
        userToken: match.player2Token,
        username: match.player2Name,
        type: "tournament_match",
        title: `⏰ Match Scheduled: ${league.title}`,
        message: `Your Round ${match.round} Match #${match.matchNumber} is scheduled for ${new Date(scheduledTimeIso).toLocaleString()}.`,
        link: `/leagues`,
        actionLabel: "View Schedule",
      }).catch(() => {});
    }

    return match;
  },

  async scheduleRound(
    facilitatorOrAdminToken: string,
    leagueId: string,
    round: number,
    options: {
      startDateTimeIso: string;
      matchDurationMinutes?: number;
      intervalMinutes?: number;
      concurrentBoards?: number;
      breakMinutes?: number;
      staggerMatches?: boolean;
      overwriteExisting?: boolean;
    }
  ) {
    const interval = options.intervalMinutes ?? (options.staggerMatches ? (options.matchDurationMinutes || 20) : 0);
    const res = await this.batchScheduleRound(facilitatorOrAdminToken, leagueId, {
      round,
      startDateTimeIso: options.startDateTimeIso,
      intervalMinutes: interval,
      concurrentBoards: options.concurrentBoards ?? 1,
      breakMinutes: options.breakMinutes ?? 5,
      overwriteExisting: options.overwriteExisting ?? true,
    });
    return res.matches;
  },

  async batchScheduleRound(
    facilitatorOrAdminToken: string,
    leagueId: string,
    options: {
      round: number;
      startDateTimeIso: string;
      intervalMinutes: number;
      concurrentBoards?: number;
      breakMinutes?: number;
      overwriteExisting?: boolean;
      matchIds?: string[];
    }
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only batch schedule matches for their own tournaments.");
    }

    const allMatches = await dbRepository.getLeagueMatches(leagueId);
    let targetMatches = options.round > 0
      ? allMatches.filter((m) => m.round === options.round)
      : allMatches;

    if (Array.isArray(options.matchIds) && options.matchIds.length > 0) {
      const idSet = new Set(options.matchIds);
      targetMatches = targetMatches.filter((m) => idSet.has(m.id));
    }

    if (options.overwriteExisting === false) {
      targetMatches = targetMatches.filter((m) => !m.scheduledTime);
    }

    // Sort by matchNumber for clean deterministic wave order
    targetMatches.sort((a, b) => a.matchNumber - b.matchNumber);

    if (targetMatches.length === 0) {
      throw new Error("No eligible matches found to schedule with the specified criteria");
    }

    const baseStartTime = new Date(options.startDateTimeIso).getTime();
    if (isNaN(baseStartTime)) {
      throw new Error("Invalid start date and time format");
    }

    const intervalMs = Math.max(0, options.intervalMinutes || 0) * 60 * 1000;
    const breakMs = Math.max(0, options.breakMinutes || 0) * 60 * 1000;
    const boards = Math.max(1, options.concurrentBoards || 1);

    const updatedMatches: LeagueMatch[] = [];
    const scheduledDetails: Array<{ matchId: string; scheduledTime: string; boardNumber: number }> = [];

    for (let i = 0; i < targetMatches.length; i++) {
      const match = targetMatches[i];
      const waveIndex = Math.floor(i / boards);
      const boardNumber = (i % boards) + 1;
      const matchStartMs = intervalMs === 0
        ? baseStartTime
        : baseStartTime + waveIndex * (intervalMs + breakMs);

      const scheduledTimeIso = new Date(matchStartMs).toISOString();
      match.scheduledTime = scheduledTimeIso;
      await dbRepository.saveLeagueMatch(match);
      updatedMatches.push(match);
      scheduledDetails.push({
        matchId: match.id,
        scheduledTime: scheduledTimeIso,
        boardNumber,
      });

      // Send live notifications to players if match is pending/active
      if (match.status !== "completed") {
        const timeFormatted = new Date(scheduledTimeIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateFormatted = new Date(scheduledTimeIso).toLocaleDateString([], { month: "short", day: "numeric" });

        if (match.player1Token) {
          notificationService.sendNotification({
            userToken: match.player1Token,
            username: match.player1Name,
            type: "tournament_match",
            title: `⏰ Match Fixture Set: Round ${match.round} #${match.matchNumber}`,
            message: `Your match vs ${match.player2Name || "Opponent"} in ${league.title} is scheduled for ${dateFormatted} at ${timeFormatted} (Board #${boardNumber}).`,
            link: `/leagues`,
            actionLabel: "View Fixture",
            actionPayload: { leagueId: league.id, matchId: match.id, round: match.round },
          }).catch(() => {});
        }
        if (match.player2Token) {
          notificationService.sendNotification({
            userToken: match.player2Token,
            username: match.player2Name,
            type: "tournament_match",
            title: `⏰ Match Fixture Set: Round ${match.round} #${match.matchNumber}`,
            message: `Your match vs ${match.player1Name || "Opponent"} in ${league.title} is scheduled for ${dateFormatted} at ${timeFormatted} (Board #${boardNumber}).`,
            link: `/leagues`,
            actionLabel: "View Fixture",
            actionPayload: { leagueId: league.id, matchId: match.id, round: match.round },
          }).catch(() => {});
        }
      }
    }

    const firstTimeIso = scheduledDetails[0]?.scheduledTime || options.startDateTimeIso;
    const lastTimeIso = scheduledDetails[scheduledDetails.length - 1]?.scheduledTime || options.startDateTimeIso;

    return {
      success: true,
      count: updatedMatches.length,
      matches: updatedMatches,
      summary: {
        round: options.round,
        totalScheduled: updatedMatches.length,
        firstMatchTime: firstTimeIso,
        lastMatchTime: lastTimeIso,
        intervalMinutes: options.intervalMinutes,
        concurrentBoards: boards,
        breakMinutes: options.breakMinutes || 0,
      },
    };
  },

  async clearRoundSchedule(
    facilitatorOrAdminToken: string,
    leagueId: string,
    round: number
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only clear round fixtures for their own tournaments.");
    }

    const allMatches = await dbRepository.getLeagueMatches(leagueId);
    const targetMatches = round > 0
      ? allMatches.filter((m) => m.round === round && m.status !== "completed")
      : allMatches.filter((m) => m.status !== "completed");

    const cleared: LeagueMatch[] = [];
    for (const match of targetMatches) {
      match.scheduledTime = undefined;
      await dbRepository.saveLeagueMatch(match);
      cleared.push(match);
    }

    return {
      success: true,
      clearedCount: cleared.length,
      matches: cleared,
    };
  },

  async delayRound(
    facilitatorOrAdminToken: string,
    leagueId: string,
    round: number,
    delayMinutes: number,
    reason?: string
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only delay rounds for their own tournaments.");
    }

    const allMatches = await dbRepository.getLeagueMatches(leagueId);
    const roundMatches = allMatches.filter((m) => m.round === round && m.status !== "completed");
    const delayMs = delayMinutes * 60 * 1000;

    const updatedMatches: LeagueMatch[] = [];
    for (const match of roundMatches) {
      const currentMs = match.scheduledTime ? new Date(match.scheduledTime).getTime() : Date.now();
      const newTimeIso = new Date(currentMs + delayMs).toISOString();
      match.scheduledTime = newTimeIso;
      await dbRepository.saveLeagueMatch(match);
      updatedMatches.push(match);

      const noticeMsg = `Round ${round} has been delayed by ${delayMinutes} minutes${reason ? ` (${reason})` : ""}. New start time: ${new Date(newTimeIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;

      if (match.player1Token) {
        notificationService.sendNotification({
          userToken: match.player1Token,
          username: match.player1Name,
          type: "tournament_match",
          title: `⚠️ Round ${round} Delayed by ${delayMinutes}m`,
          message: noticeMsg,
          link: `/leagues`,
          actionLabel: "View Fixtures",
        }).catch(() => {});
      }
      if (match.player2Token) {
        notificationService.sendNotification({
          userToken: match.player2Token,
          username: match.player2Name,
          type: "tournament_match",
          title: `⚠️ Round ${round} Delayed by ${delayMinutes}m`,
          message: noticeMsg,
          link: `/leagues`,
          actionLabel: "View Fixtures",
        }).catch(() => {});
      }
    }

    return updatedMatches;
  },

  async forfeitMatch(
    facilitatorOrAdminToken: string,
    matchId: string,
    forfeitingPlayerToken: string,
    reason: string
  ) {
    const matchesList = await dbRepository.getLeagueMatches("");
    const match = matchesList.find((m) => m.id === matchId);
    if (!match) throw new Error("Match not found");

    const winningToken =
      match.player1Token === forfeitingPlayerToken ? match.player2Token : match.player1Token;

    if (!winningToken) {
      throw new Error("Cannot determine winning contestant for walkover");
    }

    return this.submitLeagueMatchResult(
      facilitatorOrAdminToken,
      matchId,
      winningToken,
      `Walkover / Forfeit: ${reason}`
    );
  },

  async broadcastTournamentAnnouncement(
    facilitatorOrAdminToken: string,
    leagueId: string,
    title: string,
    message: string
  ) {
    const profile = await dbRepository.getProfile(facilitatorOrAdminToken);
    if (!profile) throw new Error("Unauthorized profile");

    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isOwner = league.facilitatorToken === facilitatorOrAdminToken;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized: Organizers can only broadcast announcements for their own tournaments.");
    }

    const participants = await dbRepository.getLeagueParticipants(leagueId);
    let count = 0;

    for (const p of participants) {
      if (p.userToken) {
        notificationService.sendNotification({
          userToken: p.userToken,
          username: p.username,
          type: "system_alert",
          title: `📢 ${title}`,
          message: `${message} — Organizer, ${league.title}`,
          link: `/leagues`,
          actionLabel: "View Tournament",
        }).catch(() => {});
        count++;
      }
    }

    return { success: true, broadcastCount: count };
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
    thirdPlaceToken?: string | null,
    unawardedReason?: string
  ) {
    return dbRepository.lockKey(`league_payout:${league.id}`, async () => {
      // Re-fetch league inside lock to prevent race condition / double-payout
      const latestLeague = await dbRepository.getLeague(league.id);
      if (!latestLeague) {
        throw new Error(`Tournament ${league.id} not found.`);
      }
      if (latestLeague.status === "completed") {
        throw new Error(`Tournament '${latestLeague.title}' prize pool has already been disbursed.`);
      }

      // Validate that any awarded token is an enrolled participant in this league
      const participants = await dbRepository.getLeagueParticipants(league.id);
      const validTokens = new Set(participants.filter((p) => p.status !== "rejected").map((p) => p.userToken));

      if (winnerToken && !validTokens.has(winnerToken)) {
        throw new Error(`Security violation: Winner token (${winnerToken}) is not an enrolled participant in tournament '${league.title}'`);
      }
      if (runnerUpToken && !validTokens.has(runnerUpToken)) {
        throw new Error(`Security violation: Runner-up token (${runnerUpToken}) is not an enrolled participant in tournament '${league.title}'`);
      }
      if (thirdPlaceToken && !validTokens.has(thirdPlaceToken)) {
        throw new Error(`Security violation: 3rd-place token (${thirdPlaceToken}) is not an enrolled participant in tournament '${league.title}'`);
      }

      const winnerProfile = winnerToken ? await dbRepository.getProfile(winnerToken) : null;
      const runnerUpProfile = runnerUpToken ? await dbRepository.getProfile(runnerUpToken) : null;
      const thirdPlaceProfile = thirdPlaceToken ? await dbRepository.getProfile(thirdPlaceToken) : null;

      latestLeague.status = "completed";
      latestLeague.winnerToken = winnerToken;
      latestLeague.winnerName = winnerProfile ? winnerProfile.username : (winnerToken ? "Champion" : "Unawarded");
      latestLeague.runnerUpToken = runnerUpToken || null;
      latestLeague.runnerUpName = runnerUpProfile ? runnerUpProfile.username : (runnerUpToken ? "Runner-Up" : "Unawarded");
      latestLeague.thirdPlaceToken = thirdPlaceToken || null;
      latestLeague.thirdPlaceName = thirdPlaceProfile ? thirdPlaceProfile.username : (thirdPlaceToken ? "3rd Place" : "Unawarded");

      if (unawardedReason) {
        latestLeague.unawardedReason = unawardedReason;
      }

      await dbRepository.saveLeague(latestLeague);

      // Calculate payouts according to Prize Distribution percentages after platform fee
      const settings = await dbRepository.getAdminSettings();
      const tournamentFeePercent = settings.tournamentFeePercent ?? 10;
      const totalPrize = latestLeague.prizePoolPoints;

      if (totalPrize > 0) {
        const platformFee = Math.round((totalPrize * tournamentFeePercent) / 100);
        const netPrizePool = totalPrize - platformFee;

        if (!latestLeague.platformFeeCharged && platformFee > 0) {
          await dbRepository.createTransaction({
            id: `tx-league-fee-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: "platform-treasury",
            type: "platform_fee",
            currency: "points",
            amount: platformFee,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ leagueTitle: latestLeague.title, totalPrize, tournamentFeePercent }),
            createdAt: new Date().toISOString(),
          });
        }

        const dist = latestLeague.prizeDistribution || { first: 60, second: 30, third: 10 };

        // 1st Place Payout or Unawarded Pool Return
        const firstAmount = Math.round((netPrizePool * dist.first) / 100);
        if (winnerToken) {
          await dbRepository.updateProfileBalance(winnerToken, firstAmount);
          await dbRepository.createTransaction({
            id: `tx-league-prize-1st-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: winnerToken,
            type: "league_prize",
            currency: "points",
            amount: firstAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ rank: "1st Place (Champion)", leagueTitle: latestLeague.title, platformFee, netPrizePool }),
            createdAt: new Date().toISOString(),
          });
        } else {
          // Unawarded 1st place returned to platform reward pool
          await dbRepository.createTransaction({
            id: `tx-league-unawarded-1st-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: "platform-treasury",
            type: "platform_fee",
            currency: "points",
            amount: firstAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ note: "Unawarded 1st place prize returned to platform reward pool", reason: unawardedReason || "No eligible champion" }),
            createdAt: new Date().toISOString(),
          });
        }

        // 2nd Place Payout or Unawarded Pool Return
        const secondAmount = Math.round((netPrizePool * dist.second) / 100);
        if (runnerUpToken) {
          await dbRepository.updateProfileBalance(runnerUpToken, secondAmount);
          await dbRepository.createTransaction({
            id: `tx-league-prize-2nd-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: runnerUpToken,
            type: "league_prize",
            currency: "points",
            amount: secondAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ rank: "2nd Place (Runner-Up)", leagueTitle: latestLeague.title, platformFee, netPrizePool }),
            createdAt: new Date().toISOString(),
          });
        } else {
          // Unawarded 2nd place returned to platform reward pool
          await dbRepository.createTransaction({
            id: `tx-league-unawarded-2nd-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: "platform-treasury",
            type: "platform_fee",
            currency: "points",
            amount: secondAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ note: "Unawarded 2nd place prize returned to platform reward pool", reason: unawardedReason || "No eligible runner-up" }),
            createdAt: new Date().toISOString(),
          });
        }

        // 3rd Place Payout or Unawarded Pool Return
        const thirdAmount = Math.round((netPrizePool * dist.third) / 100);
        if (thirdPlaceToken) {
          await dbRepository.updateProfileBalance(thirdPlaceToken, thirdAmount);
          await dbRepository.createTransaction({
            id: `tx-league-prize-3rd-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: thirdPlaceToken,
            type: "league_prize",
            currency: "points",
            amount: thirdAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ rank: "3rd Place", leagueTitle: latestLeague.title, platformFee, netPrizePool }),
            createdAt: new Date().toISOString(),
          });
        } else {
          // Unawarded 3rd place returned to platform reward pool
          await dbRepository.createTransaction({
            id: `tx-league-unawarded-3rd-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: "platform-treasury",
            type: "platform_fee",
            currency: "points",
            amount: thirdAmount,
            reference: latestLeague.id,
            status: "completed",
            metaJson: JSON.stringify({ note: "Unawarded 3rd place prize returned to platform reward pool", reason: unawardedReason || "No eligible 3rd place" }),
            createdAt: new Date().toISOString(),
          });
        }

        // Double-entry ledger settlement:
        // Escrow liability reduction (-totalPrize), platform commission credit (+platformFee), and winners/pool credits
        await dbRepository.writeLedger([
          {
            userId: latestLeague.facilitatorToken || "platform-treasury",
            accountType: "escrow",
            entryType: "league_prize",
            amount: String(-totalPrize),
            referenceType: "league",
            referenceId: latestLeague.id,
          },
          ...(platformFee > 0 && !latestLeague.platformFeeCharged ? [{
            userId: "platform-treasury",
            accountType: "available" as const,
            entryType: "platform_fee" as const,
            amount: String(platformFee),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : []),
          ...(winnerToken && firstAmount > 0 ? [{
            userId: winnerToken,
            accountType: "available" as const,
            entryType: "league_prize" as const,
            amount: String(firstAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : firstAmount > 0 ? [{
            userId: "platform-treasury",
            accountType: "available" as const,
            entryType: "platform_fee" as const,
            amount: String(firstAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : []),
          ...(runnerUpToken && secondAmount > 0 ? [{
            userId: runnerUpToken,
            accountType: "available" as const,
            entryType: "league_prize" as const,
            amount: String(secondAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : secondAmount > 0 ? [{
            userId: "platform-treasury",
            accountType: "available" as const,
            entryType: "platform_fee" as const,
            amount: String(secondAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : []),
          ...(thirdPlaceToken && thirdAmount > 0 ? [{
            userId: thirdPlaceToken,
            accountType: "available" as const,
            entryType: "league_prize" as const,
            amount: String(thirdAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : thirdAmount > 0 ? [{
            userId: "platform-treasury",
            accountType: "available" as const,
            entryType: "platform_fee" as const,
            amount: String(thirdAmount),
            referenceType: "league",
            referenceId: latestLeague.id,
          }] : []),
        ]).catch(() => []);
      }
    });
  },
};
