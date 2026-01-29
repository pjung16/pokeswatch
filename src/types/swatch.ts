// Request body for POST /swatches
export interface CreateSwatchRequest {
  pokemon: string;          // required
  swatchName?: string;      // optional
}

// Response from all swatch endpoints
export interface ISwatch {
  id: string;
  userId: string;
  pokemon: string;
  swatchName: string | null;
  createdAt: string;        // ISO date string
  updatedAt: string;        // ISO date string
}

// Response from DELETE /swatches/:id
export interface IDeleteSwatchResponse {
  message: string;
}