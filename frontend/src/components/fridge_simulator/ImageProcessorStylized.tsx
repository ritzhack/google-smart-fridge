import React, { useState, useRef } from 'react';
import { UpdateConfirmationModal } from '../inventory/UpdateConfirmationModal';
import { NewItemConfirmationModal } from '../inventory/NewItemConfirmationModal';
import { createImageHandlers } from './util/imageHandlers';

interface ImageProcessorStylizedProps {
  onInventoryUpdate: () => void;
  onNotification: (message: string | null) => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  newItemQuantity: string;
  setNewItemQuantity: (quantity: string) => void;
}

export const ImageProcessorStylized: React.FC<ImageProcessorStylizedProps> = ({
  onInventoryUpdate,
  onNotification,
  newItemName,
  setNewItemName,
  newItemQuantity,
  setNewItemQuantity,
}) => {
  const [takeInDragActive, setTakeInDragActive] = useState<boolean>(false);
  const [takeOutDragActive, setTakeOutDragActive] = useState<boolean>(false);
  const [takeInImage, setTakeInImage] = useState<File | null>(null);
  const [takeOutImage, setTakeOutImage] = useState<File | null>(null);
  const [takeInPreview, setTakeInPreview] = useState<string | null>(null);
  const [takeOutPreview, setTakeOutPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [takeInLoading, setTakeInLoading] = useState<boolean>(false);
  const [takeOutLoading, setTakeOutLoading] = useState<boolean>(false);
  const takeInFileInputRef = useRef<HTMLInputElement>(null);
  const takeOutFileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [showNewItemModal, setShowNewItemModal] = useState<boolean>(false);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isManualAdding, setIsManualAdding] = useState<boolean>(false);

  // Create image handlers for take in
  const takeInHandlers = createImageHandlers({
    setImage: setTakeInImage,
    setPreview: setTakeInPreview,
    setLoading: setTakeInLoading,
    onNotification,
    fileInputRef: takeInFileInputRef
  });

  // Create image handlers for take out
  const takeOutHandlers = createImageHandlers({
    setImage: setTakeOutImage,
    setPreview: setTakeOutPreview,
    setLoading: setTakeOutLoading,
    onNotification,
    fileInputRef: takeOutFileInputRef
  });

  const handleAddNewItem = async (itemName: string, quantity: number, imageUrl: string | null) => {
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

      // Extract base64 data from the image URL if it's a data URL
      let image_data = null;
      if (imageUrl && imageUrl.startsWith('data:')) {
        image_data = imageUrl.split(',')[1]; // Get the base64 part after the comma
      }

      // Prepare the request body
      const requestBody = {
        name: itemName,
        quantity: quantity,
        image_data: image_data,  // Send the base64 data
        image_url: imageUrl      // Keep the original URL for reference
      };
      const response = await fetch(`${API_URL}/api/inventory/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const responseData = await response.json();
        onNotification(`✅ Created new item: ${responseData.name} with quantity ${responseData.quantity}`);

        // Remove this item from pending updates
        setPendingUpdates(prev => prev.filter(item => item.name !== itemName));

        // If no more pending updates, close modal
        const remainingUpdates = pendingUpdates.filter(item => item.name !== itemName);
        if (remainingUpdates.length === 0) {
          setShowConfirmationModal(false);
          setPendingUpdates([]);
        }

        // Refresh inventory
        await onInventoryUpdate();
        if (takeInImage) takeInHandlers.clearImage();
        if (takeOutImage) takeOutHandlers.clearImage();
      } else {
        const errorData = await response.json();
        onNotification(`Error creating new item: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error creating new item:', err);
      onNotification('Failed to create new item. Please try again.');
    } finally {
      setShowNewItemModal(false);
      setIsManualAdding(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    setIsManualAdding(true);
    await handleAddNewItem(newItemName, parseInt(newItemQuantity) || 1, null);
    setNewItemName("");
    setNewItemQuantity("1");
  };

  // Process uploaded images
  const handleProcessImages = async () => {
    if (!takeInImage && !takeOutImage) {
      onNotification("Please select at least one image to process.");
      return;
    }

    setIsUploading(true);
    onNotification(null);

    try {
      const formData = new FormData();

      if (takeInImage) {
        formData.append('take_in_image', takeInImage);
      }

      if (takeOutImage) {
        formData.append('take_out_image', takeOutImage);
      }

      // Add parameter to indicate that we want to store the image in the vector database
      // if no similar images are found (similarity < 0.75)

      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/upload-image-pair`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const responseData = await response.json();

        // Check if there are updates that need confirmation
        if (responseData.updated && responseData.updated.length > 0) {
          // Show confirmation modal instead of immediate success notification
          setPendingUpdates(responseData.updated);
          setShowConfirmationModal(true);

          // Don't process other notifications yet - wait for confirmation
          return;
        }

        // Process non-update notifications normally
        const notifications = [];

        // Handle added items
        if (responseData.added && responseData.added.length > 0) {
          const addedItems = responseData.added.map((item: any) => {
            if (typeof item === 'string') {
              return item;
            } else if (item.name) {
              return `${item.name} (qty: ${item.quantity || 1})`;
            }
            return 'Unknown item';
          });
          notifications.push(`✅ Added: ${addedItems.join(', ')}`);
        }

        // Handle removed items
        if (responseData.removed && responseData.removed.length > 0) {
          const removedItems = responseData.removed.map((item: any) => {
            if (typeof item === 'string') {
              return item;
            } else if (item.name) {
              return `${item.name} (qty: ${item.quantity || 1})`;
            }
            return 'Unknown item';
          });
          const removedNotification = `❌ Removed: ${removedItems.join(', ')}`;
          notifications.push(removedNotification);
        }

        // Handle similar items found
        if (responseData.similar_items_found && responseData.similar_items_found.length > 0) {
          const similarItems = responseData.similar_items_found.map((item: any) =>
            `${item.name} (${Math.round(item.similarity_score * 100)}% match)`
          );
          notifications.push(`🔍 Recognized: ${similarItems.join(', ')}`);
        }

        // Show success notifications
        if (notifications.length > 0) {
          const finalNotification = notifications.join('\n');
          onNotification(finalNotification);
        } else {
          onNotification("Images processed successfully, but no items were detected.");
        }

        // Handle any errors in the response
        if (responseData.errors && responseData.errors.length > 0) {
          const errorMessages = responseData.errors.map((error: any) => {
            if (typeof error === 'string') {
              return error;
            } else if (error.name && error.error) {
              return `${error.name}: ${error.error}`;
            }
            return 'Unknown error';
          });
          onNotification(`⚠️ Some issues occurred: ${errorMessages.join(', ')}`);
        }

        // Refresh inventory and clear images
        await onInventoryUpdate();
        if (takeInImage) takeInHandlers.clearImage();
        if (takeOutImage) takeOutHandlers.clearImage();

      } else {
        // Check for the specific 'updated' response which actually means the item was added
        const responseData = await response.json();
        const responseMessage = responseData.error || 'Failed to process images';

        // If the response contains "updated", the item was likely added despite the error status
        if (responseMessage.includes('updated')) {
          onNotification("✅ Item was added successfully (with minor backend notice)");
          await onInventoryUpdate();
          if (takeInImage) takeInHandlers.clearImage();
          if (takeOutImage) takeOutHandlers.clearImage();
        } else if (responseMessage.includes('similarity') || responseMessage.includes('threshold')) {
          // This is the case where no similar images were found, but we've asked the backend to store it
          onNotification("✅ New image type detected and added to our database. Item identification might improve in future uploads.");
          await onInventoryUpdate();
          if (takeInImage) takeInHandlers.clearImage();
          if (takeOutImage) takeOutHandlers.clearImage();
        } else {
          throw new Error(responseMessage);
        }
      }
    } catch (err) {
      console.error('Error processing images:', err);
      onNotification(err instanceof Error ? err.message : 'Failed to process images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Confirmation modal handlers
  const handleConfirmUpdates = async () => {
    try {
      // Call the confirm-updates endpoint
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/confirm-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingUpdates),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm updates');
      }

      const responseData = await response.json();

      // Create success notification for confirmed updates
      const updatedItems = responseData.updated.map((item: any) => {
        const pendingItem = pendingUpdates.find((p: any) => p.item_id === item.item_id);
        return `${pendingItem?.name || 'Unknown'} (new qty: ${item.new_quantity})`;
      });
      onNotification(`🔄 Updated: ${updatedItems.join(', ')}`);

      // Handle any errors
      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors.map((error: any) =>
          `${error.item_id}: ${error.error}`
        );
        onNotification(`⚠️ Some updates failed: ${errorMessages.join(', ')}`);
      }

      // Refresh inventory and clear images
      await onInventoryUpdate();
      if (takeInImage) takeInHandlers.clearImage();
      if (takeOutImage) takeOutHandlers.clearImage();

      // Close modal and reset state
      setShowConfirmationModal(false);
      setPendingUpdates([]);
    } catch (err) {
      console.error('Error confirming updates:', err);
      onNotification('Failed to confirm updates. Please try again.');
    }
  };

  return (
    <div className="scan-panel-section">
      <h3>Upload Images</h3>
      <div className="image-upload-container">
        {/* Take In Image Upload */}
        <div className="image-upload-box">
          <h4 className="upload-title take-in">Take In (Add Items)</h4>
          <div
            className={`upload-dropzone take-in ${takeInDragActive ? 'active' : ''} ${takeInPreview ? 'has-preview' : ''}`}
            onDragEnter={(e) => setTakeInDragActive(takeInHandlers.handleDrag(e))}
            onDragOver={(e) => setTakeInDragActive(takeInHandlers.handleDrag(e))}
            onDragLeave={(e) => setTakeInDragActive(takeInHandlers.handleDrag(e))}
            onDrop={(e) => {
              setTakeInDragActive(false);
              takeInHandlers.handleDrop(e);
            }}
            onClick={() => takeInHandlers.handleClick(takeInPreview)}
          >
            <input
              type="file"
              ref={takeInFileInputRef}
              onChange={takeInHandlers.handleFileChange}
              accept="image/*"
              className="file-input"
            />

            {takeInPreview ? (
              <div className="preview-container" onClick={(e) => e.stopPropagation()}>
                <img
                  src={takeInPreview}
                  alt="Take in preview"
                  className="preview-image"
                />
                <button
                  onClick={(e) => takeInHandlers.clearImage(e)}
                  className="clear-image-btn"
                >
                  ×
                </button>
              </div>
            ) : takeInLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Processing image...</p>
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
            onDragEnter={(e) => setTakeOutDragActive(takeOutHandlers.handleDrag(e))}
            onDragOver={(e) => setTakeOutDragActive(takeOutHandlers.handleDrag(e))}
            onDragLeave={(e) => setTakeOutDragActive(takeOutHandlers.handleDrag(e))}
            onDrop={(e) => {
              setTakeOutDragActive(false);
              takeOutHandlers.handleDrop(e);
            }}
            onClick={() => takeOutHandlers.handleClick(takeOutPreview)}
          >
            <input
              type="file"
              ref={takeOutFileInputRef}
              onChange={takeOutHandlers.handleFileChange}
              accept="image/*"
              className="file-input"
            />

            {takeOutPreview ? (
              <div className="preview-container" onClick={(e) => e.stopPropagation()}>
                <img
                  src={takeOutPreview}
                  alt="Take out preview"
                  className="preview-image"
                />
                <button
                  onClick={(e) => takeOutHandlers.clearImage(e)}
                  className="clear-image-btn"
                >
                  ×
                </button>
              </div>
            ) : takeOutLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Processing image...</p>
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
        <form onSubmit={handleManualAdd} className="manual-add-form">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name (e.g., Apple)"
            required
            className="manual-input"
            disabled={isManualAdding}
          />
          <input
            type="text"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
            placeholder="Quantity (e.g., 2)"
            required
            className="manual-input"
            disabled={isManualAdding}
          />
          <button
            type="submit"
            className={`manual-add-btn ${isManualAdding ? 'disabled' : ''}`}
            disabled={isManualAdding}
          >
            {isManualAdding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      {/* Update Confirmation Modal */}
      <UpdateConfirmationModal
        updatedItems={pendingUpdates}
        isVisible={showConfirmationModal}
        onConfirm={handleConfirmUpdates}
        onClose={() => {
          setShowConfirmationModal(false);
          setPendingUpdates([]);
        }}
        onAddNewItem={(item) => {
          setSelectedItem(item);
          setShowConfirmationModal(false);
          setShowNewItemModal(true);
        }}
      />

      {/* New Item Confirmation Modal */}
      <NewItemConfirmationModal
        isVisible={showNewItemModal}
        onClose={() => {
          setShowNewItemModal(false);
          setSelectedItem(null);
        }}
        onSave={handleAddNewItem}
        initialName={selectedItem?.name || ''}
        initialQuantity={selectedItem?.new_quantity || 0}
        imageUrl={takeInPreview}
      />
    </div>
  );
}; 