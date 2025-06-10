import React from 'react';
import { InventoryItem, Recipe as BaseRecipe } from '../types';

// Extended Recipe interface with optional nutrition properties
interface Recipe extends BaseRecipe {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  health_assessment?: string;
}

interface FridgeProps {
  recipes: Recipe[];
  inventory: InventoryItem[];
}

const calculateHealthScore = (ingredients: string[]): number => {
  // This is a simplified health score calculation
  // In a real app, you would use a more sophisticated algorithm
  const healthyIngredients = ['vegetable', 'fruit', 'lean', 'whole grain', 'fish', 'legume'];
  const unhealthyIngredients = ['processed', 'sugar', 'fried', 'fatty', 'sodium'];
  
  let score = 50; // Start with neutral score
  
  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    if (healthyIngredients.some(healthy => lowerIngredient.includes(healthy))) {
      score += 10;
    }
    if (unhealthyIngredients.some(unhealthy => lowerIngredient.includes(unhealthy))) {
      score -= 10;
    }
  });
  
  return Math.min(Math.max(score, 0), 100); // Clamp between 0 and 100
};

const getHealthStatus = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Very Healthy', color: '#4CAF50' };
  if (score >= 60) return { label: 'Healthy', color: '#8BC34A' };
  if (score >= 40) return { label: 'Moderate', color: '#FFC107' };
  if (score >= 20) return { label: 'Unhealthy', color: '#FF9800' };
  return { label: 'Very Unhealthy', color: '#F44336' };
};

const Fridge: React.FC<FridgeProps> = ({ recipes, inventory }) => {
  return (
    <div className="recipes-overview">
      <h2>Recipe Suggestions</h2>
      <div className="recipes-grid">
        {recipes
          .slice(0, 3)
          .sort((a: Recipe, b: Recipe) => {
            // Sort by expiration date of ingredients
            const aExpiryDates = a.ingredients
              .map((ing: string) => inventory.find(item => item.name.toLowerCase() === ing.toLowerCase())?.expiration_date)
              .filter((date): date is string => !!date)
              .map((date: string) => new Date(date).getTime());
            
            const bExpiryDates = b.ingredients
              .map((ing: string) => inventory.find(item => item.name.toLowerCase() === ing.toLowerCase())?.expiration_date)
              .filter((date): date is string => !!date)
              .map((date: string) => new Date(date).getTime());
            
            // If no expiry dates are found, use current time as default
            const aExpiry = aExpiryDates.length > 0 ? Math.min(...aExpiryDates) : Date.now();
            const bExpiry = bExpiryDates.length > 0 ? Math.min(...bExpiryDates) : Date.now();
            
            return aExpiry - bExpiry;
          })
          .map((recipe: Recipe, index: number) => {
            // Find closest expiring ingredient
            interface ExpiringItem {
              name: string;
              expiry: number;
            }

            const expiringIngredients = recipe.ingredients
              .map((ing: string) => {
                const item = inventory.find(item => item.name.toLowerCase() === ing.toLowerCase());
                return item && item.expiration_date ? {
                  name: item.name,
                  expiry: new Date(item.expiration_date).getTime()
                } : null;
              })
              .filter((item): item is ExpiringItem => !!item)
              .sort((a: ExpiringItem, b: ExpiringItem) => a.expiry - b.expiry);

            return (
              <div key={index} className="recipe-card modern-recipe-card">
                <div className="modern-recipe-header">
                  <span className="modern-recipe-title">{recipe.name}</span>
                  {recipe.cooking_time && (
                    <span className="modern-recipe-time"><span role="img" aria-label="clock">⏰</span> {recipe.cooking_time} min</span>
                  )}
                </div>
                <div className="modern-recipe-section">
                  <div className="modern-recipe-section-title">Ingredients</div>
                  <div className="modern-divider"></div>
                  <ul className="modern-ingredient-list">
                    {recipe.ingredients.map((ingredient: string, idx: number) => (
                      <li key={idx}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
                <div className="modern-recipe-section">
                  <div className="modern-recipe-section-title">Nutritional Information (per serving)</div>
                  <div className="modern-nutrition-grid">
                    <div className="modern-nutrition-card">
                      <div className="modern-nutrition-label">Calories</div>
                      <div className="modern-nutrition-value">{recipe.calories ? `${recipe.calories} kcal` : 'N/A'}</div>
                    </div>
                    <div className="modern-nutrition-card">
                      <div className="modern-nutrition-label">Protein</div>
                      <div className="modern-nutrition-value">{recipe.protein ? `${recipe.protein}g` : 'N/A'}</div>
                    </div>
                    <div className="modern-nutrition-card">
                      <div className="modern-nutrition-label">Carbs</div>
                      <div className="modern-nutrition-value">{recipe.carbs ? `${recipe.carbs}g` : 'N/A'}</div>
                    </div>
                    <div className="modern-nutrition-card">
                      <div className="modern-nutrition-label">Fat</div>
                      <div className="modern-nutrition-value">{recipe.fat ? `${recipe.fat}g` : '0g'}</div>
                    </div>
                  </div>
                </div>
                <div className="modern-health-box">
                  <div className="modern-health-title">Health Assessment</div>
                  <div className="modern-health-text">{recipe.health_assessment || 'No assessment available.'}</div>
                </div>
                {expiringIngredients.length > 0 && (
                  <div className="expiry-warning">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">
                      {expiringIngredients[0].name} expires in {Math.ceil((expiringIngredients[0].expiry - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        {recipes.length === 0 && (
          <div className="empty-recipes">
            No recipe suggestions available. Add more items to your fridge!
          </div>
        )}
      </div>
    </div>
  );
};

export default Fridge; 