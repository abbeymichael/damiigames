import { Board, Player, Move, getBestCpuMove, applyMove, formatMoveNotation, legalMoves } from "./damii-rules";
import { dbRepository } from "./db-client";
import { Room, MoveLogEntry } from "./types";
import { securityService } from "./security";

// 100 realistic, authentic player profiles for automatic matchmaking in casual/free rooms
export const BOT_ACCOUNTS: Array<{
  token: string;
  username: string;
  phoneNumber?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestStreak: number;
}> = [
  { token: "bot-player-001", username: "Kwame_Damii", rating: 1340, wins: 42, losses: 28, draws: 10, winStreak: 3, bestStreak: 7 },
  { token: "bot-player-002", username: "KofiDraughts", rating: 1220, wins: 25, losses: 23, draws: 6, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-003", username: "Akosua_Master", rating: 1480, wins: 78, losses: 41, draws: 15, winStreak: 4, bestStreak: 9 },
  { token: "bot-player-004", username: "Yaw_King", rating: 1190, wins: 18, losses: 22, draws: 5, winStreak: 0, bestStreak: 3 },
  { token: "bot-player-005", username: "AmaTactics", rating: 1310, wins: 36, losses: 29, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-006", username: "Kweku_10x10", rating: 1420, wins: 64, losses: 38, draws: 12, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-007", username: "Esi_Grand", rating: 1560, wins: 112, losses: 54, draws: 22, winStreak: 5, bestStreak: 12 },
  { token: "bot-player-008", username: "Aboagye_Pro", rating: 1270, wins: 31, losses: 27, draws: 7, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-009", username: "Nana_Kwesi", rating: 1380, wins: 53, losses: 35, draws: 9, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-010", username: "Adjoa_Star", rating: 1210, wins: 20, losses: 19, draws: 4, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-011", username: "Mensah_Strike", rating: 1450, wins: 71, losses: 44, draws: 14, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-012", username: "Osei_Tutu", rating: 1610, wins: 130, losses: 60, draws: 25, winStreak: 6, bestStreak: 14 },
  { token: "bot-player-013", username: "Afia_Champion", rating: 1390, wins: 56, losses: 37, draws: 11, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-014", username: "Bempong_07", rating: 1180, wins: 15, losses: 21, draws: 3, winStreak: 0, bestStreak: 3 },
  { token: "bot-player-015", username: "Sarpong_Play", rating: 1330, wins: 40, losses: 31, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-016", username: "Boateng_Accra", rating: 1490, wins: 85, losses: 46, draws: 16, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-017", username: "Frimpong_Draught", rating: 1250, wins: 28, losses: 26, draws: 5, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-018", username: "Abena_Genius", rating: 1540, wins: 105, losses: 51, draws: 19, winStreak: 5, bestStreak: 11 },
  { token: "bot-player-019", username: "Gyasi_Board", rating: 1280, wins: 33, losses: 28, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-020", username: "Opoku_Blitz", rating: 1360, wins: 48, losses: 34, draws: 10, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-021", username: "Darko_Sharp", rating: 1410, wins: 62, losses: 39, draws: 13, winStreak: 3, bestStreak: 7 },
  { token: "bot-player-022", username: "Agyeman_Ace", rating: 1520, wins: 95, losses: 49, draws: 18, winStreak: 4, bestStreak: 11 },
  { token: "bot-player-023", username: "Baah_Tempo", rating: 1230, wins: 23, losses: 24, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-024", username: "Owusu_Tema", rating: 1350, wins: 45, losses: 33, draws: 9, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-025", username: "Kyeremeh_Fly", rating: 1460, wins: 75, losses: 43, draws: 14, winStreak: 3, bestStreak: 9 },
  { token: "bot-player-026", username: "Yeboah_Elite", rating: 1580, wins: 120, losses: 56, draws: 24, winStreak: 5, bestStreak: 13 },
  { token: "bot-player-027", username: "Asare_Classic", rating: 1260, wins: 30, losses: 26, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-028", username: "Appiah_Kumasi", rating: 1370, wins: 50, losses: 36, draws: 10, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-029", username: "Gyan_Striker", rating: 1430, wins: 68, losses: 40, draws: 13, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-030", username: "Acheampong_21", rating: 1290, wins: 35, losses: 30, draws: 7, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-031", username: "Tetteh_Sniper", rating: 1500, wins: 88, losses: 47, draws: 17, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-032", username: "Quaye_Moves", rating: 1200, wins: 19, losses: 21, draws: 4, winStreak: 0, bestStreak: 3 },
  { token: "bot-player-033", username: "Lartey_Fast", rating: 1320, wins: 38, losses: 30, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-034", username: "Nartey_Tactician", rating: 1440, wins: 70, losses: 42, draws: 14, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-035", username: "Annan_Power", rating: 1570, wins: 115, losses: 55, draws: 23, winStreak: 5, bestStreak: 12 },
  { token: "bot-player-036", username: "Tagoe_King", rating: 1240, wins: 26, losses: 25, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-037", username: "Adjei_10x10", rating: 1380, wins: 52, losses: 35, draws: 10, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-038", username: "Lamptey_Speed", rating: 1470, wins: 79, losses: 44, draws: 15, winStreak: 4, bestStreak: 9 },
  { token: "bot-player-039", username: "Aryee_Focus", rating: 1215, wins: 21, losses: 20, draws: 4, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-040", username: "Dodoo_Master", rating: 1345, wins: 44, losses: 32, draws: 9, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-041", username: "Kotei_Draughts", rating: 1405, wins: 60, losses: 38, draws: 12, winStreak: 3, bestStreak: 7 },
  { token: "bot-player-042", username: "Sackey_Boss", rating: 1530, wins: 100, losses: 50, draws: 19, winStreak: 4, bestStreak: 11 },
  { token: "bot-player-043", username: "Mills_Arena", rating: 1265, wins: 29, losses: 27, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-044", username: "Vanderpuye_Ace", rating: 1395, wins: 58, losses: 37, draws: 11, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-045", username: "Bruce_Damii", rating: 1485, wins: 82, losses: 45, draws: 16, winStreak: 4, bestStreak: 9 },
  { token: "bot-player-046", username: "Hammond_Pro", rating: 1225, wins: 24, losses: 23, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-047", username: "Plange_Jump", rating: 1335, wins: 41, losses: 31, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-048", username: "Allotey_Knight", rating: 1455, wins: 73, losses: 43, draws: 14, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-049", username: "Addy_Grand", rating: 1590, wins: 124, losses: 58, draws: 24, winStreak: 6, bestStreak: 13 },
  { token: "bot-player-050", username: "Cleland_10", rating: 1275, wins: 32, losses: 28, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-051", username: "Koranteng_Cap", rating: 1365, wins: 49, losses: 34, draws: 10, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-052", username: "Amoah_Strike", rating: 1425, wins: 66, losses: 40, draws: 13, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-053", username: "Danso_Pro", rating: 1245, wins: 27, losses: 25, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-054", username: "Twumasi_Fly", rating: 1375, wins: 51, losses: 35, draws: 10, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-055", username: "Boakye_Gold", rating: 1515, wins: 92, losses: 48, draws: 18, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-056", username: "Agyei_Board", rating: 1195, wins: 17, losses: 21, draws: 4, winStreak: 0, bestStreak: 3 },
  { token: "bot-player-057", username: "Frempong_Ace", rating: 1315, wins: 37, losses: 29, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-058", username: "Danquah_Gen", rating: 1465, wins: 76, losses: 43, draws: 15, winStreak: 3, bestStreak: 9 },
  { token: "bot-player-059", username: "Antwi_Champion", rating: 1550, wins: 108, losses: 52, draws: 20, winStreak: 5, bestStreak: 12 },
  { token: "bot-player-060", username: "Boadu_Knight", rating: 1285, wins: 34, losses: 29, draws: 7, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-061", username: "Amoako_Tactics", rating: 1415, wins: 63, losses: 39, draws: 12, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-062", username: "Kwakye_Tema", rating: 1255, wins: 29, losses: 26, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-063", username: "Asamoah_Blitz", rating: 1385, wins: 54, losses: 36, draws: 11, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-064", username: "Kusi_Grand", rating: 1505, wins: 90, losses: 47, draws: 17, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-065", username: "Adubofour_Pro", rating: 1235, wins: 24, losses: 24, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-066", username: "Poku_Draughts", rating: 1355, wins: 46, losses: 33, draws: 9, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-067", username: "Oteng_Sharp", rating: 1435, wins: 69, losses: 41, draws: 13, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-068", username: "Nkrumah_King", rating: 1600, wins: 128, losses: 59, draws: 25, winStreak: 6, bestStreak: 14 },
  { token: "bot-player-069", username: "Prempeh_Master", rating: 1525, wins: 97, losses: 49, draws: 18, winStreak: 4, bestStreak: 11 },
  { token: "bot-player-070", username: "Bonsu_Accra", rating: 1295, wins: 36, losses: 30, draws: 7, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-071", username: "Donkor_Jump", rating: 1340, wins: 43, losses: 32, draws: 9, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-072", username: "Agyapong_Ace", rating: 1475, wins: 80, losses: 44, draws: 15, winStreak: 4, bestStreak: 9 },
  { token: "bot-player-073", username: "Sefa_Fast", rating: 1210, wins: 20, losses: 20, draws: 4, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-074", username: "Oppong_Board", rating: 1330, wins: 39, losses: 30, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-075", username: "Kwarteng_Pro", rating: 1445, wins: 72, losses: 42, draws: 14, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-076", username: "Duah_Sniper", rating: 1565, wins: 114, losses: 54, draws: 22, winStreak: 5, bestStreak: 12 },
  { token: "bot-player-077", username: "Wiredu_Tactics", rating: 1270, wins: 31, losses: 27, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-078", username: "Gyimah_Strike", rating: 1390, wins: 55, losses: 36, draws: 11, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-079", username: "Fosu_Champion", rating: 1480, wins: 81, losses: 45, draws: 16, winStreak: 4, bestStreak: 9 },
  { token: "bot-player-080", username: "Gyamfi_Knight", rating: 1220, wins: 22, losses: 22, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-081", username: "Obeng_Speed", rating: 1350, wins: 45, losses: 33, draws: 9, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-082", username: "Marfo_Boss", rating: 1420, wins: 65, losses: 39, draws: 13, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-083", username: "Kyere_Grand", rating: 1545, wins: 106, losses: 51, draws: 20, winStreak: 5, bestStreak: 11 },
  { token: "bot-player-084", username: "Amoateng_Ace", rating: 1280, wins: 33, losses: 29, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-085", username: "Paintsil_Damii", rating: 1400, wins: 59, losses: 38, draws: 12, winStreak: 3, bestStreak: 7 },
  { token: "bot-player-086", username: "Arthur_CapeCoast", rating: 1460, wins: 74, losses: 43, draws: 15, winStreak: 3, bestStreak: 9 },
  { token: "bot-player-087", username: "Essien_Midfield", rating: 1585, wins: 122, losses: 57, draws: 24, winStreak: 5, bestStreak: 13 },
  { token: "bot-player-088", username: "Paintsil_Pro", rating: 1240, wins: 25, losses: 25, draws: 5, winStreak: 1, bestStreak: 4 },
  { token: "bot-player-089", username: "Mintah_10x10", rating: 1360, wins: 47, losses: 34, draws: 10, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-090", username: "Buckman_Sharp", rating: 1430, wins: 67, losses: 40, draws: 13, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-091", username: "Aggrey_Gen", rating: 1260, wins: 30, losses: 27, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-092", username: "Crentsil_Tempo", rating: 1370, wins: 50, losses: 35, draws: 10, winStreak: 2, bestStreak: 7 },
  { token: "bot-player-093", username: "Hayford_Master", rating: 1495, wins: 86, losses: 46, draws: 17, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-094", username: "Quansah_Tema", rating: 1205, wins: 18, losses: 21, draws: 4, winStreak: 0, bestStreak: 3 },
  { token: "bot-player-095", username: "Turkson_King", rating: 1325, wins: 38, losses: 30, draws: 8, winStreak: 2, bestStreak: 6 },
  { token: "bot-player-096", username: "Dadzie_Tactics", rating: 1450, wins: 73, losses: 43, draws: 14, winStreak: 3, bestStreak: 8 },
  { token: "bot-player-097", username: "Koomson_Fast", rating: 1510, wins: 93, losses: 48, draws: 18, winStreak: 4, bestStreak: 10 },
  { token: "bot-player-098", username: "Eshun_Sniper", rating: 1275, wins: 32, losses: 28, draws: 6, winStreak: 1, bestStreak: 5 },
  { token: "bot-player-099", username: "Bentsil_Grand", rating: 1395, wins: 57, losses: 37, draws: 11, winStreak: 3, bestStreak: 7 },
  { token: "bot-player-100", username: "Abban_Accra", rating: 1480, wins: 80, losses: 45, draws: 15, winStreak: 4, bestStreak: 9 },
];

export const botService = {
  isBot(token: string | null | undefined): boolean {
    if (!token) return false;
    return token.startsWith("bot-player-");
  },

  getRandomBot(): (typeof BOT_ACCOUNTS)[0] {
    const idx = Math.floor(Math.random() * BOT_ACCOUNTS.length);
    return BOT_ACCOUNTS[idx];
  },

  /**
   * Matches an unjoined casual room to an authentic player profile if no human joins
   */
  async matchmakeBotIfEligible(room: Room): Promise<boolean> {
    if (room.status !== "waiting" || room.guestToken || room.isPrivate || room.mode !== "casual") {
      return false;
    }

    const hostToken = room.hostToken;
    const availableBots = BOT_ACCOUNTS.filter((b) => b.token !== hostToken);
    if (availableBots.length === 0) return false;

    // Pick a bot close in rating if possible
    const hostProfile = await dbRepository.getProfile(hostToken);
    const hostRating = hostProfile?.rating || 1200;

    availableBots.sort((a, b) => Math.abs(a.rating - hostRating) - Math.abs(b.rating - hostRating));
    // Pick from top 5 closest rating
    const candidatePool = availableBots.slice(0, Math.min(5, availableBots.length));
    const chosenBot = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    // Ensure bot profile exists in store
    await dbRepository.upsertProfile(chosenBot.token, chosenBot.username);

    room.guestName = chosenBot.username;
    room.guestToken = chosenBot.token;
    room.guestReady = true;
    room.hostReady = true;
    room.status = "playing";
    room.lastMoveTime = Date.now();
    room.disconnectTime = null;
    room.disconnectedPlayer = null;

    await dbRepository.saveRoom(room);
    return true;
  },

  /**
   * Triggers a bot move if it's the bot's turn in an online match
   */
  async triggerBotMoveIfTurn(room: Room): Promise<boolean> {
    if (room.status !== "playing") return false;

    const isHostBot = botService.isBot(room.hostToken);
    const isGuestBot = botService.isBot(room.guestToken);

    if (!isHostBot && !isGuestBot) return false;

    const botRole: Player | null =
      room.turn === "white" && isHostBot ? "white" : room.turn === "black" && isGuestBot ? "black" : null;

    if (!botRole) return false;

    // Bot needs to move!
    const board: Board = JSON.parse(room.boardJson);
    const moves = legalMoves(board, room.turn, room.forcedFrom, room.ruleVariations);
    if (moves.length === 0) {
      // Bot has no legal moves -> other player wins
      room.winner = room.turn === "white" ? "black" : "white";
      room.status = "completed";
      await dbRepository.saveRoom(room);
      return true;
    }

    // Determine difficulty based on bot's simulated rating
    const botToken = botRole === "white" ? room.hostToken : room.guestToken;
    const botAccount = BOT_ACCOUNTS.find((b) => b.token === botToken);
    const rating = botAccount?.rating || 1300;
    const difficulty: "easy" | "medium" | "hard" = rating >= 1500 ? "hard" : rating >= 1300 ? "medium" : "easy";

    const move = getBestCpuMove(board, room.turn, room.forcedFrom, difficulty, room.ruleVariations);
    if (!move) return false;

    const result = applyMove(board, room.turn, room.forcedFrom, move.from, move.to, room.ruleVariations);
    room.boardJson = JSON.stringify(result.board);

    const formatted = formatMoveNotation(move.from, move.to, result.captured);
    const botPlayerName = botRole === "white" ? room.hostName : (room.guestName || "Opponent");
    const moveEntry: MoveLogEntry = {
      moveNumber: room.moveCount + 1,
      player: room.turn,
      playerName: botPlayerName,
      from: move.from,
      to: move.to,
      notation: formatted.notation,
      algNotation: formatted.algNotation,
      sqNotation: formatted.sqNotation,
      isCapture: result.captured,
      timestamp: Date.now(),
    };

    let existingMoves: MoveLogEntry[] = [];
    try {
      if (room.movesJson) existingMoves = JSON.parse(room.movesJson);
    } catch {
      existingMoves = [];
    }
    existingMoves.push(moveEntry);
    room.movesJson = JSON.stringify(existingMoves);

    room.turn = result.turn;
    room.forcedFrom = result.forcedFrom;
    room.winner = result.winner;
    room.moveCount += 1;
    room.lastMoveTime = Date.now();
    room.disconnectTime = null;
    room.disconnectedPlayer = null;

    if (result.winner) {
      room.status = "completed";
    }

    await dbRepository.saveRoom(room);
    return true;
  },
};
