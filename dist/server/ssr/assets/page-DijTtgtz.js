import "../index.js";
import { C as createLucideIcon, S as Trophy, a as Eye, b as Swords, d as Zap, l as Check, m as X, t as SharedHeader, u as Sparkles, y as User } from "./SharedHeader-D3NEmMWE.js";
import { a as UserCheck, i as Settings, n as Plus, r as RefreshCw, t as Play } from "./play-xhWKohq5.js";
import { t as ShieldCheck } from "./shield-check-U2HHf4RL.js";
import { t as TriangleAlert } from "./triangle-alert-BShSatn6.js";
import { t as Copy } from "./copy-BpJXZsCR.js";
import { t as Award } from "./award-DPFkoqI5.js";
import { t as ArrowRight } from "./arrow-right-BBE6bKn_.js";
import { t as FileText } from "./file-text-G1EI3cI4.js";
import { t as Bot } from "./bot-CkLYI2kP.js";
import { t as Maximize2 } from "./maximize-2-8ghPURjo.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region lib/damii-rules.ts
var SIZE = 10;
var idx = (row, col) => row * SIZE + col;
var rowOf = (square) => Math.floor(square / SIZE);
var colOf = (square) => square % SIZE;
var inside = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
function createBoard() {
	return Array.from({ length: 100 }, (_, square) => {
		const row = rowOf(square);
		if ((row + colOf(square)) % 2 === 0) return null;
		if (row < 4) return {
			player: "black",
			king: false
		};
		if (row > 5) return {
			player: "white",
			king: false
		};
		return null;
	});
}
function capturesFor(board, from) {
	const piece = board[from];
	if (!piece) return [];
	const row = rowOf(from);
	const col = colOf(from);
	const directions = [
		[-1, -1],
		[-1, 1],
		[1, -1],
		[1, 1]
	];
	const moves = [];
	if (!piece.king) {
		for (const [dr, dc] of directions) {
			const middleRow = row + dr;
			const middleCol = col + dc;
			const landingRow = row + dr * 2;
			const landingCol = col + dc * 2;
			if (!inside(landingRow, landingCol)) continue;
			const middle = board[idx(middleRow, middleCol)];
			const landing = idx(landingRow, landingCol);
			if (middle && middle.player !== piece.player && !board[landing]) moves.push({
				from,
				to: landing,
				captured: idx(middleRow, middleCol)
			});
		}
		return moves;
	}
	for (const [dr, dc] of directions) {
		let scanRow = row + dr;
		let scanCol = col + dc;
		let enemy;
		while (inside(scanRow, scanCol)) {
			const square = idx(scanRow, scanCol);
			const occupant = board[square];
			if (!occupant) {
				if (enemy !== void 0) moves.push({
					from,
					to: square,
					captured: enemy
				});
			} else if (occupant.player === piece.player || enemy !== void 0) break;
			else enemy = square;
			scanRow += dr;
			scanCol += dc;
		}
	}
	return moves;
}
function simpleMovesFor(board, from) {
	const piece = board[from];
	if (!piece) return [];
	const row = rowOf(from);
	const col = colOf(from);
	const moves = [];
	const directions = piece.king ? [
		[-1, -1],
		[-1, 1],
		[1, -1],
		[1, 1]
	] : piece.player === "white" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
	for (const [dr, dc] of directions) {
		let nextRow = row + dr;
		let nextCol = col + dc;
		while (inside(nextRow, nextCol)) {
			const square = idx(nextRow, nextCol);
			if (board[square]) break;
			moves.push({
				from,
				to: square
			});
			if (!piece.king) break;
			nextRow += dr;
			nextCol += dc;
		}
	}
	return moves;
}
function legalMoves(board, player, forcedFrom = null) {
	if (forcedFrom !== null) return capturesFor(board, forcedFrom);
	const pieces = board.flatMap((piece, square) => piece?.player === player ? [square] : []);
	const captures = pieces.flatMap((square) => capturesFor(board, square));
	return captures.length ? captures : pieces.flatMap((square) => simpleMovesFor(board, square));
}
function applyMove(board, player, forcedFrom, from, to) {
	const move = legalMoves(board, player, forcedFrom).find((candidate) => candidate.from === from && candidate.to === to);
	if (!move) throw new Error("Illegal move");
	const next = board.map((piece) => piece ? { ...piece } : null);
	const piece = next[from];
	if (!piece) throw new Error("Piece missing");
	next[from] = null;
	next[to] = piece;
	if (move.captured !== void 0) next[move.captured] = null;
	if ((move.captured !== void 0 ? capturesFor(next, to) : []).length) return {
		board: next,
		turn: player,
		forcedFrom: to,
		winner: null,
		captured: true
	};
	if (piece.player === "white" && rowOf(to) === 0 || piece.player === "black" && rowOf(to) === 9) piece.king = true;
	const opponent = player === "white" ? "black" : "white";
	return {
		board: next,
		turn: opponent,
		forcedFrom: null,
		winner: next.filter((candidate) => candidate?.player === opponent).length === 0 || legalMoves(next, opponent).length === 0 ? player : null,
		captured: move.captured !== void 0
	};
}
function getBestCpuMove(board, player, forcedFrom, difficulty = "medium") {
	const moves = legalMoves(board, player, forcedFrom);
	if (moves.length === 0) return null;
	const captureMoves = moves.filter((m) => m.captured !== void 0);
	const candidates = captureMoves.length > 0 ? captureMoves : moves;
	if (difficulty === "easy") return candidates[Math.floor(Math.random() * candidates.length)];
	let bestMove = candidates[0];
	let maxScore = -9999;
	for (const move of candidates) {
		let score = 0;
		if (move.captured !== void 0) score += 50;
		const piece = board[move.from];
		if (piece) {
			if (!piece.king) {
				const targetRow = rowOf(move.to);
				if (player === "white" && targetRow === 0 || player === "black" && targetRow === 9) score += 40;
			}
			const targetCol = colOf(move.to);
			if (targetCol >= 3 && targetCol <= 6) score += 10;
		}
		if (difficulty === "hard") try {
			const res = applyMove(board, player, forcedFrom, move.from, move.to);
			if (res.winner === player) score += 500;
			else if (res.turn !== player) {
				if (legalMoves(res.board, res.turn, res.forcedFrom).filter((m) => m.captured !== void 0).length > 0) score -= 35;
			}
		} catch {}
		score += Math.random() * 5;
		if (score > maxScore) {
			maxScore = score;
			bestMove = move;
		}
	}
	return bestMove;
}
function playerName(player) {
	return player === "white" ? "Player 1" : "Player 2";
}
function squareToAlgebraic(square) {
	const row = rowOf(square);
	return `${[
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"I",
		"J"
	][colOf(square)]}${10 - row}`;
}
function squareToDraughtsNum(square) {
	const row = rowOf(square);
	const col = colOf(square);
	return row * 5 + Math.floor(col / 2) + 1;
}
function formatMoveNotation(fromOrMove, to, isCapture) {
	let fromSq;
	let toSq;
	let capturedFlag;
	if (typeof fromOrMove === "object" && fromOrMove !== null) {
		fromSq = fromOrMove.from;
		toSq = fromOrMove.to;
		capturedFlag = Boolean(isCapture ?? (fromOrMove.captured !== void 0 || Boolean(fromOrMove.isCapture)));
	} else {
		fromSq = fromOrMove;
		toSq = to ?? 0;
		capturedFlag = Boolean(isCapture);
	}
	const fromNum = squareToDraughtsNum(fromSq);
	const toNum = squareToDraughtsNum(toSq);
	const separator = capturedFlag ? "x" : "-";
	return {
		notation: `${fromNum}${separator}${toNum}`,
		algNotation: `${squareToAlgebraic(fromSq)}${separator}${squareToAlgebraic(toSq)}`,
		sqNotation: `${fromSq}${separator}${toSq}`,
		toString() {
			return this.notation;
		}
	};
}
//#endregion
//#region lib/sound-service.ts
var DEFAULT_SOUND_SETTINGS = {
	master: true,
	move: true,
	capture: true,
	win: true,
	ui: true
};
var SoundService = class {
	constructor() {
		this.ctx = null;
		this.settings = { ...DEFAULT_SOUND_SETTINGS };
		if (typeof window !== "undefined") try {
			const savedJson = localStorage.getItem("damii-sound-settings-v2");
			if (savedJson) {
				const parsed = JSON.parse(savedJson);
				this.settings = {
					...DEFAULT_SOUND_SETTINGS,
					...parsed
				};
			} else {
				const legacySaved = localStorage.getItem("damii-sound-enabled");
				if (legacySaved !== null) this.settings.master = legacySaved === "true";
			}
		} catch {
			this.settings = { ...DEFAULT_SOUND_SETTINGS };
		}
	}
	getSettings() {
		return { ...this.settings };
	}
	setSettings(newSettings) {
		this.settings = {
			...this.settings,
			...newSettings
		};
		if (typeof window !== "undefined") try {
			localStorage.setItem("damii-sound-settings-v2", JSON.stringify(this.settings));
			localStorage.setItem("damii-sound-enabled", this.settings.master ? "true" : "false");
		} catch {}
		return this.getSettings();
	}
	toggleCategory(category) {
		const updated = !this.settings[category];
		const newSettings = this.setSettings({ [category]: updated });
		if (category === "master" && updated) this.playSelect();
		return newSettings;
	}
	isCategoryEnabled(category) {
		if (!this.settings.master) return false;
		return !!this.settings[category];
	}
	isEnabled() {
		return this.settings.master;
	}
	setEnabled(enable) {
		this.setSettings({ master: enable });
	}
	toggle() {
		return this.toggleCategory("master").master;
	}
	initCtx() {
		if (!this.settings.master) return null;
		if (!this.ctx && typeof window !== "undefined") {
			const AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) this.ctx = new AudioCtx();
		}
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
		return this.ctx;
	}
	/**
	* Gentle click/tap when a player selects a piece or button
	*/
	playSelect() {
		if (!this.isCategoryEnabled("ui")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(550, now);
			osc.frequency.exponentialRampToValueAtTime(850, now + .04);
			gain.gain.setValueAtTime(.12, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .04);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + .04);
		} catch {}
	}
	/**
	* Tactile wooden piece placement sound
	*/
	playMove() {
		if (!this.isCategoryEnabled("move")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(240, now);
			osc.frequency.exponentialRampToValueAtTime(90, now + .07);
			gain.gain.setValueAtTime(.22, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .07);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + .07);
			const bufferSize = ctx.sampleRate * .025;
			const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * .3));
			const noise = ctx.createBufferSource();
			noise.buffer = buffer;
			const noiseFilter = ctx.createBiquadFilter();
			noiseFilter.type = "bandpass";
			noiseFilter.frequency.value = 1400;
			const noiseGain = ctx.createGain();
			noiseGain.gain.setValueAtTime(.12, now);
			noiseGain.gain.exponentialRampToValueAtTime(.001, now + .025);
			noise.connect(noiseFilter);
			noiseFilter.connect(noiseGain);
			noiseGain.connect(ctx.destination);
			noise.start(now);
		} catch {}
	}
	/**
	* Crisp marble impact clack on piece capture
	*/
	playCapture() {
		if (!this.isCategoryEnabled("capture")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(1500, now);
			osc.frequency.exponentialRampToValueAtTime(320, now + .08);
			gain.gain.setValueAtTime(.35, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .08);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + .08);
			setTimeout(() => {
				if (!this.ctx || !this.isCategoryEnabled("capture")) return;
				try {
					const t = this.ctx.currentTime;
					const osc2 = this.ctx.createOscillator();
					const gain2 = this.ctx.createGain();
					osc2.type = "triangle";
					osc2.frequency.setValueAtTime(1800, t);
					osc2.frequency.exponentialRampToValueAtTime(450, t + .05);
					gain2.gain.setValueAtTime(.2, t);
					gain2.gain.exponentialRampToValueAtTime(.001, t + .05);
					osc2.connect(gain2);
					gain2.connect(this.ctx.destination);
					osc2.start(t);
					osc2.stop(t + .05);
				} catch {}
			}, 35);
		} catch {}
	}
	/**
	* Rapid ascending double capture tone for compulsory multi-jumps
	*/
	playMultiJump() {
		if (!this.isCategoryEnabled("capture")) return;
		this.playCapture();
		setTimeout(() => {
			const ctx = this.initCtx();
			if (!ctx || !this.isCategoryEnabled("capture")) return;
			try {
				const now = ctx.currentTime;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(950, now);
				osc.frequency.exponentialRampToValueAtTime(1750, now + .09);
				gain.gain.setValueAtTime(.3, now);
				gain.gain.exponentialRampToValueAtTime(.001, now + .09);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + .09);
			} catch {}
		}, 110);
	}
	/**
	* Regal ascending 4-note chime when a piece reaches the back row and becomes a Flying King
	*/
	playKingPromotion() {
		if (!this.isCategoryEnabled("win")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			[
				523.25,
				659.25,
				783.99,
				1046.5
			].forEach((freq, idx) => {
				const now = ctx.currentTime + idx * .07;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now);
				gain.gain.setValueAtTime(.28, now);
				gain.gain.exponentialRampToValueAtTime(.001, now + .3);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + .3);
			});
		} catch {}
	}
	/**
	* Triumphant fanfare sequence when checkmate / match victory is achieved
	*/
	playVictory() {
		if (!this.isCategoryEnabled("win")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			[
				{
					freq: 392,
					delay: 0
				},
				{
					freq: 523.25,
					delay: .12
				},
				{
					freq: 659.25,
					delay: .24
				},
				{
					freq: 783.99,
					delay: .36
				},
				{
					freq: 1046.5,
					delay: .52
				}
			].forEach(({ freq, delay }) => {
				const now = ctx.currentTime + delay;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "triangle";
				osc.frequency.setValueAtTime(freq, now);
				gain.gain.setValueAtTime(.3, now);
				gain.gain.exponentialRampToValueAtTime(.001, now + .55);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + .55);
			});
		} catch {}
	}
	/**
	* Low warning buzz for compulsory capture reminders or turn warnings
	*/
	playWarning() {
		if (!this.isCategoryEnabled("ui")) return;
		const ctx = this.initCtx();
		if (!ctx) return;
		try {
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(220, now);
			osc.frequency.exponentialRampToValueAtTime(140, now + .12);
			gain.gain.setValueAtTime(.12, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .12);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + .12);
		} catch {}
	}
};
var soundService = new SoundService();
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var RotateCcw = createLucideIcon("rotate-ccw", [["path", {
	d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
	key: "1357e3"
}], ["path", {
	d: "M3 3v5h5",
	key: "1xhq8a"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CircleQuestionMark = createLucideIcon("circle-question-mark", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["path", {
		d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
		key: "1u773s"
	}],
	["path", {
		d: "M12 17h.01",
		key: "p32p05"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Globe = createLucideIcon("globe", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["path", {
		d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
		key: "13o1zl"
	}],
	["path", {
		d: "M2 12h20",
		key: "9i4pu4"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Monitor = createLucideIcon("monitor", [
	["rect", {
		width: "20",
		height: "14",
		x: "2",
		y: "3",
		rx: "2",
		key: "48i651"
	}],
	["line", {
		x1: "8",
		x2: "16",
		y1: "21",
		y2: "21",
		key: "1svkeh"
	}],
	["line", {
		x1: "12",
		x2: "12",
		y1: "17",
		y2: "21",
		key: "vw1qmm"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ListOrdered = createLucideIcon("list-ordered", [
	["path", {
		d: "M11 5h10",
		key: "1cz7ny"
	}],
	["path", {
		d: "M11 12h10",
		key: "1438ji"
	}],
	["path", {
		d: "M11 19h10",
		key: "11t30w"
	}],
	["path", {
		d: "M4 4h1v5",
		key: "10yrso"
	}],
	["path", {
		d: "M4 9h2",
		key: "r1h2o0"
	}],
	["path", {
		d: "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02",
		key: "xtkcd5"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Target = createLucideIcon("target", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["circle", {
		cx: "12",
		cy: "12",
		r: "6",
		key: "1vlfrh"
	}],
	["circle", {
		cx: "12",
		cy: "12",
		r: "2",
		key: "1c9p78"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Share2 = createLucideIcon("share-2", [
	["circle", {
		cx: "18",
		cy: "5",
		r: "3",
		key: "gq8acd"
	}],
	["circle", {
		cx: "6",
		cy: "12",
		r: "3",
		key: "w7nqdw"
	}],
	["circle", {
		cx: "18",
		cy: "19",
		r: "3",
		key: "1xt0gg"
	}],
	["line", {
		x1: "8.59",
		x2: "15.42",
		y1: "13.51",
		y2: "17.49",
		key: "47mynk"
	}],
	["line", {
		x1: "15.41",
		x2: "8.59",
		y1: "6.51",
		y2: "10.49",
		key: "1n3mei"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Palette = createLucideIcon("palette", [
	["path", {
		d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
		key: "e79jfc"
	}],
	["circle", {
		cx: "13.5",
		cy: "6.5",
		r: ".5",
		fill: "currentColor",
		key: "1okk4w"
	}],
	["circle", {
		cx: "17.5",
		cy: "10.5",
		r: ".5",
		fill: "currentColor",
		key: "f64h9f"
	}],
	["circle", {
		cx: "6.5",
		cy: "12.5",
		r: ".5",
		fill: "currentColor",
		key: "qy21gx"
	}],
	["circle", {
		cx: "8.5",
		cy: "7.5",
		r: ".5",
		fill: "currentColor",
		key: "fotxhn"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Volume2 = createLucideIcon("volume-2", [
	["path", {
		d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
		key: "uqj9uw"
	}],
	["path", {
		d: "M16 9a5 5 0 0 1 0 6",
		key: "1q6k2b"
	}],
	["path", {
		d: "M19.364 18.364a9 9 0 0 0 0-12.728",
		key: "ijwkga"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var VolumeX = createLucideIcon("volume-x", [
	["path", {
		d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
		key: "uqj9uw"
	}],
	["line", {
		x1: "22",
		x2: "16",
		y1: "9",
		y2: "15",
		key: "1ewh16"
	}],
	["line", {
		x1: "16",
		x2: "22",
		y1: "9",
		y2: "15",
		key: "5ykzw1"
	}]
]);
//#endregion
//#region app/arena/page.tsx
var BOARD_THEME_STYLES = {
	emerald: {
		name: "Emerald Forest",
		description: "Classic velvet green with golden bamboo trim",
		wrapBg: "bg-emerald-950/90",
		wrapBorder: "border-amber-600/50",
		boardBg: "#e9dbb4",
		playableBg: "#184d3c",
		playableAltBg: "#144435",
		restBg: "#eadfbf",
		previewColors: ["#184d3c", "#eadfbf"]
	},
	mahogany: {
		name: "Royal Mahogany",
		description: "Deep mahogany wood grain with warm honey oak rest squares",
		wrapBg: "bg-[#281108]",
		wrapBorder: "border-amber-700/80",
		boardBg: "#d4a373",
		playableBg: "#3b1a0e",
		playableAltBg: "#2d130a",
		restBg: "#e9c46a",
		previewColors: ["#3b1a0e", "#e9c46a"]
	},
	ebony: {
		name: "Obsidian & Ivory",
		description: "High contrast dark slate theme with crisp alabaster squares",
		wrapBg: "bg-slate-950",
		wrapBorder: "border-slate-700",
		boardBg: "#f1f5f9",
		playableBg: "#0f172a",
		playableAltBg: "#020617",
		restBg: "#e2e8f0",
		previewColors: ["#0f172a", "#e2e8f0"]
	},
	terracotta: {
		name: "Terracotta Earth",
		description: "Rich earth-toned clay with warm sunburst yellow",
		wrapBg: "bg-[#421408]",
		wrapBorder: "border-orange-600/80",
		boardBg: "#fef3c7",
		playableBg: "#7c2d12",
		playableAltBg: "#5c200d",
		restBg: "#fde68a",
		previewColors: ["#7c2d12", "#fde68a"]
	},
	sapphire: {
		name: "Royal Sapphire",
		description: "Luxe deep ocean blue grid with silver platinum borders",
		wrapBg: "bg-slate-950",
		wrapBorder: "border-blue-600/80",
		boardBg: "#e0f2fe",
		playableBg: "#1e3a8a",
		playableAltBg: "#1e1b4b",
		restBg: "#bae6fd",
		previewColors: ["#1e3a8a", "#bae6fd"]
	}
};
var MARBLE_THEME_STYLES = {
	classic: {
		name: "Classic Ivory & Ebony",
		description: "Traditional carved ivory and polished dark timber marbles",
		whiteStyle: {
			background: "radial-gradient(circle at 34% 25%, #fffef8 0 18%, #e9ddbe 57%, #bba878 100%)",
			borderColor: "#cfbc8a",
			boxShadow: "inset 0 -5px 8px rgba(97,76,32,.26), 0 3px 5px rgba(0,0,0,.28)"
		},
		blackStyle: {
			background: "radial-gradient(circle at 34% 25%, #55766a 0 12%, #153d31 53%, #051c17 100%)",
			borderColor: "#061c17",
			boxShadow: "inset 0 -5px 8px rgba(0,0,0,.5), 0 3px 5px rgba(0,0,0,.3)"
		}
	},
	gemstone: {
		name: "Ruby & Sapphire Gems",
		description: "Radiant glowing red ruby and deep ocean sapphire gemstones",
		whiteStyle: {
			background: "radial-gradient(circle at 34% 25%, #fecdd3 0%, #e11d48 60%, #881337 100%)",
			borderColor: "#fda4af",
			boxShadow: "0 0 12px rgba(225,29,72,0.6), inset 0 -4px 6px rgba(0,0,0,0.4)"
		},
		blackStyle: {
			background: "radial-gradient(circle at 34% 25%, #bae6fd 0%, #0284c7 60%, #0c4a6e 100%)",
			borderColor: "#7dd3fc",
			boxShadow: "0 0 12px rgba(2,132,199,0.6), inset 0 -4px 6px rgba(0,0,0,0.4)"
		}
	},
	metallic: {
		name: "Gold & Chrome Medals",
		description: "Handcrafted metallic gold coin pieces and mirror chrome marbles",
		whiteStyle: {
			background: "radial-gradient(circle at 34% 25%, #fffbeb 0%, #f59e0b 60%, #78350f 100%)",
			borderColor: "#fbbf24",
			boxShadow: "0 0 10px rgba(245,158,11,0.5), inset 0 -4px 6px rgba(120,53,15,0.6)"
		},
		blackStyle: {
			background: "radial-gradient(circle at 34% 25%, #f8fafc 0%, #64748b 60%, #0f172a 100%)",
			borderColor: "#94a3b8",
			boxShadow: "0 0 10px rgba(100,116,139,0.5), inset 0 -4px 6px rgba(15,23,42,0.8)"
		}
	},
	neon: {
		name: "Cyber Cyan & Magenta",
		description: "Futuristic neon arcade marbles with vivid luminescent halos",
		whiteStyle: {
			background: "radial-gradient(circle at 34% 25%, #ecfeff 0%, #06b6d4 60%, #164e63 100%)",
			borderColor: "#22d3ee",
			boxShadow: "0 0 14px rgba(34,211,238,0.8), inset 0 -4px 6px rgba(0,0,0,0.5)"
		},
		blackStyle: {
			background: "radial-gradient(circle at 34% 25%, #fdf2f8 0%, #d946ef 60%, #701a75 100%)",
			borderColor: "#f0abfc",
			boxShadow: "0 0 14px rgba(240,171,252,0.8), inset 0 -4px 6px rgba(0,0,0,0.5)"
		}
	}
};
function ArenaPage() {
	const [mode, setMode] = useState("local");
	const [subMode, setSubMode] = useState("pass_play");
	const [roomMode, setRoomMode] = useState("casual");
	const [wagerInput, setWagerInput] = useState(20);
	const [localWhiteName, setLocalWhiteName] = useState("Kwame (Player 1)");
	const [localBlackName, setLocalBlackName] = useState("Ama (Player 2)");
	const [cpuDifficulty, setCpuDifficulty] = useState("medium");
	const [turnTimerLimit, setTurnTimerLimit] = useState(60);
	const [isCpuThinking, setIsCpuThinking] = useState(false);
	const [board, setBoard] = useState(() => createBoard());
	const [turn, setTurn] = useState("white");
	const [selected, setSelected] = useState(null);
	const [forcedFrom, setForcedFrom] = useState(null);
	const [winner, setWinner] = useState(null);
	const [message, setMessage] = useState("Setup your match to start playing!");
	const [rotated, setRotated] = useState(false);
	const [captures, setCaptures] = useState({
		white: 0,
		black: 0
	});
	const [localMoves, setLocalMoves] = useState([]);
	const [token, setToken] = useState("");
	const [username, setUsername] = useState("");
	const [profile, setProfile] = useState(null);
	const [room, setRoom] = useState(null);
	const [joinCode, setJoinCode] = useState("");
	const [onlineBusy, setOnlineBusy] = useState(false);
	const [onlineError, setOnlineError] = useState("");
	const [secondsLeft, setSecondsLeft] = useState(60);
	const [showPregameModal, setShowPregameModal] = useState(true);
	const [showGuide, setShowGuide] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [showThemeModal, setShowThemeModal] = useState(false);
	const [soundSettings, setSoundSettings] = useState(() => soundService.getSettings());
	const [soundEnabled, setSoundEnabled] = useState(() => soundService.isEnabled());
	const [lastCaptureSquare, setLastCaptureSquare] = useState(null);
	const [promotedKingEffect, setPromotedKingEffect] = useState(null);
	const [animatedMove, setAnimatedMove] = useState(null);
	function toggleSoundCat(category) {
		const updated = soundService.toggleCategory(category);
		setSoundSettings(updated);
		setSoundEnabled(updated.master);
	}
	const [boardTheme, setBoardTheme] = useState("emerald");
	const [marbleTheme, setMarbleTheme] = useState("classic");
	const [animatePieces, setAnimatePieces] = useState(true);
	const [boardZoom, setBoardZoom] = useState(1);
	function handleZoomChange(nextZoom) {
		setBoardZoom(nextZoom);
		localStorage.setItem("damii-board-zoom", String(nextZoom));
	}
	const [copiedCode, setCopiedCode] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedHistory, setCopiedHistory] = useState(false);
	const [copiedShareResult, setCopiedShareResult] = useState(false);
	const [notationStyle, setNotationStyle] = useState("alg");
	const activeBoardConfig = BOARD_THEME_STYLES[boardTheme] || BOARD_THEME_STYLES.emerald;
	const activeMarbleConfig = MARBLE_THEME_STYLES[marbleTheme] || MARBLE_THEME_STYLES.classic;
	function saveCustomTheme(bKey, mKey) {
		setBoardTheme(bKey);
		setMarbleTheme(mKey);
		localStorage.setItem("damii-board-theme", bKey);
		localStorage.setItem("damii-marble-theme", mKey);
	}
	function togglePieceAnimation(enabled) {
		setAnimatePieces(enabled);
		localStorage.setItem("damii-animate-pieces", enabled ? "true" : "false");
	}
	const historyScrollRef = useRef(null);
	const [focusMode, setFocusMode] = useState(false);
	const activeMoves = useMemo(() => mode === "online" ? room?.moves ?? [] : localMoves, [
		mode,
		room?.moves,
		localMoves
	]);
	const lastMove = useMemo(() => {
		if (mode === "online") {
			if (room?.moves && room.moves.length > 0) {
				const last = room.moves[room.moves.length - 1];
				if (last.from !== void 0 && last.to !== void 0) return {
					from: last.from,
					to: last.to,
					player: last.player,
					playerName: last.playerName,
					isCapture: last.isCapture,
					notation: last.notation,
					sqNotation: last.sqNotation
				};
			}
			return null;
		}
		if (localMoves.length > 0) {
			const last = localMoves[localMoves.length - 1];
			return {
				from: last.from,
				to: last.to,
				player: last.player,
				playerName: last.playerName,
				isCapture: last.isCapture,
				notation: last.notation,
				sqNotation: last.sqNotation
			};
		}
		return null;
	}, [
		mode,
		room?.moves,
		localMoves
	]);
	const isMatchActive = useMemo(() => {
		if (winner) return false;
		if (mode === "online") return room?.status === "active" || room?.moves && room.moves.length > 0;
		return localMoves.length > 0;
	}, [
		winner,
		mode,
		room?.status,
		room?.moves,
		localMoves.length
	]);
	const toggleFocusMode = () => {
		const next = !focusMode;
		setFocusMode(next);
		if (typeof window !== "undefined") {
			sessionStorage.setItem("damii-focus-mode", next ? "true" : "false");
			window.dispatchEvent(new CustomEvent("damii-focus-mode-change", { detail: next }));
		}
	};
	useEffect(() => {
		if (typeof window !== "undefined") {
			sessionStorage.setItem("damii-active-match", isMatchActive ? "true" : "false");
			window.dispatchEvent(new CustomEvent("damii-match-active-change", { detail: isMatchActive }));
		}
	}, [isMatchActive]);
	useEffect(() => {
		if (!isMatchActive) return;
		const handleBeforeUnload = (e) => {
			e.preventDefault();
			e.returnValue = "Active 1-on-1 match in progress! Leaving will exit your match.";
			return e.returnValue;
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isMatchActive]);
	useEffect(() => {
		const syncArenaAuth = () => {
			const savedToken = localStorage.getItem("damii-player-token");
			setToken(savedToken || "");
			const savedName = localStorage.getItem("damii-player-name") ?? "";
			if (savedName) {
				setUsername(savedName);
				setLocalWhiteName(savedName);
			} else setUsername("");
			if (savedToken) fetch(`/api/wallet?token=${encodeURIComponent(savedToken)}`).then((r) => r.json()).then((d) => {
				if (d.balance) {
					setProfile(d.balance);
					if (!savedName && d.balance.username) {
						setUsername(d.balance.username);
						setLocalWhiteName(d.balance.username);
					}
				} else setProfile(null);
			}).catch(() => setProfile(null));
			else setProfile(null);
		};
		syncArenaAuth();
		window.addEventListener("damii-auth-changed", syncArenaAuth);
		const savedBoardTheme = localStorage.getItem("damii-board-theme");
		if (savedBoardTheme && BOARD_THEME_STYLES[savedBoardTheme]) setBoardTheme(savedBoardTheme);
		const savedMarbleTheme = localStorage.getItem("damii-marble-theme");
		if (savedMarbleTheme && MARBLE_THEME_STYLES[savedMarbleTheme]) setMarbleTheme(savedMarbleTheme);
		const savedAnimatePieces = localStorage.getItem("damii-animate-pieces");
		if (savedAnimatePieces !== null) setAnimatePieces(savedAnimatePieces === "true");
		const savedZoom = localStorage.getItem("damii-board-zoom");
		if (savedZoom) {
			const parsed = parseFloat(savedZoom);
			if ([
				1,
				1.25,
				1.5,
				1.75
			].includes(parsed)) setBoardZoom(parsed);
		}
		if (typeof window !== "undefined") {
			const joinParam = new URLSearchParams(window.location.search).get("join");
			if (joinParam) {
				setJoinCode(joinParam.toUpperCase());
				setMode("online");
				setShowPregameModal(true);
			}
		}
		return () => {
			window.removeEventListener("damii-auth-changed", syncArenaAuth);
		};
	}, []);
	useEffect(() => {
		if (mode !== "online" || !room || !token) return;
		const update = async () => {
			try {
				const response = await fetch(`/api/damii?code=${encodeURIComponent(room.code)}&token=${encodeURIComponent(token)}`);
				if (!response.ok) return;
				loadRoom((await response.json()).room);
			} catch {}
		};
		const timer = window.setInterval(update, 1500);
		return () => window.clearInterval(timer);
	}, [
		mode,
		room?.code,
		token
	]);
	const whiteDisplayName = useMemo(() => {
		if (mode === "online" && room) return room.hostName;
		return localWhiteName.trim() || "Player 1";
	}, [
		mode,
		room,
		localWhiteName
	]);
	const blackDisplayName = useMemo(() => {
		if (mode === "online" && room) return room.guestName ?? "Waiting for Opponent…";
		if (subMode === "vs_cpu") return `DAMII Bot (${cpuDifficulty})`;
		return localBlackName.trim() || "Player 2";
	}, [
		mode,
		room,
		subMode,
		cpuDifficulty,
		localBlackName
	]);
	const currentTurnPlayerName = turn === "white" ? whiteDisplayName : blackDisplayName;
	const isSpectator = useMemo(() => mode === "online" && room !== null && room.role === "spectator", [mode, room]);
	useEffect(() => {
		setSecondsLeft(turnTimerLimit > 0 ? turnTimerLimit : 60);
	}, [
		turn,
		room?.moveCount,
		mode,
		turnTimerLimit
	]);
	useEffect(() => {
		if (!(mode === "local" || room?.status === "playing") || winner || turnTimerLimit === 0) return;
		const timer = window.setInterval(() => setSecondsLeft((current) => current > 0 ? current - 1 : 0), 1e3);
		return () => window.clearInterval(timer);
	}, [
		mode,
		room?.status,
		winner,
		turn,
		turnTimerLimit
	]);
	useEffect(() => {
		if (mode !== "local" || subMode !== "vs_cpu" || winner || !token) {
			setIsCpuThinking(false);
			return;
		}
		if (turn === "black") {
			setIsCpuThinking(true);
			const timer = setTimeout(() => {
				const cpuMove = getBestCpuMove(board, turn, forcedFrom, cpuDifficulty);
				if (cpuMove) playLocal(cpuMove);
				else {
					setMessage(`🏆 Game Over! ${whiteDisplayName} wins as ${blackDisplayName} has no legal moves.`);
					setWinner("white");
				}
				setIsCpuThinking(false);
			}, 500);
			return () => clearTimeout(timer);
		} else setIsCpuThinking(false);
	}, [
		mode,
		subMode,
		turn,
		winner,
		board,
		forcedFrom,
		cpuDifficulty,
		whiteDisplayName,
		blackDisplayName
	]);
	useEffect(() => {
		if (historyScrollRef.current) historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
	}, [activeMoves.length]);
	const moves = useMemo(() => winner ? [] : legalMoves(board, turn, forcedFrom), [
		board,
		turn,
		forcedFrom,
		winner
	]);
	const selectable = useMemo(() => {
		const allowed = new Set(moves.map((move) => move.from));
		if (mode === "online" && room?.role !== turn) return /* @__PURE__ */ new Set();
		if (mode === "local" && subMode === "vs_cpu" && turn === "black") return /* @__PURE__ */ new Set();
		return allowed;
	}, [
		moves,
		mode,
		room?.role,
		turn,
		subMode
	]);
	const destinations = useMemo(() => new Map(moves.filter((move) => move.from === selected).map((move) => [move.to, move])), [moves, selected]);
	function loadRoom(next) {
		const prevMoveCount = room?.moveCount ?? 0;
		if (next.moveCount > prevMoveCount && room) if (next.winner && !room.winner) soundService.playVictory();
		else if (next.forcedFrom !== null) soundService.playMultiJump();
		else {
			const lastMove = next.moves && next.moves.length > 0 ? next.moves[next.moves.length - 1] : null;
			if (lastMove && lastMove.from !== void 0 && lastMove.to !== void 0 && animatePieces) {
				setAnimatedMove({
					from: lastMove.from,
					to: lastMove.to,
					id: Date.now()
				});
				setTimeout(() => setAnimatedMove(null), 360);
			}
			if (lastMove?.isCapture) {
				soundService.playCapture();
				if (lastMove.to !== void 0) {
					setLastCaptureSquare(lastMove.to);
					setTimeout(() => setLastCaptureSquare(null), 800);
				}
			} else soundService.playMove();
		}
		else if (next.winner && (!room || !room.winner)) soundService.playVictory();
		setRoom(next);
		setBoard(next.board);
		setTurn(next.turn);
		setForcedFrom(next.forcedFrom);
		setWinner(next.winner);
		setSelected(null);
		if (next.status === "waiting") setMessage(`Room ${next.code} created! Waiting for an opponent to join...`);
		else if (next.winner) setMessage(`🏆 Game Over! ${next.winner === "white" ? next.hostName : next.guestName ?? "Guest"} (${playerName(next.winner)}) wins!`);
		else if (next.role === next.turn) setMessage(`🎯 Your turn to move as ${next.role === "white" ? next.hostName : next.guestName}!`);
		else setMessage(`⏳ Waiting for ${next.turn === "white" ? next.hostName : next.guestName} to move...`);
	}
	function resetLocalMatch() {
		setBoard(createBoard());
		setTurn("white");
		setSelected(null);
		setForcedFrom(null);
		setWinner(null);
		setCaptures({
			white: 0,
			black: 0
		});
		setLocalMoves([]);
		setIsCpuThinking(false);
		setLastCaptureSquare(null);
		setPromotedKingEffect(null);
		setMessage(`🎯 Match started! ${localWhiteName.trim() || "Player 1"}'s turn to move (Player 1).`);
	}
	async function handleSaveLoginProfile(nameToSave) {
		if (!nameToSave.trim()) return;
		localStorage.setItem("damii-player-name", nameToSave.trim());
		setUsername(nameToSave.trim());
		setLocalWhiteName(nameToSave.trim());
		try {
			const data = await (await fetch("/api/auth", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "login",
					username: nameToSave.trim(),
					passcode: "123456"
				})
			})).json();
			if (data.profile) setProfile(data.profile);
		} catch {}
	}
	async function onlineAction(action, extra = {}) {
		if (!token) {
			window.dispatchEvent(new CustomEvent("damii-open-auth"));
			setOnlineError("Authentication Required: Please sign in or register an account to create or join 1-on-1 matches.");
			return null;
		}
		if (profile?.role === "admin" || profile?.role === "super_admin") {
			setOnlineError("Administrator accounts serve as league facilitators and regulators. Admin accounts cannot participate as players or host matches.");
			return null;
		}
		setOnlineBusy(true);
		setOnlineError("");
		try {
			localStorage.setItem("damii-player-name", username.trim());
			const response = await fetch("/api/damii", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action,
					token,
					username: username.trim(),
					...extra
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Unable to complete action");
			if (data.profile) setProfile(data.profile);
			if (data.room) {
				loadRoom(data.room);
				if (action === "create" || action === "join") {
					setShowPregameModal(false);
					setShowSettings(false);
				}
			}
			return data;
		} catch (error) {
			setOnlineError(error instanceof Error ? error.message : "Connection error");
			return null;
		} finally {
			setOnlineBusy(false);
		}
	}
	async function playOnline(move) {
		if (!room) return;
		await onlineAction("move", {
			code: room.code,
			from: move.from,
			to: move.to
		});
	}
	async function forfeitOnline() {
		if (!room) return;
		await onlineAction("forfeit", { code: room.code });
	}
	async function requestRematch() {
		if (mode === "local") {
			resetLocalMatch();
			return;
		}
		if (!room) return;
		await onlineAction("rematch", { code: room.code });
	}
	function playLocal(move) {
		const activeName = turn === "white" ? whiteDisplayName : blackDisplayName;
		const pieceBefore = board[move.from];
		const result = applyMove(board, turn, forcedFrom, move.from, move.to);
		if (result.captured) setCaptures((current) => ({
			...current,
			[turn]: current[turn] + 1
		}));
		const formatted = formatMoveNotation(move.from, move.to, result.captured);
		const entry = {
			moveNumber: localMoves.length + 1,
			player: turn,
			playerName: activeName,
			from: move.from,
			to: move.to,
			notation: formatted.notation,
			algNotation: formatted.algNotation,
			sqNotation: formatted.sqNotation,
			isCapture: result.captured,
			timestamp: Date.now()
		};
		setLocalMoves((prev) => [...prev, entry]);
		setBoard(result.board);
		setTurn(result.turn);
		setForcedFrom(result.forcedFrom);
		setWinner(result.winner);
		if (animatePieces) {
			setAnimatedMove({
				from: move.from,
				to: move.to,
				id: Date.now()
			});
			setTimeout(() => setAnimatedMove(null), 450);
		}
		if (result.forcedFrom !== null) soundService.playMultiJump();
		else if (result.captured) soundService.playCapture();
		else soundService.playMove();
		if (result.captured && move.captured !== void 0) {
			setLastCaptureSquare(move.captured);
			setTimeout(() => setLastCaptureSquare(null), 850);
		}
		const pieceAfter = result.board[move.to];
		if (pieceBefore && !pieceBefore.king && pieceAfter && pieceAfter.king) {
			soundService.playKingPromotion();
			setPromotedKingEffect({
				square: move.to,
				player: pieceBefore.player
			});
			setTimeout(() => setPromotedKingEffect(null), 2800);
		}
		if (result.winner) soundService.playVictory();
		if (result.forcedFrom !== null) {
			setSelected(result.forcedFrom);
			setMessage(`💥 ${activeName} captured piece (${formatted.notation})! Compulsory multi-jump active. Jump again.`);
		} else {
			setSelected(null);
			const nextPlayerName = result.turn === "white" ? whiteDisplayName : blackDisplayName;
			if (result.winner) setMessage(`🏆 Victory! ${result.winner === "white" ? whiteDisplayName : blackDisplayName} (${playerName(result.winner)}) wins the match!`);
			else setMessage(`♟ ${activeName} moved ${formatted.notation} (${formatted.sqNotation}). ${nextPlayerName}'s turn.`);
		}
	}
	function handleSquare(square) {
		if (winner) return;
		if (mode === "local" && subMode === "vs_cpu" && !token) {
			window.dispatchEvent(new CustomEvent("damii-open-auth"));
			setMessage("🔒 Sign in or create an account to challenge the Bot AI.");
			setShowPregameModal(true);
			return;
		}
		if (mode === "online") {
			if (!room) {
				setMessage("Join or create an online room to play online.");
				setShowPregameModal(true);
				return;
			}
			if (isSpectator) {
				setMessage("👁 You are in Spectator Mode. Watching live match moves.");
				return;
			}
			if (room.status === "waiting") {
				setMessage(`⏳ Waiting for an opponent to join room code ${room.code}...`);
				return;
			}
			if (room.status !== "playing") {
				setMessage("Online match is not currently active.");
				return;
			}
			if (room.role !== turn) {
				setMessage(`It is ${currentTurnPlayerName}'s turn to move.`);
				return;
			}
		}
		if (mode === "local" && subMode === "vs_cpu" && turn === "black") return;
		const destination = destinations.get(square);
		if (destination) {
			mode === "online" ? playOnline(destination) : playLocal(destination);
			return;
		}
		const clickedPiece = board[square];
		if (selectable.has(square)) {
			soundService.playSelect();
			setSelected(square);
			setMessage(moves.some((move) => move.from === square && move.captured !== void 0) ? `💥 Compulsory capture! Click a green highlighted square for ${currentTurnPlayerName}.` : `✨ Piece selected for ${currentTurnPlayerName}. Click a green destination square.`);
			return;
		}
		if (clickedPiece) {
			if (clickedPiece.player !== turn) {
				soundService.playWarning();
				setMessage(`It is ${currentTurnPlayerName}'s turn to move (${playerName(turn)}).`);
			} else if (mustCapture) {
				soundService.playWarning();
				setMessage("⚠️ Compulsory capture rule! Select a piece highlighted with a glowing red border.");
			} else {
				soundService.playWarning();
				setMessage("This piece has no valid legal moves.");
			}
			return;
		}
		if (forcedFrom === null) {
			setSelected(null);
			setMessage(`Click one of ${currentTurnPlayerName}'s highlighted pieces to move.`);
		}
	}
	function switchMode(next) {
		setMode(next);
		setSelected(null);
		setOnlineError("");
		if (next === "local") resetLocalMatch();
		else if (room) loadRoom(room);
		else setShowPregameModal(true);
	}
	const copyRoomCode = () => {
		if (!room) return;
		navigator.clipboard.writeText(room.code);
		setCopiedCode(true);
		setTimeout(() => setCopiedCode(false), 2e3);
	};
	const copyChallengeLink = () => {
		if (!room) return;
		const url = `${window.location.origin}/arena?join=${room.code}`;
		navigator.clipboard.writeText(url);
		setCopiedLink(true);
		setTimeout(() => setCopiedLink(false), 2e3);
	};
	const copyMoveLog = () => {
		if (activeMoves.length === 0) return;
		const logText = activeMoves.map((m) => `Move ${m.moveNumber}: ${m.playerName} [${m.player.toUpperCase()}] Played ${m.notation}`).join("\n");
		navigator.clipboard.writeText(`DAMII Draughts Match Log (${activeMoves.length} Moves):\n${logText}`);
		setCopiedHistory(true);
		setTimeout(() => setCopiedHistory(false), 2e3);
	};
	const copyShareResult = async () => {
		if (!winner) return;
		const winnerName = winner === "white" ? whiteDisplayName : blackDisplayName;
		const loserName = winner === "white" ? blackDisplayName : whiteDisplayName;
		const modeText = mode === "online" ? room?.leagueId || room?.mode === "league" ? "Official League Tournament" : room?.mode === "wager" ? `Wager Match (GH₵ ${(room.wagerAmount * 2).toFixed(2)})` : "Online Arena Room" : subMode === "vs_cpu" ? `VS DAMII Bot (${cpuDifficulty})` : "Local 2-Player";
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		const summaryText = [
			`🏆 DAMII Draughts Match Result`,
			`----------------------------------------`,
			`👑 Winner: ${winnerName} (${winner === "white" ? "Player 1 ♔" : "Player 2 ♚"})`,
			`⚔️ Opponent: ${loserName}`,
			`🎮 Mode: ${modeText}`,
			`📊 Match Performance:`,
			`   • Player 1 Captures: ${captures.white}`,
			`   • Player 2 Captures: ${captures.black}`,
			`   • Total Moves: ${activeMoves.length}`,
			`----------------------------------------`,
			origin ? `Play Ghanaian 10x10 DAMII Draughts: ${origin}` : `Play Ghanaian 10x10 DAMII Draughts!`
		].join("\n");
		try {
			if (typeof navigator !== "undefined" && navigator.share) await navigator.share({
				title: "DAMII Draughts Match Result",
				text: summaryText,
				url: origin || void 0
			});
			else await navigator.clipboard.writeText(summaryText);
			setCopiedShareResult(true);
			setTimeout(() => setCopiedShareResult(false), 2500);
		} catch {
			try {
				await navigator.clipboard.writeText(summaryText);
				setCopiedShareResult(true);
				setTimeout(() => setCopiedShareResult(false), 2500);
			} catch {}
		}
	};
	const orderedSquares = Array.from({ length: 100 }, (_, square) => square);
	if (rotated) orderedSquares.reverse();
	const mustCapture = moves.some((move) => move.captured !== void 0);
	const pairedMoves = useMemo(() => {
		const pairs = [];
		activeMoves.forEach((m) => {
			if (m.player === "white") pairs.push({
				turnNum: pairs.length + 1,
				white: m
			});
			else if (pairs.length > 0 && !pairs[pairs.length - 1].black) pairs[pairs.length - 1].black = m;
			else pairs.push({
				turnNum: pairs.length + 1,
				black: m
			});
		});
		return pairs;
	}, [activeMoves]);
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell flex flex-col min-h-screen",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsx("div", {
				className: "w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 border border-[#184d3c] bg-[#06261f] text-[#f5efdf] rounded-2xl shadow-xl mt-2 sm:mt-3 mb-2",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full shrink",
						children: [mode === "local" ? /* @__PURE__ */ jsx("span", {
							className: "px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#f5efdf] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0",
							children: subMode === "vs_cpu" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Bot, {
								size: 13,
								className: "text-[#d6a735]"
							}), /* @__PURE__ */ jsxs("span", {
								className: "truncate",
								children: [
									"AI (",
									cpuDifficulty,
									")"
								]
							})] }) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Monitor, {
								size: 13,
								className: "text-[#d6a735]"
							}), /* @__PURE__ */ jsx("span", {
								className: "truncate",
								children: "Local 2P"
							})] })
						}) : room ? /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-1.5 shrink-0",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#f5efdf] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1",
								children: [
									/* @__PURE__ */ jsx(Globe, {
										size: 13,
										className: "text-[#d6a735] shrink-0"
									}),
									/* @__PURE__ */ jsx("span", { children: "Room:" }),
									/* @__PURE__ */ jsx("strong", {
										className: "tracking-wider text-[#d6a735] font-mono",
										children: room.code
									}),
									/* @__PURE__ */ jsx("button", {
										onClick: copyRoomCode,
										title: "Copy Room Code",
										className: "hover:text-white transition-colors ml-0.5",
										children: copiedCode ? /* @__PURE__ */ jsx(Check, {
											size: 13,
											className: "text-emerald-400"
										}) : /* @__PURE__ */ jsx(Copy, { size: 13 })
									})
								]
							}), room.mode === "wager" && /* @__PURE__ */ jsxs("span", {
								className: "px-2 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1",
								children: [
									/* @__PURE__ */ jsx(Zap, {
										size: 12,
										className: "text-amber-400"
									}),
									" GH₵ ",
									(room.wagerAmount * 2).toFixed(2),
									" Pot"
								]
							})]
						}) : /* @__PURE__ */ jsxs("span", {
							className: "px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0",
							children: [/* @__PURE__ */ jsx(Globe, {
								size: 13,
								className: "text-[#d6a735]"
							}), /* @__PURE__ */ jsx("span", { children: "Online Arena" })]
						}), username && /* @__PURE__ */ jsxs("span", {
							className: "px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0",
							children: [
								/* @__PURE__ */ jsx(User, {
									size: 12,
									className: "text-[#d6a735]"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "truncate max-w-[80px] xs:max-w-[110px] sm:max-w-none",
									children: username
								}),
								profile && /* @__PURE__ */ jsxs("span", {
									className: "text-[10px] text-[#cbd5e1] border-l border-[#184d3c] pl-1.5 hidden sm:inline",
									children: [profile.rating, " ELO"]
								})
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 sm:gap-2 shrink-0 justify-between sm:justify-end",
						children: [
							/* @__PURE__ */ jsxs("button", {
								onClick: () => setShowPregameModal(true),
								className: "flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-md shadow-[#d6a735]/10",
								children: [/* @__PURE__ */ jsx(Swords, { size: 13 }), /* @__PURE__ */ jsx("span", { children: "Match Setup" })]
							}),
							/* @__PURE__ */ jsxs("button", {
								onClick: () => setShowHistory((prev) => !prev),
								className: `flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${showHistory ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] font-bold" : "bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border-[#184d3c]"}`,
								children: [
									/* @__PURE__ */ jsx(ListOrdered, { size: 13 }),
									/* @__PURE__ */ jsx("span", { children: "Move Log" }),
									activeMoves.length > 0 && /* @__PURE__ */ jsx("span", {
										className: `px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${showHistory ? "bg-[#06261f] text-[#d6a735]" : "bg-[#d6a735]/20 text-[#d6a735]"}`,
										children: activeMoves.length
									})
								]
							}),
							/* @__PURE__ */ jsxs("button", {
								onClick: () => setShowSettings((prev) => !prev),
								className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${showSettings ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] font-bold" : "bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border-[#184d3c]"}`,
								children: [/* @__PURE__ */ jsx(Settings, { size: 13 }), /* @__PURE__ */ jsx("span", {
									className: "hidden sm:inline",
									children: "Config"
								})]
							}),
							/* @__PURE__ */ jsxs("button", {
								onClick: () => toggleSoundCat("master"),
								title: soundSettings.master ? "Master Audio Enabled" : "Master Audio Muted",
								className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${soundSettings.master ? "bg-[#0c3b2e] text-[#d6a735] border-[#184d3c] hover:bg-[#144435]" : "bg-[#06261f] text-slate-500 border-[#184d3c]"}`,
								children: [soundSettings.master ? /* @__PURE__ */ jsx(Volume2, {
									size: 13,
									className: "text-[#d6a735]"
								}) : /* @__PURE__ */ jsx(VolumeX, {
									size: 13,
									className: "text-slate-500"
								}), /* @__PURE__ */ jsx("span", {
									className: "hidden sm:inline",
									children: soundSettings.master ? "Audio On" : "Muted"
								})]
							}),
							/* @__PURE__ */ jsxs("button", {
								onClick: toggleFocusMode,
								title: focusMode ? "Exit Arena Focus Mode" : "Enter Focus Mode (Prevents Accidental Misclicks)",
								className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${focusMode ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-md shadow-[#d6a735]/20" : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#184d3c]"}`,
								children: [/* @__PURE__ */ jsx(Eye, { size: 13 }), /* @__PURE__ */ jsx("span", {
									className: "hidden xs:inline sm:inline",
									children: focusMode ? "Focus ON" : "Focus"
								})]
							})
						]
					})]
				})
			}),
			isMatchActive && /* @__PURE__ */ jsxs("div", {
				className: "w-full max-w-6xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#06261f] via-[#0c3b2e] to-[#06261f] border border-[#d6a735]/40 rounded-xl text-[#f5efdf] text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg mb-1 sm:mb-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 text-[11px] sm:text-xs truncate",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "relative flex h-2 w-2 shrink-0",
							children: [/* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" })]
						}),
						/* @__PURE__ */ jsx("span", {
							className: "font-extrabold text-[#d6a735] uppercase tracking-wider",
							children: "1v1 Match In Progress"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "hidden sm:inline text-[#cbd5e1]",
							children: "| Accidental navigation & misclicks protected"
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [room?.mode === "wager" ? /* @__PURE__ */ jsxs("span", {
						className: "text-[10px] sm:text-[11px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold rounded-md flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(ShieldCheck, {
							size: 12,
							className: "text-emerald-400"
						}), /* @__PURE__ */ jsx("span", { children: "Escrow SLA: Disputes resolved < 2 hrs" })]
					}) : /* @__PURE__ */ jsxs("span", {
						className: "text-[10px] sm:text-[11px] px-2 py-0.5 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-bold rounded-md flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(ShieldCheck, {
							size: 12,
							className: "text-[#d6a735]"
						}), /* @__PURE__ */ jsx("span", { children: "Fair Play Protected" })]
					}), /* @__PURE__ */ jsxs("button", {
						onClick: toggleFocusMode,
						className: `px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold shrink-0 flex items-center gap-1 transition-all border ${focusMode ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]" : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#184d3c]"}`,
						children: [/* @__PURE__ */ jsx(Eye, { size: 12 }), /* @__PURE__ */ jsx("span", { children: focusMode ? "Focus Mode Active" : "Focus Mode" })]
					})]
				})]
			}),
			/* @__PURE__ */ jsx("section", {
				className: "flex-1 max-w-6xl w-full mx-auto p-1.5 sm:p-4 flex flex-col items-center justify-center",
				children: /* @__PURE__ */ jsxs("div", {
					className: `w-full grid gap-3 sm:gap-6 transition-all duration-300 ${showHistory ? "lg:grid-cols-[1fr_340px] items-start" : "max-w-[580px] mx-auto"}`,
					children: [/* @__PURE__ */ jsxs("div", {
						className: "w-full max-w-[580px] mx-auto space-y-2.5 sm:space-y-4",
						children: [/* @__PURE__ */ jsx("div", {
							className: "w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-2.5 sm:p-3.5 shadow-xl",
							children: /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 min-h-[52px] sm:min-h-[60px]",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: `relative flex items-center gap-1 sm:gap-2.5 p-1 sm:p-2.5 rounded-xl transition-all border min-h-[44px] sm:min-h-[52px] ${turn === "white" && !winner ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40 shadow-lg shadow-[#d6a735]/10" : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"}`,
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-200 shadow-md flex items-center justify-center text-slate-950 font-black text-[10px] sm:text-sm shrink-0",
												children: "♔"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-0.5 sm:gap-1 h-3.5 sm:h-4",
													children: [/* @__PURE__ */ jsx("small", {
														className: "block text-[7px] sm:text-[10px] font-bold tracking-wider text-[#d6a735] uppercase shrink-0",
														children: "PLAYER 1"
													}), /* @__PURE__ */ jsx("span", {
														className: `px-1 py-0.2 bg-[#d6a735] text-[#06261f] text-[7px] sm:text-[9px] font-extrabold rounded-full uppercase tracking-tighter transition-opacity shrink-0 ${turn === "white" && !winner ? "opacity-100 animate-pulse" : "opacity-0 pointer-events-none"}`,
														children: "TURN"
													})]
												}), /* @__PURE__ */ jsx("strong", {
													className: "block text-[11px] sm:text-sm font-extrabold text-[#f5efdf] truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none",
													children: whiteDisplayName
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "text-right shrink-0",
												children: [/* @__PURE__ */ jsx("small", {
													className: "block text-[7px] sm:text-[9px] text-[#cbd5e1] font-bold uppercase",
													children: "Takes"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[11px] sm:text-sm font-black text-[#d6a735]",
													children: captures.white
												})]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-col items-center justify-center gap-0.5 shrink-0 px-0.5 min-w-[36px] sm:min-w-[48px]",
										children: [/* @__PURE__ */ jsx("span", {
											className: "px-1 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-black text-[#f5efdf] uppercase tracking-widest bg-[#0c3b2e] rounded-md border border-[#184d3c]",
											children: "VS"
										}), turnTimerLimit > 0 ? /* @__PURE__ */ jsxs("span", {
											className: `text-[8px] sm:text-[10px] font-mono font-bold px-0.5 py-0.5 rounded ${secondsLeft <= 15 ? "text-red-400 animate-pulse font-extrabold" : "text-[#cbd5e1]"}`,
											children: [secondsLeft, "s"]
										}) : /* @__PURE__ */ jsx("span", {
											className: "text-[8px] sm:text-[10px] text-slate-500 font-mono",
											children: "∞"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: `relative flex items-center justify-end gap-1 sm:gap-2.5 p-1 sm:p-2.5 rounded-xl transition-all border min-h-[44px] sm:min-h-[52px] ${turn === "black" && !winner ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40 shadow-lg shadow-[#d6a735]/10" : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"}`,
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "text-left shrink-0",
												children: [/* @__PURE__ */ jsx("small", {
													className: "block text-[7px] sm:text-[9px] text-[#cbd5e1] font-bold uppercase",
													children: "Takes"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[11px] sm:text-sm font-black text-[#d6a735]",
													children: captures.black
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "min-w-0 flex-1 text-right",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-end gap-0.5 sm:gap-1 h-3.5 sm:h-4",
													children: [/* @__PURE__ */ jsx("span", {
														className: `px-1 py-0.2 bg-[#d6a735] text-[#06261f] text-[7px] sm:text-[9px] font-extrabold rounded-full uppercase tracking-tighter transition-opacity shrink-0 ${turn === "black" && !winner ? "opacity-100 animate-pulse" : "opacity-0 pointer-events-none"}`,
														children: "TURN"
													}), /* @__PURE__ */ jsx("small", {
														className: "block text-[7px] sm:text-[10px] font-bold tracking-wider text-[#d6a735] uppercase shrink-0",
														children: "PLAYER 2"
													})]
												}), /* @__PURE__ */ jsx("strong", {
													className: "block text-[11px] sm:text-sm font-extrabold text-[#f5efdf] truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none",
													children: blackDisplayName
												})]
											}),
											/* @__PURE__ */ jsx("span", {
												className: "w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#0c3b2e] via-[#06261f] to-slate-950 border-2 border-[#184d3c] shadow-md flex items-center justify-center text-[#f5efdf] font-black text-[10px] sm:text-sm shrink-0",
												children: subMode === "vs_cpu" ? /* @__PURE__ */ jsx(Bot, { size: 13 }) : "♚"
											})
										]
									})
								]
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-2 sm:p-5 shadow-2xl space-y-2.5 sm:space-y-4",
							children: [
								winner ? /* @__PURE__ */ jsxs("div", {
									className: "relative overflow-hidden w-full bg-slate-950/90 border-2 border-amber-500/80 rounded-2xl p-5 sm:p-8 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-300",
									children: [
										/* @__PURE__ */ jsx("div", {
											className: "absolute inset-0 pointer-events-none overflow-hidden z-10",
											children: Array.from({ length: 28 }).map((_, i) => /* @__PURE__ */ jsx("span", {
												className: "confetti-particle",
												style: {
													left: `${i * 100 / 28}%`,
													backgroundColor: [
														"#f59e0b",
														"#3b82f6",
														"#10b981",
														"#ef4444",
														"#8b5cf6",
														"#ec4899"
													][i % 6],
													animationDelay: `${i % 5 * .35}s`,
													animationDuration: `${2.2 + i % 4 * .5}s`
												}
											}, i))
										}),
										/* @__PURE__ */ jsx("div", {
											className: "relative z-20 inline-flex p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400",
											children: /* @__PURE__ */ jsx(Trophy, {
												size: 42,
												className: "animate-bounce"
											})
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "relative z-20",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full",
													children: "MATCH CONCLUDED"
												}),
												/* @__PURE__ */ jsx("h2", {
													className: "text-2xl sm:text-3xl font-black text-slate-100 mt-2",
													children: winner === "white" ? `${whiteDisplayName} Wins!` : `${blackDisplayName} Wins!`
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs sm:text-sm text-slate-400 mt-1",
													children: room?.mode === "league" || room?.leagueId ? /* @__PURE__ */ jsx("span", {
														className: "text-amber-300 font-bold",
														children: "🏆 Official League Tournament Match Victory!"
													}) : /* @__PURE__ */ jsxs("span", { children: [
														"Victory achieved in ",
														activeMoves.length,
														" total moves!"
													] })
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "relative z-20 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-left",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "p-2 bg-slate-950/80 border border-slate-800 rounded-lg",
													children: [/* @__PURE__ */ jsx("span", {
														className: "block text-[10px] font-bold text-slate-500 uppercase",
														children: "Player 1 Captures"
													}), /* @__PURE__ */ jsx("strong", {
														className: "text-base font-black text-amber-400",
														children: captures.white
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "p-2 bg-slate-950/80 border border-slate-800 rounded-lg",
													children: [/* @__PURE__ */ jsx("span", {
														className: "block text-[10px] font-bold text-slate-500 uppercase",
														children: "Player 2 Captures"
													}), /* @__PURE__ */ jsx("strong", {
														className: "text-base font-black text-emerald-400",
														children: captures.black
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "p-2 bg-slate-950/80 border border-slate-800 rounded-lg",
													children: [/* @__PURE__ */ jsx("span", {
														className: "block text-[10px] font-bold text-slate-500 uppercase",
														children: "Total Moves"
													}), /* @__PURE__ */ jsx("strong", {
														className: "text-base font-black text-slate-200",
														children: activeMoves.length
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "p-2 bg-slate-950/80 border border-slate-800 rounded-lg",
													children: [/* @__PURE__ */ jsx("span", {
														className: "block text-[10px] font-bold text-slate-500 uppercase",
														children: "Mode"
													}), /* @__PURE__ */ jsx("strong", {
														className: "text-xs font-bold text-slate-300 truncate block",
														children: mode === "online" ? room?.leagueId ? "Tournament" : room?.mode === "wager" ? "Wager" : "Online Room" : subMode === "vs_cpu" ? `AI (${cpuDifficulty})` : "Local 2P"
													})]
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "relative z-20 flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 flex-wrap",
											children: [/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => void copyShareResult(),
												className: "w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20",
												children: copiedShareResult ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Check, {
													size: 16,
													className: "text-emerald-300"
												}), /* @__PURE__ */ jsx("span", { children: "Summary Copied to Clipboard!" })] }) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Share2, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Share Result" })] })
											}), room?.leagueId || roomMode === "league" || room?.mode === "league" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("a", {
												href: `/leagues?id=${room?.leagueId || ""}`,
												className: "w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20",
												children: [/* @__PURE__ */ jsx(Trophy, { size: 16 }), " Return to Tournament Hub"]
											}), /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => setShowHistory(true),
												className: "w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors",
												children: [/* @__PURE__ */ jsx(ListOrdered, { size: 16 }), " Review Move Log"]
											})] }) : mode === "local" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => {
													resetLocalMatch();
													setShowPregameModal(true);
												},
												className: "w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20",
												children: [/* @__PURE__ */ jsx(Swords, { size: 16 }), " New Game Configuration"]
											}), /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: resetLocalMatch,
												className: "w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors",
												children: [/* @__PURE__ */ jsx(RotateCcw, { size: 16 }), " Rematch (Same Settings)"]
											})] }) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("button", {
												type: "button",
												disabled: onlineBusy,
												onClick: () => void requestRematch(),
												className: "w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20",
												children: [/* @__PURE__ */ jsx(RefreshCw, { size: 16 }), " Play Rematch"]
											}), /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => {
													setRoom(null);
													setShowPregameModal(true);
												},
												className: "w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors",
												children: [/* @__PURE__ */ jsx(Swords, { size: 16 }), " Match Configuration"]
											})] })]
										})
									]
								}) : /* @__PURE__ */ jsxs("div", {
									className: `p-1.5 sm:p-3 ${activeBoardConfig.wrapBg} border-2 ${activeBoardConfig.wrapBorder} rounded-xl shadow-inner relative transition-colors duration-300 board-touch-contain`,
									onTouchStart: (e) => {
										if (e.touches.length > 1) e.preventDefault();
									},
									children: [
										promotedKingEffect && /* @__PURE__ */ jsxs("div", {
											className: "absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-[11px] sm:text-sm rounded-full shadow-2xl flex items-center gap-1.5 border-2 border-amber-200 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92%]",
											children: [/* @__PURE__ */ jsx(Sparkles, {
												size: 14,
												className: "animate-spin text-slate-950 shrink-0"
											}), /* @__PURE__ */ jsxs("span", {
												className: "truncate",
												children: [
													"👑 FLYING KING PROMOTED for ",
													promotedKingEffect.player === "white" ? whiteDisplayName : blackDisplayName,
													"!"
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between mb-2 px-1 text-xs",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-1.5 text-[#f5efdf]",
												children: [/* @__PURE__ */ jsx(Maximize2, {
													size: 13,
													className: "text-[#d6a735]"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-bold text-[10px] sm:text-xs",
													children: "Adaptive Board Zoom:"
												})]
											}), /* @__PURE__ */ jsx("div", {
												className: "flex items-center gap-1 bg-[#06261f] p-1 rounded-lg border border-[#184d3c]",
												children: [
													1,
													1.25,
													1.5,
													1.75
												].map((z) => /* @__PURE__ */ jsxs("button", {
													type: "button",
													onClick: () => handleZoomChange(z),
													className: `px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-md transition-all ${boardZoom === z ? "bg-[#d6a735] text-[#06261f] shadow-sm" : "text-[#cbd5e1] hover:text-white hover:bg-[#144435]"}`,
													children: [Math.round(z * 100), "%"]
												}, z))
											})]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "w-full overflow-x-auto overflow-y-hidden rounded pb-1 scrollbar-thin touch-none",
											children: /* @__PURE__ */ jsx("div", {
												className: "aspect-square grid grid-cols-10 grid-rows-10 border-2 border-amber-500/50 rounded overflow-hidden shadow-2xl transition-colors duration-200 origin-top-left touch-none select-none",
												style: {
													width: `${boardZoom * 100}%`,
													minWidth: `${boardZoom * 100}%`,
													display: "grid",
													gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
													gridTemplateRows: "repeat(10, minmax(0, 1fr))",
													backgroundColor: activeBoardConfig.boardBg
												},
												role: "grid",
												"aria-label": "DAMII 10x10 board",
												children: orderedSquares.map((square) => {
													const row = rowOf(square);
													const col = colOf(square);
													const playable = (row + col) % 2 === 1;
													const piece = board[square];
													const isDestination = destinations.has(square);
													const isSelectable = selectable.has(square);
													const pieceHasCapture = isSelectable && moves.some((m) => m.from === square && m.captured !== void 0);
													const isLastSource = lastMove?.from === square;
													const isLastTarget = lastMove?.to === square;
													return /* @__PURE__ */ jsxs("button", {
														className: `square relative grid place-items-center p-0 border-0 transition-colors select-none touch-manipulation ${selected === square ? "selected" : ""} ${isDestination ? "destination" : ""} ${isLastSource ? "last-move-source" : ""} ${isLastTarget ? "last-move-target" : ""}`,
														style: { backgroundColor: playable ? (row + col) % 4 === 1 || (row + col) % 4 === 3 ? activeBoardConfig.playableBg : activeBoardConfig.playableAltBg : activeBoardConfig.restBg },
														onClick: () => handleSquare(square),
														disabled: !playable || !!winner,
														role: "gridcell",
														"aria-label": `Square ${square} ${piece ? `${piece.player} ${piece.king ? "king" : "piece"}` : "empty"}`,
														children: [
															lastCaptureSquare === square && /* @__PURE__ */ jsx("span", { className: "capture-burst-ring" }),
															promotedKingEffect?.square === square && /* @__PURE__ */ jsx("span", { className: "king-promotion-effect" }),
															piece && (() => {
																const isMovingPiece = animatePieces && animatedMove && animatedMove.to === square;
																let slideStyle = {};
																if (isMovingPiece) {
																	const fromRow = rowOf(animatedMove.from);
																	const fromCol = colOf(animatedMove.from);
																	const toRow = rowOf(square);
																	slideStyle = {
																		"--slide-x": fromCol - colOf(square),
																		"--slide-y": fromRow - toRow
																	};
																}
																return /* @__PURE__ */ jsx("span", {
																	className: `piece ${piece.player} ${piece.king ? "king" : ""} ${pieceHasCapture ? "can-capture" : isSelectable ? "can-move" : ""} ${isMovingPiece ? "piece-move-sliding" : animatePieces ? "smooth-motion" : ""}`,
																	style: {
																		...slideStyle,
																		...piece.player === "white" ? activeMarbleConfig.whiteStyle : activeMarbleConfig.blackStyle
																	},
																	children: piece.king && /* @__PURE__ */ jsx("span", { children: "♛" })
																}, isMovingPiece ? animatedMove.id : square);
															})(),
															isDestination && /* @__PURE__ */ jsx("span", { className: "move-dot" })
														]
													}, square);
												})
											})
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center justify-between p-2.5 sm:p-3 bg-[#0c3b2e]/90 border border-[#184d3c] rounded-xl text-xs gap-2 min-h-[42px] sm:min-h-[46px]",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-1.5 sm:gap-2 text-[#f5efdf] font-medium min-w-0 flex-1",
											children: [/* @__PURE__ */ jsx("span", { className: `turn-dot ${turn} shrink-0` }), /* @__PURE__ */ jsx("span", {
												className: "truncate font-semibold text-[11px] sm:text-xs",
												children: message
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-1.5 px-2 py-0.5 bg-[#06261f] border border-[#184d3c] rounded-lg text-[10px] sm:text-xs text-[#f5efdf] shrink-0 min-h-[24px]",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-bold text-[#d6a735]",
												children: "Last Move:"
											}), /* @__PURE__ */ jsx("span", {
												className: "font-mono text-[#f5efdf]",
												children: lastMove ? `${lastMove.playerName || (lastMove.player === "white" ? whiteDisplayName : blackDisplayName)}: sq ${lastMove.from} ➔ sq ${lastMove.to}` : "Start"
											})]
										}),
										mustCapture && !winner && /* @__PURE__ */ jsx("span", {
											className: "px-1.5 sm:px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 text-[9px] sm:text-[10px] font-extrabold rounded uppercase tracking-wider shrink-0 animate-pulse",
											children: "Compulsory Capture!"
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-1",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center gap-1.5 sm:gap-2 w-full xs:w-auto",
										children: [
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => setRotated((v) => !v),
												className: "flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors",
												children: "⇅ Flip"
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => setShowThemeModal(true),
												className: "flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors",
												children: [/* @__PURE__ */ jsx(Palette, { size: 13 }), " Theme"]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => setShowGuide(true),
												className: "flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors",
												children: [/* @__PURE__ */ jsx(CircleQuestionMark, { size: 13 }), " Rules"]
											})
										]
									}), /* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-1.5 sm:gap-2 w-full xs:w-auto justify-end",
										children: [
											mode === "local" && /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: resetLocalMatch,
												className: "w-full xs:w-auto px-2.5 py-1.5 bg-[#d6a735]/15 hover:bg-[#d6a735]/25 text-[#d6a735] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-[#d6a735]/40 transition-colors",
												children: [/* @__PURE__ */ jsx(RotateCcw, { size: 13 }), " Restart"]
											}),
											mode === "online" && room?.status === "playing" && !winner && /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => void forfeitOnline(),
												className: "w-full xs:w-auto px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-red-800 transition-colors",
												children: [/* @__PURE__ */ jsx(TriangleAlert, { size: 13 }), " Forfeit"]
											}),
											winner && /* @__PURE__ */ jsxs("button", {
												type: "button",
												disabled: onlineBusy,
												onClick: () => void requestRematch(),
												className: "w-full xs:w-auto px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all shadow-md shadow-[#d6a735]/10",
												children: [/* @__PURE__ */ jsx(RefreshCw, { size: 13 }), " Play Again"]
											})
										]
									})]
								})
							]
						})]
					}), showHistory && /* @__PURE__ */ jsxs("div", {
						className: "w-full max-w-[580px] mx-auto bg-[#06261f] border border-[#184d3c] rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col h-[400px] sm:h-[600px] animate-in fade-in zoom-in-95 duration-200",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pb-2.5 border-b border-[#184d3c]",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx(ListOrdered, {
											size: 16,
											className: "text-[#d6a735]"
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "text-xs sm:text-sm font-bold text-[#f5efdf]",
											children: "Match Move History"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "px-2 py-0.5 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[10px] font-extrabold",
											children: activeMoves.length
										})
									]
								}), /* @__PURE__ */ jsx("button", {
									onClick: () => setShowHistory(false),
									className: "text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3b2e] transition-colors",
									children: /* @__PURE__ */ jsx(X, { size: 16 })
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "py-2 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-1 bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-full",
									children: [
										/* @__PURE__ */ jsx("button", {
											onClick: () => setNotationStyle("alg"),
											className: `px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${notationStyle === "alg" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`,
											children: "Algebraic (D4-E5)"
										}),
										/* @__PURE__ */ jsx("button", {
											onClick: () => setNotationStyle("sq"),
											className: `px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${notationStyle === "sq" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`,
											children: "Squares (32-28)"
										}),
										/* @__PURE__ */ jsx("button", {
											onClick: () => setNotationStyle("both"),
											className: `px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${notationStyle === "both" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`,
											children: "Both"
										})
									]
								}), /* @__PURE__ */ jsxs("button", {
									onClick: copyMoveLog,
									disabled: activeMoves.length === 0,
									className: "px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg text-[10px] sm:text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors ml-auto",
									children: [copiedHistory ? /* @__PURE__ */ jsx(Check, {
										size: 12,
										className: "text-emerald-400"
									}) : /* @__PURE__ */ jsx(Copy, { size: 12 }), /* @__PURE__ */ jsx("span", { children: copiedHistory ? "Copied" : "Export" })]
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								ref: historyScrollRef,
								className: "flex-1 overflow-y-auto py-2 pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800",
								children: activeMoves.length === 0 ? /* @__PURE__ */ jsxs("div", {
									className: "h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2",
									children: [
										/* @__PURE__ */ jsx(FileText, {
											size: 32,
											className: "opacity-40 text-amber-400"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-xs font-medium",
											children: "No moves played yet."
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px]",
											children: "Move history with custom player names will appear here."
										})
									]
								}) : /* @__PURE__ */ jsxs("div", {
									className: "space-y-1",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-[36px_1fr_1fr] text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-800/50",
										children: [
											/* @__PURE__ */ jsx("span", { children: "#" }),
											/* @__PURE__ */ jsxs("span", {
												className: "truncate flex items-center gap-1",
												children: [
													/* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-amber-300" }),
													" ",
													whiteDisplayName
												]
											}),
											/* @__PURE__ */ jsxs("span", {
												className: "truncate flex items-center gap-1",
												children: [
													/* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
													" ",
													blackDisplayName
												]
											})
										]
									}), pairedMoves.map((pair) => /* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-[36px_1fr_1fr] items-center text-xs px-2 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/40 transition-colors font-mono",
										children: [
											/* @__PURE__ */ jsxs("span", {
												className: "text-slate-500 font-bold text-[11px]",
												children: [pair.turnNum, "."]
											}),
											/* @__PURE__ */ jsx("div", { children: pair.white ? /* @__PURE__ */ jsxs("span", {
												className: `inline-flex items-center gap-1 font-bold ${pair.white.isCapture ? "text-amber-300" : "text-slate-200"}`,
												children: [notationStyle === "alg" ? pair.white.algNotation : notationStyle === "sq" ? pair.white.sqNotation : pair.white.notation, pair.white.isCapture && /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-amber-400",
													title: "Compulsory Capture",
													children: "💥"
												})]
											}) : /* @__PURE__ */ jsx("span", {
												className: "text-slate-700",
												children: "-"
											}) }),
											/* @__PURE__ */ jsx("div", { children: pair.black ? /* @__PURE__ */ jsxs("span", {
												className: `inline-flex items-center gap-1 font-bold ${pair.black.isCapture ? "text-emerald-300" : "text-slate-200"}`,
												children: [notationStyle === "alg" ? pair.black.algNotation : notationStyle === "sq" ? pair.black.sqNotation : pair.black.notation, pair.black.isCapture && /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-emerald-400",
													title: "Compulsory Capture",
													children: "💥"
												})]
											}) : /* @__PURE__ */ jsx("span", {
												className: "text-slate-700",
												children: "-"
											}) })
										]
									}, pair.turnNum))]
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between",
								children: [/* @__PURE__ */ jsx("span", { children: "FMJD 10x10 Standard Notation" }), /* @__PURE__ */ jsx("span", {
									className: "text-amber-400 font-bold",
									children: "compulsory capture 'x'"
								})]
							})
						]
					})]
				})
			}),
			showPregameModal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-xl bg-[#06261f] border-2 border-[#d6a735] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "px-6 py-4 bg-[#0c3b2e] border-b border-[#184d3c] flex items-center justify-between",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2.5 text-[#d6a735]",
								children: [/* @__PURE__ */ jsx(Swords, { size: 20 }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "text-base font-black text-[#f5efdf] font-serif",
									children: "DAMII Pregame Match Configuration"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-[11px] text-[#cbd5e1]",
									children: "Set player names, select game mode, and log in before starting."
								})] })]
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => setShowPregameModal(false),
								className: "text-[#cbd5e1] hover:text-white p-1.5 rounded-xl hover:bg-[#144435] transition-colors",
								children: /* @__PURE__ */ jsx(X, { size: 18 })
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "p-6 space-y-6 overflow-y-auto",
							children: [
								(profile?.role === "admin" || profile?.role === "super_admin") && /* @__PURE__ */ jsxs("div", {
									className: "p-4 bg-amber-950/90 border border-amber-500/80 rounded-xl text-[#f5efdf] space-y-2 shadow-lg",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2 text-[#d6a735] font-bold text-xs",
											children: [/* @__PURE__ */ jsx(ShieldAlert, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Administrator Account (Non-Playing Facilitator)" })]
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-xs text-slate-300 leading-relaxed",
											children: "As an Administrator, your account serves exclusively as a match facilitator, regulator, and spectator. Admin accounts are restricted from hosting or participating in player matches or wagers."
										}),
										/* @__PURE__ */ jsxs("a", {
											href: "/admin",
											className: "inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d6a735] text-[#06261f] font-black rounded-lg text-xs hover:bg-[#b88c24] transition-colors mt-1 shadow-sm",
											children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 14 }), " Open Admin Control Center"]
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "p-4 bg-[#0c3b2e]/80 border border-[#184d3c] rounded-xl space-y-3",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("span", {
												className: "text-xs font-bold text-[#f5efdf] flex items-center gap-1.5",
												children: [/* @__PURE__ */ jsx(User, {
													size: 15,
													className: "text-[#d6a735]"
												}), "Player Account Profile"]
											}), profile && /* @__PURE__ */ jsxs("span", {
												className: "text-[11px] text-emerald-400 font-bold flex items-center gap-1",
												children: [/* @__PURE__ */ jsx(UserCheck, { size: 13 }), " Logged In"]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 24,
												value: username,
												onChange: (e) => setUsername(e.target.value),
												placeholder: "Enter your player display name...",
												className: "flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] placeholder-[#63716b] focus:outline-none focus:border-[#d6a735] font-medium"
											}), /* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => handleSaveLoginProfile(username),
												className: "px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-bold rounded-xl transition-all shadow-md shadow-[#d6a735]/10",
												children: "Save & Login"
											})]
										}),
										profile && /* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between text-[11px] text-[#cbd5e1] pt-1 border-t border-[#184d3c]/60",
											children: [
												/* @__PURE__ */ jsxs("span", { children: ["Rating: ", /* @__PURE__ */ jsxs("strong", {
													className: "text-[#d6a735]",
													children: [profile.rating, " ELO"]
												})] }),
												/* @__PURE__ */ jsxs("span", { children: ["Points: ", /* @__PURE__ */ jsxs("strong", {
													className: "text-sky-300",
													children: [profile.points, " Pts"]
												})] }),
												/* @__PURE__ */ jsxs("span", { children: ["Record: ", /* @__PURE__ */ jsxs("strong", {
													className: "text-emerald-400",
													children: [
														profile.wins,
														"W - ",
														profile.losses,
														"L"
													]
												})] })
											]
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-bold text-[#f5efdf] uppercase tracking-wider",
										children: "Select Game Mode"
									}), /* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-3 gap-2 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl",
										children: [
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => {
													setMode("local");
													setSubMode("pass_play");
												},
												className: `py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${mode === "local" && subMode === "pass_play" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#cbd5e1] hover:text-white"}`,
												children: [/* @__PURE__ */ jsx(Monitor, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Pass & Play" })]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => {
													setMode("local");
													setSubMode("vs_cpu");
												},
												className: `py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${mode === "local" && subMode === "vs_cpu" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#cbd5e1] hover:text-white"}`,
												children: [/* @__PURE__ */ jsx(Bot, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Vs Bot AI" })]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => setMode("online"),
												className: `py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${mode === "online" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#cbd5e1] hover:text-white"}`,
												children: [/* @__PURE__ */ jsx(Globe, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Online 1-on-1" })]
											})
										]
									})]
								}),
								mode === "local" && subMode === "pass_play" && /* @__PURE__ */ jsxs("div", {
									className: "space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl",
									children: [
										/* @__PURE__ */ jsxs("h4", {
											className: "text-xs font-bold text-[#f5efdf] flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Monitor, {
												size: 15,
												className: "text-[#d6a735]"
											}), "Local 2-Player Pass & Play Match Setup"]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
											children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-[11px] font-bold text-[#d6a735] uppercase mb-1",
												children: "Player 1 (White)"
											}), /* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 20,
												value: localWhiteName,
												onChange: (e) => setLocalWhiteName(e.target.value),
												placeholder: "Player 1 Name",
												className: "w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
											})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-[11px] font-bold text-emerald-400 uppercase mb-1",
												children: "Player 2 (Black)"
											}), /* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 20,
												value: localBlackName,
												onChange: (e) => setLocalBlackName(e.target.value),
												placeholder: "Player 2 Name",
												className: "w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-emerald-500"
											})] })]
										}),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-[11px] font-semibold text-[#cbd5e1] mb-1",
											children: "Turn Time Limit"
										}), /* @__PURE__ */ jsx("div", {
											className: "grid grid-cols-4 gap-2",
											children: [
												30,
												60,
												90,
												0
											].map((seconds) => /* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => setTurnTimerLimit(seconds),
												className: `py-1.5 text-xs font-bold rounded-lg border transition-all ${turnTimerLimit === seconds ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735]" : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white"}`,
												children: seconds === 0 ? "Unlimited" : `${seconds}s`
											}, seconds))
										})] })
									]
								}),
								mode === "local" && subMode === "vs_cpu" && /* @__PURE__ */ jsxs("div", {
									className: "space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl",
									children: [/* @__PURE__ */ jsxs("h4", {
										className: "text-xs font-bold text-[#f5efdf] flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(Bot, {
											size: 15,
											className: "text-[#d6a735]"
										}), "Computer AI Simulation Setup"]
									}), !token ? /* @__PURE__ */ jsxs("div", {
										className: "p-3.5 bg-amber-950/80 border border-amber-500/50 rounded-xl space-y-2 text-center text-amber-200",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-center gap-2 font-bold text-xs",
												children: [/* @__PURE__ */ jsx(Bot, {
													size: 16,
													className: "text-[#d6a735]"
												}), /* @__PURE__ */ jsx("span", { children: "Authentication Required for Bot Play" })]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-[11px] text-amber-200/90 leading-tight",
												children: "Guests can play local Pass & Play freely. To challenge the Bot AI and track your ELO rating, please sign in or register an account."
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => window.dispatchEvent(new CustomEvent("damii-open-auth")),
												className: "w-full py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-lg transition-colors shadow-md",
												children: "Sign In / Register"
											})
										]
									}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-[11px] font-bold text-[#d6a735] uppercase mb-1",
										children: "Your Player Name (Player 1)"
									}), /* @__PURE__ */ jsx("input", {
										type: "text",
										maxLength: 20,
										value: localWhiteName,
										onChange: (e) => setLocalWhiteName(e.target.value),
										placeholder: "Your Name",
										className: "w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-[11px] font-semibold text-[#cbd5e1] mb-1",
										children: "AI Bot Level"
									}), /* @__PURE__ */ jsx("div", {
										className: "grid grid-cols-3 gap-2",
										children: [
											"easy",
											"medium",
											"hard"
										].map((lvl) => /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => setCpuDifficulty(lvl),
											className: `py-2 text-xs font-bold capitalize rounded-lg border transition-all ${cpuDifficulty === lvl ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735]" : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white"}`,
											children: lvl === "easy" ? "Casual Bot" : lvl === "medium" ? "Tactical AI" : "Grandmaster"
										}, lvl))
									})] })] })]
								}),
								mode === "online" && /* @__PURE__ */ jsxs("div", {
									className: "space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl",
									children: [
										/* @__PURE__ */ jsxs("h4", {
											className: "text-xs font-bold text-[#f5efdf] flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Globe, {
												size: 15,
												className: "text-[#d6a735]"
											}), "Online 1-on-1 Challenge & Room Creation"]
										}),
										onlineError && /* @__PURE__ */ jsxs("div", {
											className: "p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(TriangleAlert, {
												size: 15,
												className: "shrink-0 text-red-400"
											}), /* @__PURE__ */ jsx("span", { children: onlineError })]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex gap-2",
													children: [
														/* @__PURE__ */ jsxs("select", {
															value: roomMode,
															onChange: (e) => setRoomMode(e.target.value),
															className: "flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]",
															children: [/* @__PURE__ */ jsx("option", {
																value: "casual",
																children: "Casual Match (Free)"
															}), /* @__PURE__ */ jsx("option", {
																value: "wager",
																children: "Wager Match (GH₵ Escrow Pot)"
															})]
														}),
														roomMode === "wager" && /* @__PURE__ */ jsx("input", {
															type: "number",
															min: 10,
															step: 10,
															value: wagerInput,
															onChange: (e) => setWagerInput(Number(e.target.value)),
															placeholder: "Stake GH₵",
															className: "w-28 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
														}),
														/* @__PURE__ */ jsxs("button", {
															type: "button",
															disabled: onlineBusy,
															onClick: () => void onlineAction("create", {
																mode: roomMode,
																wagerAmount: roomMode === "wager" ? wagerInput : 0
															}),
															className: "px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shadow-[#d6a735]/10 flex items-center gap-1 shrink-0",
															children: [/* @__PURE__ */ jsx(Plus, { size: 14 }), " Create Room"]
														})
													]
												}),
												(roomMode === "wager" || room?.mode === "wager") && /* @__PURE__ */ jsxs("div", {
													className: "p-3 bg-[#06261f] border border-[#d6a735]/50 rounded-xl space-y-2 text-xs",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center justify-between text-[#d6a735] font-extrabold uppercase tracking-wider text-[11px]",
														children: [/* @__PURE__ */ jsxs("span", {
															className: "flex items-center gap-1.5",
															children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 14 }), " Guaranteed Escrow Vault Audit Trail"]
														}), /* @__PURE__ */ jsx("span", {
															className: "px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30 text-[9px]",
															children: "Disputes < 2h SLA"
														})]
													}), /* @__PURE__ */ jsxs("div", {
														className: "grid grid-cols-2 gap-2 text-[11px] text-[#cbd5e1] pt-1 border-t border-[#184d3c]",
														children: [
															/* @__PURE__ */ jsxs("div", { children: [
																"• Your Wager Stake: ",
																/* @__PURE__ */ jsxs("strong", {
																	className: "text-[#f5efdf]",
																	children: ["GH₵ ", Number(wagerInput).toFixed(2)]
																}),
																" (Locked)"
															] }),
															/* @__PURE__ */ jsxs("div", { children: [
																"• Opponent Stake: ",
																/* @__PURE__ */ jsxs("strong", {
																	className: "text-[#f5efdf]",
																	children: ["GH₵ ", Number(wagerInput).toFixed(2)]
																}),
																" (Locked)"
															] }),
															/* @__PURE__ */ jsxs("div", { children: ["• Total Wager Pot: ", /* @__PURE__ */ jsxs("strong", {
																className: "text-amber-300",
																children: ["GH₵ ", (Number(wagerInput) * 2).toFixed(2)]
															})] }),
															/* @__PURE__ */ jsxs("div", { children: [
																"• Winner Takes: ",
																/* @__PURE__ */ jsxs("strong", {
																	className: "text-emerald-400",
																	children: ["GH₵ ", (Number(wagerInput) * 2 * .95).toFixed(2)]
																}),
																" (5% platform fee)"
															] })
														]
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex gap-2 pt-2 border-t border-[#184d3c]",
													children: [/* @__PURE__ */ jsx("input", {
														type: "text",
														maxLength: 8,
														value: joinCode,
														onChange: (e) => setJoinCode(e.target.value.toUpperCase()),
														placeholder: "ENTER ROOM CODE",
														className: "flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs font-mono font-bold tracking-widest text-[#f5efdf] placeholder-[#63716b] uppercase focus:outline-none focus:border-[#d6a735]"
													}), /* @__PURE__ */ jsx("button", {
														type: "button",
														disabled: onlineBusy || !joinCode,
														onClick: () => void onlineAction("join", { code: joinCode }),
														className: "px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0",
														children: "Join Room"
													})]
												})
											]
										}),
										room && /* @__PURE__ */ jsx("div", {
											className: "p-3 bg-[#06261f]/80 border border-[#184d3c] rounded-xl space-y-2",
											children: /* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsxs("span", {
													className: "text-[10px] font-bold text-[#d6a735] uppercase",
													children: ["ACTIVE ROOM: ", room.code]
												}), /* @__PURE__ */ jsxs("button", {
													type: "button",
													onClick: copyChallengeLink,
													className: "px-2 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-[10px] font-bold rounded-lg flex items-center gap-1",
													children: [/* @__PURE__ */ jsx(Share2, { size: 12 }), copiedLink ? "Link Copied!" : "Copy Challenge Link"]
												})]
											})
										})
									]
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "px-6 py-4 bg-[#0c3b2e] border-t border-[#184d3c] flex items-center justify-between",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[11px] text-[#cbd5e1]",
								children: "FMJD 10x10 Compulsory Rules Active"
							}), /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: () => {
									if (mode === "local" && subMode === "vs_cpu" && !token) {
										window.dispatchEvent(new CustomEvent("damii-open-auth"));
										setOnlineError("Authentication Required: Please sign in or register to play against the Bot AI.");
										return;
									}
									resetLocalMatch();
									setShowPregameModal(false);
								},
								className: "px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-[#d6a735]/20 flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(Play, {
									size: 14,
									fill: "currentColor"
								}), /* @__PURE__ */ jsx("span", { children: "Launch Match Now" })]
							})]
						})
					]
				})
			}),
			showSettings && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-md bg-[#06261f] border-l-2 border-[#184d3c] h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between pb-4 mb-6 border-b border-[#184d3c]",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-[#f5efdf]",
							children: [/* @__PURE__ */ jsx(Settings, {
								size: 20,
								className: "text-[#d6a735]"
							}), /* @__PURE__ */ jsx("h3", {
								className: "text-base font-bold font-serif",
								children: "Match Settings & Config"
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setShowSettings(false),
							className: "text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3b2e] transition-colors",
							children: /* @__PURE__ */ jsx(X, { size: 20 })
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-6",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-bold text-[#cbd5e1] uppercase tracking-wider mb-2",
								children: "Game Mode"
							}), /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-2 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => switchMode("local"),
									className: `py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${mode === "local" ? "bg-[#d6a735] text-[#06261f] shadow-sm" : "text-[#cbd5e1] hover:text-white"}`,
									children: [/* @__PURE__ */ jsx(Monitor, { size: 14 }), " Local Device"]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => switchMode("online"),
									className: `py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${mode === "online" ? "bg-[#d6a735] text-[#06261f] shadow-sm" : "text-[#cbd5e1] hover:text-white"}`,
									children: [/* @__PURE__ */ jsx(Globe, { size: 14 }), " Online Arena"]
								})]
							})] }),
							mode === "online" && /* @__PURE__ */ jsxs("div", {
								className: "space-y-5 pt-2 border-t border-[#184d3c]",
								children: [
									onlineError && /* @__PURE__ */ jsxs("div", {
										className: "p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(TriangleAlert, {
											size: 15,
											className: "shrink-0 text-red-400"
										}), /* @__PURE__ */ jsx("span", { children: onlineError })]
									}),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5",
										children: "Public Player Name"
									}), /* @__PURE__ */ jsxs("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ jsx("input", {
											type: "text",
											maxLength: 20,
											value: username,
											onChange: (e) => setUsername(e.target.value),
											placeholder: "Enter display name",
											className: "flex-1 px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] placeholder-[#63716b] focus:outline-none focus:border-[#d6a735]"
										}), /* @__PURE__ */ jsx("button", {
											type: "button",
											disabled: onlineBusy,
											onClick: () => void onlineAction("profile"),
											className: "px-3 py-2 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-xs font-bold rounded-xl border border-[#184d3c] transition-colors",
											children: "Save"
										})]
									})] }),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-3 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl",
										children: [
											/* @__PURE__ */ jsxs("h4", {
												className: "text-xs font-bold text-[#f5efdf] flex items-center gap-1.5",
												children: [/* @__PURE__ */ jsx(Plus, {
													size: 14,
													className: "text-[#d6a735]"
												}), " Create Online Room"]
											}),
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-[11px] font-medium text-[#cbd5e1] mb-1",
												children: "Match Type"
											}), /* @__PURE__ */ jsxs("select", {
												value: roomMode,
												onChange: (e) => setRoomMode(e.target.value),
												className: "w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]",
												children: [/* @__PURE__ */ jsx("option", {
													value: "casual",
													children: "Casual Match (Free)"
												}), /* @__PURE__ */ jsx("option", {
													value: "wager",
													children: "Wager Match (GH₵ Escrow Pot)"
												})]
											})] }),
											roomMode === "wager" && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-[11px] font-medium text-[#cbd5e1] mb-1",
												children: "Wager Stake (GH₵ per player)"
											}), /* @__PURE__ */ jsx("input", {
												type: "number",
												min: 10,
												step: 10,
												value: wagerInput,
												onChange: (e) => setWagerInput(Number(e.target.value)),
												className: "w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
											})] }),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												disabled: onlineBusy,
												onClick: () => void onlineAction("create", {
													mode: roomMode,
													wagerAmount: roomMode === "wager" ? wagerInput : 0
												}),
												className: "w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shadow-[#d6a735]/10 flex items-center justify-center gap-1.5",
												children: [
													"＋ Create ",
													roomMode === "wager" ? `GH₵ ${wagerInput} Wager` : "Casual",
													" Room"
												]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-2 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl",
										children: [/* @__PURE__ */ jsxs("h4", {
											className: "text-xs font-bold text-[#f5efdf] flex items-center gap-1.5",
											children: [/* @__PURE__ */ jsx(ArrowRight, {
												size: 14,
												className: "text-[#d6a735]"
											}), " Join Private Room"]
										}), /* @__PURE__ */ jsxs("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 8,
												value: joinCode,
												onChange: (e) => setJoinCode(e.target.value.toUpperCase()),
												placeholder: "ROOM CODE",
												className: "flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs font-mono font-bold tracking-widest text-[#f5efdf] placeholder-[#63716b] uppercase focus:outline-none focus:border-[#d6a735]"
											}), /* @__PURE__ */ jsx("button", {
												type: "button",
												disabled: onlineBusy || !joinCode,
												onClick: () => void onlineAction("join", { code: joinCode }),
												className: "px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-bold text-xs rounded-xl transition-all",
												children: "Join"
											})]
										})]
									}),
									room && /* @__PURE__ */ jsxs("div", {
										className: "p-4 bg-[#06261f]/80 border border-[#184d3c] rounded-2xl space-y-2",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-bold tracking-wider text-[#d6a735] uppercase",
													children: "ACTIVE ROOM TICKET"
												}), /* @__PURE__ */ jsxs("span", {
													className: "text-xs font-bold text-[#f5efdf]",
													children: ["Role: ", room.role === "white" ? "Player 1" : room.role === "black" ? "Player 2" : "Spectator"]
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between bg-[#0c3b2e] p-2.5 rounded-xl border border-[#184d3c]",
												children: [/* @__PURE__ */ jsx("strong", {
													className: "text-lg font-mono font-black tracking-widest text-[#d6a735]",
													children: room.code
												}), /* @__PURE__ */ jsxs("button", {
													type: "button",
													onClick: copyRoomCode,
													className: "px-2.5 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] rounded-lg text-xs font-bold flex items-center gap-1 border border-[#184d3c] transition-colors",
													children: [copiedCode ? /* @__PURE__ */ jsx(Check, { size: 13 }) : /* @__PURE__ */ jsx(Copy, { size: 13 }), copiedCode ? "Copied" : "Copy Code"]
												})]
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "text-xs text-slate-300 leading-relaxed",
												children: [room.status === "waiting" ? "Share code with opponent to start." : `${room.hostName} vs ${room.guestName}`, room.mode === "wager" && ` · Pot: GH₵ ${(room.wagerAmount * 2).toFixed(2)}`]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "pt-4 border-t border-slate-800 space-y-3",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ jsxs("label", {
											className: "text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5",
											children: [/* @__PURE__ */ jsx(Volume2, {
												size: 15,
												className: "text-amber-400"
											}), " Granular Audio Controls"]
										}), /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => toggleSoundCat("master"),
											className: `px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all ${soundSettings.master ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30" : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"}`,
											children: ["Master: ", soundSettings.master ? "ON" : "MUTED"]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
										children: [
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => toggleSoundCat("move"),
												className: `p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${soundSettings.master && soundSettings.move ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600" : "bg-slate-950/60 border-slate-800 text-slate-500"}`,
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", {
													className: "block text-xs font-bold",
													children: "Piece Movement"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-slate-400",
													children: "Tactile timber placement"
												})] }), /* @__PURE__ */ jsx("span", {
													className: `text-[10px] font-bold px-2 py-0.5 rounded ${soundSettings.master && soundSettings.move ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"}`,
													children: soundSettings.master && soundSettings.move ? "ON" : "OFF"
												})]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => toggleSoundCat("capture"),
												className: `p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${soundSettings.master && soundSettings.capture ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600" : "bg-slate-950/60 border-slate-800 text-slate-500"}`,
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", {
													className: "block text-xs font-bold",
													children: "Captures & Jumps"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-slate-400",
													children: "Crisp marble clack sound"
												})] }), /* @__PURE__ */ jsx("span", {
													className: `text-[10px] font-bold px-2 py-0.5 rounded ${soundSettings.master && soundSettings.capture ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"}`,
													children: soundSettings.master && soundSettings.capture ? "ON" : "OFF"
												})]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => toggleSoundCat("win"),
												className: `p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${soundSettings.master && soundSettings.win ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600" : "bg-slate-950/60 border-slate-800 text-slate-500"}`,
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", {
													className: "block text-xs font-bold",
													children: "King & Victory Fanfare"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-slate-400",
													children: "Promotions & match wins"
												})] }), /* @__PURE__ */ jsx("span", {
													className: `text-[10px] font-bold px-2 py-0.5 rounded ${soundSettings.master && soundSettings.win ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"}`,
													children: soundSettings.master && soundSettings.win ? "ON" : "OFF"
												})]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => toggleSoundCat("ui"),
												className: `p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${soundSettings.master && soundSettings.ui ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600" : "bg-slate-950/60 border-slate-800 text-slate-500"}`,
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", {
													className: "block text-xs font-bold",
													children: "UI Clicks & Alerts"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-slate-400",
													children: "Piece selection & warnings"
												})] }), /* @__PURE__ */ jsx("span", {
													className: `text-[10px] font-bold px-2 py-0.5 rounded ${soundSettings.master && soundSettings.ui ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"}`,
													children: soundSettings.master && soundSettings.ui ? "ON" : "OFF"
												})]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-1.5 pt-1",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-bold text-slate-500 uppercase",
												children: "Test Sound:"
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => soundService.playMove(),
												className: "px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors",
												children: "🔊 Move"
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => soundService.playCapture(),
												className: "px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors",
												children: "💥 Capture"
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => soundService.playKingPromotion(),
												className: "px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors",
												children: "👑 King"
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: () => soundService.playVictory(),
												className: "px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors",
												children: "🏆 Victory"
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "pt-4 border-t border-slate-800 space-y-2",
								children: [/* @__PURE__ */ jsxs("label", {
									className: "block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Sparkles, {
										size: 15,
										className: "text-amber-400"
									}), " Motion & Visual Effects"]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => togglePieceAnimation(!animatePieces),
									className: "w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2.5",
										children: [/* @__PURE__ */ jsx(Sparkles, {
											size: 18,
											className: animatePieces ? "text-amber-400 shrink-0" : "text-slate-600 shrink-0"
										}), /* @__PURE__ */ jsxs("div", {
											className: "text-left",
											children: [/* @__PURE__ */ jsx("strong", {
												className: "block text-slate-100 font-bold",
												children: "Piece Move Animation"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-[10px] text-slate-400",
												children: "Smoothly slide pieces across board squares on every move"
											})]
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: `px-2.5 py-1 text-[10px] font-extrabold rounded-full ${animatePieces ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 text-slate-500"}`,
										children: animatePieces ? "ANIMATED" : "INSTANT"
									})]
								})]
							}),
							profile && /* @__PURE__ */ jsxs("div", {
								className: "pt-4 border-t border-slate-800 space-y-2",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-bold text-slate-400 uppercase tracking-wider",
									children: "Account Ledger"
								}), /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "p-3 bg-slate-950 border border-slate-800 rounded-xl",
										children: [/* @__PURE__ */ jsx("small", {
											className: "block text-[10px] text-slate-500 font-bold uppercase",
											children: "Points"
										}), /* @__PURE__ */ jsxs("strong", {
											className: "text-sm font-bold text-sky-400 flex items-center gap-1",
											children: [
												/* @__PURE__ */ jsx(Zap, { size: 14 }),
												" ",
												profile.points
											]
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "p-3 bg-slate-950 border border-slate-800 rounded-xl",
										children: [/* @__PURE__ */ jsx("small", {
											className: "block text-[10px] text-slate-500 font-bold uppercase",
											children: "Rating"
										}), /* @__PURE__ */ jsxs("strong", {
											className: "text-sm font-bold text-amber-400 flex items-center gap-1",
											children: [
												/* @__PURE__ */ jsx(Award, { size: 14 }),
												" ",
												profile.rating,
												" ELO"
											]
										})]
									})]
								})]
							})
						]
					})] }), /* @__PURE__ */ jsx("div", {
						className: "pt-4 border-t border-slate-800",
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setShowSettings(false),
							className: "w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors",
							children: "Close Settings"
						})
					})]
				})
			}),
			showGuide && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",
				onClick: () => setShowGuide(false),
				children: /* @__PURE__ */ jsxs("section", {
					className: "w-full max-w-lg bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-6 shadow-2xl relative space-y-4",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "absolute top-4 right-4 text-[#cbd5e1] hover:text-white p-1 rounded-lg hover:bg-[#144435] transition-colors",
							onClick: () => setShowGuide(false),
							children: /* @__PURE__ */ jsx(X, { size: 20 })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-[#d6a735]",
							children: [/* @__PURE__ */ jsx(CircleQuestionMark, { size: 20 }), /* @__PURE__ */ jsx("h2", {
								className: "text-lg font-bold text-[#f5efdf] font-serif",
								children: "DAMII Rules & Tutorial"
							})]
						}),
						/* @__PURE__ */ jsxs("ol", {
							className: "space-y-2.5 text-xs text-[#cbd5e1] list-decimal list-inside leading-relaxed",
							children: [
								/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", {
									className: "text-[#f5efdf]",
									children: "Move diagonally."
								}), " Player 1 moves first. Select a highlighted piece then a highlighted destination square."] }),
								/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", {
									className: "text-[#f5efdf]",
									children: "Compulsory captures."
								}), " Jump over an opponent into an empty square. If a jump is available, you MUST capture."] }),
								/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", {
									className: "text-[#f5efdf]",
									children: "Multiple jumps."
								}), " If the same piece can capture again, you must continue jumping."] }),
								/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", {
									className: "text-[#f5efdf]",
									children: "Flying Kings."
								}), " Reach the opponent's back row to promote to a King capable of flying across long diagonals."] }),
								/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", {
									className: "text-[#f5efdf]",
									children: "Match Victory."
								}), " Capture all enemy pieces or block them from making legal moves."] })
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#d6a735] text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(ShieldCheck, {
								size: 16,
								className: "shrink-0 text-[#d6a735]"
							}), /* @__PURE__ */ jsx("span", { children: "Server validates all moves, turn clocks, and wagers automatically." })]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all",
							onClick: () => setShowGuide(false),
							children: "Got it, back to the game"
						})
					]
				})
			}),
			showThemeModal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto",
				onClick: () => setShowThemeModal(false),
				children: /* @__PURE__ */ jsxs("section", {
					className: "w-full max-w-xl bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-6 shadow-2xl relative space-y-5 my-8",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "absolute top-4 right-4 text-[#cbd5e1] hover:text-white p-1 rounded-lg hover:bg-[#144435] transition-colors",
							onClick: () => setShowThemeModal(false),
							children: /* @__PURE__ */ jsx(X, { size: 20 })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3 border-b border-[#184d3c] pb-4",
							children: [/* @__PURE__ */ jsx("div", {
								className: "w-10 h-10 rounded-xl bg-[#d6a735]/15 border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] shrink-0",
								children: /* @__PURE__ */ jsx(Palette, { size: 22 })
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
								className: "text-lg font-extrabold text-[#f5efdf] font-serif flex items-center gap-2",
								children: "Device Theme & Style Customizer"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xs text-[#cbd5e1]",
								children: "Customized per-device preferences saved locally to your browser."
							})] })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ jsxs("h3", {
								className: "text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5",
								children: [/* @__PURE__ */ jsx(Sparkles, { size: 14 }), " Select Board Grid Theme"]
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
								children: Object.keys(BOARD_THEME_STYLES).map((key) => {
									const cfg = BOARD_THEME_STYLES[key];
									const isSelected = boardTheme === key;
									return /* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => saveCustomTheme(key, marbleTheme),
										className: `p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${isSelected ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30" : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-[#184d3c] shrink-0 shadow-md",
											children: [
												/* @__PURE__ */ jsx("div", { style: { backgroundColor: cfg.restBg } }),
												/* @__PURE__ */ jsx("div", { style: { backgroundColor: cfg.playableBg } }),
												/* @__PURE__ */ jsx("div", { style: { backgroundColor: cfg.playableAltBg } }),
												/* @__PURE__ */ jsx("div", { style: { backgroundColor: cfg.restBg } })
											]
										}), /* @__PURE__ */ jsxs("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("strong", {
													className: "text-xs font-bold text-[#f5efdf]",
													children: cfg.name
												}), isSelected && /* @__PURE__ */ jsx(Check, {
													size: 14,
													className: "text-[#d6a735]"
												})]
											}), /* @__PURE__ */ jsx("p", {
												className: "text-[10px] text-[#cbd5e1] leading-snug mt-0.5 line-clamp-2",
												children: cfg.description
											})]
										})]
									}, key);
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-3 pt-2",
							children: [/* @__PURE__ */ jsxs("h3", {
								className: "text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5",
								children: [/* @__PURE__ */ jsx(Target, { size: 14 }), " Select Marble Piece Style"]
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
								children: Object.keys(MARBLE_THEME_STYLES).map((key) => {
									const cfg = MARBLE_THEME_STYLES[key];
									const isSelected = marbleTheme === key;
									return /* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => saveCustomTheme(boardTheme, key),
										className: `p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${isSelected ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30" : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "w-10 h-10 rounded-lg bg-[#06261f] border border-[#184d3c] flex items-center justify-center gap-1 shrink-0",
											children: [/* @__PURE__ */ jsx("span", {
												className: "w-4 h-4 rounded-full border shadow",
												style: cfg.whiteStyle
											}), /* @__PURE__ */ jsx("span", {
												className: "w-4 h-4 rounded-full border shadow",
												style: cfg.blackStyle
											})]
										}), /* @__PURE__ */ jsxs("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("strong", {
													className: "text-xs font-bold text-[#f5efdf]",
													children: cfg.name
												}), isSelected && /* @__PURE__ */ jsx(Check, {
													size: 14,
													className: "text-[#d6a735]"
												})]
											}), /* @__PURE__ */ jsx("p", {
												className: "text-[10px] text-[#cbd5e1] leading-snug mt-0.5 line-clamp-2",
												children: cfg.description
											})]
										})]
									}, key);
								})
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "pt-2",
							children: /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl gap-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "space-y-0.5 min-w-0",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "text-xs font-bold text-[#f5efdf] flex items-center gap-1.5",
										children: [/* @__PURE__ */ jsx(Sparkles, {
											size: 14,
											className: "text-[#d6a735] shrink-0"
										}), " Smooth Piece Move Animations"]
									}), /* @__PURE__ */ jsx("p", {
										className: "text-[10px] text-[#cbd5e1] leading-tight",
										children: "Animates marbles smoothly with CSS transition spring-pop effects when moves occur."
									})]
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => togglePieceAnimation(!animatePieces),
									className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${animatePieces ? "bg-[#d6a735]" : "bg-[#06261f]"}`,
									role: "switch",
									"aria-checked": animatePieces,
									children: /* @__PURE__ */ jsx("span", { className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#06261f] shadow-lg ring-0 transition duration-200 ease-in-out ${animatePieces ? "translate-x-5" : "translate-x-0"}` })
								})]
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl space-y-2",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between text-[11px] font-bold text-[#f5efdf]",
								children: [/* @__PURE__ */ jsx("span", { children: "Active Preview on Your Device" }), /* @__PURE__ */ jsx("span", {
									className: "text-emerald-400 font-mono text-[10px]",
									children: "Saved to localStorage"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-center gap-4 py-2",
								children: [/* @__PURE__ */ jsx("div", {
									className: "w-20 h-20 rounded-xl border border-[#d6a735]/40 p-1 grid grid-cols-3 grid-rows-3 shadow-lg",
									style: { backgroundColor: activeBoardConfig.boardBg },
									children: [
										0,
										1,
										2,
										3,
										4,
										5,
										6,
										7,
										8
									].map((i) => {
										return /* @__PURE__ */ jsxs("div", {
											className: "rounded-sm flex items-center justify-center",
											style: { backgroundColor: i % 2 === 1 ? activeBoardConfig.playableBg : activeBoardConfig.restBg },
											children: [i === 1 && /* @__PURE__ */ jsx("span", {
												className: "w-3.5 h-3.5 rounded-full border shadow-sm",
												style: activeMarbleConfig.whiteStyle
											}), i === 7 && /* @__PURE__ */ jsx("span", {
												className: "w-3.5 h-3.5 rounded-full border shadow-sm",
												style: activeMarbleConfig.blackStyle
											})]
										}, i);
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "text-left space-y-1 text-xs",
									children: [
										/* @__PURE__ */ jsx("p", {
											className: "text-[#f5efdf] font-bold",
											children: activeBoardConfig.name
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[#cbd5e1] text-[11px]",
											children: activeMarbleConfig.name
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[#d6a735] text-[10px] italic",
											children: "Applies immediately to your board view"
										})
									]
								})]
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-lg",
							onClick: () => setShowThemeModal(false),
							children: "Done & Continue Playing"
						})
					]
				})
			})
		]
	});
}
//#endregion
export { ArenaPage as default };
