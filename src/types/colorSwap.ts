export interface PokemonColorSwapResponse {
  id: string;
  userId: string;
  pokemonName: string;
  colors: { oldColor: string; newColor: string }[];
  createdAt: string;
  updatedAt: string;
}
