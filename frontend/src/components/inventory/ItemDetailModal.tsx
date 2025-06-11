import React from "react";
import { InventoryItem } from "../../types";
import { getCategoryEmoji } from "../../util/foodUtils";

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

interface ItemDetailModalProps {
  selectedItem: InventoryItem | null;
  isEditing: boolean;
  editedItem: Partial<InventoryItem>;
  isSaving: boolean;
  updateError: string | null;
  onClose: () => void;
  onToggleEdit: () => void;
  onEditChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveChanges: () => Promise<void>;
  onRemoveItem: (item: InventoryItem) => Promise<void>;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  selectedItem,
  isEditing,
  editedItem,
  isSaving,
  updateError,
  onClose,
  onToggleEdit,
  onEditChange,
  onSaveChanges,
  onRemoveItem,
}) => {
  if (!selectedItem) return null;

  return (
    <div className="item-detail-overlay" onClick={onClose}>
      <div className="item-detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-detail-btn" onClick={onClose}>×</button>
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
              onChange={onEditChange}
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
                onChange={onEditChange}
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
                onChange={onEditChange}
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
                onChange={onEditChange}
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
                onClick={onToggleEdit}
              >
                Cancel
              </button>
              <button 
                className="detail-action-btn save-btn"
                onClick={onSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="detail-action-btn remove-btn"
                onClick={() => onRemoveItem(selectedItem)}
              >
                Remove Item
              </button>
              <button 
                className="detail-action-btn edit-btn"
                onClick={onToggleEdit}
              >
                Edit Details
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 