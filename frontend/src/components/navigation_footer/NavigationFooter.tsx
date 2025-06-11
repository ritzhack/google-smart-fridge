import React from 'react';

interface NavigationFooterProps {
  activeTab: 'home' | 'recipes' | 'inventory' | 'settings';
  onTabChange: (tab: 'home' | 'recipes' | 'inventory' | 'settings') => void;
}

export const NavigationFooter: React.FC<NavigationFooterProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  return (
    <footer className="app-navigation">
      <button 
        className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </button>
      <button 
        className={`nav-button ${activeTab === 'recipes' ? 'active' : ''}`}
        onClick={() => onTabChange('recipes')}
      >
        <span className="nav-icon">📖</span>
        <span className="nav-label">Recipes</span>
      </button>
      <button 
        className={`nav-button ${activeTab === 'inventory' ? 'active' : ''}`}
        onClick={() => onTabChange('inventory')}
      >
        <span className="nav-icon">📦</span>
        <span className="nav-label">Inventory</span>
      </button>
      <button 
        className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
      </button>
    </footer>
  );
}; 