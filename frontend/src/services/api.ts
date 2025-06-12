import axios, { AxiosResponse } from 'axios';

// Use environment variable with fallback to localhost
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for API responses
interface InventoryItem {
  _id?: string;
  name: string;
  quantity: string;
  expiration_date?: string;
  image_data?: string;
}

interface Recipe {
  _id?: string;
  name: string;
  ingredients: string[];
  instructions: string;
  source_url?: string;
}

interface ExpirationAlert {
  name: string;
  quantity: string;
  days_left: number;
  expiration_date: string;
}

interface ExpirationAlerts {
  warning_week: ExpirationAlert[];
  warning_3_days: ExpirationAlert[];
}

// API functions with proper typing
export const getInventoryItems = (): Promise<AxiosResponse<InventoryItem[]>> => {
  return apiClient.get('/inventory/items');
};

export const addItemToInventory = (itemData: { name: string; quantity: string }): Promise<AxiosResponse<InventoryItem>> => {
  return apiClient.post('/inventory/items', itemData);
};

export const updateInventoryItem = (itemId: string, itemData: Partial<InventoryItem>): Promise<AxiosResponse<InventoryItem>> => {
  return apiClient.put(`/inventory/items/${itemId}`, itemData);
};

export const deleteInventoryItem = (itemId: string): Promise<AxiosResponse<void>> => {
  return apiClient.delete(`/inventory/items/${itemId}`);
};

export const processFridgeImage = (imageIdentifier: string): Promise<AxiosResponse<any>> => {
  return apiClient.post('/inventory/process-image', { image_identifier: imageIdentifier });
};

export const generateRecipes = (ingredients: string[], mealType: string): Promise<AxiosResponse<Recipe[]>> => {
  return apiClient.post('/recipes/generate', { ingredients, meal_type: mealType });
};

export const getFavoriteRecipes = (): Promise<AxiosResponse<Recipe[]>> => {
  return apiClient.get('/recipes/favorites');
};

export const addFavoriteRecipe = (recipeData: Recipe): Promise<AxiosResponse<Recipe>> => {
  return apiClient.post('/recipes/favorites', recipeData);
};

export const deleteFavoriteRecipe = (recipeId: string): Promise<AxiosResponse<void>> => {
  return apiClient.delete(`/recipes/favorites/${recipeId}`);
};

export const rejectUpdateAndCreateNew = (data: {
  item_name: string;
  original_quantity: number;
  image_data?: string | null;
}): Promise<AxiosResponse<any>> => {
  return apiClient.post('/inventory/reject-update', data);
};

export const checkExpirations = (): Promise<AxiosResponse<ExpirationAlerts>> => {
  return apiClient.get('/notifications/check-expirations');
}; 