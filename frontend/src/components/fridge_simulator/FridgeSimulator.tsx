import React from "react";
import { ImageProcessorStylized } from "./ImageProcessorStylized";

interface FridgeSimulatorProps {
  onInventoryUpdate: () => Promise<void>;
  onNotification: (message: string | null) => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  newItemQuantity: string;
  setNewItemQuantity: (quantity: string) => void;
}

export const FridgeSimulator: React.FC<FridgeSimulatorProps> = ({
  onInventoryUpdate,
  onNotification,
  newItemName,
  setNewItemName,
  newItemQuantity,
  setNewItemQuantity,
}) => {
  return (
    <div className="scan-panel">
      <div className="scan-panel-header">
        <h2>Fridge Simulator</h2>
      </div>

      {/* Image Upload Section */}
      <ImageProcessorStylized
        onInventoryUpdate={onInventoryUpdate}
        onNotification={onNotification}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        newItemQuantity={newItemQuantity}
        setNewItemQuantity={setNewItemQuantity}
      />
    </div>
  );
}; 