import React from 'react';
import { InventoryItem } from '../types';
import { getImageSrc } from './imageUtils';

// Helper function to get emoji for food category
export const getCategoryEmoji = (category: string): string => {
  switch(category.toLowerCase()) {
    case 'dairy':
      return '🧀';
    case 'protein':
      return '🥚';
    case 'produce':
      return '🍅';
    case 'bakery':
      return '🍞';
    case 'beverages':
      return '🥤';
    case 'snacks':
      return '🍿';
    case 'fruits':
      return '🍎';
    case 'vegetables':
      return '🥦';
    case 'meat':
      return '🥩';
    case 'seafood':
      return '🐟';
    default:
      return '🥘';
  }
};

// Helper to render food icon
export const renderFoodIcon = (item: InventoryItem, category?: string) => {
  const categoryToUse = category || item.category || 'Other';
  
  if (item.image_data) {
    return (
      <img 
        src={getImageSrc(item.image_data)} 
        alt={item.name} 
        className="food-image" 
        onError={(e) => {
          // Fallback to emoji if image fails to load
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerText = 
            categoryToUse === 'Dairy' ? '🧀' : 
            categoryToUse === 'Protein' ? '🥚' : 
            categoryToUse === 'Produce' ? '🍅' : '🥘';
        }}
      />
    );
  } else {
    return (
      categoryToUse === 'Dairy' ? '🧀' : 
      categoryToUse === 'Protein' ? '🥚' : 
      categoryToUse === 'Produce' ? '🍅' : '🥘'
    );
  }
}; 