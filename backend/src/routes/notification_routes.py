# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/routes/notification_routes.py
from flask import Blueprint, jsonify
from src.services.notification_service import NotificationService # Corrected import
import traceback
import sys

notification_bp = Blueprint("notification_bp", __name__, url_prefix="/api/notifications")
notification_service = NotificationService()

@notification_bp.route("/check-expirations", methods=["GET"])
def check_expirations():
    """
    Manually triggered endpoint to check for expiring items.
    """
    try:
        print("Notification endpoint called - checking expirations")
        alerts = notification_service.get_expiring_items()
        if alerts.get("error"):
             print(f"Error returned from notification service: {alerts.get('error')}")
             return jsonify({"error": alerts.get("error")}), 500
        return jsonify(alerts), 200
    except Exception as e:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
        print(f"DETAILED ERROR in check_expirations: {str(e)}")
        print(f"Traceback: {''.join(error_details)}")
        return jsonify({"error": f"Error checking expirations: {str(e)}", "traceback": error_details}), 500

