import React, { useState, useEffect, useRef, DragEvent } from "react";
import { getInventoryItems, generateRecipes, checkExpirations, updateInventoryItem, deleteInventoryItem } from "./services/api";
import { InventoryManagement } from "./components/InventoryManagement";
import { ExpirationAlerts } from "./components/ExpirationAlerts";
import { RecipeSuggestions } from "./components/RecipeSuggestions";
import { InventoryItem, Recipe, ExpirationAlerts as ExpirationAlertsType } from "./types";
import "./App.css";

// Helper function to handle image data
const getImageSrc = (imageData: string | undefined): string | undefined => {
  if (!imageData) return undefined;
  
  // If it's already a URL that starts with http
  if (imageData.startsWith('http')) {
    return imageData;
  }
  
  // If it's a base64 string that doesn't have the data URL prefix
  if (!imageData.startsWith('data:')) {
    return `data:image/jpeg;base64,${imageData}`;
  }
  
  // If it already has the data URL prefix
  return imageData;
};

// Sample items for scanning demonstration
const sampleItemsToScan = [
  {
    id: 'scan-1',
    name: 'Milk',
    quantity: '1 gallon',
    category: 'Dairy',
    expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    image_data: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'scan-2',
    name: 'Chicken Breast',
    quantity: '1 lb',
    category: 'Protein',
    expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    image_data: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'scan-3',
    name: 'Spinach',
    quantity: '1 bunch',
    category: 'Produce',
    expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    image_data: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'scan-4',
    name: 'Cheddar Cheese',
    quantity: '8 oz',
    category: 'Dairy',
    expiration_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    image_data: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'scan-5',
    name: 'Apples',
    quantity: '5 count',
    category: 'Produce',
    expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    image_data: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200&auto=format&fit=crop'
  }
];

// Define a type for scan items to fix TypeScript errors
interface ScanItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  expiration_date?: string;
  image_data?: string;
}

