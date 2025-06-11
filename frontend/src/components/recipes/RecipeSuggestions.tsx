import React, { useState } from 'react';
import { Recipe, InventoryItem } from '../../types';
import { getRecipeImage } from './util/recipeImageUtils';
import './RecipeSuggestions.css';

interface RecipeSuggestionsProps {
  recipes: Recipe[];
  isLoading: boolean;
  onGenerateRecipes: () => void;
  showSuggestButton?: boolean;
}

export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  recipes,
  isLoading,
  onGenerateRecipes,
  showSuggestButton = false,
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleBackClick = () => {
    setSelectedRecipe(null);
  };

  // If showSuggestButton is true and no recipes, show empty state without button
  // If showSuggestButton is false, show the recipe list or empty message
  if (showSuggestButton && recipes.length === 0) {
    return (
      <div className="recipe-suggestions">
        <h2>Recipe Suggestions</h2>
        <div className="empty-state">
          <p>No recipes found. Try generating some recipes first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-suggestions">
      <h2>Recipe Suggestions</h2>
      
      {isLoading && recipes.length === 0 ? (
        <div className="loading-state">
          <p>Generating recipes based on your ingredients...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>No recipes available. Generate some recipes to get started!</p>
        </div>
      ) : (
        <div className="recipe-list">
          {recipes.map((recipe, index) => (
            <div 
              key={recipe._id || index} 
              className="recipe-card"
              onClick={() => handleRecipeClick(recipe)}
            >
              <img 
                src={getRecipeImage(recipe)} 
                alt={recipe.name} 
                className="recipe-image" 
              />
              <div className="recipe-details">
                <h3 className="recipe-name">{recipe.name}</h3>
                <div className="recipe-meta">
                  {recipe.cooking_time && (
                    <span className="cooking-time">
                      {recipe.cooking_time} min
                    </span>
                  )}
                  {recipe.nutrition?.calories && (
                    <span className="calories">
                      {recipe.nutrition.calories} kcal
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <button 
            className="refresh-button" 
            onClick={onGenerateRecipes} 
            disabled={isLoading}
          >
            {isLoading ? "Finding more recipes..." : "Refresh Recipes"}
          </button>
        </div>
      )}
      
      {/* Detailed recipe view */}
      {selectedRecipe && (
        <div className="selected-recipe">
          <div className="recipe-header">
            <button className="back-button" onClick={handleBackClick}>Back</button>
            <h2>{selectedRecipe.name}</h2>
          </div>
          
          <img 
            src={getRecipeImage(selectedRecipe)} 
            alt={selectedRecipe.name} 
            className="recipe-detail-image" 
          />
          
          <div className="recipe-info">
            <div className="recipe-time-calories">
              <div className="info-item">
                <span className="info-label">Cooking Time</span>
                <span className="info-value">{selectedRecipe.cooking_time || 'N/A'} min</span>
              </div>
              <div className="info-item">
                <span className="info-label">Calories</span>
                <span className="info-value">{selectedRecipe.nutrition?.calories || 'N/A'} kcal</span>
              </div>
            </div>
            
            <div className="recipe-ingredients">
              <h3>Ingredients</h3>
              <ul>
                {Array.isArray(selectedRecipe.ingredients) ? 
                  selectedRecipe.ingredients.map((ingredient, i) => (
                    <li key={i}>{ingredient}</li>
                  )) : 
                  <li>{selectedRecipe.ingredients}</li>
                }
              </ul>
            </div>
            
            <div className="recipe-instructions">
              <h3>Instructions</h3>
              {typeof selectedRecipe.instructions === 'string' ? (
                <p>{selectedRecipe.instructions}</p>
              ) : Array.isArray(selectedRecipe.instructions) ? (
                <ol>
                  {selectedRecipe.instructions.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p>No instructions available</p>
              )}
            </div>

            {selectedRecipe.nutrition && (
              <div className="recipe-nutrition">
                <h3>Nutritional Information</h3>
                <div className="nutrition-grid">
                  {selectedRecipe.nutrition.calories && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Calories</span>
                      <span className="nutrition-value">{selectedRecipe.nutrition.calories} kcal</span>
                    </div>
                  )}
                  {selectedRecipe.nutrition.protein && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Protein</span>
                      <span className="nutrition-value">{selectedRecipe.nutrition.protein}g</span>
                    </div>
                  )}
                  {selectedRecipe.nutrition.carbs && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Carbs</span>
                      <span className="nutrition-value">{selectedRecipe.nutrition.carbs}g</span>
                    </div>
                  )}
                  {selectedRecipe.nutrition.fat && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Fat</span>
                      <span className="nutrition-value">{selectedRecipe.nutrition.fat}g</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {selectedRecipe.health_assessment && (
              <div className="health-assessment">
                <h3>Health Assessment</h3>
                <p>{selectedRecipe.health_assessment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 