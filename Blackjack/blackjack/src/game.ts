export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface PlayingCard {
  id: string;
  suit: Suit;
  rank: Rank;
}

const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const suitSymbols: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export function createDeck(deckCount = 1): PlayingCard[] {
  const cards = Array.from({ length: deckCount }, (_, deckIndex) =>
    suits.flatMap((suit) =>
      ranks.map((rank) => ({
        id: `${deckIndex}-${suit}-${rank}`,
        suit,
        rank,
      })),
    ),
  ).flat();

  return shuffle(cards);
}

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function handValue(hand: PlayingCard[]): number {
  let value = 0;
  let aces = 0;

  hand.forEach((card) => {
    if (card.rank === "A") {
      value += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      value += 10;
    } else {
      value += Number(card.rank);
    }
  });

  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

export function isBlackjack(hand: PlayingCard[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

export type RoundResult = "win" | "loss" | "draw";

export function getResult(player: PlayingCard[], dealer: PlayingCard[]): RoundResult {
  const playerScore = handValue(player);
  const dealerScore = handValue(dealer);

  if (playerScore > 21) return "loss";
  if (dealerScore > 21) return "win";
  if (playerScore > dealerScore) return "win";
  if (playerScore < dealerScore) return "loss";
  return "draw";
}
