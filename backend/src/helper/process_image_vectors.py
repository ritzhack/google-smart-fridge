import os
import tempfile
import base64
from PIL import Image
from datetime import datetime, timedelta
from src.db_connector import get_db_instance
from src.models.item import Item
from src.services.image_vector_service import ImageVectorService

def save_base64_image(base64_image, prefix="img"):
    """
    Save a base64 image to a temporary file.
    
    Args:
        base64_image (str): Base64 encoded image
        prefix (str): Prefix for the temporary file
        
    Returns:
        str: Path to the saved image file
    """
    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(prefix=prefix, suffix=".jpg", delete=False)
    temp_file.close()
    
    # Decode base64 string and save to file
    try:
        # Remove data:image/jpeg;base64, if present
        if "base64," in base64_image:
            base64_image = base64_image.split("base64,")[1]
        
        with open(temp_file.name, "wb") as f:
            f.write(base64.b64decode(base64_image))
        
        return temp_file.name
    except Exception as e:
        print(f"Error saving base64 image: {str(e)}")
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise

def process_image_pair(first_image_base64, second_image_base64=None):
    """
    Process a pair of images (adding to fridge and removing from fridge).
    
    Args:
        first_image_base64 (str): Base64 encoded image of items being added to fridge
        second_image_base64 (str): Base64 encoded image of items being removed from fridge, or None
        
    Returns:
        dict: Results of processing
    """
    results = {"added": [], "removed": [], "errors": []}
    db = get_db_instance()
    vector_service = ImageVectorService()
    
    try:
        # Process first image (adding to fridge)
        if first_image_base64:
            print("Processing first image (items being added to fridge)...")
            first_image_path = save_base64_image(first_image_base64, prefix="add_")
            
            # Check if the image is already in the database
            similar_images = vector_service.search_similar_images(first_image_path, limit=1, threshold=0.75)
            
            if similar_images:
                # Image already exists, use stored information
                print("Found similar image in database, using stored information")
                similar_item = similar_images[0]
                item_name = similar_item.get("name")
                expiration_period = similar_item.get("expirationPeriod", 7)  # Default to 7 days
                
                # Calculate expiration date
                expiration_date = datetime.utcnow() + timedelta(days=expiration_period)
                
                # Add to items collection with image data
                new_item = Item(
                    name=item_name.lower(),
                    quantity="1",
                    expiration_date=expiration_date.isoformat(),
                    image_data=first_image_base64  # Store the base64 image data
                )
                item_dict = new_item.to_dict()
                if "_id" in item_dict:
                    del item_dict["_id"]
                
                db.items.insert_one(item_dict)
                results["added"].append(item_name)
            else:
                # Image not in database, let Perplexity process it
                print("Image not found in database, use Perplexity for identification")
                # Don't do anything here - return special flag so upload_image knows to continue with Perplexity
                results["need_perplexity"] = first_image_path
                
                # Note: After Perplexity identifies the item, we need to store it in the vector index
                # This will be handled in the upload-image route after perplexity processing
        
        # Process second image (removing from fridge)
        if second_image_base64:
            print("Processing second image (items being removed from fridge)...")
            second_image_path = save_base64_image(second_image_base64, prefix="remove_")
            
            # Identify the item using vector search
            similar_images = vector_service.search_similar_images(second_image_path, limit=1, threshold=0.7)
            
            if similar_images:
                # Found similar image, remove from items collection
                similar_item = similar_images[0]
                item_name = similar_item.get("name")
                
                # Find and remove from items collection
                delete_result = db.items.delete_one({"name": item_name.lower()})
                
                if delete_result.deleted_count > 0:
                    results["removed"].append(item_name)
                    print(f"Removed {item_name} from items collection")
                else:
                    results["errors"].append({
                        "name": item_name,
                        "action": "remove",
                        "error": "Item not found in inventory"
                    })
            else:
                # No similar image found
                print("No similar image found in database for removal")
                results["errors"].append({
                    "action": "remove",
                    "error": "No matching item found in image database"
                })
            
            # Clean up temp file
            if os.path.exists(second_image_path):
                os.unlink(second_image_path)
                
    except Exception as e:
        print(f"Error processing image pair: {str(e)}")
        results["errors"].append({
            "action": "process",
            "error": str(e)
        })
    
    return results

def store_image_vector(image_path, item_name, expiration_period):
    """
    Store an image vector in the database.
    
    Args:
        image_path (str): Path to the image file
        item_name (str): Name of the item
        expiration_period (int): Expiration period in days
        
    Returns:
        str: ID of the stored document
    """
    vector_service = ImageVectorService()
    
    try:
        # Store the image vector
        doc_id = vector_service.store_image_embedding(
            image_path=image_path,
            item_name=item_name,
            expiration_period=expiration_period,
            metadata={"date_added": datetime.utcnow().isoformat()}
        )
        
        print(f"Successfully stored image vector for {item_name} with ID: {doc_id}")
        
        # Clean up temp file
        if os.path.exists(image_path):
            os.unlink(image_path)
            print(f"Cleaned up temporary file: {image_path}")
            
        return doc_id
    except Exception as e:
        print(f"Error storing image vector: {str(e)}")
        # Still clean up temp file even if storage failed
        if os.path.exists(image_path):
            os.unlink(image_path)
        raise
    finally:
        vector_service.close() 