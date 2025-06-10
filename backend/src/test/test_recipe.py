import os
import sys
import json
import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2 import service_account

# Add the parent directory to sys.path to import from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_connector import get_db_instance, close_db_connection

# Load environment variables
# Find the project root (where .venv directory is located)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = current_dir
while not os.path.exists(os.path.join(project_root, '.venv')):
    parent = os.path.dirname(project_root)
    if parent == project_root:  # We've reached the filesystem root
        raise FileNotFoundError("Could not find .venv directory in any parent directory")
    project_root = parent

env_path = os.path.join(project_root, '.venv', '.env')
load_dotenv(env_path)

PROJECT_ID = os.getenv("PROJECT_ID")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def get_access_token():
    """
    Get Google Cloud access token using service account credentials
    
    Returns:
        str: Access token for Google Cloud API
    """
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not found in environment variables")
    
    # Load service account credentials
    credentials = service_account.Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    
    # Refresh the token
    credentials.refresh(Request())
    
    return credentials.token

def get_fridge_items():
    """
    Retrieve food items from MongoDB Atlas
    
    Returns:
        list: List of food items with their details
    """
    db = get_db_instance()
    if db is None:
        raise ConnectionError("Failed to connect to MongoDB Atlas")
    
    try:
        # Assuming 'items' is the collection name - adjust if needed
        collection = db["items"]
        
        # Get all items from the collection
        items = list(collection.find({}, {"_id": 0}))
        
        if not items:
            print("No items found in the database")
            return []
        
        return items
    except Exception as e:
        print(f"Error retrieving items from database: {e}")
        return []
    finally:
        close_db_connection()

def get_recipe_suggestions(items):
    """
    Use Google Vertex AI to get recipe suggestions based on available ingredients
    
    Args:
        items (list): List of food items from the fridge
        
    Returns:
        dict: Vertex AI API response with recipe suggestions
    """
    if not PROJECT_ID:
        raise ValueError("PROJECT_ID not found in environment variables")
    
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not found in environment variables")
    
    if not items:
        return {"error": "No items provided"}
    
    # Extract names of ingredients
    ingredient_names = [item.get('name', '') for item in items if item.get('name')]
    ingredient_list = ", ".join(ingredient_names)
    
    # Get access token
    access_token = get_access_token()
    
    # API endpoint
    url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/gemini-2.0-flash:generateContent"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"ingredient_list: {ingredient_list}")
    
    # Create a prompt for recipe suggestions
    prompt = (
        f"I have the following ingredients in my fridge: {ingredient_list}. "
        f"Please suggest 3 recipes I can make using ONLY these ingredients (it's okay to use just a subset of them). "
        f"For each recipe, provide: 1) Recipe name, 2) Ingredients needed from my list, 3) Brief cooking instructions, "
        f"4) Approximate cooking time. Format the response as a JSON array of recipe objects."
    )
    
    # Prepare request data according to Vertex AI format
    data = {
        "contents": [
            {
                "role": "USER",
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }
    
    # Make API request
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code != 200:
        raise Exception(f"API request failed with status {response.status_code}: {response.text}")
    
    # Process and return the response
    response_data = response.json()
    
    try:
        # Extract content from Vertex AI response structure
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            candidate = response_data['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                for part in candidate['content']['parts']:
                    if 'text' in part:
                        content = part['text']
                        
                        # For debugging - print the raw content
                        print("\nRaw content from Vertex AI:")
                        print(content)
                        print("\n")
                        
                        # Try to find and extract JSON from the content
                        try:
                            # First try to parse the entire content as JSON
                            recipes = json.loads(content)
                            return {"recipes": recipes}
                        except json.JSONDecodeError:
                            # If that fails, try to find JSON array in the content using simple heuristics
                            import re
                            json_match = re.search(r'\[\s*{.*}\s*\]', content, re.DOTALL)
                            if json_match:
                                recipes = json.loads(json_match.group(0))
                                return {"recipes": recipes}
                            else:
                                # If no structured JSON found, return the raw content
                                return {"text_response": content}
        
        # If we can't extract content properly, return the raw response
        return {"error": "Could not extract content from response", "raw_response": response_data}
        
    except Exception as e:
        print(f"Error processing Vertex AI response: {e}")
        return {"error": str(e), "raw_response": response_data}

if __name__ == "__main__":
    try:
        print("Retrieving fridge items from MongoDB...")
        items = get_fridge_items()
        
        if items:
            print(f"Found {len(items)} items in the fridge")
            print("Requesting recipe suggestions from Vertex AI...")
            recipes = get_recipe_suggestions(items)
            
            # Pretty print the recipe suggestions
            print("\nRecipe Suggestions:")
            print(json.dumps(recipes, indent=2))
        else:
            print("No items found in the fridge. Please add some items first.")
            
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure your GOOGLE_APPLICATION_CREDENTIALS and PROJECT_ID are set correctly in your .env file.") 