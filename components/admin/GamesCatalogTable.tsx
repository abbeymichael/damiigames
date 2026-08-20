"use client";

import React, { useState } from "react";
import { Gamepad2, Plus, ToggleLeft, ToggleRight, Settings, ShieldCheck, CheckCircle2, Clock, Sparkles } from "lucide-react";
import type { GameCatalogItem } from "@/lib/types";

interface GamesCatalogTableProps {
  games: GameCatalogItem[];
  busy: boolean;
  onRefresh: () => void;
  token: string;
}

export function GamesCatalogTable({
  games,
  busy,
  onRefresh,
  token,
}: GamesCatalogTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameCatalogItem | null>(null);
  const [gameName, setGameName] = useState("");
  const [gameSlug, setGameSlug] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [gameStatus, setGameStatus] = useState<"enabled" | "disabled">("enabled");
  const [gameIconUrl, setGameIconUrl] = useState("/icon.png");

  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  function handleOpenCreate() {
    setEditingGame(null);
    setGameName("");
    setGameSlug("");
    setGameDescription("");
    setGameStatus("enabled");
    setGameIconUrl("/icon.png");
    setError("");
    setModalOpen(true);
  }

  function handleOpenEdit(g: GameCatalogItem) {
    setEditingGame(g);
    setGameName(g.name);
    setGameSlug(g.slug);
    setGameDescription(g.description || "");
    setGameStatus(g.status);
    setGameIconUrl(g.iconUrl || "/icon.png");
    setError("");
    setModalOpen(true);
  }

  async function handleToggleStatus(g: GameCatalogItem) {
    const nextStatus = g.status === "enabled" ? "disabled" : "enabled";
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "toggle_game_status",
          gameId: g.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to update game status");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveGame(e: React.FormEvent) {
    e.preventDefault();
    if (!gameName.trim() || !gameSlug.trim()) {
      setError("Game name and slug are required");
      return;
    }

    setActionBusy(true);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "save_game",
          game: {
            id: editingGame?.id,
            name: gameName.trim(),
            slug: gameSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
            description: gameDescription.trim(),
            status: gameStatus,
            iconUrl: gameIconUrl.trim() || "/icon.png",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save game");

      setModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving game");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <Gamepad2 size={20} className="text-[#d6a735]" />
            Game Type Catalog &amp; Arena Modes
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Control which draughts rule variations, board sizes, and blitz clock configurations are active and joinable by players in match rooms and tournament leagues.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={busy || actionBusy}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus size={16} />
          Register New Game Type
        </button>
      </div>

      {/* Games Catalog Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((g) => {
          const isEnabled = g.status === "enabled";
          return (
            <div
              key={g.id}
              className={`p-5 bg-[#081c15] border rounded-2xl shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                isEnabled ? "border-[#114232] hover:border-emerald-500/40" : "border-slate-800 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#114232]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#041d17] border border-[#114232] flex items-center justify-center text-[#d6a735]">
                      <Gamepad2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#f5efdf]">{g.name}</h3>
                      <span className="text-[10px] font-mono text-cyan-300">{g.slug}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono ${
                      isEnabled
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-950/80 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {isEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 line-clamp-2">
                  {g.description || "Traditional draughts rules configuration."}
                </p>
              </div>

              <div className="pt-3 border-t border-[#114232] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(g)}
                  disabled={actionBusy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isEnabled
                      ? "bg-emerald-950/50 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30"
                      : "bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 border border-[#114232]"
                  }`}
                >
                  {isEnabled ? (
                    <>
                      <ToggleRight size={16} className="text-emerald-400" /> Enabled
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={16} className="text-slate-400" /> Disabled
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(g)}
                  className="p-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 hover:text-white rounded-lg border border-[#114232] transition-colors cursor-pointer"
                  title="Configure Game"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create/Edit Game */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <Gamepad2 size={18} className="text-[#d6a735]" />
                  {editingGame ? `Edit Game: ${editingGame.name}` : "Register New Game Type"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Define game details, slug identifier, and initial enablement status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveGame} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Game Name *
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => {
                    setGameName(e.target.value);
                    if (!editingGame) {
                      setGameSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Damii (10x10)"
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Slug / Unique Key *
                </label>
                <input
                  type="text"
                  value={gameSlug}
                  onChange={(e) => setGameSlug(e.target.value)}
                  placeholder="e.g. damii-10x10"
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={3}
                  placeholder="Rules summary, board dimensions, clock settings..."
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Initial Status
                  </label>
                  <select
                    value={gameStatus}
                    onChange={(e) => setGameStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="enabled">Enabled (Active)</option>
                    <option value="disabled">Disabled (Hidden/Draft)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Icon Path
                  </label>
                  <input
                    type="text"
                    value={gameIconUrl}
                    onChange={(e) => setGameIconUrl(e.target.value)}
                    placeholder="/icon.png"
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#114232]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 text-xs font-bold rounded-xl border border-[#114232] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  {actionBusy ? "Saving..." : "Save Game"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
