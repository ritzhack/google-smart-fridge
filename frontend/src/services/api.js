// /home/ubuntu/smart_fridge_app/frontend/frontend_app/src/services/api.js
import axios from 'axios';

// Use environment variable with fallback to localhost
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API URL:', API_URL);

export const getInventoryItems = () => {
  return apiClient.get('/inventory/items');
};

export const addItemToInventory = (itemData) => {
  return apiClient.post('/inventory/items', itemData);
};

export const updateInventoryItem = (itemId, itemData) => {
  return apiClient.put(`/inventory/items/${itemId}`, itemData);
};

export const deleteInventoryItem = (itemId) => {
  return apiClient.delete(`/inventory/items/${itemId}`);
};

export const processFridgeImage = (imageIdentifier) => {
  return apiClient.post('/inventory/process-image', { image_identifier: imageIdentifier });
};

export const generateRecipes = (ingredients, mealType) => {
  return apiClient.post('/recipes/generate', { ingredients, meal_type: mealType });
};

export const getFavoriteRecipes = () => {
  return apiClient.get('/recipes/favorites');
};

export const addFavoriteRecipe = (recipeData) => {
  return apiClient.post('/recipes/favorites', recipeData);
};

export const deleteFavoriteRecipe = (recipeId) => {
  return apiClient.delete(`/recipes/favorites/${recipeId}`);
};

export const checkExpirations = () => {
  return apiClient.get('/notifications/check-expirations');
};

// Add other API calls as needed for user preferences, shopping list etc.

