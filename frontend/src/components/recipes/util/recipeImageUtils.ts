import { Recipe } from '../../../types';

// Function to get a recipe image or placeholder
export const getRecipeImage = (recipe?: Recipe): string => {
  // Use the actual recipe image if available
  if (recipe?.image_url) {
    return recipe.image_url;
  }
  
  // If no image_url but there's a source_url, try to derive an image
  if (recipe?.source_url) {
    // For common recipe sites, try to construct an image URL
    // This is a simple example - in a real app you might use a service to fetch recipe images
    const domain = new URL(recipe.source_url).hostname.toLowerCase();
    if (domain.includes('allrecipes') || domain.includes('foodnetwork') || domain.includes('delish')) {
      // For these sites, we could potentially scrape for images, but for now use a food-specific placeholder
      return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
    }
  }
  
  // Generate a food-related image based on recipe name if available
  if (recipe?.name) {
    const recipeName = recipe.name.toLowerCase();
    // Use different food images based on recipe type
    if (recipeName.includes('chicken') || recipeName.includes('poultry')) {
      return 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?q=80&w=500&auto=format&fit=crop';
    } else if (recipeName.includes('pasta') || recipeName.includes('spaghetti') || recipeName.includes('noodle')) {
      return 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?q=80&w=500&auto=format&fit=crop';
    } else if (recipeName.includes('salad') || recipeName.includes('greens')) {
      return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=500&auto=format&fit=crop';
    } else if (recipeName.includes('soup') || recipeName.includes('stew')) {
      return 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=500&auto=format&fit=crop';
    } else if (recipeName.includes('pizza')) {
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500&auto=format&fit=crop';
    } else if (recipeName.includes('sandwich') || recipeName.includes('burger')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500&auto=format&fit=crop';
    }
  }
  
  // Default fallback image
  return 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=500&auto=format&fit=crop';
}; 