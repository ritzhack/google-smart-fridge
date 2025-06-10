import os
import sys
import numpy as np
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import argparse

# Add the src directory to the path so we can import the db_connector
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db_connector import get_db_instance, close_db_connection

# Load environment variables
load_dotenv("../../../.venv/.env", override=True)

def search_similar_images(query_image_path, limit=5, threshold=0.7):
    """
    Search for similar food images using vector search, comparing image to image.
    
    Args:
        query_image_path (str): Path to the query image
        limit (int): Maximum number of results to return
        threshold (float): Minimum similarity score (0.0-1.0) to be considered a match
        
    Returns:
        list: Similar food items with similarity above threshold
    """
    print(f"Loading query image: {query_image_path}")
    
    # Initialize the model for image embeddings
    print("Loading CLIP model...")
    model = SentenceTransformer("clip-ViT-L-14", device="cuda")
    
    # Connect to MongoDB
    print("Connecting to MongoDB...")
    db = get_db_instance()
    if db is None:
        raise ConnectionError("Failed to connect to MongoDB. Check your connection string.")
    
    # Get the collection
    collection = db["image_vectors"]
    
    # Check if collection has data
    doc_count = collection.count_documents({})
    print(f"Found {doc_count} documents in image_vectors collection")
    
    if doc_count == 0:
        print("ERROR: No data in the collection. Run test_images_upload.py first.")
        return []
    
    # Debug: List a sample document to verify structure
    sample_doc = collection.find_one({})
    if sample_doc:
        print("\nSample document in collection:")
        for key, value in sample_doc.items():
            if key == "embedding":
                print(f"  {key}: [vector with {len(value)} dimensions]")
            else:
                print(f"  {key}: {value}")
    
    # Check if index exists
    try:
        indexes_info = db.command("listSearchIndexes", collection.name)
        vector_index_exists = False
        if "cursor" in indexes_info and "firstBatch" in indexes_info["cursor"]:
            index_list = list(indexes_info["cursor"]["firstBatch"])
            print(f"\nFound {len(index_list)} search indexes:")
            for idx in index_list:
                print(f"  - {idx.get('name', 'unnamed')}")
                if idx.get('name') == "vector_index":
                    vector_index_exists = True
                    print("    (This is the index we need!)")
        
        if not vector_index_exists:
            print("\nWARNING: 'vector_index' not found! Available indexes:")
            for idx in list(collection.list_indexes()):
                print(f"  - {idx.get('name', 'unnamed')}")
    except Exception as e:
        print(f"Error checking indexes: {e}")
    
    # Generate query embedding for the image
    print("\nGenerating embedding for query image...")
    image = Image.open(query_image_path)
    query_embedding = model.encode(image)
    print(f"Generated {len(query_embedding)} dimensional embedding vector")
    
    # Try vector search first
    results = []
    try:
        print("\nAttempting vector search with $vectorSearch...")
        vector_results = collection.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding.tolist(),
                    "numCandidates": 100,
                    "limit": 100  # Get more candidates so we can filter by threshold
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "name": 1,
                    "expirationPeriod": 1,
                    "metadata": 1,
                    "embedding": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ])
        results = list(vector_results)
        print(f"Vector search returned {len(results)} results")
        
        # Filter results by threshold
        filtered_results = [r for r in results if r.get('score', 0) >= threshold]
        
        if filtered_results:
            print(f"\n=== VECTOR SEARCH RESULTS (Threshold: {threshold:.2f}) ===")
            display_results(filtered_results[:limit])  # Limit to requested number
            return filtered_results[:limit]
        else:
            if results:
                print(f"Found {len(results)} results, but none above threshold {threshold:.2f}")
                print(f"Best match was: {results[0].get('name', 'Unknown')} with score: {results[0].get('score', 0):.4f}")
            print("No results above threshold. Falling back to manual similarity calculation...")
    except Exception as e:
        print(f"\nVector search failed: {str(e)}")
        print("Falling back to manual similarity calculation...")
    
    # Fallback: Load all documents and calculate similarity manually
    print("\nFallback: Calculating similarity manually...")
    all_docs = list(collection.find({}))
    print(f"Loaded {len(all_docs)} documents for manual comparison")
    
    if len(all_docs) == 0:
        print("ERROR: No documents found in the collection.")
        return []
    
    # Calculate cosine similarity manually
    similarities = []
    query_norm = np.linalg.norm(query_embedding)
    
    for doc in all_docs:
        doc_embedding = doc.get("embedding", [])
        if not doc_embedding:
            print(f"WARNING: No embedding found in document {doc.get('_id', 'unknown')}")
            continue
            
        doc_embedding = np.array(doc_embedding)
        doc_norm = np.linalg.norm(doc_embedding)
        
        # Avoid division by zero
        if query_norm == 0 or doc_norm == 0:
            similarity = 0
        else:
            similarity = np.dot(query_embedding, doc_embedding) / (query_norm * doc_norm)
        
        similarities.append({
            "_id": doc.get("_id"),
            "name": doc.get("name"),
            "expirationPeriod": doc.get("expirationPeriod"),
            "metadata": doc.get("metadata"),
            "score": float(similarity)
        })
    
    # Sort by similarity (highest first)
    similarities.sort(key=lambda x: x["score"], reverse=True)
    
    # Filter by threshold and take only the top results
    filtered_similarities = [s for s in similarities if s["score"] >= threshold]
    manual_results = filtered_similarities[:limit]
    
    if manual_results:
        print(f"\n=== MANUAL SIMILARITY RESULTS (Threshold: {threshold:.2f}) ===")
        display_results(manual_results)
        return manual_results
    else:
        print(f"\nNo matches found with similarity above threshold {threshold:.2f}")
        if similarities:
            print(f"Best match was: {similarities[0]['name']} with score: {similarities[0]['score']:.4f}")
        print("No similar items found in the database.")
        return []

def display_results(results):
    """Display formatted results with similarity scores."""
    if not results:
        print("No results to display.")
        return
        
    # Get the highest similarity score for normalization
    max_score = max(result.get('score', 0) for result in results)
    
    # Display results with percentage match
    for i, result in enumerate(results):
        score = result.get('score', 0)
        # Calculate percentage similarity (normalize by max score)
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        print(f"\n{i+1}. {result.get('name', 'Unknown')}")
        print(f"   Similarity: {percentage:.2f}% (score: {score:.4f})")
        print(f"   Expiration period: {result.get('expirationPeriod', 'N/A')} days")
        print(f"   ID: {result.get('_id', 'N/A')}")
        
        # Print metadata if available
        if 'metadata' in result and result['metadata']:
            print(f"   Metadata: {result['metadata']}")

if __name__ == "__main__":
    import time
    parser = argparse.ArgumentParser(description='Search for similar images using image-to-image similarity.')
    parser.add_argument('image_path', type=str, help='Path to the image file to search for')
    parser.add_argument('--limit', type=int, default=5, help='Maximum number of results to return')
    parser.add_argument('--threshold', type=float, default=0.7, 
                       help='Minimum similarity score (0.0-1.0) to consider a match')
    
    args = parser.parse_args()
    
    try:
        time_start = time.time()
        search_similar_images(args.image_path, args.limit, args.threshold)
        print(f"Time taken: {time.time() - time_start:.2f} seconds")
    finally:
        # Clean up
        close_db_connection() 