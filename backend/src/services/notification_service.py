# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/services/notification_service.py
import datetime
from src.db_connector import get_db_instance
import traceback

class NotificationService:
    def __init__(self):
        self.db = get_db_instance()

    def get_expiring_items(self, days_threshold_1=7, days_threshold_2=3):
        """
        Finds items that are expiring soon based on two thresholds.

        Args:
            days_threshold_1 (int): First warning period (e.g., 7 days).
            days_threshold_2 (int): Second warning period (e.g., 3 days).

        Returns:
            dict: A dictionary with two keys: "warning_week" and "warning_3_days",
                  each containing a list of expiring item details.
        """
        if self.db is None:
            print("NotificationService: Database not connected.")
            return {"warning_week": [], "warning_3_days": [], "error": "Database not connected"}

        today = datetime.datetime.utcnow().date() # Use .date() for comparison with stored date strings
        print(f"NotificationService: Today's date: {today}")
        
        expiring_soon_week = []
        expiring_soon_3_days = []

        try:
            all_items = self.db.items.find()
            for item in all_items:
                print(f"NotificationService: Processing item: {item.get('name')}, exp date: {item.get('expiration_date')}")
                if item.get("expiration_date"):
                    try:
                        # Improved date parsing to handle various formats
                        exp_date_str = item["expiration_date"]
                        
                        # Handle both date-only strings and datetime strings
                        if 'T' in exp_date_str:
                            # It's a full ISO datetime string
                            exp_date = self._parse_iso_datetime(exp_date_str).date()
                        else:
                            # It's a date-only string
                            exp_date = datetime.date.fromisoformat(exp_date_str)
                        
                        days_until_expiry = (exp_date - today).days
                        print(f"NotificationService: Item {item.get('name')} expires in {days_until_expiry} days")

                        item_details = {
                            "id": str(item.get("_id")),
                            "name": item.get("name"),
                            "quantity": item.get("quantity"),
                            "expiration_date": item.get("expiration_date"),
                            "days_left": days_until_expiry
                        }

                        if 0 <= days_until_expiry <= days_threshold_2:
                            expiring_soon_3_days.append(item_details)
                        elif days_threshold_2 < days_until_expiry <= days_threshold_1:
                            expiring_soon_week.append(item_details)
                    except ValueError as e:
                        print(f"NotificationService: Could not parse expiration date for item {item.get('name')}: {item.get('expiration_date')}")
                        print(f"Error details: {str(e)}")
                        traceback.print_exc()
                        continue # Skip this item if date is invalid
            
            return {
                "warning_week": expiring_soon_week,
                "warning_3_days": expiring_soon_3_days
            }

        except Exception as e:
            print(f"NotificationService: Error fetching expiring items: {e}")
            traceback.print_exc()
            return {"warning_week": [], "warning_3_days": [], "error": str(e)}
            
    def _parse_iso_datetime(self, iso_string):
        """Helper method to parse ISO format dates with optional timezone info"""
        try:
            # Try parsing with timezone info
            return datetime.datetime.fromisoformat(iso_string)
        except ValueError:
            # If it fails, try handling common variations
            if iso_string.endswith('Z'):  # UTC indicator
                iso_string = iso_string[:-1] + '+00:00'
                return datetime.datetime.fromisoformat(iso_string)
            else:
                # Strip microseconds if that's causing issues
                if '.' in iso_string:
                    parts = iso_string.split('.')
                    iso_string = parts[0]
                    return datetime.datetime.fromisoformat(iso_string)
                raise  # Re-raise if we can't handle it

# Example Usage (for testing this module directly):
if __name__ == "__main__":
    # This direct test requires MongoDB to be running and accessible
    # and the db_connector to be correctly configured.
    # For isolated testing, you might mock the db connection.
    
    # Ensure db_connector.py is in the python path or adjust imports
    # For this example, assume it can be found if run from the parent directory of src
    # e.g. python -m src.services.notification_service
    
    notification_service = NotificationService()
    if notification_service.db is not None:
        print("Simulating adding some test items to MongoDB for notification check...")
        # Clear existing test items if any
        notification_service.db.items.delete_many({"name": {"$in": ["Test Milk", "Test Bread", "Test Juice"]}})
        
        # Add items for testing
        test_items_data = [
            {"name": "Test Milk", "quantity": "1L", "expiration_date": (datetime.date.today() + datetime.timedelta(days=2)).isoformat(), "date_added": datetime.datetime.utcnow()},
            {"name": "Test Bread", "quantity": "1 loaf", "expiration_date": (datetime.date.today() + datetime.timedelta(days=6)).isoformat(), "date_added": datetime.datetime.utcnow()},
            {"name": "Test Juice", "quantity": "500ml", "expiration_date": (datetime.date.today() + datetime.timedelta(days=10)).isoformat(), "date_added": datetime.datetime.utcnow()}
        ]
        notification_service.db.items.insert_many(test_items_data)
        print("Test items added.")

        alerts = notification_service.get_expiring_items()
        print("\nExpiry Alerts:")
        print(f"  Within 3 days: {alerts.get('warning_3_days')}")
        print(f"  Within 1 week (but more than 3 days): {alerts.get('warning_week')}")
        if alerts.get("error"):
            print(f"Error during alert check: {alerts.get('error')}")
    else:
        print("Cannot run example: DB not connected in NotificationService.")

