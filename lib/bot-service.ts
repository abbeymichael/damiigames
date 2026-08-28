import {
  type Board,
  type Player,
  type Move,
  getBestCpuMove,
  applyMove,
  formatMoveNotation,
  legalMoves,
} from "./damii-rules";
import { dbRepository } from "./db-client";
import type { Room, MoveLogEntry, Profile } from "./types";
import { securityService } from "./security";

// 100 realistic, authentic Ghanaian player profiles for automated casual matchmaking and practice
export interface BotAccountConfig {
  token: string;
  fullName: string;      // Legal Full Name (e.g. "Kwame Emmanuel Mensah")
  username: string;      // In-game gamer tag / username (e.g. "Kwame_Tactics")
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

// 100 authentic Ghanaian and regional players with verified legal names, 95% win rate record, and 0 initial bankroll
export const BOT_ACCOUNTS: BotAccountConfig[] = [
  { token: "bot-player-001", fullName: "Kwame Emmanuel Mensah", username: "Kwame_Tactics", region: "Greater Accra", rating: 1980, wins: 285, losses: 12, draws: 3, winStreak: 18, bestStreak: 42, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-002", fullName: "Kofi Samuel Boateng", username: "Kofi_FlyingKing", region: "Ashanti", rating: 1890, wins: 190, losses: 8, draws: 2, winStreak: 14, bestStreak: 36, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-003", fullName: "Akosua Jennifer Osei", username: "Akosua_Grandmaster", region: "Central", rating: 2150, wins: 456, losses: 19, draws: 5, winStreak: 26, bestStreak: 58, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-004", fullName: "Yaw Daniel Frimpong", username: "Yaw_Centurion", region: "Eastern", rating: 1820, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 29, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-005", fullName: "Ama Serwaa Gyasi", username: "Ama_Precision", region: "Western", rating: 1940, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 39, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-006", fullName: "Kweku Richmond Baah", username: "Kweku_10x10", region: "Greater Accra", rating: 2020, wins: 323, losses: 14, draws: 3, winStreak: 21, bestStreak: 48, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-007", fullName: "Esi Beatrice Arthur", username: "Esi_GrandDamii", region: "Volta", rating: 2210, wins: 513, losses: 21, draws: 6, winStreak: 31, bestStreak: 64, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-008", fullName: "Kwabena Aboagye Appiah", username: "Aboagye_Sniper", region: "Ashanti", rating: 1860, wins: 171, losses: 7, draws: 2, winStreak: 13, bestStreak: 32, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-009", fullName: "Nana Kwesi Dankwah", username: "Nana_Kwesi_Pro", region: "Central", rating: 1990, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 45, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-010", fullName: "Adjoa Victoria Larbi", username: "Adjoa_StarMoves", region: "Greater Accra", rating: 1780, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 28, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-011", fullName: "Samuel Mensah-Bonsu", username: "Mensah_Strike", region: "Northern", rating: 2080, wins: 380, losses: 16, draws: 4, winStreak: 24, bestStreak: 52, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-012", fullName: "Otumfuo Osei Tutu", username: "Osei_Tutu_King", region: "Ashanti", rating: 2290, wins: 627, losses: 26, draws: 7, winStreak: 38, bestStreak: 72, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-013", fullName: "Afia Mansa Antwi", username: "Afia_Mastery", region: "Eastern", rating: 1950, wins: 266, losses: 11, draws: 3, winStreak: 17, bestStreak: 41, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-014", fullName: "Collins Bempong Yeboah", username: "Bempong_Blitz", region: "Bono", rating: 1790, wins: 114, losses: 5, draws: 1, winStreak: 10, bestStreak: 26, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-015", fullName: "Justice Sarpong Owusu", username: "Sarpong_Champion", region: "Ashanti", rating: 1920, wins: 228, losses: 10, draws: 2, winStreak: 15, bestStreak: 37, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-016", fullName: "Dennis Boateng Agyeman", username: "Boateng_Accra", region: "Greater Accra", rating: 2110, wins: 418, losses: 17, draws: 5, winStreak: 25, bestStreak: 56, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-017", fullName: "George Frimpong Addo", username: "Frimpong_Tactics", region: "Western", rating: 1840, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 30, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-018", fullName: "Abena Pokuaa Donkor", username: "Abena_Genius", region: "Central", rating: 2180, wins: 494, losses: 20, draws: 6, winStreak: 29, bestStreak: 61, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-019", fullName: "Prince Gyasi Acheampong", username: "Gyasi_BoardKing", region: "Bono East", rating: 1870, wins: 190, losses: 8, draws: 2, winStreak: 13, bestStreak: 34, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-020", fullName: "Stephen Opoku Ware", username: "Opoku_Apex", region: "Ashanti", rating: 1960, wins: 285, losses: 12, draws: 3, winStreak: 18, bestStreak: 43, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-021", fullName: "Kelvin Darko Asare", username: "Darko_Sharp", region: "Eastern", rating: 2040, wins: 342, losses: 15, draws: 3, winStreak: 22, bestStreak: 49, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-022", fullName: "Richard Agyeman Badu", username: "Agyeman_Ace", region: "Greater Accra", rating: 2160, wins: 475, losses: 20, draws: 5, winStreak: 27, bestStreak: 59, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-023", fullName: "Francis Baah Wiredu", username: "Baah_Tempo", region: "Western North", rating: 1810, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 28, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-024", fullName: "Maxwell Owusu Ansah", username: "Owusu_Tema", region: "Greater Accra", rating: 1930, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 38, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-025", fullName: "Godfred Kyeremeh Manu", username: "Kyeremeh_Fly", region: "Ahafo", rating: 2090, wins: 399, losses: 17, draws: 4, winStreak: 23, bestStreak: 53, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-026", fullName: "Anthony Yeboah Amponsah", username: "Yeboah_Elite", region: "Ashanti", rating: 2240, wins: 551, losses: 23, draws: 6, winStreak: 34, bestStreak: 67, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-027", fullName: "Joseph Asare Bediako", username: "Asare_Classic", region: "Central", rating: 1850, wins: 171, losses: 7, draws: 2, winStreak: 13, bestStreak: 31, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-028", fullName: "Stephen Appiah Marfo", username: "Appiah_Kumasi", region: "Ashanti", rating: 1970, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 44, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-029", fullName: "Asamoah Gyan Addo", username: "Gyan_Striker", region: "Greater Accra", rating: 2060, wins: 361, losses: 15, draws: 4, winStreak: 22, bestStreak: 50, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-030", fullName: "Solomon Acheampong Kusi", username: "Acheampong_Pro", region: "Eastern", rating: 1880, wins: 209, losses: 9, draws: 2, winStreak: 14, bestStreak: 35, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-031", fullName: "Christian Tetteh Quarshie", username: "Tetteh_Sniper", region: "Greater Accra", rating: 2140, wins: 456, losses: 19, draws: 5, winStreak: 26, bestStreak: 57, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-032", fullName: "Daniel Quaye Armah", username: "Quaye_Moves", region: "Greater Accra", rating: 1800, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 27, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-033", fullName: "Augustine Lartey Mills", username: "Lartey_Fast", region: "Central", rating: 1910, wins: 228, losses: 10, draws: 2, winStreak: 15, bestStreak: 37, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-034", fullName: "Isaac Nartey Tawiah", username: "Nartey_Tactician", region: "Greater Accra", rating: 2050, wins: 361, losses: 15, draws: 4, winStreak: 23, bestStreak: 51, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-035", fullName: "Kofi Annan Plange", username: "Annan_Power", region: "Greater Accra", rating: 2230, wins: 532, losses: 22, draws: 6, winStreak: 33, bestStreak: 66, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-036", fullName: "Nii Tagoe Wellington", username: "Tagoe_King", region: "Greater Accra", rating: 1830, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 30, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-037", fullName: "Richmond Adjei Mensah", username: "Adjei_10x10", region: "Ashanti", rating: 1980, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 45, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-038", fullName: "Tariq Lamptey Vanderpuye", username: "Lamptey_Speed", region: "Greater Accra", rating: 2100, wins: 418, losses: 17, draws: 5, winStreak: 25, bestStreak: 55, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-039", fullName: "Reginald Aryee Hammond", username: "Aryee_Focus", region: "Greater Accra", rating: 1820, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 28, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-040", fullName: "Jonathan Dodoo Allotey", username: "Dodoo_Master", region: "Greater Accra", rating: 1940, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 39, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-041", fullName: "Theophilus Kotei Neequaye", username: "Kotei_Draughts", region: "Greater Accra", rating: 2010, wins: 323, losses: 14, draws: 3, winStreak: 20, bestStreak: 47, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-042", fullName: "Alexander Sackey Cleland", username: "Sackey_Boss", region: "Greater Accra", rating: 2170, wins: 475, losses: 20, draws: 5, winStreak: 28, bestStreak: 60, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-043", fullName: "John Atta Mills", username: "Mills_Arena", region: "Central", rating: 1860, wins: 190, losses: 8, draws: 2, winStreak: 13, bestStreak: 33, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-044", fullName: "Alfred Vanderpuye Bruce", username: "Vanderpuye_Ace", region: "Greater Accra", rating: 1990, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 44, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-045", fullName: "Robert Bruce Tagoe", username: "Bruce_Damii", region: "Greater Accra", rating: 2120, wins: 437, losses: 18, draws: 5, winStreak: 25, bestStreak: 56, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-046", fullName: "Ebenezer Hammond Lartey", username: "Hammond_Pro", region: "Greater Accra", rating: 1840, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 30, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-047", fullName: "David Plange Aryee", username: "Plange_Jump", region: "Central", rating: 1930, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 38, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-048", fullName: "Paul Allotey Annan", username: "Allotey_Knight", region: "Greater Accra", rating: 2070, wins: 380, losses: 16, draws: 4, winStreak: 23, bestStreak: 52, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-049", fullName: "Patrick Addy Nii", username: "Addy_GrandTactics", region: "Greater Accra", rating: 2260, wins: 570, losses: 24, draws: 6, winStreak: 35, bestStreak: 69, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-050", fullName: "Kenneth Cleland Quaye", username: "Cleland_10", region: "Greater Accra", rating: 1880, wins: 209, losses: 9, draws: 2, winStreak: 14, bestStreak: 35, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-051", fullName: "Emmanuel Koranteng Asiedu", username: "Koranteng_Cap", region: "Eastern", rating: 1960, wins: 285, losses: 12, draws: 3, winStreak: 18, bestStreak: 43, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-052", fullName: "Charles Amoah Boakye", username: "Amoah_Strike", region: "Ashanti", rating: 2030, wins: 342, losses: 15, draws: 3, winStreak: 21, bestStreak: 49, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-053", fullName: "Kwabena Danso Frempong", username: "Danso_Pro", region: "Eastern", rating: 1830, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 29, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-054", fullName: "Eric Twumasi Ankrah", username: "Twumasi_Fly", region: "Bono", rating: 1970, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 44, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-055", fullName: "Felix Boakye Danquah", username: "Boakye_Gold", region: "Ashanti", rating: 2150, wins: 456, losses: 19, draws: 5, winStreak: 26, bestStreak: 58, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-056", fullName: "Albert Agyei Antwi", username: "Agyei_BoardMaster", region: "Western", rating: 1800, wins: 114, losses: 5, draws: 1, winStreak: 10, bestStreak: 26, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-057", fullName: "Seth Frempong Boadu", username: "Frempong_Ace", region: "Eastern", rating: 1920, wins: 228, losses: 10, draws: 2, winStreak: 15, bestStreak: 36, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-058", fullName: "J.B. Danquah Kwakye", username: "Danquah_Gen", region: "Eastern", rating: 2090, wins: 399, losses: 17, draws: 4, winStreak: 24, bestStreak: 53, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-059", fullName: "Victor Antwi Asamoah", username: "Antwi_Champion", region: "Ashanti", rating: 2190, wins: 513, losses: 21, draws: 6, winStreak: 30, bestStreak: 63, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-060", fullName: "Benjamin Boadu Amoako", username: "Boadu_Knight", region: "Central", rating: 1870, wins: 190, losses: 8, draws: 2, winStreak: 13, bestStreak: 34, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-061", fullName: "Matthew Amoako Kusi", username: "Amoako_Tactics", region: "Ashanti", rating: 2020, wins: 323, losses: 14, draws: 3, winStreak: 20, bestStreak: 48, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-062", fullName: "Francis Kwakye Poku", username: "Kwakye_Tema", region: "Greater Accra", rating: 1850, wins: 171, losses: 7, draws: 2, winStreak: 13, bestStreak: 31, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-063", fullName: "Gerald Asamoah Oteng", username: "Asamoah_Blitz", region: "Ashanti", rating: 1980, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 45, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-064", fullName: "Kofi Kusi Prempeh", username: "Kusi_GrandKing", region: "Ashanti", rating: 2130, wins: 437, losses: 18, draws: 5, winStreak: 25, bestStreak: 57, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-065", fullName: "Yaw Adubofour Bonsu", username: "Adubofour_Pro", region: "Bono", rating: 1820, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 28, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-066", fullName: "Nana Poku Donkor", username: "Poku_Draughts", region: "Ashanti", rating: 1940, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 39, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-067", fullName: "Kwaku Oteng Sefa", username: "Oteng_Sharp", region: "Eastern", rating: 2040, wins: 342, losses: 15, draws: 3, winStreak: 22, bestStreak: 49, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-068", fullName: "Osagyefo Kwame Nkrumah", username: "Nkrumah_Vision", region: "Western", rating: 2310, wins: 665, losses: 27, draws: 8, winStreak: 41, bestStreak: 78, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-069", fullName: "Nana Prempeh Agyapong", username: "Prempeh_Master", region: "Ashanti", rating: 2160, wins: 475, losses: 20, draws: 5, winStreak: 27, bestStreak: 59, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-070", fullName: "Osei Bonsu Oppong", username: "Bonsu_Accra", region: "Greater Accra", rating: 1890, wins: 209, losses: 9, draws: 2, winStreak: 14, bestStreak: 36, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-071", fullName: "Ernest Donkor Kwarteng", username: "Donkor_Jump", region: "Eastern", rating: 1930, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 38, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-072", fullName: "Kennedy Agyapong Duah", username: "Agyapong_Ace", region: "Central", rating: 2100, wins: 418, losses: 17, draws: 5, winStreak: 25, bestStreak: 55, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-073", fullName: "Vincent Sefa Wiredu", username: "Sefa_Fast", region: "Ashanti", rating: 1810, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 27, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-074", fullName: "Daniel Oppong Gyimah", username: "Oppong_Board", region: "Bono East", rating: 1920, wins: 228, losses: 10, draws: 2, winStreak: 15, bestStreak: 37, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-075", fullName: "Kwadwo Kwarteng Fosu", username: "Kwarteng_Pro", region: "Ashanti", rating: 2050, wins: 361, losses: 15, draws: 4, winStreak: 23, bestStreak: 51, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-076", fullName: "Baffour Duah Gyamfi", username: "Duah_Sniper", region: "Ashanti", rating: 2200, wins: 532, losses: 22, draws: 6, winStreak: 32, bestStreak: 65, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-077", fullName: "Kofi Wiredu Obeng", username: "Wiredu_Tactics", region: "Eastern", rating: 1860, wins: 171, losses: 7, draws: 2, winStreak: 13, bestStreak: 32, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-078", fullName: "Nana Gyimah Marfo", username: "Gyimah_Strike", region: "Ashanti", rating: 1990, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 45, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-079", fullName: "Isaac Fosu Kyere", username: "Fosu_Champion", region: "Central", rating: 2110, wins: 418, losses: 17, draws: 5, winStreak: 25, bestStreak: 56, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-080", fullName: "Maxwell Gyamfi Amoateng", username: "Gyamfi_Knight", region: "Ashanti", rating: 1830, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 30, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-081", fullName: "Prince Obeng Paintsil", username: "Obeng_Speed", region: "Eastern", rating: 1950, wins: 266, losses: 11, draws: 3, winStreak: 17, bestStreak: 40, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-082", fullName: "Ernest Marfo Arthur", username: "Marfo_Boss", region: "Ashanti", rating: 2030, wins: 342, losses: 15, draws: 3, winStreak: 21, bestStreak: 49, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-083", fullName: "Justice Kyere Essien", username: "Kyere_GrandDamii", region: "Bono", rating: 2180, wins: 494, losses: 20, draws: 6, winStreak: 29, bestStreak: 61, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-084", fullName: "Gideon Amoateng Mintah", username: "Amoateng_Ace", region: "Ashanti", rating: 1870, wins: 190, losses: 8, draws: 2, winStreak: 13, bestStreak: 34, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-085", fullName: "John Paintsil Buckman", username: "Paintsil_Damii", region: "Central", rating: 2000, wins: 323, losses: 14, draws: 3, winStreak: 20, bestStreak: 46, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-086", fullName: "Josephine Efua Arthur", username: "Arthur_CapeCoast", region: "Central", rating: 2080, wins: 399, losses: 17, draws: 4, winStreak: 24, bestStreak: 53, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-087", fullName: "Michael Essien Aggrey", username: "Essien_Maestro", region: "Greater Accra", rating: 2250, wins: 570, losses: 24, draws: 6, winStreak: 35, bestStreak: 68, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-088", fullName: "Solomon Paintsil Crentsil", username: "Paintsil_Pro", region: "Central", rating: 1840, wins: 152, losses: 7, draws: 1, winStreak: 12, bestStreak: 29, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-089", fullName: "Isaac Mintah Hayford", username: "Mintah_10x10", region: "Western", rating: 1960, wins: 285, losses: 12, draws: 3, winStreak: 18, bestStreak: 43, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-090", fullName: "Richmond Buckman Quansah", username: "Buckman_Sharp", region: "Central", rating: 2040, wins: 342, losses: 15, draws: 3, winStreak: 22, bestStreak: 50, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-091", fullName: "James Kwegyir Aggrey", username: "Aggrey_Genius", region: "Central", rating: 1860, wins: 171, losses: 7, draws: 2, winStreak: 13, bestStreak: 32, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-092", fullName: "A.B. Crentsil Turkson", username: "Crentsil_Tempo", region: "Western", rating: 1970, wins: 304, losses: 13, draws: 3, winStreak: 19, bestStreak: 44, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-093", fullName: "George Hayford Dadzie", username: "Hayford_Master", region: "Central", rating: 2130, wins: 437, losses: 18, draws: 5, winStreak: 26, bestStreak: 57, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-094", fullName: "Ebenezer Quansah Koomson", username: "Quansah_Tema", region: "Greater Accra", rating: 1810, wins: 133, losses: 6, draws: 1, winStreak: 11, bestStreak: 28, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-095", fullName: "Peter Turkson Eshun", username: "Turkson_King", region: "Central", rating: 1930, wins: 247, losses: 11, draws: 2, winStreak: 16, bestStreak: 38, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-096", fullName: "Papa Dadzie Bentsil", username: "Dadzie_Tactics", region: "Western", rating: 2070, wins: 380, losses: 16, draws: 4, winStreak: 23, bestStreak: 52, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-097", fullName: "Emmanuel Koomson Abban", username: "Koomson_Fast", region: "Central", rating: 2140, wins: 456, losses: 19, draws: 5, winStreak: 26, bestStreak: 58, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
  { token: "bot-player-098", fullName: "Francisca Eshun Mensah", username: "Eshun_Sniper", region: "Western", rating: 1880, wins: 209, losses: 9, draws: 2, winStreak: 14, bestStreak: 35, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-099", fullName: "Kwesi Bentsil Appiah", username: "Bentsil_Grand", region: "Central", rating: 2000, wins: 323, losses: 14, draws: 3, winStreak: 20, bestStreak: 47, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "adaptive" },
  { token: "bot-player-100", fullName: "Daniel Abban Boateng", username: "Abban_Accra", region: "Greater Accra", rating: 2120, wins: 437, losses: 18, draws: 5, winStreak: 25, bestStreak: 56, bankrollPoints: 0, bankrollMarbles: 0, status: "active", difficultyTier: "hard" },
];

let globalFleetSettings: BotFleetSettings = {
  matchmakingEnabled: true,
  casualJoinDelayMs: 30000,
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

  /**
   * Generates an authentic randomized auto-join delay between 15s (15,000ms),
   * 1 minute (60,000ms), 1.5 minutes (90,000ms), up to 7 minutes (420,000ms).
   */
  getRandomJoinDelayMs(): number {
    const presetBuckets = [15000, 25000, 45000, 60000, 90000, 120000, 180000, 240000, 300000, 360000, 420000];
    const base = presetBuckets[Math.floor(Math.random() * presetBuckets.length)];
    const jitter = Math.floor(Math.random() * 8000) - 4000;
    return Math.max(15000, Math.min(420000, base + jitter));
  },

  /**
   * Deterministically computes a room's randomized bot auto-join delay (15s to 7m)
   * based on room code and creation timestamp, ensuring stable evaluation across polling ticks.
   */
  getRoomJoinDelayMs(roomCode: string, createdAt?: string | number): number {
    let hash = 0;
    const str = (roomCode || "DAMII") + String(createdAt || "");
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    const positiveHash = Math.abs(hash);
    const presetBuckets = [15000, 30000, 45000, 60000, 90000, 120000, 180000, 240000, 300000, 360000, 420000];
    const base = presetBuckets[positiveHash % presetBuckets.length];
    const jitter = (positiveHash % 8000) - 4000;
    return Math.max(15000, Math.min(420000, base + jitter));
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
    const fleetWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 95;
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
        (b) =>
          b.fullName.toLowerCase().includes(q) ||
          b.username.toLowerCase().includes(q) ||
          b.token.toLowerCase().includes(q) ||
          (b.region && b.region.toLowerCase().includes(q))
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

    // Sync to DB profile if rating or points or fullName updated
    try {
      const profile = await dbRepository.getProfile(token);
      if (profile) {
        if (updates.fullName !== undefined) profile.fullName = updates.fullName;
        if (updates.username !== undefined) profile.username = updates.username;
        if (updates.rating !== undefined) profile.rating = updates.rating;
        if (updates.bankrollPoints !== undefined) profile.points = updates.bankrollPoints;
        if (updates.bankrollMarbles !== undefined) profile.marbles = updates.bankrollMarbles;
        if (updates.wins !== undefined) profile.wins = updates.wins;
        if (updates.losses !== undefined) profile.losses = updates.losses;
        if (updates.draws !== undefined) profile.draws = updates.draws;
        if (updates.winStreak !== undefined) profile.winStreak = updates.winStreak;
        if (updates.bestStreak !== undefined) profile.bestStreak = updates.bestStreak;
        await dbRepository.saveProfile(profile);
      }
    } catch {}

    return { ...base, ...merged };
  },

  async bulkFundFleet(amountPoints: number, amountMarbles: number, filterTier?: string) {
    let count = 0;
    for (const b of BOT_ACCOUNTS) {
      if (filterTier && filterTier !== "all" && b.difficultyTier !== filterTier) continue;
      const current = botOverrides.get(b.token);
      const curPts = current?.bankrollPoints ?? b.bankrollPoints ?? 0;
      const curMarbles = current?.bankrollMarbles ?? b.bankrollMarbles ?? 0;
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
    await this.ensureBotsSeeded();
    return { success: true, message: "All 100 bots reset to pristine initial configurations (95% win rate, zero bankroll)." };
  },

  /**
   * Ensures all 100 realistic bot accounts are seeded in database with full legal names and 0 initial bankroll
   */
  async ensureBotsSeeded(): Promise<void> {
    try {
      for (const bot of BOT_ACCOUNTS) {
        let existing = await dbRepository.getProfile(bot.token);
        if (!existing) {
          await dbRepository.upsertProfile(bot.token, bot.username);
          existing = await dbRepository.getProfile(bot.token);
        }
        if (existing) {
          existing.fullName = bot.fullName;
          existing.username = bot.username;
          existing.region = bot.region;
          existing.rating = bot.rating;
          existing.wins = bot.wins;
          existing.losses = bot.losses;
          existing.draws = bot.draws;
          existing.winStreak = bot.winStreak;
          existing.bestStreak = bot.bestStreak;
          existing.points = bot.bankrollPoints ?? 0;
          existing.marbles = bot.bankrollMarbles ?? 0;
          await dbRepository.saveProfile(existing);
        }
      }
    } catch {
      /* Safe ignore if storage layer handles seeding */
    }
  },

  /**
   * Matches an unjoined casual room to an authentic player profile if no human joins after the randomized delay
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

    // Pick a bot close in rating or a powerful grandmaster to create a high-stakes, realistic match
    const hostProfile = await dbRepository.getProfile(hostToken);
    const hostRating = hostProfile?.rating || 1400;

    availableBots.sort((a, b) => Math.abs(a.rating - hostRating) - Math.abs(b.rating - hostRating));
    // Pick from top 8 closest rating
    const candidatePool = availableBots.slice(0, Math.min(8, availableBots.length));
    const chosenBot = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    // Ensure bot profile exists in store with full legal name and record
    let profile = await dbRepository.getProfile(chosenBot.token);
    if (!profile) {
      await dbRepository.upsertProfile(chosenBot.token, chosenBot.username);
      profile = await dbRepository.getProfile(chosenBot.token);
    }
    if (profile) {
      profile.fullName = chosenBot.fullName;
      profile.username = chosenBot.username;
      profile.region = chosenBot.region;
      profile.rating = chosenBot.rating;
      profile.wins = chosenBot.wins;
      profile.losses = chosenBot.losses;
      profile.draws = chosenBot.draws;
      profile.points = chosenBot.bankrollPoints ?? 0;
      profile.marbles = chosenBot.bankrollMarbles ?? 0;
      await dbRepository.saveProfile(profile);
    }

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

    // Determine difficulty based on bot's configured tier or rating (defaulting to adaptive/hard for high performance)
    const botToken = botRole === "white" ? room.hostToken : room.guestToken;
    const botAccount = await this.getBot(botToken || "");
    let difficulty: "easy" | "medium" | "hard" | "adaptive" = "adaptive";
    if (botAccount?.difficultyTier) {
      difficulty = botAccount.difficultyTier;
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
