/**
 * Wish type definitions
 */

export interface Wish {
  id: string;
  category: string;
  text: string;
  timestamp: string;
}

export interface CreateWishInput {
  category: string;
  text: string;
}
