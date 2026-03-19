/**
 * Tag type definitions
 */

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
}

export interface CreateTagInput {
  name: string;
  emoji?: string;
  color?: string;
}
