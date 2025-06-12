import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../types';

interface InventoryManagementProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  onInventoryUpdate: () => void;
}

interface ExpiringItem {
  name: string;
  quantity: string;
  days_left: number;
  expiration_date: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory,
  isLoading,
  onInventoryUpdate,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBannerMinimized, setIsBannerMinimized] = useState<boolean>(false);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);

  // Check for expiring items
  useEffect(() => {
    const checkExpiringItems = () => {
      const expiring: ExpiringItem[] = [];
      const now = new Date();
      
      inventory.forEach(item => {
        if (item.expiration_date) {
          const expirationDate = new Date(item.expiration_date);
          const timeDiff = expirationDate.getTime() - now.getTime();
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          // Show items expiring within 7 days
          if (daysLeft <= 7 && daysLeft >= 0) {
            expiring.push({
              name: item.name,
              quantity: item.quantity,
              days_left: daysLeft,
              expiration_date: item.expiration_date
            });
          }
        }
      });
      
      setExpiringItems(expiring);
    };

    if (inventory.length > 0) {
      checkExpiringItems();
    }
  }, [inventory]);

  const handleDeleteItem = async (itemId: string) => {
    if (!itemId) return;
    
    setIsDeleting(itemId);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/inventory/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      onInventoryUpdate();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getExpirationStatus = (expirationDate: string) => {
    const now = new Date();
    const expiration = new Date(expirationDate);
    const daysLeft = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysLeft < 0) return { color: '#ff4444', text: 'Expired', urgent: true };
    if (daysLeft <= 3) return { color: '#ff6b35', text: `${daysLeft} days left`, urgent: true };
    if (daysLeft <= 7) return { color: '#ffa500', text: `${daysLeft} days left`, urgent: false };
    return { color: '#4CAF50', text: `${daysLeft} days left`, urgent: false };
  };

  return (
    <section id="inventory-management" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Expiration Notification Banner */}
      {expiringItems.length > 0 && (
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
      )}

      <h2 style={{ marginBottom: '20px', color: '#333' }}>My Fridge Inventory</h2>
      
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          Error: {error}
        </div>
      )}
      
      {/* Inventory Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading inventory...</div>
        </div>
      ) : inventory.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          padding: '10px 0'
        }}>
          {inventory.map((item) => {
            const expirationStatus = item.expiration_date ? getExpirationStatus(item.expiration_date) : null;
            
            return (
              <div 
                key={item._id || item.name}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: expirationStatus?.urgent ? `2px solid ${expirationStatus.color}` : '2px solid #f0f0f0',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Delete Button */}
                <button
                  onClick={() => item._id && handleDeleteItem(item._id)}
                  disabled={isDeleting === item._id}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  {isDeleting === item._id ? '...' : '×'}
                </button>

                {/* Item Image */}
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  {item.image_data ? (
                    <img 
                      src={`data:image/jpeg;base64,${item.image_data}`}
                      alt={item.name}
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'cover', 
                        borderRadius: '12px',
                        border: '2px solid #f0f0f0',
                        display: 'block',
                        margin: '0 auto'
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      margin: '0 auto',
                      border: '2px solid #e9ecef'
                    }}>
                      🍽️
                    </div>
                  )}
                </div>

                {/* Item Name */}
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  {item.name}
                </h3>

                {/* Quantity */}
                <div style={{
                  textAlign: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Qty: {item.quantity}
                  </span>
                </div>

                {/* Expiration Date */}
                {item.expiration_date && expirationStatus && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '10px'
                  }}>
                    <div style={{
                      backgroundColor: expirationStatus.urgent ? `${expirationStatus.color}20` : '#f8f9fa',
                      color: expirationStatus.color,
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: `1px solid ${expirationStatus.color}30`
                    }}>
                      📅 {expirationStatus.text}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '4px'
                    }}>
                      {new Date(item.expiration_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥶</div>
          <h3 style={{ color: '#6c757d', margin: '0 0 8px 0' }}>Your fridge is empty</h3>
          <p style={{ color: '#6c757d', margin: 0 }}>Add some items to get started!</p>
        </div>
      )}
    </section>
  );
}; 