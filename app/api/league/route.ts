import { NextRequest, NextResponse } from "next/server";
import { leagueService } from "@/lib/league-service";
import { requireApprovedOrganizer } from "@/lib/auth-guard";
import { dbRepository } from "@/lib/db-client";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const organizerToken = searchParams.get("organizerToken") || searchParams.get("facilitatorToken");

  if (id) {
    try {
      const details = await leagueService.getLeagueDetails(id);
      return NextResponse.json(details);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "League not found" }, { status: 404 });
    }
  }

  let leagues = await leagueService.listLeagues();
  if (organizerToken) {
    leagues = leagues.filter((l) => l.facilitatorToken === organizerToken);
  }
  return NextResponse.json({ leagues });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const token = cleanToken(body.token);

    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    if (action === "create") {
      // Server-side guard checking if user is an approved organizer or admin
      const authResult = await requireApprovedOrganizer(
        new NextRequest(req.url, {
          headers: { authorization: `Bearer ${token}` },
        })
      );
      if (authResult instanceof NextResponse) {
        return authResult;
      }

      const {
        title,
        description,
        entryFeePoints,
        prizePoolPoints,
        maxParticipants,
        facilitatorName,
        format,
        isPrivate,
        inviteCode,
        requiresApproval,
        scheduleDate,
        scheduleTime,
        gameDays,
        turnTimerSeconds,
        prizeDistribution,
        rulesNotes,
      } = body;

      if (!title) return NextResponse.json({ error: "League title required" }, { status: 400 });

      const league = await leagueService.createLeague(
        token,
        facilitatorName || "Facilitator",
        title,
        description || "Official Damii League",
        Number(entryFeePoints) || 0,
        Number(prizePoolPoints) || 0,
        Number(maxParticipants) || 8,
        {
          format: format || "single_elimination",
          isPrivate: Boolean(isPrivate),
          inviteCode: inviteCode ? String(inviteCode) : undefined,
          requiresApproval: Boolean(requiresApproval),
          scheduleDate: scheduleDate ? String(scheduleDate) : undefined,
          scheduleTime: scheduleTime ? String(scheduleTime) : undefined,
          gameDays: gameDays ? String(gameDays) : undefined,
          turnTimerSeconds: Number(turnTimerSeconds) || 60,
          prizeDistribution,
          rulesNotes: rulesNotes ? String(rulesNotes) : undefined,
        }
      );
      return NextResponse.json({ league });
    }

    if (action === "update_settings") {
      const { leagueId, updates } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const updated = await leagueService.updateLeagueSettings(token, leagueId, updates || {});
      return NextResponse.json({ success: true, league: updated });
    }

    if (action === "join") {
      const leagueId = String(body.leagueId ?? "");
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const res = await leagueService.joinLeague(token, leagueId, body.inviteCode);
      return NextResponse.json(res);
    }

    if (action === "checkin") {
      const leagueId = String(body.leagueId ?? "");
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const participant = await leagueService.togglePlayerCheckIn(token, leagueId);
      return NextResponse.json({ success: true, participant });
    }

    if (action === "reseed") {
      const { leagueId, orderedUserTokens } = body;
      if (!leagueId || !Array.isArray(orderedUserTokens)) {
        return NextResponse.json({ error: "League ID and ordered user tokens required" }, { status: 400 });
      }

      const participants = await leagueService.reseedParticipants(token, leagueId, orderedUserTokens);
      return NextResponse.json({ success: true, participants });
    }

    if (action === "approve") {
      const participantId = String(body.participantId ?? "");
      if (!participantId) return NextResponse.json({ error: "Participant ID required" }, { status: 400 });

      const res = await leagueService.approveApplicant(token, participantId);
      return NextResponse.json({ success: true, participant: res });
    }

    if (action === "reject") {
      const participantId = String(body.participantId ?? "");
      if (!participantId) return NextResponse.json({ error: "Participant ID required" }, { status: 400 });

      const res = await leagueService.rejectApplicant(token, participantId);
      return NextResponse.json({ success: true, participant: res });
    }

    if (action === "start_match_room") {
      const matchId = String(body.matchId ?? "");
      if (!matchId) return NextResponse.json({ error: "Match ID required" }, { status: 400 });

      const res = await leagueService.startLeagueMatchRoom(token, matchId);
      return NextResponse.json(res);
    }

    if (action === "result") {
      const { matchId, winnerToken, disputeNotes } = body;
      if (!matchId || !winnerToken) {
        return NextResponse.json({ error: "Match ID and Winner Token required" }, { status: 400 });
      }

      const res = await leagueService.submitLeagueMatchResult(token, matchId, winnerToken, disputeNotes);
      return NextResponse.json(res);
    }

    if (action === "add_player_manual") {
      const { leagueId, usernameToAdd } = body;
      if (!leagueId || !usernameToAdd) {
        return NextResponse.json({ error: "League ID and Player Username required" }, { status: 400 });
      }

      const participant = await leagueService.addParticipantManual(token, String(leagueId), String(usernameToAdd));
      return NextResponse.json({ success: true, participant });
    }

    if (action === "cancel") {
      const { leagueId, reason } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const league = await leagueService.cancelTournament(token, String(leagueId), reason ? String(reason) : undefined);
      return NextResponse.json({ success: true, league });
    }

    if (action === "generate_bracket") {
      const leagueId = String(body.leagueId ?? "");
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const matches = await leagueService.generateTournamentBracket(leagueId, token);
      return NextResponse.json({ success: true, matches });
    }

    if (action === "schedule_match") {
      const { matchId, scheduledTimeIso } = body;
      if (!matchId || !scheduledTimeIso) {
        return NextResponse.json({ error: "Match ID and Scheduled Time (ISO) required" }, { status: 400 });
      }

      const match = await leagueService.scheduleMatch(token, String(matchId), String(scheduledTimeIso));
      return NextResponse.json({ success: true, match });
    }

    if (action === "schedule_round" || action === "batch_schedule_round") {
      const {
        leagueId,
        round,
        startDateTimeIso,
        intervalMinutes,
        matchDurationMinutes,
        concurrentBoards,
        breakMinutes,
        staggerMatches,
        overwriteExisting,
        matchIds,
      } = body;
      if (!leagueId || round === undefined || !startDateTimeIso) {
        return NextResponse.json({ error: "League ID, Round, and Start Date Time required" }, { status: 400 });
      }

      const calculatedInterval = intervalMinutes !== undefined
        ? Number(intervalMinutes)
        : (staggerMatches ? (Number(matchDurationMinutes) || 20) : 0);

      const result = await leagueService.batchScheduleRound(token, String(leagueId), {
        round: Number(round),
        startDateTimeIso: String(startDateTimeIso),
        intervalMinutes: calculatedInterval,
        concurrentBoards: Number(concurrentBoards) || 1,
        breakMinutes: Number(breakMinutes) || 0,
        overwriteExisting: overwriteExisting !== undefined ? Boolean(overwriteExisting) : true,
        matchIds: Array.isArray(matchIds) ? matchIds.map(String) : undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "clear_round_schedule") {
      const { leagueId, round } = body;
      if (!leagueId) {
        return NextResponse.json({ error: "League ID required" }, { status: 400 });
      }

      const result = await leagueService.clearRoundSchedule(token, String(leagueId), Number(round) || 0);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "delay_round") {
      const { leagueId, round, delayMinutes, reason } = body;
      if (!leagueId || !round || !delayMinutes) {
        return NextResponse.json({ error: "League ID, Round, and Delay Minutes required" }, { status: 400 });
      }

      const matches = await leagueService.delayRound(token, String(leagueId), Number(round), Number(delayMinutes), reason ? String(reason) : undefined);
      return NextResponse.json({ success: true, matches });
    }

    if (action === "forfeit_match") {
      const { matchId, forfeitingPlayerToken, reason } = body;
      if (!matchId || !forfeitingPlayerToken) {
        return NextResponse.json({ error: "Match ID and Forfeiting Player Token required" }, { status: 400 });
      }

      const res = await leagueService.forfeitMatch(token, String(matchId), String(forfeitingPlayerToken), String(reason || "Organizer Walkover"));
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "broadcast_announcement") {
      const { leagueId, title, message } = body;
      if (!leagueId || !title || !message) {
        return NextResponse.json({ error: "League ID, Title, and Message required" }, { status: 400 });
      }

      const res = await leagueService.broadcastTournamentAnnouncement(token, String(leagueId), String(title), String(message));
      return NextResponse.json(res);
    }

    if (action === "disburse_prizes") {
      const { leagueId, winnerToken, runnerUpToken, thirdPlaceToken } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const leagueDetails = await leagueService.getLeagueDetails(String(leagueId));
      if (!leagueDetails || !leagueDetails.league) return NextResponse.json({ error: "League not found" }, { status: 400 });

      const profile = await dbRepository.getProfile(token);
      if (!profile) return NextResponse.json({ error: "Unauthorized profile" }, { status: 401 });

      const isAdmin = profile.role === "admin" || profile.role === "super_admin";
      const isOwner = leagueDetails.league.facilitatorToken === token;
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Unauthorized: Organizers can only disburse prizes for their own tournaments." },
          { status: 403 }
        );
      }

      await leagueService.payoutTournamentPrizePool(
        leagueDetails.league,
        winnerToken || leagueDetails.league.winnerToken || null,
        runnerUpToken || leagueDetails.league.runnerUpToken || null,
        thirdPlaceToken || leagueDetails.league.thirdPlaceToken || null
      );

      const updated = await leagueService.getLeagueDetails(String(leagueId));
      return NextResponse.json({ success: true, ...updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "League error" },
      { status: 500 }
    );
  }
}
