import os
import requests
import json
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel
from typing import List
from google.cloud import aiplatform
from google.auth import default
import google.auth.transport.requests
from PIL import Image
import io
import base64
from datetime import datetime, timedelta


load_dotenv()  # This will automatically find .env in the project root or use environment variables
PROJECT_ID = os.getenv("PROJECT_ID")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def identify_object_from_image(image_url=None, image_path=None):
    """
    Use Google Vertex AI Gemini model to identify objects in an image
    
    Args:
        image_url (str, optional): URL to an image
        image_path (str, optional): Local path to an image file
        
    Returns:
        dict: Response with items and their expiration dates
    """
    if not PROJECT_ID:
        raise ValueError("PROJECT_ID not found in environment variables")
    
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not found in environment variables")
    
    if image_url is None and image_path is None:
        raise ValueError("Either image_url or image_path must be provided")
    
    # Set up authentication
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS
    
    try:
        # Get credentials and create authenticated session
        credentials, _ = default()
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        
        # Prepare the image data
        if image_path:
            # For local images, encode as base64
            with open(image_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
                
            # Determine MIME type
            file_extension = Path(image_path).suffix.lower()
            mime_type = {
                ".png": "image/png",
                ".jpg": "image/jpeg", 
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp"
            }.get(file_extension, "image/jpeg")
            
            # Create request payload with inline data
            image_part = {
                "inlineData": {
                    "mimeType": mime_type,
                    "data": image_data
                }
            }
        else:
            # For image URLs, we need to download and encode
            response = requests.get(image_url)
            if response.status_code == 200:
                image_data = base64.b64encode(response.content).decode('utf-8')
                # Try to determine MIME type from response headers
                content_type = response.headers.get('content-type', 'image/jpeg')
                
                image_part = {
                    "inlineData": {
                        "mimeType": content_type,
                        "data": image_data
                    }
                }
            else:
                raise ValueError(f"Failed to download image from URL: {image_url}")
        
        # Create the request payload
        payload = {
            "contents": [
                {
                    "role": "USER",
                    "parts": [
                        image_part,
                        {
                            "text": (
                                "Analyze this refrigerator image and identify all food items visible. "
                                "For each item, provide: name, estimated count, today's date as date_added, "
                                "and estimated expiration_date (assuming items were purchased today). "
                                "Use YYYY-MM-DD format for dates. "
                                "Return response as a JSON object with an 'items' array, where each item has: "
                                "name, count, date_added, expiration_date"
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json"
            }
        }
        
        # Make the API request to Vertex AI
        url = f"https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/publishers/google/models/gemini-2.0-flash:generateContent"
        
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        print("Sending request to Vertex AI Gemini...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            raise ValueError(f"Vertex AI API request failed: {response.status_code}")
        
        response_data = response.json()
        print(f"DEBUG: Vertex AI Response: {response_data}")
        
        # Extract the content from Vertex AI response
        if "candidates" in response_data and len(response_data["candidates"]) > 0:
            candidate = response_data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                content = candidate["content"]["parts"][0].get("text", "")
                
                try:
                    # Parse the JSON response
                    result = json.loads(content)
                    print(f"DEBUG: Parsed result: {result}")
                    return result
                except json.JSONDecodeError as e:
                    print(f"Error parsing JSON response: {e}")
                    print(f"Raw content: {content}")
                    # Return a fallback structure
                    return {"items": []}
        
        print("No valid response from Vertex AI")
        return {"items": []}
        
    except Exception as e:
        print(f"Error in Vertex AI request: {str(e)}")
        # Fallback to return empty items
        return {"items": []}

def identify_object_from_image_legacy(image_url=None):
    """
    Legacy function for backward compatibility - redirects to new implementation
    """
    return identify_object_from_image(image_url=image_url)