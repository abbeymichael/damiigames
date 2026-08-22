"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Timer,
  Layers,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Swords,
  ChevronRight,
  Info,
} from "lucide-react";
import type { League, LeagueMatch } from "@/lib/types";
import { getAuthHeaders } from "@/lib/client-auth";

interface BatchFixtureSchedulerProps {
  league: League;
  matches: LeagueMatch[];
  token: string;
  onScheduleApplied: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}

export function BatchFixtureScheduler({
  league,
  matches,
  token,
  onScheduleApplied,
  busy,
  setBusy,
  setError,
  setSuccess,
}: BatchFixtureSchedulerProps) {
  // Available rounds
  const rounds = useMemo(() => {
    const rSet = new Set<number>();
    matches.forEach((m) => rSet.add(m.round));
    const list = Array.from(rSet).sort((a, b) => a - b);
    return list.length > 0 ? list : [1];
  }, [matches]);

  const [selectedRound, setSelectedRound] = useState<number>(rounds[0] || 1);
  const [startDateTime, setStartDateTime] = useState<string>(() => {
    // Default to next 30-min rounded slot
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const offsetMs = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  });

  const [intervalMinutes, setIntervalMinutes] = useState<number>(20);
  const [concurrentBoards, setConcurrentBoards] = useState<number>(1);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<string>("30m");

  // Matches in the chosen round
  const roundMatches = useMemo(() => {
    return matches
      .filter((m) => m.round === selectedRound)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  }, [matches, selectedRound]);

  const unscheduledCount = useMemo(() => {
    return roundMatches.filter((m) => !m.scheduledTime && m.status !== "completed").length;
  }, [roundMatches]);

  const scheduledCount = useMemo(() => {
    return roundMatches.filter((m) => Boolean(m.scheduledTime)).length;
  }, [roundMatches]);

  // Quick Presets
  const applyPresetTime = (preset: string) => {
    setSelectedPreset(preset);
    const now = new Date();
    let target = new Date();

    if (preset === "15m") {
      target = new Date(now.getTime() + 15 * 60 * 1000);
    } else if (preset === "30m") {
      target = new Date(now.getTime() + 30 * 60 * 1000);
    } else if (preset === "1h") {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === "tonight18") {
      target = new Date();
      target.setHours(18, 0, 0, 0);
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
    } else if (preset === "tonight19") {
      target = new Date();
      target.setHours(19, 0, 0, 0);
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
    } else if (preset === "tomorrow10") {
      target = new Date();
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    }

    const offsetMs = target.getTimezoneOffset() * 60000;
    const local = new Date(target.getTime() - offsetMs);
    setStartDateTime(local.toISOString().slice(0, 16));
  };

  // Preview timetable calculation
  const previewTimetable = useMemo(() => {
    if (!startDateTime) return [];
    const baseMs = new Date(startDateTime).getTime();
    if (isNaN(baseMs)) return [];

    const effectiveMatches = overwriteExisting
      ? roundMatches
      : roundMatches.filter((m) => !m.scheduledTime);

    const boards = Math.max(1, concurrentBoards);
    const spacingMs = (intervalMinutes + breakMinutes) * 60 * 1000;

    return effectiveMatches.map((m, index) => {
      const waveIndex = Math.floor(index / boards);
      const boardNumber = (index % boards) + 1;
      const matchStartMs = intervalMinutes === 0 ? baseMs : baseMs + waveIndex * spacingMs;
      const dateObj = new Date(matchStartMs);

      return {
        matchId: m.id,
        matchNumber: m.matchNumber,
        player1Name: m.player1Name || "TBD",
        player2Name: m.player2Name || "TBD",
        status: m.status,
        alreadyScheduled: Boolean(m.scheduledTime),
        currentScheduledTime: m.scheduledTime,
        newScheduledTimeIso: dateObj.toISOString(),
        timeFormatted: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dateFormatted: dateObj.toLocaleDateString([], { month: "short", day: "numeric" }),
        boardNumber,
        waveIndex: waveIndex + 1,
      };
    });
  }, [
    startDateTime,
    roundMatches,
    intervalMinutes,
    concurrentBoards,
    breakMinutes,
    overwriteExisting,
  ]);

  const estimatedEndTime = useMemo(() => {
    if (previewTimetable.length === 0) return null;
    const last = previewTimetable[previewTimetable.length - 1];
    const lastStartMs = new Date(last.newScheduledTimeIso).getTime();
    const matchDurMs = (intervalMinutes > 0 ? intervalMinutes : 20) * 60 * 1000;
    const finishDate = new Date(lastStartMs + matchDurMs);
    return finishDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [previewTimetable, intervalMinutes]);

  // Execute Batch Scheduling
  const handleExecuteBatchSchedule = async () => {
    if (!startDateTime) {
      setError("Please specify a starting date and time.");
      return;
    }

    const baseStartTime = new Date(startDateTime).getTime();
    if (isNaN(baseStartTime)) {
      setError("Invalid start date and time format.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "batch_schedule_round",
          token,
          leagueId: league.id,
          round: selectedRound,
          startDateTimeIso: new Date(startDateTime).toISOString(),
          intervalMinutes,
          concurrentBoards,
          breakMinutes,
          overwriteExisting,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to execute batch schedule");
      }

      setSuccess(
        `⚡ Batch scheduled ${data.count || roundMatches.length} fixtures for Round ${selectedRound}! Players notified.`
      );
      onScheduleApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch scheduling failed");
    } finally {
      setBusy(false);
    }
  };

  // Clear Round Schedule
  const handleClearSchedule = async () => {
    if (!window.confirm(`Are you sure you want to clear all scheduled times for Round ${selectedRound}?`)) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "clear_round_schedule",
          token,
          leagueId: league.id,
          round: selectedRound,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to clear schedule");
      }

      setSuccess(`Reset schedule times for Round ${selectedRound} (${data.clearedCount} fixtures cleared).`);
      onScheduleApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear schedule failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#184d3c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#d6a735]/15 border border-[#d6a735]/30 flex items-center justify-center text-[#d6a735]">
            <Timer size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#f5efdf]">Batch Fixture Scheduler</h3>
              <span className="px-2 py-0.5 rounded-md bg-[#d6a735]/20 text-[#d6a735] text-[10px] font-black uppercase tracking-wider">
                Automated Interval Engine
              </span>
            </div>
            <p className="text-xs text-[#a3b8b0] mt-0.5">
              Automatically calculate and assign match start times, board allocations, and rest breaks across all matches in a round.
            </p>
          </div>
        </div>

        {/* Round Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#081c15] p-1 rounded-2xl border border-[#114232]">
          {rounds.map((r) => {
            const count = matches.filter((m) => m.round === r).length;
            const isSelected = selectedRound === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRound(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#d6a735] text-[#06261f] shadow-md"
                    : "text-[#a3b8b0] hover:text-[#f5efdf] hover:bg-[#114232]/40"
                }`}
              >
                <span>Round {r}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? "bg-[#06261f]/20 text-[#06261f]" : "bg-[#184d3c] text-[#d6a735]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Round Status Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#a3b8b0]">Total Fixtures</div>
          <div className="text-lg font-black text-[#f5efdf] mt-0.5">{roundMatches.length} Matches</div>
        </div>
        <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl">
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Unscheduled</div>
          <div className="text-lg font-black text-amber-400 mt-0.5">{unscheduledCount} Fixtures</div>
        </div>
        <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl">
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Scheduled</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5">{scheduledCount} Fixtures</div>
        </div>
        <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#d6a735]">Est. Round Duration</div>
          <div className="text-lg font-black text-[#d6a735] mt-0.5">
            {estimatedEndTime ? `Until ~${estimatedEndTime}` : "—"}
          </div>
        </div>
      </div>

      {/* Scheduler Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings Configuration */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-[#f5efdf] mb-2 flex items-center justify-between">
              <span>1. Quick Start Presets</span>
              <span className="text-[10px] text-[#a3b8b0] font-normal">Pick preset or custom</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "15m", label: "+15 Mins" },
                { id: "30m", label: "+30 Mins" },
                { id: "1h", label: "+1 Hour" },
                { id: "tonight18", label: "Tonight 18:00" },
                { id: "tonight19", label: "Tonight 19:00" },
                { id: "tomorrow10", label: "Tmrw 10:00" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPresetTime(p.id)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                    selectedPreset === p.id
                      ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735]"
                      : "bg-[#081c15] border-[#114232] text-[#a3b8b0] hover:text-[#f5efdf] hover:border-[#184d3c]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base Start Time Input */}
          <div>
            <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-[#d6a735]" /> Base Round Start Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => {
                setStartDateTime(e.target.value);
                setSelectedPreset("custom");
              }}
              className="w-full px-3.5 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735] transition-colors"
            />
          </div>

          {/* Match Spacing / Interval Stepper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                <Clock size={14} className="text-[#d6a735]" /> Match Interval (Wave Spacing)
              </label>
              <span className="text-xs font-bold text-[#d6a735]">
                {intervalMinutes === 0 ? "0m (Simultaneous)" : `+${intervalMinutes} minutes`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[
                { val: 0, label: "0m (Simul)" },
                { val: 15, label: "15 mins" },
                { val: 20, label: "20 mins" },
                { val: 30, label: "30 mins" },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setIntervalMinutes(item.val)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    intervalMinutes === item.val
                      ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-sm"
                      : "bg-[#081c15] border-[#114232] text-[#a3b8b0] hover:text-[#f5efdf]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 40, label: "40 mins" },
                { val: 45, label: "45 mins" },
                { val: 60, label: "60 mins" },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setIntervalMinutes(item.val)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    intervalMinutes === item.val
                      ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-sm"
                      : "bg-[#081c15] border-[#114232] text-[#a3b8b0] hover:text-[#f5efdf]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Concurrent Boards & Buffer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                <Layers size={13} className="text-[#d6a735]" /> Concurrent Boards
              </label>
              <select
                value={concurrentBoards}
                onChange={(e) => setConcurrentBoards(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
              >
                <option value={1}>1 Board (Sequential)</option>
                <option value={2}>2 Boards (Dual Arena)</option>
                <option value={3}>3 Boards (Tri Arena)</option>
                <option value={4}>4 Boards (Quad Arena)</option>
                <option value={8}>8 Boards (Full Arena)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                <Timer size={13} className="text-[#d6a735]" /> Break / Rest Buffer
              </label>
              <select
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
              >
                <option value={0}>0 mins (No break)</option>
                <option value={5}>+5 mins break</option>
                <option value={10}>+10 mins break</option>
                <option value={15}>+15 mins break</option>
              </select>
            </div>
          </div>

          {/* Overwrite Toggle */}
          <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-[#f5efdf]">Overwrite Existing Times</div>
              <div className="text-[11px] text-[#a3b8b0]">
                {overwriteExisting ? "Re-schedules all matches in round" : "Only schedules unassigned matches"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOverwriteExisting(!overwriteExisting)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                overwriteExisting ? "bg-[#d6a735]" : "bg-[#184d3c]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#06261f] shadow-md transition-transform transform ${
                  overwriteExisting ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={busy || !startDateTime || roundMatches.length === 0}
              onClick={handleExecuteBatchSchedule}
              className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-2xl text-xs transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap size={16} /> Apply Batch Schedule to Round {selectedRound} ({previewTimetable.length} Matches)
            </button>

            <button
              type="button"
              disabled={busy || scheduledCount === 0}
              onClick={handleClearSchedule}
              className="w-full py-2 bg-[#081c15] hover:bg-[#114232] text-[#a3b8b0] hover:text-[#f5efdf] border border-[#114232] rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw size={13} /> Reset / Clear Scheduled Times for Round {selectedRound}
            </button>
          </div>
        </div>

        {/* Right Column: Live Batch Schedule Preview Timetable */}
        <div className="lg:col-span-7 bg-[#081c15] border border-[#114232] rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#114232] pb-3 mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#d6a735]" /> Live Timetable Preview
                </h4>
                <p className="text-[11px] text-[#a3b8b0]">
                  Visualizing calculated board assignments and start times for Round {selectedRound}.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#a3b8b0] block">Round {selectedRound}</span>
                <span className="text-xs font-bold text-[#d6a735]">
                  {concurrentBoards} Board{concurrentBoards > 1 ? "s" : ""} •{" "}
                  {intervalMinutes === 0 ? "Simultaneous" : `+${intervalMinutes + breakMinutes}m wave`}
                </span>
              </div>
            </div>

            {/* Fixture Cards List */}
            {roundMatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#a3b8b0] border border-dashed border-[#184d3c] rounded-xl">
                No fixtures found for Round {selectedRound}. Generate the tournament bracket first.
              </div>
            ) : previewTimetable.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#a3b8b0] border border-dashed border-[#184d3c] rounded-xl">
                Select a valid start time above to generate preview.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {previewTimetable.map((item, idx) => (
                  <div
                    key={item.matchId}
                    className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between gap-3 hover:border-[#d6a735]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#081c15] border border-[#114232] flex items-center justify-center text-xs font-black text-[#d6a735]">
                        #{item.matchNumber}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                          <span>{item.player1Name}</span>
                          <span className="text-[10px] text-[#a3b8b0] font-normal">vs</span>
                          <span>{item.player2Name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#a3b8b0]">
                          <span className="px-1.5 py-0.2 rounded bg-[#081c15] border border-[#114232] text-[#d6a735] font-bold text-[10px]">
                            Board {item.boardNumber}
                          </span>
                          <span>Wave {item.waveIndex}</span>
                          {item.alreadyScheduled && (
                            <span className="text-[10px] text-amber-400">
                              (Prior: {new Date(item.currentScheduledTime!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-[#d6a735] flex items-center gap-1 justify-end">
                        <Clock size={12} /> {item.timeFormatted}
                      </div>
                      <div className="text-[10px] text-[#a3b8b0]">{item.dateFormatted}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl text-[11px] text-[#a3b8b0] flex items-center gap-2">
            <Info size={14} className="text-[#d6a735] shrink-0" />
            <span>
              Executing will instantly schedule all {previewTimetable.length} matches and dispatch real-time in-app match alerts to both players.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchFixtureScheduler;
