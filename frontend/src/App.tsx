import React, { useState, useEffect } from "react";
import { getInventoryItems, generateRecipes, checkExpirations, updateInventoryItem, deleteInventoryItem } from "./services/api";
import { InventoryManagement, ItemDetailModal } from "./components/inventory";
import { DeleteConfirmationDialog } from "./components/inventory/DeleteConfirmationDialog";
import { RecipeSuggestions } from "./components/recipes";
import { FridgeSimulator } from "./components/fridge_simulator";
import { Settings } from "./components/setting";
import { NavigationFooter } from "./components/navigation_footer";
import { Home } from "./components/home";
import { InventoryItem, Recipe, ExpirationAlerts as ExpirationAlertsType } from "./types";
import "./App.css";

function App() {
  // Core data state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlertsType>({
    warning_week: [],
    warning_3_days: []
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'home' | 'recipes' | 'inventory' | 'settings'>('home');
  const [expandedFridge, setExpandedFridge] = useState<boolean>(false);
  const [showExpirationAlerts, setShowExpirationAlerts] = useState<boolean>(false);
  const [showRecipeList, setShowRecipeList] = useState<boolean>(false);

  // Loading and error state
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Form state
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<string>("1");

  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Fetch inventory data
  const fetchInventory = async (): Promise<void> => {
    setIsLoadingInventory(true);
    setError(null);
    try {
      const response = await getInventoryItems();
      setInventory(response.data);
      // Update expiration alerts after inventory is updated
      await handleCheckExpirations();
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("Failed to fetch inventory. Is the backend server running?");
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchInventory();
  }, []);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Check expirations when inventory changes
  useEffect(() => {
    if (inventory.length > 0) {
      handleCheckExpirations();
      if (expirationAlerts.warning_3_days.length > 0) {
        setShowExpirationAlerts(true);
      }
    }
  }, [inventory]);

  // Tab navigation
  const handleTabChange = (tab: 'home' | 'recipes' | 'inventory' | 'settings') => {
    setActiveTab(tab);
    if (tab !== 'home') setShowRecipeList(false);

    // Auto-generate recipes for recipes tab
    if (tab === 'recipes' && recipes.length === 0 && inventory.length > 0 && !isLoadingRecipes) {
      handleGenerateRecipes();
    }
  };

  // Recipe generation
  const handleGenerateRecipes = async (): Promise<void> => {
    if (inventory.length === 0) {
      alert("Fridge is empty! Add some items to get recipe suggestions.");
      return;
    }

    setIsLoadingRecipes(true);
    setError(null);
    try {
      const itemNames = inventory.map(item => item.name);
      const response = await generateRecipes(itemNames, "dinner");
      setRecipes(response.data);
      setShowRecipeList(true);
    } catch (err) {
      console.error("Error generating recipes:", err);
      setError("Failed to generate recipes.");
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Expiration alerts
  const handleCheckExpirations = async (): Promise<void> => {
    setError(null);
    try {
      const response = await checkExpirations();
      setExpirationAlerts(response.data);
    } catch (err) {
      console.error("Error checking expirations:", err);
      setError("Failed to check for expiring items.");
      setExpirationAlerts({ warning_week: [], warning_3_days: [] });
    }
  };

  // Item management
  const handleFoodItemClick = (item: InventoryItem) => setSelectedItem(item);

  const handleRemoveItem = async (item: InventoryItem) => {
    try {
      if (item._id) await deleteInventoryItem(item._id);

      setInventory(prev => prev.filter(invItem =>
        invItem._id !== item._id && invItem.id !== item.id
      ));

      // Update expiration alerts after removing item
      await handleCheckExpirations();

      fetchInventory();
      setSelectedItem(null);
      setItemToDelete(null);
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Failed to delete item. Please try again.");
    }
  };

  // Item detail modal
  const closeDetailCard = () => {
    setSelectedItem(null);
    setIsEditing(false);
    setEditedItem({});
    setUpdateError(null);
  };

  const toggleEditMode = () => {
    if (!selectedItem) return;

    setEditedItem({
      name: selectedItem.name,
      quantity: selectedItem.quantity,
      category: selectedItem.category,
      expiration_date: selectedItem.expiration_date
    });
    setIsEditing(!isEditing);
    setUpdateError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: value }));
  };

  const saveItemChanges = async () => {
    if (!selectedItem?._id) return;

    setIsSaving(true);
    setUpdateError(null);

    try {
      const itemUpdate: Partial<InventoryItem> = {};

      // Only include changed fields
      if (editedItem.name && editedItem.name !== selectedItem.name) itemUpdate.name = editedItem.name;
      if (editedItem.quantity && editedItem.quantity !== selectedItem.quantity) itemUpdate.quantity = editedItem.quantity;
      if (editedItem.category && editedItem.category !== selectedItem.category) itemUpdate.category = editedItem.category;
      if (editedItem.expiration_date && editedItem.expiration_date !== selectedItem.expiration_date) itemUpdate.expiration_date = editedItem.expiration_date;

      if (Object.keys(itemUpdate).length > 0) {
        const response = await updateInventoryItem(selectedItem._id, itemUpdate);

        setInventory(prev => prev.map(item =>
          item._id === selectedItem._id ? { ...item, ...response.data } : item
        ));

        setSelectedItem(prev => prev ? { ...prev, ...response.data } : null);
        fetchInventory();
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating item:", err);
      setUpdateError("Failed to update item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Computed values
  const foodCategories = inventory.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Toggle functions
  const toggleFridgeExpand = () => setExpandedFridge(!expandedFridge);
  const toggleExpirationAlerts = () => setShowExpirationAlerts(!showExpirationAlerts);

  // Notification handlers
  const handleNotification = (message: string | null) => {
    if (message) {
      // Check if this is actually a success message disguised as an error
      if (message.includes('✅') || message.includes('🔄') || message.includes('🔍') || message.includes('❌')) {
        setNotification({ message, type: 'success' });
        setError(null);
      } else {
        setError(message);
        setNotification(null);
      }
    } else {
      setError(null);
      setNotification(null);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            inventory={inventory}
            recipes={recipes}
            expirationAlerts={expirationAlerts}
            isLoadingRecipes={isLoadingRecipes}
            expandedFridge={expandedFridge}
            showExpirationAlerts={showExpirationAlerts}
            showRecipeList={showRecipeList}
            foodCategories={foodCategories}
            onFoodItemClick={handleFoodItemClick}
            onToggleFridgeExpand={toggleFridgeExpand}
            onToggleExpirationAlerts={toggleExpirationAlerts}
            onGenerateRecipes={handleGenerateRecipes}
          />
        );
      case 'recipes':
        return (
          <RecipeSuggestions
            recipes={recipes}
            isLoading={isLoadingRecipes}
            onGenerateRecipes={handleGenerateRecipes}
          />
        );
      case 'inventory':
        return (
          <InventoryManagement
            inventory={inventory}
            isLoading={isLoadingInventory}
            onInventoryUpdate={fetchInventory}
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <FridgeSimulator
        onInventoryUpdate={fetchInventory}
        onNotification={handleNotification}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        newItemQuantity={newItemQuantity}
        setNewItemQuantity={setNewItemQuantity}
      />

      <div className="App">
        <header className="app-header">
          <div className="brand">PROTAG & RITZ</div>
          <h1>Refrigerator</h1>
          <div className="connection-status">Connected</div>
        </header>

        <main className="app-content">
          {error && <div className="error-message">{error}</div>}
          {notification && (
            <div className={`notification-message ${notification.type}`}>
              <div className="notification-content">
                {notification.message.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
              <button
                className="notification-close"
                onClick={() => setNotification(null)}
              >
                ×
              </button>
            </div>
          )}
          {renderContent()}
        </main>

        <NavigationFooter
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      <ItemDetailModal
        selectedItem={selectedItem}
        isEditing={isEditing}
        editedItem={editedItem}
        isSaving={isSaving}
        updateError={updateError}
        onClose={closeDetailCard}
        onToggleEdit={toggleEditMode}
        onEditChange={handleEditChange}
        onSaveChanges={saveItemChanges}
        onRemoveItem={(item) => setItemToDelete(item)}
      />

      <DeleteConfirmationDialog
        item={itemToDelete}
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleRemoveItem(itemToDelete)}
      />
    </div>
  );
}

export default App; 