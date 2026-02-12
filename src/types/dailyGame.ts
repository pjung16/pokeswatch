// Submit result
export interface SubmitGameResultRequest {
  won: boolean;
  guesses: number; // 1-20
}

// GET /daily-game/today response
export interface DailyGameResponse {
  id: string;
  date: string;
  pokemonId: number;
  pokemonName: string;
  createdAt: string;
}

// GET /daily-game/today/me or history response
export interface UserDailyGameResponse {
  id: string;
  userId: string;
  gameId: string;
  won: boolean;
  guesses: number;
  completedAt: string | null;
  createdAt: string;
  game: DailyGameResponse;
}