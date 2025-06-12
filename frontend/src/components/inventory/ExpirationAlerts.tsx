import React, { useEffect } from 'react';
import { ExpirationAlerts as ExpirationAlertsType } from '../../types';

interface ExpirationAlertsProps {
  alerts: ExpirationAlertsType;
  isLoading: boolean;
  onCheckExpirations: () => void;
  inventory: Array<{
    name: string;
    quantity: string;
    expiration_date?: string;
  }>;
}

interface AlertItemProps {
  item: {
    name: string;
    quantity: string;
    days_left: number;
    expiration_date: string;
  };
  color: string;
}

const AlertItem: React.FC<AlertItemProps> = ({ item, color }) => (
  <li key={`${item.name}-${item.expiration_date}`} style={{ color }}>
    {item.name} ({item.quantity}) - Expires in {item.days_left} day(s) ({new Date(item.expiration_date).toLocaleDateString()})
  </li>
);

interface AlertSectionProps {
  title: string;
  items: Array<{
    name: string;
    quantity: string;
    days_left: number;
    expiration_date: string;
  }>;
  color: string;
}

const AlertSection: React.FC<AlertSectionProps> = ({ title, items, color }) => (
  items.length > 0 && (
    <div className="alert-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <AlertItem key={`${item.name}-${item.expiration_date}`} item={item} color={color} />
        ))}
      </ul>
    </div>
  )
);

export const ExpirationAlerts: React.FC<ExpirationAlertsProps> = ({
  alerts,
  isLoading,
  onCheckExpirations,
  inventory,
}) => {
  const hasAlerts = alerts.warning_3_days.length > 0 || alerts.warning_week.length > 0;

  // Watch for changes in inventory and check expirations
  useEffect(() => {
    if (inventory.length > 0) {
      onCheckExpirations();
    }
  }, [inventory]);

  return (
    <section id="expiration-alerts">
      <h2>Expiration Alerts</h2>
      <button 
        onClick={onCheckExpirations} 
        disabled={isLoading}
        className="check-expirations-btn"
      >
        {isLoading ? "Checking..." : "Check for Expiring Items"}
      </button>

      {hasAlerts ? (
        <div className="alerts-container">
          <AlertSection
            title="Expiring in 3 days or less:"
            items={alerts.warning_3_days}
            color="orange"
          />
          <AlertSection
            title="Expiring in 1 week (but more than 3 days):"
            items={alerts.warning_week}
            color="gold"
          />
        </div>
      ) : (
        <p className="no-alerts">No immediate expiration alerts based on the last check.</p>
      )}
    </section>
  );
}; 