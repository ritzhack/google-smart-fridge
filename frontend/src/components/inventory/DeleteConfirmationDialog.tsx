import React from 'react';
import { InventoryItem } from '../../types';

interface DeleteConfirmationDialogProps {
    item: InventoryItem | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
    item,
    isOpen,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !item) return null;

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-modal-header">
                    <h3>Confirm Deletion</h3>
                    <button className="confirmation-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="confirmation-modal-content">
                    <p className="confirmation-description">
                        Are you sure you want to remove "{item.name}" from your inventory?
                        This action cannot be undone.
                    </p>
                </div>

                <div className="confirmation-modal-footer">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="confirm-all-btn"
                        onClick={onConfirm}
                        style={{ backgroundColor: '#dc2626' }}
                    >
                        Delete Item
                    </button>
                </div>
            </div>
        </div>
    );
}; 