export interface InventoryItem {
  _id?: string;
  id?: string;
  name: string;
  quantity: string;
  expiration_date?: string;
  image_data?: string;
  category?: string;
}

export interface Recipe {
  _id?: string;
  name: string;
  ingredients: string[];
  instructions: string | string[];
  source_url?: string;
  cooking_time?: number;
  calories?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  health_assessment?: string;
}

export interface ExpirationAlert {
  name: string;
  quantity: string;
  days_left: number;
  expiration_date: string;
}

export interface ExpirationAlerts {
  warning_week: ExpirationAlert[];
  warning_3_days: ExpirationAlert[];
} 