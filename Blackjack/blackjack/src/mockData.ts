export type MatchResult = "Victoria" | "Derrota" | "Empate";

export interface MatchRecord {
  id: number;
  date: string;
  result: MatchResult;
  playerScore: number;
  dealerScore: number;
  hands: number;
  name: string;
}

export const mockMatches: MatchRecord[] = [
  { id: 1, date: "18 jun 2025 · 20:42", result: "Victoria", playerScore: 21, dealerScore: 19, hands: 3, name: "Noche de ases" },
  { id: 2, date: "17 jun 2025 · 18:10", result: "Derrota", playerScore: 22, dealerScore: 18, hands: 2, name: "Ronda rápida" },
  { id: 3, date: "15 jun 2025 · 22:31", result: "Empate", playerScore: 20, dealerScore: 20, hands: 4, name: "Mesa esmeralda" },
  { id: 4, date: "12 jun 2025 · 19:05", result: "Victoria", playerScore: 20, dealerScore: 24, hands: 5, name: "Después del trabajo" },
  { id: 5, date: "9 jun 2025 · 21:22", result: "Victoria", playerScore: 21, dealerScore: 17, hands: 1, name: "Blackjack directo" },
  { id: 6, date: "6 jun 2025 · 17:46", result: "Derrota", playerScore: 18, dealerScore: 20, hands: 3, name: "Viernes clásico" },
  { id: 7, date: "2 jun 2025 · 23:14", result: "Empate", playerScore: 19, dealerScore: 19, hands: 2, name: "Última mano" },
  { id: 8, date: "30 may 2025 · 16:30", result: "Derrota", playerScore: 23, dealerScore: 17, hands: 4, name: "Tarde de cartas" },
];
