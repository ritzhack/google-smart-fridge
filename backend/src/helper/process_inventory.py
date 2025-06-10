import sys
import os

# Add the backend/src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db_connector import get_db_instance
from src.models.item import Item

db = get_db_instance()

def process_ai_response(ai_response, image_data=None):
    """
    Process Vertex AI response and update inventory accordingly.
    
    Args:
        ai_response (dict): Response containing items list from Vertex AI
        image_data (str, optional): Base64 encoded image data to store with items
        
    Returns:
        tuple: (results dict, status code)
    """
    try:
        print("DEBUG: Processing Vertex AI response...")
        results = {"added": [], "updated": [], "errors": []}
        
        # Extract items from the response
        items = ai_response.get('items', [])
        if not items:
            print("DEBUG: No items found in response")
            return results, 200
        
        for item in items:
            item_name = item.get('name')
            count = item.get('count', 1)
            expiration_date = item.get('expiration_date')
            
            if not item_name or not expiration_date:
                print(f"DEBUG: Skipping item with missing data: {item}")
                continue
                
            print(f"DEBUG: Processing item: {item_name}")
            
            # Check if item exists in inventory with same expiration date (case-insensitive)
            existing_item = db.items.find_one({
                "name": item_name.lower(),
                "expiration_date": expiration_date
            })
            
            if existing_item:
                print(f"DEBUG: Item {item_name} exists with same expiration date")
                try:
                    current_quantity = int(existing_item.get('quantity', '1'))
                    new_quantity = str(current_quantity + count)
                    
                    update_result = db.items.update_one(
                        {"_id": existing_item["_id"]},
                        {"$set": {"quantity": new_quantity}}
                    )
                    
                    if update_result.modified_count > 0:
                        print(f"DEBUG: Updated quantity for {item_name}")
                        results["updated"].append({
                            "name": item_name,
                            "new_quantity": new_quantity
                        })
                    else:
                        print(f"DEBUG: Failed to update quantity for {item_name}")
                        results["errors"].append({
                            "name": item_name,
                            "action": "update",
                            "error": "Failed to update quantity"
                        })
                except Exception as e:
                    print(f"DEBUG: Error updating item {item_name}: {str(e)}")
                    results["errors"].append({
                        "name": item_name,
                        "action": "update",
                        "error": str(e)
                    })
            else:
                # Item doesn't exist or has different expiration date, add as new item
                try:
                    new_item = Item(
                        name=item_name.lower(),  # Add lowercase version for searching
                        quantity=str(count),
                        expiration_date=expiration_date,
                        image_data=image_data  # Store the base64 image data
                    )
                    item_dict = new_item.to_dict()
                    if "_id" in item_dict:
                        del item_dict["_id"]
                        
                    db.items.insert_one(item_dict)
                    print(f"DEBUG: Added new item {item_name}")
                    results["added"].append(item_name)
                except Exception as e:
                    print(f"DEBUG: Error adding new item {item_name}: {str(e)}")
                    results["errors"].append({
                        "name": item_name,
                        "action": "add",
                        "error": str(e)
                    })
        
        print(f"DEBUG: Processing complete. Results: {results}")
        return results, 200
        
    except Exception as e:
        print(f"DEBUG: Error in process_ai_response: {str(e)}")
        return {"error": str(e)}, 500

# Legacy function for backward compatibility
def process_perplexity_response(perplexity_response, image_data=None):
    """
    Legacy function for backward compatibility - redirects to new implementation
    """
    return process_ai_response(perplexity_response, image_data)

# if __name__ == "__main__":
#     # Sample Perplexity response for testing
#     test_response = {
#         "items": [
#             {
#                 "name": "Cucumbers",
#                 "count": 6,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Orange Bell Peppers",
#                 "count": 2,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Green Leaf Lettuce",
#                 "count": 1,
#                 "expiration_date": "2025-05-20"
#             },
#             {
#                 "name": "Yellow Bell Pepper",
#                 "count": 1,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Cheese block",
#                 "count": 1,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Small milk bottles",
#                 "count": 3,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Milk bottle with red cap",
#                 "count": 1,
#                 "expiration_date": "2025-05-22"
#             },
#             {
#                 "name": "Eggs",
#                 "count": 12,
#                 "expiration_date": "2025-06-05"
#             }
#         ]
#     }
    
#     print("Testing process_perplexity_response with sample data...")
#     results, status_code = process_perplexity_response(test_response)
    
#     print("\nResults:")
#     print(f"Status Code: {status_code}")
#     print("\nAdded Items:")
#     for item in results["added"]:
#         print(f"- {item}")
    
#     print("\nUpdated Items:")
#     for item in results["updated"]:
#         print(f"- {item['name']}: New quantity = {item['new_quantity']}")
    
#     print("\nErrors:")
#     for error in results["errors"]:
#         print(f"- {error['name']}: {error['error']}") 