import os
import sys
import tempfile
import base64
from PIL import Image
from dotenv import load_dotenv

# Add the src directory to the path so we can import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.helper.process_image_vectors import store_image_vector
from src.services.image_vector_service import ImageVectorService
from src.db_connector import get_db_instance, close_db_connection

# Load environment variables
load_dotenv("../../../.venv/.env", override=True)

def create_test_image():
    """Create a simple test image and return its path."""
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='red')
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name, 'JPEG')
    temp_file.close()
    
    return temp_file.name

def test_vector_storage():
    """Test the image vector storage functionality."""
    print("Testing image vector storage functionality...")
    
    # Create a test image
    test_image_path = create_test_image()
    print(f"Created test image: {test_image_path}")
    
    try:
        # Test storing an image vector
        item_name = "Test Kiwi"
        expiration_period = 10  # 10 days
        
        print(f"Storing vector for {item_name} with {expiration_period} days expiration...")
        doc_id = store_image_vector(test_image_path, item_name, expiration_period)
        print(f"Successfully stored with document ID: {doc_id}")
        
        # Verify the document was stored
        db = get_db_instance()
        collection = db["image_vectors"]
        stored_doc = collection.find_one({"_id": doc_id})
        
        if stored_doc:
            print("✓ Document successfully stored in database")
            print(f"  Name: {stored_doc.get('name')}")
            print(f"  Expiration Period: {stored_doc.get('expirationPeriod')} days")
            print(f"  Embedding dimensions: {len(stored_doc.get('embedding', []))}")
            print(f"  Metadata: {stored_doc.get('metadata')}")
        else:
            print("✗ Document not found in database")
            
        # Test searching for similar images
        print("\nTesting image search...")
        vector_service = ImageVectorService()
        
        # Create another test image for searching
        search_image_path = create_test_image()
        similar_images = vector_service.search_similar_images(search_image_path, limit=3, threshold=0.5)
        
        print(f"Found {len(similar_images)} similar images")
        for i, img in enumerate(similar_images):
            print(f"  {i+1}. {img.get('name')} (score: {img.get('score', 0):.4f})")
        
        # Clean up search image
        if os.path.exists(search_image_path):
            os.unlink(search_image_path)
            
        vector_service.close()
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up test image if it still exists
        if os.path.exists(test_image_path):
            os.unlink(test_image_path)
        close_db_connection()

if __name__ == "__main__":
    test_vector_storage() 