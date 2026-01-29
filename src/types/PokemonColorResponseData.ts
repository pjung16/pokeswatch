export interface IColorWithPercentage {
  color: string;
  percentage: number;
}

export interface IPokemonColorsResponseData {
  id: string;
  pokemonName: string;
  colors: IColorWithPercentage[];
  filename: string;
  imageUrl: string;
  isShiny: boolean;
  createdAt: Date;
  updatedAt: Date;
}
  