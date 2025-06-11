import React from "react";

export const Settings: React.FC = () => {
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
}; 