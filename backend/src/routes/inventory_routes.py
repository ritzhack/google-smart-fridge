# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/routes/inventory_routes.py
from flask import Blueprint, request, jsonify
from src.db_connector import get_db_instance
from src.models.item import Item
from src.services.ai_service import AIService
from src.services.image_processing_service import ImageProcessingService
from src.services.image_vector_service import ImageVectorService
from src.helper.identify_object_from_picutre import identify_object_from_image
from src.helper.process_inventory import process_perplexity_response
from src.helper.process_image_vectors import process_image_pair, store_image_vector
from bson import ObjectId # For converting string ID to ObjectId for MongoDB queries
import datetime
import traceback
import sys
import base64
import tempfile
import os
from PIL import Image

inventory_bp = Blueprint("inventory_bp", __name__, url_prefix="/api/inventory")
db = get_db_instance()
ai_service = AIService()
image_service = ImageProcessingService()
vector_service = ImageVectorService()

@inventory_bp.route("/debug", methods=["GET"])
def debug_connection():
    """Debug route to check MongoDB connection"""
    try:
        if db is None:
            return jsonify({
                "error": "Database connection failed",
                "db_object": str(db),
                "connection_status": "None"
            }), 500

        # Try a simple database operation
        collections = db.list_collection_names() if db else []
        
        return jsonify({
            "status": "Database connection successful",
            "db_object": str(db),
            "collections": collections
        }), 200
    except Exception as e:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
        
        return jsonify({
            "error": str(e),
            "db_object": str(db),
            "traceback": error_details
        }), 500

@inventory_bp.route("/items", methods=["POST"])
def add_item_to_inventory():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("quantity"):
        return jsonify({"error": "Missing item name or quantity"}), 400

    item_name = data.get("name")
    quantity = data.get("quantity")
    image_url = data.get("image_url") # Optional

    # Simulate getting expiration date from AI service
    expiration_date_dt = ai_service.get_general_expiration_info(item_name)
    
    # Convert date to datetime for MongoDB compatibility if needed, or store as string
    # For simplicity, storing as string if it's a date object, otherwise None
    expiration_date_iso = None
    if expiration_date_dt:
        expiration_date_iso = expiration_date_dt.isoformat()

    new_item = Item(
        name=item_name,
        quantity=quantity,
        expiration_date=expiration_date_iso, # Store as ISO string or datetime object
        image_url=image_url
    )

    try:
        if db is None:
            return jsonify({"error": "Database connection failed. Check backend logs."}), 500
            
        item_dict = new_item.to_dict()
        if "_id" in item_dict:
            del item_dict["_id"] # Remove _id if present, MongoDB will generate it
        
        result = db.items.insert_one(item_dict)
        created_item = db.items.find_one({"_id": result.inserted_id})
        return jsonify(Item.from_dict(created_item).to_dict()), 201
    except Exception as e:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
        print("ERROR in add_item_to_inventory:", error_details)
        return jsonify({"error": str(e), "details": error_details}), 500

@inventory_bp.route("/items", methods=["GET"])
def get_all_items():
    try:
        if db is None:
            return jsonify({"error": "Database connection failed. Check backend logs."}), 500
            
        # Try to access the items collection
        items_cursor = db.items.find()
        items_list = [Item.from_dict(item_data).to_dict() for item_data in items_cursor]
        return jsonify(items_list), 200
    except Exception as e:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
        print("ERROR in get_all_items:", error_details)
        return jsonify({"error": str(e), "details": error_details}), 500

@inventory_bp.route("/items/<item_id>", methods=["GET"])
def get_item_by_id(item_id):
    try:
        item_data = db.items.find_one({"_id": ObjectId(item_id)})
        if item_data:
            return jsonify(Item.from_dict(item_data).to_dict()), 200
        else:
            return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/items/<item_id>", methods=["PUT"])
