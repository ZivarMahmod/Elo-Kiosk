/**
 * Category-related type definitions
 */

export interface Category {
  id: string;
  name: string;
  status: boolean;
  description?: string | null;
  emoji?: string;
  color?: string;
  subtitle?: string;
  parentId?: string | null;
  visibleFrom?: string | null;
  visibleTo?: string | null;
  bannerImageUrl?: string | null;
  sortOrder?: number;
  showOnKiosk?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  status?: boolean;
  description?: string | null;
  emoji?: string;
  color?: string;
  subtitle?: string;
  parentId?: string | null;
  visibleFrom?: string | null;
  visibleTo?: string | null;
  bannerImageUrl?: string | null;
  sortOrder?: number;
  showOnKiosk?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  status?: boolean;
  description?: string | null;
  emoji?: string;
  color?: string;
  subtitle?: string;
  parentId?: string | null;
  visibleFrom?: string | null;
  visibleTo?: string | null;
  bannerImageUrl?: string | null;
  sortOrder?: number;
  showOnKiosk?: boolean;
}
