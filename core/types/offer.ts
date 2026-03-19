/**
 * Offer-related type definitions
 */

export interface OfferProduct {
  namn: string;
  antal: number;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  products: OfferProduct[];
  discount: number;
  offerPrice: number;
  isMainOffer: boolean;
  createdAt: string;
}

export interface CreateOfferInput {
  title: string;
  description?: string;
  products?: OfferProduct[];
  discount?: number;
  offerPrice?: number;
  isMainOffer?: boolean;
}

export interface UpdateOfferInput {
  id: string;
  title?: string;
  description?: string;
  products?: OfferProduct[];
  discount?: number;
  offerPrice?: number;
  isMainOffer?: boolean;
}
