import { Board, Player, Move, getBestCpuMove, applyMove, formatMoveNotation, legalMoves } from "./damii-rules";
import { dbRepository } from "./db-client";
import { Room, MoveLogEntry, Profile } from "./types";
import { securityService } from "./security";

// 100 realistic, authentic player profiles for automatic matchmaking in casual/free rooms
export interface BotAccountConfig {
  token: string;
  username: string;
  phoneNumber?: string;
  region?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestStreak: number;
  bankrollPoints?: number;
  bankrollMarbles?: number;
  status?: "active" | "paused" | "in_match";
  difficultyTier?: "easy" | "medium" | "hard" | "adaptive";
  maxWagerPoints?: number;
  dailyLossLimitPoints?: number;
}

export interface BotFleetSettings {
  matchmakingEnabled: boolean;
  casualJoinDelayMs: number;
  allowWagerMatches: boolean;
  defaultDifficulty: "adaptive" | "easy" | "medium" | "hard";
  globalBankrollCap: number;
  maxWagerPerBot: number;
  updatedAt: string;
}

// 100 realistic, authentic Ghanaian and international player profiles for automated casual matchmaking and practice
export const BOT_ACCOUNTS: BotAccountConfig[] = [
  { token: "bot-player-001", username: "Kwame_Damii", region: "Greater Accra", rating: 1340, wins: 42, losses: 28, draws: 10, winStreak: 3, bestStreak: 7, bankrollPoints: 350, bankrollMarbles: 350, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-002", username: "KofiDraughts", region: "Ashanti", rating: 1220, wins: 25, losses: 23, draws: 6, winStreak: 1, bestStreak: 4, bankrollPoints: 200, bankrollMarbles: 200, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-003", username: "Akosua_Master", region: "Central", rating: 1480, wins: 78, losses: 41, draws: 15, winStreak: 4, bestStreak: 9, bankrollPoints: 500, bankrollMarbles: 500, status: "active", difficultyTier: "hard" },
  { token: "bot-player-004", username: "Yaw_King", region: "Eastern", rating: 1190, wins: 18, losses: 22, draws: 5, winStreak: 0, bestStreak: 3, bankrollPoints: 150, bankrollMarbles: 150, status: "active", difficultyTier: "easy" },
  { token: "bot-player-005", username: "AmaTactics", region: "Western", rating: 1310, wins: 36, losses: 29, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 300, bankrollMarbles: 300, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-006", username: "Kweku_10x10", region: "Greater Accra", rating: 1420, wins: 64, losses: 38, draws: 12, winStreak: 3, bestStreak: 8, bankrollPoints: 450, bankrollMarbles: 450, status: "active", difficultyTier: "medium" },
  { token: "bot-player-007", username: "Esi_Grand", region: "Volta", rating: 1560, wins: 112, losses: 54, draws: 22, winStreak: 5, bestStreak: 12, bankrollPoints: 750, bankrollMarbles: 750, status: "active", difficultyTier: "hard" },
  { token: "bot-player-008", username: "Aboagye_Pro", region: "Ashanti", rating: 1270, wins: 31, losses: 27, draws: 7, winStreak: 1, bestStreak: 5, bankrollPoints: 250, bankrollMarbles: 250, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-009", username: "Nana_Kwesi", region: "Central", rating: 1380, wins: 53, losses: 35, draws: 9, winStreak: 2, bestStreak: 7, bankrollPoints: 400, bankrollMarbles: 400, status: "active", difficultyTier: "medium" },
  { token: "bot-player-010", username: "Adjoa_Star", region: "Greater Accra", rating: 1210, wins: 20, losses: 19, draws: 4, winStreak: 1, bestStreak: 4, bankrollPoints: 200, bankrollMarbles: 200, status: "active", difficultyTier: "easy" },
  { token: "bot-player-011", username: "Mensah_Strike", region: "Northern", rating: 1450, wins: 71, losses: 44, draws: 14, winStreak: 3, bestStreak: 8, bankrollPoints: 480, bankrollMarbles: 480, status: "active", difficultyTier: "hard" },
  { token: "bot-player-012", username: "Osei_Tutu", region: "Ashanti", rating: 1610, wins: 130, losses: 60, draws: 25, winStreak: 6, bestStreak: 14, bankrollPoints: 1000, bankrollMarbles: 1000, status: "active", difficultyTier: "hard" },
  { token: "bot-player-013", username: "Afia_Champion", region: "Eastern", rating: 1390, wins: 56, losses: 37, draws: 11, winStreak: 2, bestStreak: 7, bankrollPoints: 420, bankrollMarbles: 420, status: "active", difficultyTier: "medium" },
  { token: "bot-player-014", username: "Bempong_07", region: "Bono", rating: 1180, wins: 15, losses: 21, draws: 3, winStreak: 0, bestStreak: 3, bankrollPoints: 150, bankrollMarbles: 150, status: "active", difficultyTier: "easy" },
  { token: "bot-player-015", username: "Sarpong_Play", region: "Ashanti", rating: 1330, wins: 40, losses: 31, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 320, bankrollMarbles: 320, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-016", username: "Boateng_Accra", region: "Greater Accra", rating: 1490, wins: 85, losses: 46, draws: 16, winStreak: 4, bestStreak: 10, bankrollPoints: 550, bankrollMarbles: 550, status: "active", difficultyTier: "hard" },
  { token: "bot-player-017", username: "Frimpong_Draught", region: "Western", rating: 1250, wins: 28, losses: 26, draws: 5, winStreak: 1, bestStreak: 5, bankrollPoints: 240, bankrollMarbles: 240, status: "active", difficultyTier: "easy" },
  { token: "bot-player-018", username: "Abena_Genius", region: "Central", rating: 1540, wins: 105, losses: 51, draws: 19, winStreak: 5, bestStreak: 11, bankrollPoints: 700, bankrollMarbles: 700, status: "active", difficultyTier: "hard" },
  { token: "bot-player-019", username: "Gyasi_Board", region: "Bono East", rating: 1280, wins: 33, losses: 28, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 260, bankrollMarbles: 260, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-020", username: "Opoku_Blitz", region: "Ashanti", rating: 1360, wins: 48, losses: 34, draws: 10, winStreak: 2, bestStreak: 6, bankrollPoints: 380, bankrollMarbles: 380, status: "active", difficultyTier: "medium" },
  { token: "bot-player-021", username: "Darko_Sharp", region: "Eastern", rating: 1410, wins: 62, losses: 39, draws: 13, winStreak: 3, bestStreak: 7, bankrollPoints: 440, bankrollMarbles: 440, status: "active", difficultyTier: "medium" },
  { token: "bot-player-022", username: "Agyeman_Ace", region: "Greater Accra", rating: 1520, wins: 95, losses: 49, draws: 18, winStreak: 4, bestStreak: 11, bankrollPoints: 650, bankrollMarbles: 650, status: "active", difficultyTier: "hard" },
  { token: "bot-player-023", username: "Baah_Tempo", region: "Western North", rating: 1230, wins: 23, losses: 24, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 220, bankrollMarbles: 220, status: "active", difficultyTier: "easy" },
  { token: "bot-player-024", username: "Owusu_Tema", region: "Greater Accra", rating: 1350, wins: 45, losses: 33, draws: 9, winStreak: 2, bestStreak: 6, bankrollPoints: 360, bankrollMarbles: 360, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-025", username: "Kyeremeh_Fly", region: "Ahafo", rating: 1460, wins: 75, losses: 43, draws: 14, winStreak: 3, bestStreak: 9, bankrollPoints: 500, bankrollMarbles: 500, status: "active", difficultyTier: "hard" },
  { token: "bot-player-026", username: "Yeboah_Elite", region: "Ashanti", rating: 1580, wins: 120, losses: 56, draws: 24, winStreak: 5, bestStreak: 13, bankrollPoints: 850, bankrollMarbles: 850, status: "active", difficultyTier: "hard" },
  { token: "bot-player-027", username: "Asare_Classic", region: "Central", rating: 1260, wins: 30, losses: 26, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 250, bankrollMarbles: 250, status: "active", difficultyTier: "easy" },
  { token: "bot-player-028", username: "Appiah_Kumasi", region: "Ashanti", rating: 1370, wins: 50, losses: 36, draws: 10, winStreak: 2, bestStreak: 7, bankrollPoints: 390, bankrollMarbles: 390, status: "active", difficultyTier: "medium" },
  { token: "bot-player-029", username: "Gyan_Striker", region: "Greater Accra", rating: 1430, wins: 68, losses: 40, draws: 13, winStreak: 3, bestStreak: 8, bankrollPoints: 460, bankrollMarbles: 460, status: "active", difficultyTier: "medium" },
  { token: "bot-player-030", username: "Acheampong_21", region: "Eastern", rating: 1290, wins: 35, losses: 30, draws: 7, winStreak: 1, bestStreak: 5, bankrollPoints: 280, bankrollMarbles: 280, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-031", username: "Tetteh_Sniper", region: "Greater Accra", rating: 1500, wins: 88, losses: 47, draws: 17, winStreak: 4, bestStreak: 10, bankrollPoints: 600, bankrollMarbles: 600, status: "active", difficultyTier: "hard" },
  { token: "bot-player-032", username: "Quaye_Moves", region: "Greater Accra", rating: 1200, wins: 19, losses: 21, draws: 4, winStreak: 0, bestStreak: 3, bankrollPoints: 180, bankrollMarbles: 180, status: "active", difficultyTier: "easy" },
  { token: "bot-player-033", username: "Lartey_Fast", region: "Central", rating: 1320, wins: 38, losses: 30, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 310, bankrollMarbles: 310, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-034", username: "Nartey_Tactician", region: "Greater Accra", rating: 1440, wins: 70, losses: 42, draws: 14, winStreak: 3, bestStreak: 8, bankrollPoints: 470, bankrollMarbles: 470, status: "active", difficultyTier: "medium" },
  { token: "bot-player-035", username: "Annan_Power", region: "Greater Accra", rating: 1570, wins: 115, losses: 55, draws: 23, winStreak: 5, bestStreak: 12, bankrollPoints: 800, bankrollMarbles: 800, status: "active", difficultyTier: "hard" },
  { token: "bot-player-036", username: "Tagoe_King", region: "Greater Accra", rating: 1240, wins: 26, losses: 25, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 230, bankrollMarbles: 230, status: "active", difficultyTier: "easy" },
  { token: "bot-player-037", username: "Adjei_10x10", region: "Ashanti", rating: 1380, wins: 52, losses: 35, draws: 10, winStreak: 2, bestStreak: 7, bankrollPoints: 410, bankrollMarbles: 410, status: "active", difficultyTier: "medium" },
  { token: "bot-player-038", username: "Lamptey_Speed", region: "Greater Accra", rating: 1470, wins: 79, losses: 44, draws: 15, winStreak: 4, bestStreak: 9, bankrollPoints: 520, bankrollMarbles: 520, status: "active", difficultyTier: "hard" },
  { token: "bot-player-039", username: "Aryee_Focus", region: "Greater Accra", rating: 1215, wins: 21, losses: 20, draws: 4, winStreak: 1, bestStreak: 4, bankrollPoints: 200, bankrollMarbles: 200, status: "active", difficultyTier: "easy" },
  { token: "bot-player-040", username: "Dodoo_Master", region: "Greater Accra", rating: 1345, wins: 44, losses: 32, draws: 9, winStreak: 2, bestStreak: 6, bankrollPoints: 350, bankrollMarbles: 350, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-041", username: "Kotei_Draughts", region: "Greater Accra", rating: 1405, wins: 60, losses: 38, draws: 12, winStreak: 3, bestStreak: 7, bankrollPoints: 430, bankrollMarbles: 430, status: "active", difficultyTier: "medium" },
  { token: "bot-player-042", username: "Sackey_Boss", region: "Greater Accra", rating: 1530, wins: 100, losses: 50, draws: 19, winStreak: 4, bestStreak: 11, bankrollPoints: 680, bankrollMarbles: 680, status: "active", difficultyTier: "hard" },
  { token: "bot-player-043", username: "Mills_Arena", region: "Central", rating: 1265, wins: 29, losses: 27, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 250, bankrollMarbles: 250, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-044", username: "Vanderpuye_Ace", region: "Greater Accra", rating: 1395, wins: 58, losses: 37, draws: 11, winStreak: 3, bestStreak: 8, bankrollPoints: 430, bankrollMarbles: 430, status: "active", difficultyTier: "medium" },
  { token: "bot-player-045", username: "Bruce_Damii", region: "Greater Accra", rating: 1485, wins: 82, losses: 45, draws: 16, winStreak: 4, bestStreak: 9, bankrollPoints: 540, bankrollMarbles: 540, status: "active", difficultyTier: "hard" },
  { token: "bot-player-046", username: "Hammond_Pro", region: "Greater Accra", rating: 1225, wins: 24, losses: 23, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 210, bankrollMarbles: 210, status: "active", difficultyTier: "easy" },
  { token: "bot-player-047", username: "Plange_Jump", region: "Central", rating: 1335, wins: 41, losses: 31, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 330, bankrollMarbles: 330, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-048", username: "Allotey_Knight", region: "Greater Accra", rating: 1455, wins: 73, losses: 43, draws: 14, winStreak: 3, bestStreak: 8, bankrollPoints: 490, bankrollMarbles: 490, status: "active", difficultyTier: "hard" },
  { token: "bot-player-049", username: "Addy_Grand", region: "Greater Accra", rating: 1590, wins: 124, losses: 58, draws: 24, winStreak: 6, bestStreak: 13, bankrollPoints: 900, bankrollMarbles: 900, status: "active", difficultyTier: "hard" },
  { token: "bot-player-050", username: "Cleland_10", region: "Greater Accra", rating: 1275, wins: 32, losses: 28, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 260, bankrollMarbles: 260, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-051", username: "Koranteng_Cap", region: "Eastern", rating: 1365, wins: 49, losses: 34, draws: 10, winStreak: 2, bestStreak: 7, bankrollPoints: 380, bankrollMarbles: 380, status: "active", difficultyTier: "medium" },
  { token: "bot-player-052", username: "Amoah_Strike", region: "Ashanti", rating: 1425, wins: 66, losses: 40, draws: 13, winStreak: 3, bestStreak: 8, bankrollPoints: 450, bankrollMarbles: 450, status: "active", difficultyTier: "medium" },
  { token: "bot-player-053", username: "Danso_Pro", region: "Eastern", rating: 1245, wins: 27, losses: 25, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 230, bankrollMarbles: 230, status: "active", difficultyTier: "easy" },
  { token: "bot-player-054", username: "Twumasi_Fly", region: "Bono", rating: 1375, wins: 51, losses: 35, draws: 10, winStreak: 2, bestStreak: 7, bankrollPoints: 400, bankrollMarbles: 400, status: "active", difficultyTier: "medium" },
  { token: "bot-player-055", username: "Boakye_Gold", region: "Ashanti", rating: 1515, wins: 92, losses: 48, draws: 18, winStreak: 4, bestStreak: 10, bankrollPoints: 630, bankrollMarbles: 630, status: "active", difficultyTier: "hard" },
  { token: "bot-player-056", username: "Agyei_Board", region: "Western", rating: 1195, wins: 17, losses: 21, draws: 4, winStreak: 0, bestStreak: 3, bankrollPoints: 170, bankrollMarbles: 170, status: "active", difficultyTier: "easy" },
  { token: "bot-player-057", username: "Frempong_Ace", region: "Eastern", rating: 1315, wins: 37, losses: 29, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 310, bankrollMarbles: 310, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-058", username: "Danquah_Gen", region: "Eastern", rating: 1465, wins: 76, losses: 43, draws: 15, winStreak: 3, bestStreak: 9, bankrollPoints: 510, bankrollMarbles: 510, status: "active", difficultyTier: "hard" },
  { token: "bot-player-059", username: "Antwi_Champion", region: "Ashanti", rating: 1550, wins: 108, losses: 52, draws: 20, winStreak: 5, bestStreak: 12, bankrollPoints: 740, bankrollMarbles: 740, status: "active", difficultyTier: "hard" },
  { token: "bot-player-060", username: "Boadu_Knight", region: "Central", rating: 1285, wins: 34, losses: 29, draws: 7, winStreak: 1, bestStreak: 5, bankrollPoints: 270, bankrollMarbles: 270, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-061", username: "Amoako_Tactics", region: "Ashanti", rating: 1415, wins: 63, losses: 39, draws: 12, winStreak: 3, bestStreak: 8, bankrollPoints: 440, bankrollMarbles: 440, status: "active", difficultyTier: "medium" },
  { token: "bot-player-062", username: "Kwakye_Tema", region: "Greater Accra", rating: 1255, wins: 29, losses: 26, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 240, bankrollMarbles: 240, status: "active", difficultyTier: "easy" },
  { token: "bot-player-063", username: "Asamoah_Blitz", region: "Ashanti", rating: 1385, wins: 54, losses: 36, draws: 11, winStreak: 2, bestStreak: 7, bankrollPoints: 410, bankrollMarbles: 410, status: "active", difficultyTier: "medium" },
  { token: "bot-player-064", username: "Kusi_Grand", region: "Ashanti", rating: 1505, wins: 90, losses: 47, draws: 17, winStreak: 4, bestStreak: 10, bankrollPoints: 610, bankrollMarbles: 610, status: "active", difficultyTier: "hard" },
  { token: "bot-player-065", username: "Adubofour_Pro", region: "Bono", rating: 1235, wins: 24, losses: 24, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 220, bankrollMarbles: 220, status: "active", difficultyTier: "easy" },
  { token: "bot-player-066", username: "Poku_Draughts", region: "Ashanti", rating: 1355, wins: 46, losses: 33, draws: 9, winStreak: 2, bestStreak: 6, bankrollPoints: 370, bankrollMarbles: 370, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-067", username: "Oteng_Sharp", region: "Eastern", rating: 1435, wins: 69, losses: 41, draws: 13, winStreak: 3, bestStreak: 8, bankrollPoints: 460, bankrollMarbles: 460, status: "active", difficultyTier: "medium" },
  { token: "bot-player-068", username: "Nkrumah_King", region: "Western", rating: 1600, wins: 128, losses: 59, draws: 25, winStreak: 6, bestStreak: 14, bankrollPoints: 950, bankrollMarbles: 950, status: "active", difficultyTier: "hard" },
  { token: "bot-player-069", username: "Prempeh_Master", region: "Ashanti", rating: 1525, wins: 97, losses: 49, draws: 18, winStreak: 4, bestStreak: 11, bankrollPoints: 670, bankrollMarbles: 670, status: "active", difficultyTier: "hard" },
  { token: "bot-player-070", username: "Bonsu_Accra", region: "Greater Accra", rating: 1295, wins: 36, losses: 30, draws: 7, winStreak: 1, bestStreak: 5, bankrollPoints: 290, bankrollMarbles: 290, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-071", username: "Donkor_Jump", region: "Eastern", rating: 1340, wins: 43, losses: 32, draws: 9, winStreak: 2, bestStreak: 6, bankrollPoints: 350, bankrollMarbles: 350, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-072", username: "Agyapong_Ace", region: "Central", rating: 1475, wins: 80, losses: 44, draws: 15, winStreak: 4, bestStreak: 9, bankrollPoints: 530, bankrollMarbles: 530, status: "active", difficultyTier: "hard" },
  { token: "bot-player-073", username: "Sefa_Fast", region: "Ashanti", rating: 1210, wins: 20, losses: 20, draws: 4, winStreak: 1, bestStreak: 4, bankrollPoints: 200, bankrollMarbles: 200, status: "active", difficultyTier: "easy" },
  { token: "bot-player-074", username: "Oppong_Board", region: "Bono East", rating: 1330, wins: 39, losses: 30, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 320, bankrollMarbles: 320, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-075", username: "Kwarteng_Pro", region: "Ashanti", rating: 1445, wins: 72, losses: 42, draws: 14, winStreak: 3, bestStreak: 8, bankrollPoints: 475, bankrollMarbles: 475, status: "active", difficultyTier: "medium" },
  { token: "bot-player-076", username: "Duah_Sniper", region: "Ashanti", rating: 1565, wins: 114, losses: 54, draws: 22, winStreak: 5, bestStreak: 12, bankrollPoints: 780, bankrollMarbles: 780, status: "active", difficultyTier: "hard" },
  { token: "bot-player-077", username: "Wiredu_Tactics", region: "Eastern", rating: 1270, wins: 31, losses: 27, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 260, bankrollMarbles: 260, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-078", username: "Gyimah_Strike", region: "Ashanti", rating: 1390, wins: 55, losses: 36, draws: 11, winStreak: 2, bestStreak: 7, bankrollPoints: 420, bankrollMarbles: 420, status: "active", difficultyTier: "medium" },
  { token: "bot-player-079", username: "Fosu_Champion", region: "Central", rating: 1480, wins: 81, losses: 45, draws: 16, winStreak: 4, bestStreak: 9, bankrollPoints: 535, bankrollMarbles: 535, status: "active", difficultyTier: "hard" },
  { token: "bot-player-080", username: "Gyamfi_Knight", region: "Ashanti", rating: 1220, wins: 22, losses: 22, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 210, bankrollMarbles: 210, status: "active", difficultyTier: "easy" },
  { token: "bot-player-081", username: "Obeng_Speed", region: "Eastern", rating: 1350, wins: 45, losses: 33, draws: 9, winStreak: 2, bestStreak: 6, bankrollPoints: 360, bankrollMarbles: 360, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-082", username: "Marfo_Boss", region: "Ashanti", rating: 1420, wins: 65, losses: 39, draws: 13, winStreak: 3, bestStreak: 8, bankrollPoints: 450, bankrollMarbles: 450, status: "active", difficultyTier: "medium" },
  { token: "bot-player-083", username: "Kyere_Grand", region: "Bono", rating: 1545, wins: 106, losses: 51, draws: 20, winStreak: 5, bestStreak: 11, bankrollPoints: 720, bankrollMarbles: 720, status: "active", difficultyTier: "hard" },
  { token: "bot-player-084", username: "Amoateng_Ace", region: "Ashanti", rating: 1280, wins: 33, losses: 29, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 270, bankrollMarbles: 270, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-085", username: "Paintsil_Damii", region: "Central", rating: 1400, wins: 59, losses: 38, draws: 12, winStreak: 3, bestStreak: 7, bankrollPoints: 430, bankrollMarbles: 430, status: "active", difficultyTier: "medium" },
  { token: "bot-player-086", username: "Arthur_CapeCoast", region: "Central", rating: 1460, wins: 74, losses: 43, draws: 15, winStreak: 3, bestStreak: 9, bankrollPoints: 500, bankrollMarbles: 500, status: "active", difficultyTier: "hard" },
  { token: "bot-player-087", username: "Essien_Midfield", region: "Greater Accra", rating: 1585, wins: 122, losses: 57, draws: 24, winStreak: 5, bestStreak: 13, bankrollPoints: 880, bankrollMarbles: 880, status: "active", difficultyTier: "hard" },
  { token: "bot-player-088", username: "Paintsil_Pro", region: "Central", rating: 1240, wins: 25, losses: 25, draws: 5, winStreak: 1, bestStreak: 4, bankrollPoints: 230, bankrollMarbles: 230, status: "active", difficultyTier: "easy" },
  { token: "bot-player-089", username: "Mintah_10x10", region: "Western", rating: 1360, wins: 47, losses: 34, draws: 10, winStreak: 2, bestStreak: 6, bankrollPoints: 375, bankrollMarbles: 375, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-090", username: "Buckman_Sharp", region: "Central", rating: 1430, wins: 67, losses: 40, draws: 13, winStreak: 3, bestStreak: 8, bankrollPoints: 460, bankrollMarbles: 460, status: "active", difficultyTier: "medium" },
  { token: "bot-player-091", username: "Aggrey_Gen", region: "Central", rating: 1260, wins: 30, losses: 27, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 250, bankrollMarbles: 250, status: "active", difficultyTier: "easy" },
  { token: "bot-player-092", username: "Crentsil_Tempo", region: "Western", rating: 1370, wins: 50, losses: 35, draws: 10, winStreak: 2, bestStreak: 7, bankrollPoints: 395, bankrollMarbles: 395, status: "active", difficultyTier: "medium" },
  { token: "bot-player-093", username: "Hayford_Master", region: "Central", rating: 1495, wins: 86, losses: 46, draws: 17, winStreak: 4, bestStreak: 10, bankrollPoints: 575, bankrollMarbles: 575, status: "active", difficultyTier: "hard" },
  { token: "bot-player-094", username: "Quansah_Tema", region: "Greater Accra", rating: 1205, wins: 18, losses: 21, draws: 4, winStreak: 0, bestStreak: 3, bankrollPoints: 190, bankrollMarbles: 190, status: "active", difficultyTier: "easy" },
  { token: "bot-player-095", username: "Turkson_King", region: "Central", rating: 1325, wins: 38, losses: 30, draws: 8, winStreak: 2, bestStreak: 6, bankrollPoints: 320, bankrollMarbles: 320, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-096", username: "Dadzie_Tactics", region: "Western", rating: 1450, wins: 73, losses: 43, draws: 14, winStreak: 3, bestStreak: 8, bankrollPoints: 480, bankrollMarbles: 480, status: "active", difficultyTier: "hard" },
  { token: "bot-player-097", username: "Koomson_Fast", region: "Central", rating: 1510, wins: 93, losses: 48, draws: 18, winStreak: 4, bestStreak: 10, bankrollPoints: 620, bankrollMarbles: 620, status: "active", difficultyTier: "hard" },
  { token: "bot-player-098", username: "Eshun_Sniper", region: "Western", rating: 1275, wins: 32, losses: 28, draws: 6, winStreak: 1, bestStreak: 5, bankrollPoints: 265, bankrollMarbles: 265, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-099", username: "Bentsil_Grand", region: "Central", rating: 1395, wins: 57, losses: 37, draws: 11, winStreak: 3, bestStreak: 7, bankrollPoints: 425, bankrollMarbles: 425, status: "active", difficultyTier: "medium" },
  { token: "bot-player-100", username: "Abban_Accra", region: "Greater Accra", rating: 1480, wins: 80, losses: 45, draws: 15, winStreak: 4, bestStreak: 9, bankrollPoints: 530, bankrollMarbles: 530, status: "active", difficultyTier: "hard" },
];

let globalFleetSettings: BotFleetSettings = {
  matchmakingEnabled: true,
  casualJoinDelayMs: 4000,
  allowWagerMatches: false,
  defaultDifficulty: "adaptive",
  globalBankrollCap: 50000,
  maxWagerPerBot: 50,
  updatedAt: new Date().toISOString(),
};

// In-memory overrides for active bot fleet management
const botOverrides = new Map<string, Partial<BotAccountConfig>>();

export const botService = {
  isBot(token: string | null | undefined): boolean {
    if (!token) return false;
    return token.startsWith("bot-player-");
  },

  getRandomBot(): BotAccountConfig {
    const activeBots = BOT_ACCOUNTS.filter((b) => {
      const ov = botOverrides.get(b.token);
      return ov?.status !== "paused";
    });
    const pool = activeBots.length > 0 ? activeBots : BOT_ACCOUNTS;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  },

  getSettings(): BotFleetSettings {
    return { ...globalFleetSettings };
  },

  updateSettings(updates: Partial<BotFleetSettings>): BotFleetSettings {
    globalFleetSettings = {
      ...globalFleetSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...globalFleetSettings };
  },

  async getFleetMetrics() {
    const allBots = await this.listBots();
    const activeBots = allBots.filter((b) => b.status === "active" || b.status === "in_match");
    const totalBankrollPoints = allBots.reduce((sum, b) => sum + (b.bankrollPoints || 0), 0);
    const totalBankrollMarbles = allBots.reduce((sum, b) => sum + (b.bankrollMarbles || 0), 0);
    const totalWins = allBots.reduce((sum, b) => sum + b.wins, 0);
    const totalLosses = allBots.reduce((sum, b) => sum + b.losses, 0);
    const totalDraws = allBots.reduce((sum, b) => sum + b.draws, 0);
    const totalMatches = totalWins + totalLosses + totalDraws;
    const fleetWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 55;
    const avgRating = Math.round(allBots.reduce((sum, b) => sum + b.rating, 0) / allBots.length);

    return {
      totalBots: allBots.length,
      activeBots: activeBots.length,
      pausedBots: allBots.length - activeBots.length,
      totalBankrollPoints,
      totalBankrollMarbles,
      fleetWinRate,
      totalMatches,
      avgRating,
      settings: this.getSettings(),
    };
  },

  async listBots(options?: { search?: string; status?: string; tier?: string }): Promise<BotAccountConfig[]> {
    const list = BOT_ACCOUNTS.map((base) => {
      const ov = botOverrides.get(base.token);
      return {
        ...base,
        ...ov,
      };
    });

    let filtered = list;
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (b) => b.username.toLowerCase().includes(q) || b.token.toLowerCase().includes(q) || (b.region && b.region.toLowerCase().includes(q))
      );
    }
    if (options?.status && options.status !== "all") {
      filtered = filtered.filter((b) => b.status === options.status);
    }
    if (options?.tier && options.tier !== "all") {
      filtered = filtered.filter((b) => b.difficultyTier === options.tier);
    }

    return filtered;
  },

  async getBot(token: string): Promise<BotAccountConfig | null> {
    const base = BOT_ACCOUNTS.find((b) => b.token === token);
    if (!base) return null;
    const ov = botOverrides.get(token);
    return { ...base, ...ov };
  },

  async updateBot(token: string, updates: Partial<BotAccountConfig>): Promise<BotAccountConfig | null> {
    const base = BOT_ACCOUNTS.find((b) => b.token === token);
    if (!base) return null;

    const existing = botOverrides.get(token) || {};
    const merged = { ...existing, ...updates };
    botOverrides.set(token, merged);

    // Sync to DB profile if rating or points updated
    try {
      const profile = await dbRepository.getProfile(token);
      if (profile) {
        if (updates.rating !== undefined) profile.rating = updates.rating;
        if (updates.bankrollPoints !== undefined) profile.points = updates.bankrollPoints;
        if (updates.bankrollMarbles !== undefined) profile.marbles = updates.bankrollMarbles;
        if (updates.username !== undefined) profile.username = updates.username;
        await dbRepository.upsertProfile(profile.token, profile.username);
      }
    } catch {}

    return { ...base, ...merged };
  },

  async bulkFundFleet(amountPoints: number, amountMarbles: number, filterTier?: string) {
    let count = 0;
    for (const b of BOT_ACCOUNTS) {
      if (filterTier && filterTier !== "all" && b.difficultyTier !== filterTier) continue;
      const current = botOverrides.get(b.token);
      const curPts = current?.bankrollPoints ?? b.bankrollPoints ?? 250;
      const curMarbles = current?.bankrollMarbles ?? b.bankrollMarbles ?? 250;
      botOverrides.set(b.token, {
        ...current,
        bankrollPoints: Math.max(0, curPts + amountPoints),
        bankrollMarbles: Math.max(0, curMarbles + amountMarbles),
      });
      count++;
    }
    return { success: true, count, fundedPoints: amountPoints, fundedMarbles: amountMarbles };
  },

  async resetFleet() {
    botOverrides.clear();
    return { success: true, message: "All 100 bots reset to initial configurations." };
  },

  /**
   * Ensures all 100 realistic bot accounts are populated in database
   */
  async ensureBotsSeeded(): Promise<void> {
    try {
      for (const bot of BOT_ACCOUNTS) {
        const existing = await dbRepository.getProfile(bot.token);
        if (!existing) {
          await dbRepository.upsertProfile(bot.token, bot.username);
        }
      }
    } catch {
      /* Safe ignore if storage layer handles seeding */
    }
  },

  /**
   * Matches an unjoined casual room to an authentic player profile if no human joins
   */
  async matchmakeBotIfEligible(room: Room): Promise<boolean> {
    if (!globalFleetSettings.matchmakingEnabled) return false;
    if (room.status !== "waiting" || room.guestToken || room.isPrivate || room.mode !== "casual") {
      return false;
    }

    const hostToken = room.hostToken;
    const availableBots = BOT_ACCOUNTS.filter((b) => {
      if (b.token === hostToken) return false;
      const ov = botOverrides.get(b.token);
      return ov?.status !== "paused";
    });

    if (availableBots.length === 0) return false;

    // Pick a bot close in rating to create a realistic, well-matched game
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

    // Determine difficulty based on bot's configured tier or rating
    const botToken = botRole === "white" ? room.hostToken : room.guestToken;
    const botAccount = await this.getBot(botToken || "");
    const rating = botAccount?.rating || 1300;
    let difficulty: "easy" | "medium" | "hard" = "medium";
    if (botAccount?.difficultyTier && botAccount.difficultyTier !== "adaptive") {
      difficulty = botAccount.difficultyTier;
    } else {
      difficulty = rating >= 1500 ? "hard" : rating >= 1300 ? "medium" : "easy";
    }

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
      // Update bot match statistics
      if (botAccount) {
        const isBotWin = result.winner === botRole;
        const newWins = isBotWin ? botAccount.wins + 1 : botAccount.wins;
        const newLosses = !isBotWin ? botAccount.losses + 1 : botAccount.losses;
        const newStreak = isBotWin ? (botAccount.winStreak || 0) + 1 : 0;
        this.updateBot(botAccount.token, {
          wins: newWins,
          losses: newLosses,
          winStreak: newStreak,
          bestStreak: Math.max(botAccount.bestStreak || 0, newStreak),
        });
      }
    }

    await dbRepository.saveRoom(room);
    return true;
  },
};

