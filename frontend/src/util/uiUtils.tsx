// uiUtils.tsx - UI-related utility functions

import React from 'react';
import { ExpirationAlerts } from '../types';

// Function to render a compact version of expiration alerts
export const renderExpirationBanner = (
  expirationAlerts: ExpirationAlerts,
  toggleExpirationAlerts: () => void
): React.ReactElement | null => {
  const hasAlerts = expirationAlerts.warning_3_days.length > 0 || expirationAlerts.warning_week.length > 0;

  if (!hasAlerts) return null;

  return (
    <div className="expiration-banner">
      <div className="expiration-banner-header">
        <h3>
          <span className="warning-icon">⚠️</span>
          Expiration Alerts
        </h3>
        <button className="expiration-banner-close" onClick={toggleExpirationAlerts}>×</button>
      </div>

      {expirationAlerts.warning_3_days.length > 0 && (
        <div className="expiration-alert-group critical">
          <h4>Critical: Expiring in 3 days or less</h4>
          <ul className="expiration-items">
            {expirationAlerts.warning_3_days.map((item) => (
              <li key={`${item.name}-${item.expiration_date}`}>
                <span className="exp-item-name">{item.name}</span>
                <span className="exp-item-days">{item.days_left} day{item.days_left !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expirationAlerts.warning_week.length > 0 && (
        <div className="expiration-alert-group warning">
          <h4>Warning: Expiring this week</h4>
          <ul className="expiration-items">
            {expirationAlerts.warning_week.map((item) => (
              <li key={`${item.name}-${item.expiration_date}`}>
                <span className="exp-item-name">{item.name}</span>
                <span className="exp-item-days">{item.days_left} day{item.days_left !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}; 