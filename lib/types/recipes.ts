// Recipe type (existing in database)
export interface Recipe {
  id: string;
  parent_user_id: string;
  title: string;
  source_type: 'typed' | 'link';
  ingredients?: { item: string; amount: string }[];
  instructions?: string;
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  source_url?: string;
  scraped_data?: Record<string, unknown>;
  image_url?: string;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// Recipe Category (Book Spine)
export interface RecipeCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string; // Hex color for book spine
  cover_image?: string; // Optional custom cover image URL
  recipe_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Recipe Category Tag (junction)
export interface RecipeCategoryTag {
  id: string;
  recipe_id: string;
  category_id: string;
  created_at: string;
}

// Preset categories with predefined colors
export interface PresetCategory {
  name: string;
  slug: string;
  color: string;
  sort_order: number;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  { name: 'Drinks', slug: 'drinks', color: '#3498DB', sort_order: 0 },
  { name: 'Entree', slug: 'entree', color: '#9B6DD6', sort_order: 1 },
  { name: 'Mains', slug: 'mains', color: '#7A9E9A', sort_order: 2 },
  { name: 'BBQ', slug: 'bbq', color: '#C14E3D', sort_order: 3 },
  { name: 'Salads', slug: 'salads', color: '#9BCF53', sort_order: 4 },
  { name: 'World Flavours', slug: 'world-flavours', color: '#F39C12', sort_order: 5 },
  { name: 'Desserts', slug: 'desserts', color: '#E891A6', sort_order: 6 },
  { name: 'Baking', slug: 'baking', color: '#D4A853', sort_order: 7 },
];

// Color swatches for custom categories
export const COLOR_SWATCHES = [
  '#D4A853', // gold
  '#7A9E9A', // sage
  '#6B9ECE', // blue
  '#E891A6', // pink
  '#9BCF53', // green
  '#C14E3D', // red
  '#9B6DD6', // purple
  '#F39C12', // orange
  '#3498DB', // bright blue
  '#F1C40F', // yellow
];
