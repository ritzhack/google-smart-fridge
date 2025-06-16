import React from 'react';
import './UpdateConfirmationModal.css'; // We'll reuse the same styles

interface NewItemConfirmationModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSave: (name: string, quantity: number, imageUrl: string | null) => Promise<void>;
    initialName: string;
    initialQuantity: number;
    imageUrl: string | null;
}

export const NewItemConfirmationModal: React.FC<NewItemConfirmationModalProps> = ({
    isVisible,
    onClose,
    onSave,
    initialName,
    initialQuantity,
    imageUrl,
}) => {
    const [editedName, setEditedName] = React.useState(initialName);
    const [editedQuantity, setEditedQuantity] = React.useState(initialQuantity);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        setEditedName(initialName);
        setEditedQuantity(initialQuantity);
    }, [initialName, initialQuantity]);

    const handleSave = async () => {
        if (isSaving) return; // Prevent multiple saves

        setIsSaving(true);
        try {
            await onSave(editedName, editedQuantity, imageUrl);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-modal-header">
                    <h3>Confirm New Item</h3>
                    <button className="confirmation-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="confirmation-modal-content">
                    <div className="new-item-confirmation">
                        <div className="form-group">
                            <label>Item Name:</label>
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="name-input"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="form-group">
                            <label>Quantity:</label>
                            <input
                                type="number"
                                min="0"
                                value={editedQuantity}
                                onChange={(e) => setEditedQuantity(parseInt(e.target.value) || 0)}
                                className="quantity-input"
                                disabled={isSaving}
                            />
                        </div>
                        {imageUrl && (
                            <div className="form-group">
                                <label>Item Image:</label>
                                <div className="image-preview">
                                    <img src={imageUrl} alt="Item preview" className="preview-image" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="confirmation-modal-footer">
                    <button
                        className={`confirm-all-btn ${isSaving ? 'disabled' : ''}`}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save New Item'}
                    </button>
                    <button
                        className="cancel-btn"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}; 