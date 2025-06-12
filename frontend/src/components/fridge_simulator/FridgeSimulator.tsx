import React from "react";
import { ImageProcessorStylized } from "./ImageProcessorStylized";

interface FridgeSimulatorProps {
  error: string | null;
  onInventoryUpdate: () => Promise<void>;
  onError: (error: string | null) => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  newItemQuantity: string;
  setNewItemQuantity: (quantity: string) => void;
  onAddItemManually: (e: React.FormEvent) => void;
}

export const FridgeSimulator: React.FC<FridgeSimulatorProps> = ({
  error,
  onInventoryUpdate,
  onError,
  newItemName,
  setNewItemName,
  newItemQuantity,
  setNewItemQuantity,
  onAddItemManually,
}) => {
  return (
    <div className="scan-panel">
      <div className="scan-panel-header">
        <h2>Fridge Simulator</h2>
      </div>

      {/* Image Upload Section */}
      <ImageProcessorStylized
        onInventoryUpdate={onInventoryUpdate}
        onError={onError}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        newItemQuantity={newItemQuantity}
        setNewItemQuantity={setNewItemQuantity}
        onAddItemManually={onAddItemManually}
      />
    </div>
  );
}; 