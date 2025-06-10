import sys
import os
import base64
import requests
import json
from dotenv import load_dotenv
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2 import service_account

# Load environment variables
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

# Debug: Print the path being used and check if file exists
print(f"Looking for .env file at: {env_path}")
print(f".env file exists: {os.path.exists(env_path)}")

PROJECT_ID = os.getenv("PROJECT_ID")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Debug: Print the environment variables
print(f"PROJECT_ID: {PROJECT_ID}")
print(f"GOOGLE_APPLICATION_CREDENTIALS: {GOOGLE_APPLICATION_CREDENTIALS}")
print(f"Credentials file exists: {os.path.exists(GOOGLE_APPLICATION_CREDENTIALS) if GOOGLE_APPLICATION_CREDENTIALS else 'N/A'}")

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

def encode_image_to_base64(image_path):
    """
    Encode an image file to base64 for Vertex AI
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        tuple: (base64_encoded_string, mime_type)
    """
    with open(image_path, "rb") as image_file:
        # Read image file
        image_data = image_file.read()
        
        # Encode to base64
        base64_encoded = base64.b64encode(image_data).decode("utf-8")
        
        # Determine MIME type based on file extension
        file_extension = Path(image_path).suffix.lower()
        mime_type = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }.get(file_extension, "image/png")
        
        return base64_encoded, mime_type

def identify_image(image_path=None, image_url=None):
    """
    Upload an image to Google Vertex AI and get object identification response
    
    Args:
        image_path (str, optional): Path to local image file
        image_url (str, optional): URL to an image (alternative to image_path)
        
    Returns:
        dict: Vertex AI API response
    """
    if not PROJECT_ID:
        raise ValueError("PROJECT_ID not found in environment variables")
    
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not found in environment variables")
    
    # Check if either image_path or image_url is provided
    if image_path is None and image_url is None:
        raise ValueError("Either image_path or image_url must be provided")
    
    # Get access token
    access_token = get_access_token()
    
    # API endpoint
    url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/gemini-2.0-flash:generateContent"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Prepare content parts
    content_parts = [
        {
            "text": "list out all the items in the fridge with their estimate expiration date, assuming everything is purchased today. return a dict list"
        }
    ]
    
    # Add image data
    if image_path:
        base64_data, mime_type = encode_image_to_base64(image_path)
        content_parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": base64_data
            }
        })
    else:
        # For image URLs, we need to download and encode them
        response = requests.get(image_url)
        if response.status_code == 200:
            image_data = response.content
            base64_encoded = base64.b64encode(image_data).decode("utf-8")
            
            # Try to determine MIME type from URL or response headers
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            content_parts.append({
                "inlineData": {
                    "mimeType": content_type,
                    "data": base64_encoded
                }
            })
        else:
            raise ValueError(f"Failed to download image from URL: {image_url}")
    
    # Prepare request data according to Vertex AI format
    data = {
        "contents": [
            {
                "role": "USER",
                "parts": content_parts
            }
        ]
    }
    
    # Make API request
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code != 200:
        raise Exception(f"API request failed with status {response.status_code}: {response.text}")
    
    return response.json()

if __name__ == "__main__":
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Build the path to the image using os.path.join
    test_image_path = os.path.join(script_dir, "refrigerator-full-of-food.jpg")
    
    try:
        # Test with a local image
        result = identify_image(image_path=test_image_path)
        
        # Or test with an image URL
        # test_image_url = "https://example.com/path/to/image.jpg"
        # result = identify_image(image_url=test_image_url)
        
        # Print the response
        print("Full API Response:")
        print(json.dumps(result, indent=2))
        
        # Extract and print just the model's response text
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                for part in candidate['content']['parts']:
                    if 'text' in part:
                        print("\nModel Response:")
                        print(part['text'])
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure your GOOGLE_APPLICATION_CREDENTIALS and PROJECT_ID are set correctly in your .env file.") 