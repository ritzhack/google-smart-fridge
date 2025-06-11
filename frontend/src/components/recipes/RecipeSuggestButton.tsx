import React from 'react';
import { InventoryItem } from '../../types';

interface RecipeSuggestButtonProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  onSuggestRecipes: () => void;
}

export const RecipeSuggestButton: React.FC<RecipeSuggestButtonProps> = ({
  inventory,
  isLoading,
  onSuggestRecipes,
}) => {
  const handleSuggestClick = () => {
    // Generate recipes and navigate to recipe list
    onSuggestRecipes();
  };

  return (
    <div className="recipe-suggest-section">
      <div className="suggest-content">
        <h3>Ready to Cook?</h3>
        <p>Get delicious recipe ideas based on what's in your fridge</p>
        <button 
          className="suggest-button" 
          onClick={handleSuggestClick} 
          disabled={isLoading || inventory.length === 0}
        >
          {isLoading ? "Finding recipes..." : "Suggest Recipes"}
        </button>
        {inventory.length === 0 && (
          <p className="empty-inventory-message">
            Add some items to your fridge to get recipe suggestions
          </p>
        )}
      </div>
    </div>
  );
}; 