import React, { useState, useCallback } from 'react';
import { InventoryItem } from '../types';
import { addItemToInventory } from '../services/api';
import { useDropzone } from 'react-dropzone';

interface InventoryManagementProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  onInventoryUpdate: () => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory,
  isLoading,
  onInventoryUpdate,
}) => {
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [takeInImage, setTakeInImage] = useState<File | null>(null);
  const [takeOutImage, setTakeOutImage] = useState<File | null>(null);
  const [takeInPreview, setTakeInPreview] = useState<string | null>(null);
  const [takeOutPreview, setTakeOutPreview] = useState<string | null>(null);

  const handleDeleteItem = async (itemId: string) => {
    if (!itemId) return;
    
    setIsDeleting(itemId);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      onInventoryUpdate();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const createImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const onTakeInDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;

    setTakeInImage(file);
    setTakeInPreview(createImagePreview(file));
  }, []);

  const onTakeOutDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;

    setTakeOutImage(file);
    setTakeOutPreview(createImagePreview(file));
  }, []);

  const { getRootProps: getTakeInRootProps, getInputProps: getTakeInInputProps, isDragActive: isTakeInDragActive } = useDropzone({
    onDrop: onTakeInDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  const { getRootProps: getTakeOutRootProps, getInputProps: getTakeOutInputProps, isDragActive: isTakeOutDragActive } = useDropzone({
    onDrop: onTakeOutDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

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

      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/upload-image-pair`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process images');
      }

      const result = await response.json();
      
      // Clear the images and previews after successful processing
      setTakeInImage(null);
      setTakeOutImage(null);
      setTakeInPreview(null);
      setTakeOutPreview(null);
      
      onInventoryUpdate();
    } catch (err) {
      console.error('Error processing images:', err);
      setError(err instanceof Error ? err.message : 'Failed to process images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearTakeInImage = () => {
    setError(null);
    setTakeInImage(null);
    if (takeInPreview) {
      URL.revokeObjectURL(takeInPreview);
      setTakeInPreview(null);
    }
  };

  const clearTakeOutImage = () => {
    setError(null);
    setTakeOutImage(null);
    if (takeOutPreview) {
      URL.revokeObjectURL(takeOutPreview);
      setTakeOutPreview(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemQuantity.trim()) {
      alert("Please enter item name and quantity.");
      return;
    }
    setError(null);
    try {
      await addItemToInventory({ name: newItemName, quantity: newItemQuantity });
      setNewItemName("");
      setNewItemQuantity("1");
      onInventoryUpdate();
    } catch (err) {
      console.error("Error adding item:", err);
      setError("Failed to add item.");
    }
  };

  return (
    <section id="inventory-management">
      <h2>My Fridge Inventory</h2>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      
      {/* Image Upload Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Scan Items</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {/* Take In Image Upload */}
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>Take In (Add Items)</h4>
            <div
              {...getTakeInRootProps()}
              style={{
                border: '2px dashed #4CAF50',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: isTakeInDragActive ? '#f0f8f0' : 'white',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <input {...getTakeInInputProps()} />
              {takeInPreview ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={takeInPreview} 
                    alt="Take in preview" 
                    style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTakeInImage();
                    }}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : isTakeInDragActive ? (
                <p style={{ margin: 0, color: '#4CAF50' }}>Drop the image here...</p>
              ) : (
                <p style={{ margin: 0, color: '#666' }}>
                  Drag & drop an image of items to add<br />
                  or click to select
                </p>
              )}
            </div>
          </div>

          {/* Take Out Image Upload */}
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#f44336', marginBottom: '10px' }}>Take Out (Remove Items)</h4>
            <div
              {...getTakeOutRootProps()}
              style={{
                border: '2px dashed #f44336',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: isTakeOutDragActive ? '#fff0f0' : 'white',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <input {...getTakeOutInputProps()} />
              {takeOutPreview ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={takeOutPreview} 
                    alt="Take out preview" 
                    style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTakeOutImage();
                    }}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : isTakeOutDragActive ? (
                <p style={{ margin: 0, color: '#f44336' }}>Drop the image here...</p>
              ) : (
                <p style={{ margin: 0, color: '#666' }}>
                  Drag & drop an image of items to remove<br />
                  or click to select
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Process Images Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleProcessImages}
            disabled={isUploading || (!takeInImage && !takeOutImage)}
            style={{
              backgroundColor: isUploading || (!takeInImage && !takeOutImage) ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: isUploading || (!takeInImage && !takeOutImage) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isUploading ? 'Processing Images...' : 'Process Images'}
          </button>
        </div>
      </div>

      {/* Manual Add Item Form */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Add Item</h3>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            value={newItemName} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)} 
            placeholder="Item name (e.g., Apple)"
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text"
            value={newItemQuantity} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemQuantity(e.target.value)} 
            placeholder="Quantity (e.g., 2)"
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            type="submit"
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Inventory List */}
      {isLoading ? (
        <p>Loading inventory...</p>
      ) : inventory.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {inventory.map((item) => (
            <li 
              key={item._id || item.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                margin: '4px 0',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.image_data ? (
                  <img 
                    src={`data:image/jpeg;base64,${item.image_data}`}
                    alt={item.name}
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      objectFit: 'cover', 
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                  />
                ) : (
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#666',
                    textAlign: 'center',
                    border: '1px solid #ddd'
                  }}>
                    Image not available
                  </div>
                )}
                <span>
                  {item.name} ({item.quantity}) - Expires on: {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <button
                onClick={() => item._id && handleDeleteItem(item._id)}
                disabled={isDeleting === item._id}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4444',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px 8px',
                  marginLeft: '8px'
                }}
              >
                {isDeleting === item._id ? '...' : '×'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Your fridge is empty. Add some items!</p>
      )}
    </section>
  );
};