import React, { useState, useEffect } from 'react';

interface ExpiringItem {
  name: string;
  quantity: string;
  days_left: number;
  expiration_date: string;
}

interface ExpirationAlertsProps {
  expiringItems: ExpiringItem[];
}

export const ExpirationAlerts: React.FC<ExpirationAlertsProps> = ({ expiringItems }) => {
  const [isBannerMinimized, setIsBannerMinimized] = useState<boolean>(false);
  const [shouldShow, setShouldShow] = useState<boolean>(false);

  useEffect(() => {
    setShouldShow(expiringItems.length > 0);
  }, [expiringItems]);

  if (!shouldShow) return null;

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: isBannerMinimized ? '10px' : '15px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <strong style={{ color: '#856404' }}>
            {expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring soon
          </strong>
        </div>
        <button
          onClick={() => setIsBannerMinimized(!isBannerMinimized)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#856404',
            padding: '5px'
          }}
        >
          {isBannerMinimized ? '▼' : '▲'}
        </button>
      </div>

      {!isBannerMinimized && (
        <div style={{ marginTop: '10px' }}>
          {expiringItems.map((item, index) => (
            <div key={index} style={{
              display: 'inline-block',
              backgroundColor: item.days_left <= 3 ? '#f8d7da' : '#d4edda',
              color: item.days_left <= 3 ? '#721c24' : '#155724',
              padding: '5px 10px',
              borderRadius: '15px',
              margin: '2px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {item.name} - {item.days_left === 0 ? 'Expires today!' : `${item.days_left} days left`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};