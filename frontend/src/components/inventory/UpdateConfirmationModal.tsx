import React, { useState, useEffect } from 'react';
import './UpdateConfirmationModal.css';

interface UpdatedItem {
    name: string;
    new_quantity: number;
    old_quantity: number;
    similarity_score?: number;
    image_data?: string;
}

interface UpdateConfirmationModalProps {
    updatedItems: UpdatedItem[];
    isVisible: boolean;
    onConfirm: (items: UpdatedItem[]) => void;
    onClose: () => void;
}

export const UpdateConfirmationModal: React.FC<UpdateConfirmationModalProps> = ({
    updatedItems,
    isVisible,
    onConfirm,
    onClose,
}) => {
    const [localItems, setLocalItems] = useState<UpdatedItem[]>(updatedItems);

    useEffect(() => {
        setLocalItems(updatedItems);
    }, [updatedItems]);

    const handleQuantityChange = (index: number, newValue: string) => {
        const value = parseInt(newValue) || 0;
        const updatedItems = [...localItems];
        updatedItems[index] = { ...updatedItems[index], new_quantity: value };
        setLocalItems(updatedItems);
    };

    if (!isVisible || localItems.length === 0) return null;

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-modal-header">
                    <h3>Confirm Item Updates</h3>
                    <button className="confirmation-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="confirmation-modal-content">
                    <p className="confirmation-description">
                        We recognized {localItems.length} item{localItems.length > 1 ? 's' : ''} in your image and updated the quantities.
                        Please confirm if these updates are correct:
                    </p>

                    <div className="updated-items-list">
                        {localItems.map((item, index) => (
                            <div key={index} className="updated-item-card">
                                <div className="updated-item-info">
                                    <div className="updated-item-name">{item.name}</div>
                                    <div className="updated-item-quantities">
                                        Quantity: {item.old_quantity} →
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.new_quantity}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                            className="quantity-input"
                                        />
                                        {item.similarity_score && (
                                            <span className="similarity-score">
                                                ({Math.round(item.similarity_score * 100)}% match)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="updated-item-actions">
                                    <button
                                        className="confirm-update-btn"
                                        onClick={() => onConfirm(localItems)}
                                    >
                                        ✓ Correct
                                    </button>
                                    <button
                                        className="reject-update-btn"
                                        onClick={() => onClose()}
                                    >
                                        ✗ Add as New Item
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="confirmation-modal-footer">
                    <button className="confirm-all-btn" onClick={() => onConfirm(localItems)}>
                        Confirm All Updates
                    </button>
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}; 