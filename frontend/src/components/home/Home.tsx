import React from 'react';
import { RecipeSuggestions } from '../recipes';
import { RecipeSuggestButton } from '../recipes/RecipeSuggestButton';
import { InventoryItem, Recipe, ExpirationAlerts as ExpirationAlertsType } from '../../types';
import { renderFoodIcon } from '../../util/foodUtils';
import { renderExpirationBanner } from '../../util/uiUtils';

interface HomeProps {
  inventory: InventoryItem[];
  recipes: Recipe[];
  expirationAlerts: ExpirationAlertsType;
  isLoadingRecipes: boolean;
  expandedFridge: boolean;
  showExpirationAlerts: boolean;
  showRecipeList: boolean;
  foodCategories: Record<string, InventoryItem[]>;
  onFoodItemClick: (item: InventoryItem) => void;
  onToggleFridgeExpand: () => void;
  onToggleExpirationAlerts: () => void;
  onGenerateRecipes: () => void;
}

export const Home: React.FC<HomeProps> = ({
  inventory,
  recipes,
  expirationAlerts,
  isLoadingRecipes,
  expandedFridge,
  showExpirationAlerts,
  showRecipeList,
  foodCategories,
  onFoodItemClick,
  onToggleFridgeExpand,
  onToggleExpirationAlerts,
  onGenerateRecipes
}) => {
  return (
    <>
      <div className="temperature-display">
        <div className="temp-card">
          <div className="temp-value">37<span className="temp-unit">°F</span></div>
          <div className="temp-label">Fridge</div>
        </div>
        <div className="temp-card">
          <div className="temp-value">0<span className="temp-unit">°F</span></div>
          <div className="temp-label">Freezer</div>
        </div>
      </div>
      
      <div className="fridge-section-container">
        <div className="inside-fridge-container">
          <div className="inside-fridge-header">
            <h2>Inside Fridge</h2>
            <button 
              className="expiration-alerts-toggle"
              onClick={onToggleExpirationAlerts}
            >
              <span className="alert-icon">⚠️</span>
              Expiration Alerts
              {(expirationAlerts.warning_3_days.length > 0 || expirationAlerts.warning_week.length > 0) && (
                <span className="alert-badge">{expirationAlerts.warning_3_days.length + expirationAlerts.warning_week.length}</span>
              )}
            </button>
          </div>
          
          {!expandedFridge ? (
            <div className="food-items-container">
              <div className="food-items-grid">
                {inventory.length > 0 ? (
                  // Flatten all items from all categories and take the first 8
                  inventory.slice(0, 8).map(item => (
                    <div key={item.id || item._id} className="food-item" onClick={() => onFoodItemClick(item)}>
                      <div className="food-icon">
                        {renderFoodIcon(item)}
                      </div>
                      <div className="food-name">{item.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-fridge-message">
                    No items in your fridge
                  </div>
                )}
              </div>
              <div className="view-more" onClick={onToggleFridgeExpand}>
                <span className="expand-arrow">›</span>
              </div>
            </div>
          ) : (
            <div className="expanded-fridge">
              <div className="expanded-fridge-overlay" onClick={onToggleFridgeExpand}></div>
              <div className="expanded-fridge-content">
                <div className="expanded-header">
                  <h2>Full Inventory</h2>
                  <button className="close-button" onClick={onToggleFridgeExpand}>✕</button>
                </div>
                
                {Object.entries(foodCategories).map(([category, items]) => (
                  <div key={category} className="category-section">
                    <h3 className="category-title">{category}</h3>
                    <div className="category-items">
                      {items.map(item => (
                        <div key={item.id || item._id} className="inventory-item" onClick={() => onFoodItemClick(item)}>
                          <div className="item-icon">
                            {renderFoodIcon(item, category)}
                          </div>
                          <div className="item-details">
                            <div className="item-name">{item.name}</div>
                            <div className="item-quantity">{item.quantity}</div>
                            {item.expiration_date && (
                              <div className="item-expiry">
                                Expires: {new Date(item.expiration_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {inventory.length === 0 && (
                  <div className="empty-inventory">
                    <p>Your fridge is empty! Add some items to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Display expiration alerts when showExpirationAlerts is true */}
        {showExpirationAlerts && renderExpirationBanner(expirationAlerts, onToggleExpirationAlerts)}
      </div>
      
      <RecipeSuggestButton
        inventory={inventory}
        isLoading={isLoadingRecipes}
        onSuggestRecipes={onGenerateRecipes}
      />
      
      {/* Show recipe suggestions below if recipes are available and showRecipeList is true */}
      {showRecipeList && recipes.length > 0 && (
        <RecipeSuggestions
          recipes={recipes}
          isLoading={isLoadingRecipes}
          onGenerateRecipes={onGenerateRecipes}
          showSuggestButton={false}
        />
      )}
    </>
  );
}; 