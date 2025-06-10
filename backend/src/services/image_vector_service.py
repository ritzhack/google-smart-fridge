import os
import numpy as np
from pathlib import Path
from PIL import Image
from sentence_transformers import SentenceTransformer
from src.db_connector import get_db_instance, close_db_connection

class ImageVectorService:
    def __init__(self):
        self.model = None
        self.db = None
        self.vector_dimensions = 768  # Dimensions for clip-ViT-L-14 model
    
    def initialize(self):
        """Initialize the model and database connection."""
        if self.model is None:
            print("Loading CLIP model...")
            self.model = SentenceTransformer("clip-ViT-L-14")
        
        if self.db is None:
            self.db = get_db_instance()
            if self.db is None:
                raise ConnectionError("Failed to connect to MongoDB. Check your connection string.")
    
    def search_similar_images(self, query_image_path, limit=5, threshold=0.7):
        """
        Search for similar food images using vector search, comparing image to image.
        
        Args:
            query_image_path (str): Path to the query image
            limit (int): Maximum number of results to return
            threshold (float): Minimum similarity score (0.0-1.0) to be considered a match
            
        Returns:
            list: Similar food items with similarity above threshold
        """
        print(f"Searching for similar images to: {query_image_path}")
        
        self.initialize()
        
        # Get the collection
        collection = self.db["image_vectors"]
        
        # Check if collection has data
        doc_count = collection.count_documents({})
        print(f"Found {doc_count} documents in image_vectors collection")
        
        if doc_count == 0:
            print("No data in the image_vectors collection.")
            return []
        
        # Generate query embedding for the image
        print("Generating embedding for query image...")
        image = Image.open(query_image_path)
        query_embedding = self.model.encode(image)
        
        # Try vector search
        results = []
        try:
            print("Attempting vector search with $vectorSearch...")
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
                print(f"Found {len(filtered_results)} results above threshold {threshold:.2f}")
                return filtered_results[:limit]  # Limit to requested number
            else:
                if results:
                    print(f"Found {len(results)} results, but none above threshold {threshold:.2f}")
                    print(f"Best match was: {results[0].get('name', 'Unknown')} with score: {results[0].get('score', 0):.4f}")
                print("No results above threshold. Falling back to manual similarity calculation...")
        except Exception as e:
            print(f"Vector search failed: {str(e)}")
            print("Falling back to manual similarity calculation...")
        
        # Fallback: Load all documents and calculate similarity manually
        print("Calculating similarity manually...")
        all_docs = list(collection.find({}))
        print(f"Loaded {len(all_docs)} documents for manual comparison")
        
        if len(all_docs) == 0:
            print("No documents found in the collection.")
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
            print(f"Found {len(manual_results)} matches with manual similarity calculation")
            return manual_results
        else:
            print(f"No matches found with similarity above threshold {threshold:.2f}")
            return []
    
    def store_image_embedding(self, image_path, item_name, expiration_period, metadata=None):
        """
        Store an image embedding in the MongoDB database.
        
        Args:
            image_path (str): Path to the image file
            item_name (str): Name of the item
            expiration_period (int): Expiration period in days
            metadata (dict, optional): Additional metadata to store
            
        Returns:
            str: ID of the stored document
        """
        print(f"Storing embedding for {item_name}...")
        
        self.initialize()
        
        # Get the collection
        collection = self.db["image_vectors"]
        
        # Ensure vector search index exists
        self._ensure_vector_index(collection)
        
        try:
            # Generate embedding using the model
            image = Image.open(image_path)
            embedding = self.model.encode(image)
            
            # Create document for MongoDB with a meaningful ID
            import time
            timestamp = int(time.time() * 1000)  # milliseconds timestamp
            document_id = f"{item_name.lower().replace(' ', '_')}_{timestamp}"
            
            document = {
                "_id": document_id,  # Using item name + timestamp as the document ID
                "name": item_name,
                "expirationPeriod": expiration_period,
                "embedding": embedding.tolist(),  # Convert numpy array to list
                "metadata": metadata or {"category": "food"}
            }
            
            # Insert into MongoDB (with upsert to avoid duplicate key errors)
            result = collection.replace_one(
                {"_id": document["_id"]}, 
                document, 
                upsert=True
            )
            
            if result.upserted_id:
                print(f"Added {item_name} to image_vectors collection")
                return str(result.upserted_id)
            else:
                print(f"Updated {item_name} in image_vectors collection")
                return document["_id"]
            
        except Exception as e:
            print(f"Error storing image embedding: {str(e)}")
            raise
    
    def _ensure_vector_index(self, collection):
        """
        Create a vector search index on the collection if it doesn't exist.
        
        Args:
            collection: MongoDB collection to create the index on
        """
        print("Checking vector search index...")
        
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
        except Exception:
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
                            "dimensions": self.vector_dimensions,
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
                print("You may need to create the index manually in MongoDB Atlas.")
        else:
            print("Vector search index 'vector_index' already exists.")
    
    def close(self):
        """Release resources."""
        close_db_connection()
        self.db = None 