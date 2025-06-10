import os
import sys
import pymongo
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# Add the src directory to the path so we can import the db_connector
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db_connector import get_db_instance, close_db_connection

# Load environment variables
load_dotenv("../../../.venv/.env", override=True)

def main():
    """
    Store food images in MongoDB with vector embeddings using SentenceTransformer
    and create a vector search index programmatically.
    """
    print("Starting image vector upload process...")
    
    # Connect to MongoDB
    print("Connecting to MongoDB...")
    db = get_db_instance()
    if db is None:
        raise ConnectionError("Failed to connect to MongoDB. Check your connection string.")
    
    # Get or create the collection for image vectors
    collection = db["image_vectors"]
    
    # Load CLIP model
    print("Loading CLIP model (this may take a moment)...")
    model = SentenceTransformer("clip-ViT-L-14")  # Using the model specified in the tutorial
    
    # Create vector search index if it doesn't exist
    create_vector_search_index(collection)
    
    # Food items to store with their expiration periods
    food_items = [
        {
            "filename": "ketchep.jpeg", 
            "name": "Ketchup",
            "expirationPeriod": 180  # 6 months in days
        },
        {
            "filename": "kiwi.jpeg",
            "name": "Kiwi",
            "expirationPeriod": 21  # 3 weeks in days
        },
        {
            "filename": "mandarin.jpeg",
            "name": "Mandarin",
            "expirationPeriod": 21  # 3 weeks in days
        }
    ]
    
    # Get the directory where the images are stored
    test_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Clear previous data for clean testing
    print("Clearing previous data from image_vectors collection...")
    collection.delete_many({})
    
    # Process and store each food item
    print("\nProcessing food items...")
    for item in food_items:
        image_path = os.path.join(test_dir, item["filename"])
        
        # Check if the image file exists
        if not os.path.exists(image_path):
            print(f"Warning: Image file {image_path} not found. Skipping.")
            continue
        
        print(f"Processing {item['name']}...")
        
        try:
            # Generate embedding using the model
            image = Image.open(image_path)
            embedding = model.encode(image)
            
            # Create document for MongoDB
            document = {
                "_id": item["filename"],  # Using filename as the document ID
                "name": item["name"],
                "expirationPeriod": item["expirationPeriod"],
                "embedding": embedding.tolist(),  # Convert numpy array to list
                "metadata": {"category": "food"}
            }
            
            # Insert into MongoDB (with upsert to avoid duplicate key errors)
            result = collection.replace_one(
                {"_id": document["_id"]}, 
                document, 
                upsert=True
            )
            
            if result.upserted_id:
                print(f"✓ Added {item['name']} to database")
            else:
                print(f"✓ Updated {item['name']} in database")
            
        except Exception as e:
            print(f"Error processing {item['name']}: {str(e)}")
    
    # Print a summary
    count = collection.count_documents({})
    print(f"\nSuccessfully stored {count} food items in the database.")
    print("You can now use these for vector similarity search!")

def create_vector_search_index(collection):
    """
    Create a vector search index on the collection programmatically.
    
    Args:
        collection: MongoDB collection to create the index on
    """
    print("Setting up vector search index...")
    
    # Check if the index already exists
    index_exists = False
    try:
        # Get all search indexes for the collection
        indexes = collection.database.command("listSearchIndexes", collection.name)
        
        # Check if our vector index already exists
        if "cursor" in indexes and "firstBatch" in indexes["cursor"]:
            for index in indexes["cursor"]["firstBatch"]:
                if index.get("name") == "vector_index":
                    index_exists = True
                    break
    except pymongo.errors.OperationFailure:
        # This can happen if there are no search indexes yet
        pass
    
    if not index_exists:
        print("Creating vector search index...")
        
        # Define the index configuration
        index_config = {
            "mappings": {
                "dynamic": True,
                "fields": {
                    "embedding": {
                        "dimensions": 768,
                        "similarity": "cosine",
                        "type": "knnVector"
                    }
                }
            }
        }
        
        # Create the index
        try:
            collection.database.command(
                "createSearchIndex",
                collection.name,
                {
                    "definition": index_config,
                    "name": "vector_index"
                }
            )
            print("Vector search index 'vector_index' created successfully.")
        except Exception as e:
            print(f"Failed to create vector search index: {str(e)}")
            print("\nYou'll need to create the index manually in MongoDB Atlas following these steps:")
            print("1. Log in to MongoDB Atlas")
            print("2. Navigate to your cluster")
            print("3. Go to the 'Search' tab")
            print("4. Click 'Create Search Index'")
            print("5. Choose 'JSON Editor' and enter:")
            print("""
            {
              "mappings": {
                "dynamic": true,
                "fields": {
                  "embedding": {
                    "dimensions": 768,
                    "similarity": "cosine",
                    "type": "knnVector"
                  }
                }
              }
            }
            """)
            print("6. Name your index 'vector_index'")
            print("7. Click 'Create Index'")
    else:
        print("Vector search index 'vector_index' already exists.")

if __name__ == "__main__":
    try:
        main()
    finally:
        # Always close the connection
        close_db_connection() 