// Helper function to get emoji for food category
const getCategoryEmoji = (category: string): string => {
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

function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlertsType>({ 
    warning_week: [], 
    warning_3_days: [] 
  });
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'recipes' | 'inventory' | 'settings'>('home');
  const [expandedFridge, setExpandedFridge] = useState<boolean>(false);
  const [itemsToScan, setItemsToScan] = useState<ScanItem[]>(sampleItemsToScan);
  const [showExpirationAlerts, setShowExpirationAlerts] = useState<boolean>(false);
  
  // Image upload state
  const [takeInDragActive, setTakeInDragActive] = useState<boolean>(false);
  const [takeOutDragActive, setTakeOutDragActive] = useState<boolean>(false);
  const [takeInImage, setTakeInImage] = useState<File | null>(null);
  const [takeOutImage, setTakeOutImage] = useState<File | null>(null);
  const [takeInPreview, setTakeInPreview] = useState<string | null>(null);
  const [takeOutPreview, setTakeOutPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<string>("1");
  const takeInFileInputRef = useRef<HTMLInputElement>(null);
  const takeOutFileInputRef = useRef<HTMLInputElement>(null);

  // Add selected item state in the App component
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchInventory = async (): Promise<void> => {
    setIsLoadingInventory(true);
    setError(null);
    try {
      const response = await getInventoryItems();
      setInventory(response.data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("Failed to fetch inventory. Is the backend server running?");
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchInventory();
  }, []);

  // Set up automatic refresh at regular intervals
  useEffect(() => {
    // Refresh inventory data every 30 seconds to ensure it stays up-to-date
    const refreshInterval = setInterval(() => {
      fetchInventory();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

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
    } catch (err) {
      console.error("Error generating recipes:", err);
      setError("Failed to generate recipes.");
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleCheckExpirations = async (): Promise<void> => {
    setIsLoadingAlerts(true);
    setError(null);
    try {
      const response = await checkExpirations();
      setExpirationAlerts(response.data);
    } catch (err) {
      console.error("Error checking expirations:", err);
      setError("Failed to check for expiring items.");
      setExpirationAlerts({ warning_week: [], warning_3_days: [] });
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const toggleFridgeExpand = () => {
    setExpandedFridge(!expandedFridge);
  };

  // Handle adding an item to the fridge
  const handleAddItem = (item: InventoryItem) => {
    // Add the item to inventory
    setInventory(prev => [...prev, { ...item, _id: Date.now().toString() }]);
    
    // Remove the item from the scan list
    setItemsToScan(prev => prev.filter(i => i.id !== item.id));
    
    // Add a new random item to the scan list after a delay
    setTimeout(() => {
      const newItem = { 
        ...sampleItemsToScan[Math.floor(Math.random() * sampleItemsToScan.length)],
        id: `scan-${Date.now()}`
      };
      setItemsToScan(prev => [...prev, newItem]);
      
      // Refresh inventory data to ensure UI is up-to-date
      fetchInventory();
    }, 2000);
  };

  // Update the handleFoodItemClick function to show the detail card instead of removing the item
  const handleFoodItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
  };
  
  // Add a function to handle the actual removal of items
  const handleRemoveItem = async (item: InventoryItem) => {
    try {
      // Call the backend API to delete the item if it has an _id
      if (item._id) {
        await deleteInventoryItem(item._id);
      }
      
      // Only remove the specific item from local state
      const newInventory = inventory.filter((invItem) => {
        // If both IDs exist, check both to be sure
        if (invItem._id && item._id) {
          return invItem._id !== item._id;
        }
        // If only one type of ID exists, check that
        if (invItem.id && item.id) {
          return invItem.id !== item.id;
        }
        // If we have mixed ID types, check both possibilities
        return (invItem._id !== item._id) && (invItem.id !== item.id);
      });
      
      setInventory(newInventory);
      
      // Add item to scan panel if it has a name
      if (item.name) {
        const newScanItem: ScanItem = {
          id: String(Date.now()),
          name: item.name,
          quantity: item.quantity || "1",
          category: item.category || "general",
          expiration_date: item.expiration_date,
          image_data: item.image_data
        };
        setItemsToScan([...itemsToScan, newScanItem]);
      }
      
      // Refresh inventory data to ensure UI is up-to-date
      fetchInventory();
      
      // Close the detail card
      setSelectedItem(null);
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Failed to delete item. Please try again.");
    }
  };
  
  // Add a function to close the detail card
  const closeDetailCard = () => {
    setSelectedItem(null);
    setIsEditing(false);
    setEditedItem({});
    setUpdateError(null);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (selectedItem) {
      setEditedItem({
        name: selectedItem.name,
        quantity: selectedItem.quantity,
        category: selectedItem.category,
        expiration_date: selectedItem.expiration_date
      });
      setIsEditing(!isEditing);
      setUpdateError(null);
    }
  };
  
  // Handle input changes in edit mode
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save changes to the backend
  const saveItemChanges = async () => {
    if (!selectedItem || !selectedItem._id) return;
    
    setIsSaving(true);
    setUpdateError(null);
    
    try {
      // Only send fields that have been modified
      const itemUpdate: Partial<InventoryItem> = {};
      
      if (editedItem.name && editedItem.name !== selectedItem.name) {
        itemUpdate.name = editedItem.name;
      }
      
      if (editedItem.quantity && editedItem.quantity !== selectedItem.quantity) {
        itemUpdate.quantity = editedItem.quantity;
      }
      
      if (editedItem.category && editedItem.category !== selectedItem.category) {
        itemUpdate.category = editedItem.category;
      }
      
      if (editedItem.expiration_date && editedItem.expiration_date !== selectedItem.expiration_date) {
        itemUpdate.expiration_date = editedItem.expiration_date;
      }
      
      // Only proceed with update if there are changes
      if (Object.keys(itemUpdate).length > 0) {
        const response = await updateInventoryItem(selectedItem._id, itemUpdate);
        
        // Update local state
        setInventory(prev => 
          prev.map(item => 
            (item._id === selectedItem._id) 
              ? { ...item, ...response.data }
              : item
          )
        );
        
        // Update selected item with new data
        setSelectedItem(prev => prev ? { ...prev, ...response.data } : null);
        
        // Refresh inventory data to ensure UI is up-to-date
        fetchInventory();
      }
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating item:", err);
      setUpdateError("Failed to update item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Group inventory items by category for display
  const foodCategories = inventory.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Helper to render food icon
  const renderFoodIcon = (item: InventoryItem, category?: string) => {
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

  // Take In image handlers
  const handleTakeInDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setTakeInDragActive(true);
    } else if (e.type === "dragleave") {
      setTakeInDragActive(false);
    }
  };

  const handleTakeInDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setTakeInDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleTakeInFile(e.dataTransfer.files[0]);
    }
  };

  const handleTakeInFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleTakeInFile(e.target.files[0]);
    }
  };

  const handleTakeInFile = (file: File) => {
    setTakeInImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setTakeInPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearTakeInImage = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setTakeInImage(null);
    setTakeInPreview(null);
    if (takeInFileInputRef.current) {
      takeInFileInputRef.current.value = '';
    }
  };

  // Take Out image handlers
  const handleTakeOutDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setTakeOutDragActive(true);
    } else if (e.type === "dragleave") {
      setTakeOutDragActive(false);
    }
  };

  const handleTakeOutDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setTakeOutDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleTakeOutFile(e.dataTransfer.files[0]);
    }
  };

  const handleTakeOutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleTakeOutFile(e.target.files[0]);
    }
  };

  const handleTakeOutFile = (file: File) => {
    setTakeOutImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setTakeOutPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearTakeOutImage = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setTakeOutImage(null);
    setTakeOutPreview(null);
    if (takeOutFileInputRef.current) {
      takeOutFileInputRef.current.value = '';
    }
  };

  // Process uploaded images
  const handleProcessImages = async () => {
    if (!takeInImage && !takeOutImage) {
      setError("Please select at least one image to process.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (takeInImage) {
        formData.append('first_image', takeInImage);
      }
      
      if (takeOutImage) {
        formData.append('second_image', takeOutImage);
      }
      
      // Add parameter to indicate that we want to store the image in the vector database
      // if no similar images are found (similarity < 0.75)
      formData.append('store_new_images', 'true');

      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/upload-image-pair`, {
        method: 'POST',
        body: formData,
      });

      let successfulProcess = false;

      if (response.ok) {
        // Normal successful case
        successfulProcess = true;
      } else {
        // Check for the specific 'updated' error which actually means the item was added
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to process images';
        
        // If the error contains "updated", the item was likely added despite the error
        if (errorMessage.includes('updated')) {
          console.log("Item was likely added despite 'updated' error. Refreshing inventory.");
          successfulProcess = true;
          setError("Item was added, but there was a minor backend error: " + errorMessage);
        } else if (errorMessage.includes('similarity') || errorMessage.includes('threshold')) {
          // This is the case where no similar images were found, but we've asked the backend to store it
          console.log("No similar images found. Image should be added to the vector database.");
          successfulProcess = true;
          setError("New image type detected and added to our database. Item identification might improve in future uploads.");
        } else {
          throw new Error(errorMessage);
        }
      }

      if (successfulProcess) {
        // Fetch updated inventory if the process was successful or had the specific error
        await fetchInventory();
        
        // Clear the images and previews
        if (takeInImage) clearTakeInImage();
        if (takeOutImage) clearTakeOutImage();
        
        // Reset form fields
        setNewItemName("");
        setNewItemQuantity("1");
      }
    } catch (err) {
      console.error('Error processing images:', err);
      setError(err instanceof Error ? err.message : 'Failed to process images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add item manually
  const handleAddItemManually = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newItemName) {
      const newItem: ScanItem = {
        id: `manual-${Date.now()}`,
        name: newItemName,
        quantity: newItemQuantity,
        category: "Other",
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        image_data: ''
      };
      
      setInventory(prev => [...prev, { ...newItem, _id: Date.now().toString() }]);
      setNewItemName("");
      setNewItemQuantity("1");
      
      // Refresh inventory data to ensure UI is up-to-date
      fetchInventory();
    }
  };

  // Function to render a compact version of expiration alerts
  const renderExpirationBanner = () => {
    const hasAlerts = expirationAlerts.warning_3_days.length > 0 || expirationAlerts.warning_week.length > 0;
    
    if (!hasAlerts) return null;
    
    return (
      <div className="expiration-banner">
        <div className="expiration-banner-header">
          <h3>
            <span className="warning-icon">⚠️</span>
            Expiration Alerts
          </h3>
          <button className="expiration-banner-close" onClick={toggleExpirationAlerts}>×</button>
        </div>
        
        {expirationAlerts.warning_3_days.length > 0 && (
          <div className="expiration-alert-group critical">
            <h4>Critical: Expiring in 3 days or less</h4>
            <ul className="expiration-items">
              {expirationAlerts.warning_3_days.map((item) => (
                <li key={`${item.name}-${item.expiration_date}`}>
                  <span className="exp-item-name">{item.name}</span>
                  <span className="exp-item-days">{item.days_left} day{item.days_left !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {expirationAlerts.warning_week.length > 0 && (
          <div className="expiration-alert-group warning">
            <h4>Warning: Expiring this week</h4>
            <ul className="expiration-items">
              {expirationAlerts.warning_week.map((item) => (
                <li key={`${item.name}-${item.expiration_date}`}>
                  <span className="exp-item-name">{item.name}</span>
                  <span className="exp-item-days">{item.days_left} day{item.days_left !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Add function to toggle expiration alerts visibility
  const toggleExpirationAlerts = () => {
    setShowExpirationAlerts(!showExpirationAlerts);
  };

  // Update useEffect to check expirations when inventory changes and initialize showExpirationAlerts
  useEffect(() => {
    if (inventory.length > 0) {
      handleCheckExpirations();
      // Auto show expiration alerts if there are critical items
      if (expirationAlerts.warning_3_days.length > 0) {
        setShowExpirationAlerts(true);
      }
    }
  }, [inventory]);

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
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
                    onClick={toggleExpirationAlerts}
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
                          <div key={item.id || item._id} className="food-item" onClick={() => handleFoodItemClick(item)}>
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
                    <div className="view-more" onClick={toggleFridgeExpand}>
                      <span className="expand-arrow">›</span>
                    </div>
                  </div>
                ) : (
                  <div className="expanded-fridge">
                    <div className="expanded-fridge-overlay" onClick={toggleFridgeExpand}></div>
                    <div className="expanded-fridge-content">
                      <div className="expanded-header">
                        <h2>Full Inventory</h2>
                        <button className="close-button" onClick={toggleFridgeExpand}>✕</button>
                      </div>
                      
                      {Object.entries(foodCategories).map(([category, items]) => (
                        <div key={category} className="category-section">
                          <h3 className="category-title">{category}</h3>
                          <div className="category-items">
                            {items.map(item => (
                              <div key={item.id || item._id} className="inventory-item" onClick={() => handleFoodItemClick(item)}>
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
              {showExpirationAlerts && renderExpirationBanner()}
            </div>
            
            <RecipeSuggestions
              recipes={recipes}
              inventory={inventory}
              isLoading={isLoadingRecipes}
              onGenerateRecipes={handleGenerateRecipes}
            />
          </>
        );
      case 'recipes':
        return (
          <RecipeSuggestions
            recipes={recipes}
            inventory={inventory}
            isLoading={isLoadingRecipes}
            onGenerateRecipes={handleGenerateRecipes}
          />
        );
      case 'inventory':
        return (
          <>
            <InventoryManagement
              inventory={inventory}
              isLoading={isLoadingInventory}
              onInventoryUpdate={fetchInventory}
            />
            <ExpirationAlerts
              alerts={expirationAlerts}
              isLoading={isLoadingAlerts}
              onCheckExpirations={handleCheckExpirations}
              inventory={inventory}
            />
          </>
        );
      case 'settings':
        return (
          <div className="settings-page">
            <h2>Settings</h2>
            <div className="settings-section">
              <h3>Temperature Control</h3>
              <div className="setting-item">
                <span>Fridge Temperature</span>
                <select defaultValue="37">
                  {Array.from({length: 8}, (_, i) => 34 + i).map(temp => (
                    <option key={temp} value={temp}>{temp}°F</option>
                  ))}
                </select>
              </div>
              <div className="setting-item">
                <span>Freezer Temperature</span>
                <select defaultValue="0">
                  {Array.from({length: 6}, (_, i) => -5 + i).map(temp => (
                    <option key={temp} value={temp}>{temp}°F</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <div className="scan-panel">
        <div className="scan-panel-header">
          <h2>Scan Items</h2>
        </div>
        
        {/* Image Upload Section */}
        <div className="scan-panel-section">
          <h3>Upload Images</h3>
          {error && <div className="error-message scan-panel-error">{error}</div>}
          <div className="image-upload-container">
            {/* Take In Image Upload */}
            <div className="image-upload-box">
              <h4 className="upload-title take-in">Take In (Add Items)</h4>
              <div
                className={`upload-dropzone take-in ${takeInDragActive ? 'active' : ''} ${takeInPreview ? 'has-preview' : ''}`}
                onDragEnter={handleTakeInDrag}
                onDragOver={handleTakeInDrag}
                onDragLeave={handleTakeInDrag}
                onDrop={handleTakeInDrop}
                onClick={() => takeInFileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={takeInFileInputRef}
                  onChange={handleTakeInFileChange}
                  accept="image/*"
                  className="file-input"
                />
                
                {takeInPreview ? (
                  <div className="preview-container">
                    <img 
                      src={takeInPreview} 
                      alt="Take in preview" 
                      className="preview-image"
                    />
                    <button
                      onClick={(e) => clearTakeInImage(e)}
                      className="clear-image-btn"
                    >
                      ×
                    </button>
                  </div>
                ) : takeInDragActive ? (
                  <p className="dropzone-text active">Drop the image here...</p>
                ) : (
                  <div className="dropzone-content">
                    <div className="dropzone-icon">📸</div>
                    <p className="dropzone-text">
                      Drag & drop an image of items to add<br />
                      or click to select
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Take Out Image Upload */}
            <div className="image-upload-box">
              <h4 className="upload-title take-out">Take Out (Remove Items)</h4>
              <div
                className={`upload-dropzone take-out ${takeOutDragActive ? 'active' : ''} ${takeOutPreview ? 'has-preview' : ''}`}
                onDragEnter={handleTakeOutDrag}
                onDragOver={handleTakeOutDrag}
                onDragLeave={handleTakeOutDrag}
                onDrop={handleTakeOutDrop}
                onClick={() => takeOutFileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={takeOutFileInputRef}
                  onChange={handleTakeOutFileChange}
                  accept="image/*"
                  className="file-input"
                />
                
                {takeOutPreview ? (
                  <div className="preview-container">
                    <img 
                      src={takeOutPreview} 
                      alt="Take out preview" 
                      className="preview-image"
                    />
                    <button
                      onClick={(e) => clearTakeOutImage(e)}
                      className="clear-image-btn"
                    >
                      ×
                    </button>
                  </div>
                ) : takeOutDragActive ? (
                  <p className="dropzone-text active">Drop the image here...</p>
                ) : (
                  <div className="dropzone-content">
                    <div className="dropzone-icon">📸</div>
                    <p className="dropzone-text">
                      Drag & drop an image of items to remove<br />
                      or click to select
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Process Images Button */}
          <div className="process-images-container">
            <button
              className={`process-images-btn ${isUploading || (!takeInImage && !takeOutImage) ? 'disabled' : ''}`}
              onClick={handleProcessImages}
              disabled={isUploading || (!takeInImage && !takeOutImage)}
            >
              {isUploading ? 'Processing Images...' : 'Process Images'}
            </button>
          </div>

          {/* Manual Add Item Form */}
          <div className="manual-add-container">
            <h4>Manual Add Item</h4>
            <form onSubmit={handleAddItemManually} className="manual-add-form">
              <input 
                type="text" 
                value={newItemName} 
                onChange={(e) => setNewItemName(e.target.value)} 
                placeholder="Item name (e.g., Apple)"
                required
                className="manual-input"
              />
              <input 
                type="text"
                value={newItemQuantity} 
                onChange={(e) => setNewItemQuantity(e.target.value)} 
                placeholder="Quantity (e.g., 2)"
                required
                className="manual-input"
              />
              <button 
                type="submit"
                className="manual-add-btn"
              >
                Add Item
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="App">
        <header className="app-header">
          <div className="brand">PROTAG & RITZ</div>
          <h1>Refrigerator</h1>
          <div className="connection-status">Connected</div>
        </header>
        <main className="app-content">
          {error && <div className="error-message">{error}</div>}
          {renderContent()}
        </main>
        <footer className="app-navigation">
          <button 
            className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button 
            className={`nav-button ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <span className="nav-icon">📖</span>
            <span className="nav-label">Recipes</span>
          </button>
          <button 
            className={`nav-button ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-icon">📦</span>
            <span className="nav-label">Inventory</span>
          </button>
          <button 
            className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </footer>
      </div>

      {/* Item Detail Card Modal */}
      {selectedItem && (
        <div className="item-detail-overlay" onClick={closeDetailCard}>
          <div className="item-detail-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-detail-btn" onClick={closeDetailCard}>×</button>
            <div className="detail-card-header">
              <div className="detail-card-icon">
                {selectedItem.image_data ? (
                  <img 
                    src={getImageSrc(selectedItem.image_data)} 
                    alt={selectedItem.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span>{getCategoryEmoji(selectedItem.category || 'general')}</span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedItem.name || ''}
                  onChange={handleEditChange}
                  className="edit-item-input item-name-input"
                  placeholder="Item name"
                />
              ) : (
                <h2 className="detail-card-title">{selectedItem.name}</h2>
              )}
            </div>
            <div className="detail-card-content">
              {/* Category */}
              <div className="detail-info-row">
                <span className="detail-label">Category</span>
                {isEditing ? (
                  <select
                    name="category"
                    value={editedItem.category || 'general'}
                    onChange={handleEditChange}
                    className="edit-item-select"
                  >
                    <option value="general">General</option>
                    <option value="dairy">Dairy</option>
                    <option value="protein">Protein</option>
                    <option value="produce">Produce</option>
                    <option value="bakery">Bakery</option>
                    <option value="beverages">Beverages</option>
                    <option value="snacks">Snacks</option>
                    <option value="fruits">Fruits</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="meat">Meat</option>
                    <option value="seafood">Seafood</option>
                  </select>
                ) : (
                  <span className="detail-value">{selectedItem.category || 'General'}</span>
                )}
              </div>
              
              {/* Quantity */}
              <div className="detail-info-row">
                <span className="detail-label">Quantity</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="quantity"
                    value={editedItem.quantity || ''}
                    onChange={handleEditChange}
                    className="edit-item-input"
                    placeholder="Quantity"
                  />
                ) : (
                  <span className="detail-value">{selectedItem.quantity}</span>
                )}
              </div>
              
              {/* Expiration Date */}
              <div className="detail-info-row">
                <span className="detail-label">Expires</span>
                {isEditing ? (
                  <input
                    type="date"
                    name="expiration_date"
                    value={editedItem.expiration_date ? new Date(editedItem.expiration_date).toISOString().split('T')[0] : ''}
                    onChange={handleEditChange}
                    className="edit-item-input"
                  />
                ) : (
                  <span className="detail-value">
                    {selectedItem.expiration_date ? new Date(selectedItem.expiration_date).toLocaleDateString() : 'Not set'}
                  </span>
                )}
              </div>
              
              {/* Show error message if update failed */}
              {updateError && (
                <div className="detail-update-error">
                  {updateError}
                </div>
              )}
            </div>
            <div className="detail-card-actions">
              {isEditing ? (
                <>
                  <button 
                    className="detail-action-btn cancel-btn"
                    onClick={toggleEditMode}
                  >
                    Cancel
                  </button>
                  <button 
                    className="detail-action-btn save-btn"
                    onClick={saveItemChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="detail-action-btn remove-btn"
                    onClick={() => handleRemoveItem(selectedItem)}
                  >
                    Remove Item
                  </button>
                  <button 
                    className="detail-action-btn edit-btn"
                    onClick={toggleEditMode}
                  >
                    Edit Details
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 