def update_item(item_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided for update"}), 400

    update_fields = {}
    if "name" in data: update_fields["name"] = data["name"]
    if "quantity" in data: update_fields["quantity"] = data["quantity"]
    if "expiration_date" in data: update_fields["expiration_date"] = data["expiration_date"] # Expecting ISO date string
    if "image_url" in data: update_fields["image_url"] = data["image_url"]

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400
    
    update_fields["date_added"] = datetime.datetime.utcnow() # Update date_added on modification

    try:
        result = db.items.update_one({"_id": ObjectId(item_id)}, {"$set": update_fields})
        if result.matched_count:
            updated_item = db.items.find_one({"_id": ObjectId(item_id)})
            return jsonify(Item.from_dict(updated_item).to_dict()), 200
        else:
            return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/items/<item_id>", methods=["DELETE"])
def delete_item(item_id):
    try:
        result = db.items.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count:
            return jsonify({"message": "Item deleted successfully"}), 200
        else:
            return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Enhanced image processing route with similarity checking
@inventory_bp.route("/process-image", methods=["POST"])
def process_fridge_image():
    """
    Enhanced image processing endpoint that checks for similar images before adding new items.
    Accepts either simulated data or actual image data with similarity checking.
    """
    try:
        # Check if this is a file upload or JSON data
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload with image similarity checking
            return _process_image_with_similarity_check()
        else:
            # Handle JSON data (backward compatibility for simulation)
            return _process_simulated_image()
            
    except Exception as e:
        print(f"Error in process_fridge_image: {str(e)}")
        return jsonify({"error": str(e)}), 500

def _process_image_with_similarity_check():
    """Process uploaded image with similarity checking."""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
        
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save uploaded image to temporary file
    temp_image_path = None
    results = {"added": [], "updated": [], "errors": [], "similar_items_found": []}
    
    try:
        # Create temporary file for the uploaded image
        temp_image_file = tempfile.NamedTemporaryFile(prefix="process_", suffix=".jpg", delete=False)
        temp_image_path = temp_image_file.name
        temp_image_file.close()
        
        # Save uploaded image to temporary file
        image_file.save(temp_image_path)
        
        # Search for similar images in the database
        similar_images = vector_service.search_similar_images(
            temp_image_path, 
            limit=3, 
            threshold=0.85  # 85% similarity threshold
        )
        
        if similar_images:
            # Similar image(s) found - update quantities instead of adding new items
            print(f"Found {len(similar_images)} similar image(s) in database")
            
            for similar_item in similar_images:
                item_name = similar_item.get("name")
                similarity_score = similar_item.get("score", 0)
                
                results["similar_items_found"].append({
                    "name": item_name,
                    "similarity_score": round(similarity_score, 4)
                })
                
                # Find the item in the inventory and update quantity
                item_doc = db.items.find_one({"name": item_name.lower()})
                if item_doc:
                    # Update quantity (increment by 1) - ensure quantity is treated as integer
                    current_quantity = item_doc.get("quantity", 0)
                    # Convert to int if it's stored as string
                    if isinstance(current_quantity, str):
                        try:
                            current_quantity = int(current_quantity)
                        except (ValueError, TypeError):
                            current_quantity = 0
                    new_quantity = current_quantity + 1
                    update_result = db.items.update_one(
                        {"_id": item_doc["_id"]},
                        {
                            "$set": {
                                "quantity": new_quantity,
                                "date_added": datetime.datetime.utcnow()
                            }
                        }
                    )
                    
                    if update_result.modified_count > 0:
                        results["updated"].append({
                            "name": item_name,
                            "new_quantity": new_quantity,
                            "old_quantity": current_quantity,  # Include old quantity for comparison
                            "similarity_score": round(similarity_score, 4),
                            "action": "quantity_updated"
                        })
                        print(f"Updated quantity for {item_name} to {new_quantity}")
                    else:
                        results["errors"].append({
                            "name": item_name,
                            "action": "update_quantity",
                            "error": "Failed to update quantity in database"
                        })
                else:
                    # Similar image found but item not in inventory - create new item using original approach
                    print(f"Similar image found for {item_name} but not in inventory, creating new item")
                    
                    # Get expiration period from similar item metadata
                    expiration_period = similar_item.get("expirationPeriod", 7)  # Default to 7 days
                    expiration_date = datetime.datetime.utcnow() + datetime.timedelta(days=expiration_period)
                    
                    # Create new item with simple approach
                    new_item = Item(
                        name=item_name.lower(),
                        quantity=1,
                        expiration_date=expiration_date.isoformat()
                    )
                    item_dict = new_item.to_dict()
                    if "_id" in item_dict:
                        del item_dict["_id"]
                    
                    try:
                        db.items.insert_one(item_dict)
                        results["added"].append({
                            "name": item_name,
                            "quantity": 1,
                            "similarity_score": round(similarity_score, 4),
                            "action": "new_item_from_similar"
                        })
                        print(f"Created new item {item_name} with quantity 1")
                    except Exception as e:
                        results["errors"].append({
                            "name": item_name,
                            "action": "create_item",
                            "error": str(e)
                        })
        else:
            # No similar images found - identify items and add as new
            print("No similar images found, processing as new items")
            
            # Use AI to identify items in the image
            image_data = None
            with open(temp_image_path, "rb") as f:
                image_data = f.read()
            
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Use Vertex AI to identify objects
            perplexity_response = identify_object_from_image(
                image_url=f"data:image/jpeg;base64,{base64_image}"
            )
            
            # Process the AI response to get identified items
            ai_results, _ = process_perplexity_response(perplexity_response, base64_image)
            
            if "added" in ai_results:
                results["added"].extend(ai_results["added"])
                
                # Store image vectors for newly identified items
                for item_name in ai_results["added"]:
                    try:
                        # Find the item in the database to get its expiration date
                        item_doc = db.items.find_one({"name": item_name.lower()})
                        if item_doc:
                            # Calculate expiration period in days
                            exp_date = datetime.datetime.fromisoformat(item_doc.get("expiration_date"))
                            current_date = datetime.datetime.utcnow()
                            expiration_period = max(1, (exp_date - current_date).days)
                            
                            # Store the image vector
                            store_image_vector(temp_image_path, item_name, expiration_period)
                            print(f"Stored image vector for new item: {item_name}")
                    except Exception as e:
                        print(f"Error storing vector for {item_name}: {str(e)}")
                        results["errors"].append({
                            "name": item_name,
                            "action": "store_vector",
                            "error": str(e)
                        })
            
            if "errors" in ai_results:
                results["errors"].extend(ai_results["errors"])
                
    except Exception as e:
        print(f"Error processing image with similarity check: {str(e)}")
        results["errors"].append({
            "action": "process_image",
            "error": str(e)
        })
    finally:
        # Clean up temporary file
        if temp_image_path and os.path.exists(temp_image_path):
            os.unlink(temp_image_path)
    
    return jsonify(results), 200

def _process_simulated_image():
    """Process simulated image data (backward compatibility)."""
    data = request.get_json()
    image_identifier = data.get("image_identifier", "default_simulated_items")

    # 1. Get current items from DB (simulating previous state)
    try:
        current_db_items_cursor = db.items.find()
        previous_item_names = [item["name"] for item in current_db_items_cursor]
    except Exception as e:
        return jsonify({"error": f"Failed to fetch current inventory: {str(e)}"}), 500

    # 2. Simulate image capture and item identification
    identified_item_names = image_service.simulate_capture_and_identify_items(image_identifier)

    # 3. Determine changes
    added_names, removed_names = image_service.determine_item_change(previous_item_names, identified_item_names)

    # 4. Process changes
    results = {"added": [], "removed": [], "errors": []}

    for name in added_names:
        exp_date_dt = ai_service.get_general_expiration_info(name)
        exp_date_iso = exp_date_dt.isoformat() if exp_date_dt else None
        new_item = Item(name=name, quantity=1, expiration_date=exp_date_iso) # Default quantity 1
        item_dict = new_item.to_dict()
        if "_id" in item_dict:
            del item_dict["_id"]
        try:
            db.items.insert_one(item_dict)
            results["added"].append(name)
        except Exception as e:
            results["errors"].append({"name": name, "action": "add", "error": str(e)})
    
    for name in removed_names:
        try:
            # Simple removal by name. Could be more sophisticated (e.g. if multiple items with same name)
            delete_result = db.items.delete_one({"name": name})
            if delete_result.deleted_count > 0:
                results["removed"].append(name)
            else:
                results["errors"].append({"name": name, "action": "remove", "error": "item not found for removal by name"})
        except Exception as e:
            results["errors"].append({"name": name, "action": "remove", "error": str(e)})
            
    return jsonify(results), 200

@inventory_bp.route("/upload-image-pair", methods=["POST"])
def upload_image_pair():
    """
    New endpoint specifically for handling pairs of images.
    - First image: Adding item to fridge
    - Second image: Removing item from fridge
    """
    try:
        if 'take_in_image' not in request.files and 'take_out_image' not in request.files:
            return jsonify({"error": "Image file is required"}), 400
        take_in_base64_image = None
        take_out_base64_image = None

        if 'take_in_image' in request.files:
            take_in_image_file = request.files['take_in_image']
            if take_in_image_file.filename == '':
                return jsonify({"error": "Empty first image file"}), 400 
            # Read the first image file and convert to base64
            take_in_image_data = take_in_image_file.read()
            take_in_base64_image = base64.b64encode(take_in_image_data).decode('utf-8')
        if 'take_out_image' in request.files:
            take_out_image_file = request.files['take_out_image']
            if take_out_image_file.filename != '':
                take_out_image_data = take_out_image_file.read()
                take_out_base64_image = base64.b64encode(take_out_image_data).decode('utf-8')
        
        # Process the image pair
        results = process_image_pair(take_in_base64_image, take_out_base64_image)
        
        # Check if we need to use AI for the first image
        if "need_ai" in results:
            temp_image_path = results.pop("need_ai")
            
            print("Using Vertex AI to identify objects in the image...")
            perplexity_response = identify_object_from_image(image_url=f"data:image/jpeg;base64,{take_in_base64_image}")
            
            # Process the response
            perplexity_results, status_code = process_perplexity_response(perplexity_response, take_in_base64_image)
            
            # Ensure all required keys exist in results before merging
            for key in ["added", "updated", "errors"]:
                if key not in results:
                    results[key] = []
                if key in perplexity_results:
                    results[key].extend(perplexity_results.get(key, []))
            
            # Store image vectors for newly identified items
            if "added" in perplexity_results and perplexity_results["added"]:
                for item_name in perplexity_results["added"]:
                    # Find the item in the database to get its expiration date
                    item_doc = db.items.find_one({"name": item_name.lower()})
                    if item_doc:
                        # Calculate expiration period in days
                        try:
                            exp_date = datetime.datetime.fromisoformat(item_doc.get("expiration_date"))
                            current_date = datetime.datetime.utcnow()
                            expiration_period = (exp_date - current_date).days
                            
                            # Ensure expiration period is positive
                            expiration_period = max(1, expiration_period)
                            
                            # Store the image vector
                            print(f"Storing image vector for {item_name} with expiration period {expiration_period} days")
                            store_image_vector(temp_image_path, item_name, expiration_period)
                            results["vector_stored"] = True
                        except Exception as e:
                            print(f"Error storing vector for {item_name}: {str(e)}")
                            if "errors" not in results:
                                results["errors"] = []
                            results["errors"].append({
                                "name": item_name,
                                "action": "store_vector",
                                "error": str(e)
                            })
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error in upload_image_pair: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/reject-update", methods=["POST"])
def reject_update_and_create_new():
    """
    Endpoint to handle when user rejects an item update and wants to create a new item instead.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        item_name = data.get("item_name")
        original_quantity = data.get("original_quantity", 1)
        image_data = data.get("image_data")  # Base64 image data
        
        if not item_name:
            return jsonify({"error": "Item name is required"}), 400
        
        # Revert the original item's quantity back to what it was
        existing_item = db.items.find_one({"name": item_name.lower()})
        if existing_item:
            # Revert quantity
            db.items.update_one(
                {"_id": existing_item["_id"]},
                {"$set": {"quantity": original_quantity}}
            )
        
        # Create a new item with a unique name (append number)
        base_name = item_name.lower()
        counter = 1
        new_name = f"{base_name}_{counter}"
        
        # Find a unique name
        while db.items.find_one({"name": new_name}):
            counter += 1
            new_name = f"{base_name}_{counter}"
        
        # Get expiration date for this item type
        expiration_date_dt = ai_service.get_general_expiration_info(item_name)
        expiration_date_iso = expiration_date_dt.isoformat() if expiration_date_dt else None
        
        # Create the new item
        new_item = Item(
            name=new_name,
            quantity=1,
            expiration_date=expiration_date_iso,
            image_data=image_data if image_data else None
        )
        
        item_dict = new_item.to_dict()
        if "_id" in item_dict:
            del item_dict["_id"]
        
        result = db.items.insert_one(item_dict)
        
        return jsonify({
            "message": "Update rejected and new item created",
            "reverted_item": {
                "name": item_name,
                "quantity": original_quantity
            },
            "new_item": {
                "name": new_name,
                "quantity": 1,
                "_id": str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        print(f"Error in reject_update_and_create_new: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/confirm-updates", methods=["POST"])
def confirm_updates():
    """
    Endpoint to confirm and apply pending updates to item quantities.
    """
    try:
        data = request.get_json()
        if not data or not isinstance(data, list):
            return jsonify({"error": "Expected list of updates"}), 400

        results = {"updated": [], "errors": []}
        
        for update in data:
            item_id = update.get("item_id")
            new_quantity = update.get("new_quantity")
            
            if not item_id or new_quantity is None:
                results["errors"].append({
                    "error": "Missing item_id or new_quantity",
                    "update": update
                })
                continue
                
            try:
                # Update the item quantity
                result = db.items.update_one(
                    {"_id": ObjectId(item_id)},
                    {
                        "$set": {
                            "quantity": new_quantity,
                            "date_added": datetime.datetime.utcnow()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    results["updated"].append({
                        "item_id": item_id,
                        "new_quantity": new_quantity
                    })
                else:
                    results["errors"].append({
                        "error": "Item not found or no changes made",
                        "item_id": item_id
                    })
            except Exception as e:
                results["errors"].append({
                    "error": str(e),
                    "item_id": item_id
                })
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error in confirm_updates: {str(e)}")
        return jsonify({"error": str(e)}), 500
