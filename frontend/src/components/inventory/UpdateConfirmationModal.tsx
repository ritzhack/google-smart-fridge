import React from 'react';

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
    onConfirm: () => void;
    onReject: (itemName: string) => void;
    onClose: () => void;
}

export const UpdateConfirmationModal: React.FC<UpdateConfirmationModalProps> = ({
    updatedItems,
    isVisible,
    onConfirm,
    onReject,
    onClose,
}) => {
    if (!isVisible || updatedItems.length === 0) return null;

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-modal-header">
                    <h3>Confirm Item Updates</h3>
                    <button className="confirmation-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="confirmation-modal-content">
                    <p className="confirmation-description">
                        We recognized {updatedItems.length} item{updatedItems.length > 1 ? 's' : ''} in your image and updated the quantities.
                        Please confirm if these updates are correct:
                    </p>

                    <div className="updated-items-list">
                        {updatedItems.map((item, index) => (
                            <div key={index} className="updated-item-card">
                                <div className="updated-item-info">
                                    <div className="updated-item-name">{item.name}</div>
                                    <div className="updated-item-quantities">
                                        Quantity: {item.old_quantity} → {item.new_quantity}
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
                                        onClick={onConfirm}
                                    >
                                        ✓ Correct
                                    </button>
                                    <button
                                        className="reject-update-btn"
                                        onClick={() => onReject(item.name)}
                                    >
                                        ✗ Add as New Item
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="confirmation-modal-footer">
                    <button className="confirm-all-btn" onClick={onConfirm}>
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