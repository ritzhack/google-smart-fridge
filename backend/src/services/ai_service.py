# backend/src/services/ai_service.py
import datetime
import re # For parsing durations
import os
import json
import requests
from dotenv import load_dotenv
from typing import List
from google.auth.transport.requests import Request
from google.oauth2 import service_account

# Load environment variables for API keys
load_dotenv("../../../.venv/.env")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
PROJECT_ID = os.getenv("PROJECT_ID")

class AIService:
    def __init__(self):
        # Initialize Google Cloud credentials and project
        self.project_id = PROJECT_ID
        self.credentials_path = GOOGLE_APPLICATION_CREDENTIALS
        
        if not self.project_id:
            print("Warning: PROJECT_ID not found in environment variables.")
        if not self.credentials_path:
            print("Warning: GOOGLE_APPLICATION_CREDENTIALS not found in environment variables.")
            
        # Set up authentication
        self.credentials = None
        if self.credentials_path and os.path.exists(self.credentials_path):
            try:
                self.credentials = service_account.Credentials.from_service_account_file(
                    self.credentials_path,
                    scopes=['https://www.googleapis.com/auth/cloud-platform']
                )
                print("Successfully loaded Google Cloud credentials.")
            except Exception as e:
                print(f"Error loading Google Cloud credentials: {str(e)}")
        else:
            print("Warning: Google Cloud credentials file not found. AI services may fail.")

    def _get_access_token(self):
        """Get a valid access token for Google Cloud API calls."""
        if not self.credentials:
            return None
            
        # Refresh the token if needed
        if not self.credentials.valid:
            self.credentials.refresh(Request())
            
        return self.credentials.token

    def _call_vertex_ai_api(self, prompt, model="gemini-2.0-flash", image_data=None, mime_type=None):
        """
        Make a call to the Vertex AI Gemini API with optional image support.
        
        Args:
            prompt (str): The text prompt to send to the model
            model (str): The model to use (default: gemini-2.0-flash)
            image_data (bytes, optional): Image data for multimodal requests
            mime_type (str, optional): MIME type of the image (e.g., 'image/jpeg')
            
        Returns:
            str: The model's response text, or None on error
        """
        if not self.project_id or not self.credentials:
            print("Error: Missing project ID or credentials for Vertex AI API.")
            return None
            
        access_token = self._get_access_token()
        if not access_token:
            print("Error: Could not get valid access token.")
            return None
            
        # Construct the API endpoint
        url = f"https://aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/global/publishers/google/models/{model}:generateContent"
        
        # Set up headers
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Construct the request body parts
        parts = []
        
        # Add image data if provided
        if image_data and mime_type:
            import base64
            encoded_image = base64.b64encode(image_data).decode('utf-8')
            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": encoded_image
                }
            })
        
        # Add text prompt
        parts.append({
            "text": prompt
        })
        
        # Construct the request body
        request_body = {
            "contents": {
                "role": "USER",
                "parts": parts
            },
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "topP": 0.9,
                "topK": 40
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=request_body)
            response.raise_for_status()
            
            response_data = response.json()
            
            # Extract the generated text from the response
            candidates = response_data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"]
                    
            print("Warning: Unexpected response format from Vertex AI API.")
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling Vertex AI API: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error in Vertex AI API call: {str(e)}")
            return None

    def get_general_expiration_info(self, item_name):
        """
        Uses Google Vertex AI Gemini API to get general expiration information for a given food item.

        Args:
            item_name (str): The name of the food item (e.g., "apple", "milk_carton").

        Returns:
            datetime.date or None: An estimated expiration date (today + estimated shelf life),
                                   or None if information cannot be found or parsed.
        """
        print(f"AI Service: Querying Vertex AI for general expiration of '{item_name}'...")

        # First try using the AI API if available
        if self.project_id and self.credentials:
            prompt = (
                f"What is the typical shelf life or expiration time for '{item_name}' when stored properly? "
                f"Please provide a specific answer in terms of days, weeks, or months. "
                f"For example: '5-7 days in the refrigerator' or '2-3 weeks at room temperature'. "
                f"If it varies significantly based on storage conditions, mention the most common storage method."
            )
            
            try:
                response_text = self._call_vertex_ai_api(prompt)
                if response_text:
                    print(f"AI Service: Vertex AI response for '{item_name}': '{response_text}'")
                    
                    # Parse the AI response to extract duration
                    days_to_add = self._parse_expiration_duration(response_text)
                    if days_to_add is not None:
                        estimated_expiration_date = datetime.date.today() + datetime.timedelta(days=days_to_add)
                        print(f"AI Service: Estimated expiration for '{item_name}' is {estimated_expiration_date}.")
                        return estimated_expiration_date
                else:
                    print(f"AI Service: No response from Vertex AI for '{item_name}'. Using fallback.")
            except Exception as e:
                print(f"AI Service: Error querying Vertex AI for '{item_name}': {str(e)}. Using fallback.")

        # Fallback to simulated responses if AI API is not available or fails
        print(f"AI Service: Using fallback data for '{item_name}'...")
        simulated_ai_responses = {
            "apple": "Apples typically last for 1-2 weeks in the refrigerator.",
            "milk_carton": "An opened milk carton is usually good for 5-7 days in the fridge after opening. Unopened, check the printed date.",
            "cheese_block": "A hard cheese block can last for 3-4 weeks in the fridge after opening.",
            "lettuce_head": "A head of lettuce can last for 1-2 weeks when stored properly in the fridge.",
            "orange_juice": "Opened orange juice typically lasts for 7-10 days in the refrigerator.",
            "eggs": "Eggs can last for 3-5 weeks in the refrigerator from the date of purchase.",
            "butter": "Butter can last for 1-3 months in the refrigerator.",
            "yogurt": "Yogurt usually lasts for 1-2 weeks past its sell-by date if kept refrigerated.",
            "generic_item_from_image": "The shelf life of generic items varies greatly. Please check packaging.",
            "banana": "Bananas last about 2-7 days on the counter, or a bit longer in the fridge (skin will brown)."
        }

        response_text = simulated_ai_responses.get(item_name.lower(), "Sorry, I don't have general expiration information for that item.")
        print(f"AI Service: Fallback response for '{item_name}': '{response_text}'")

        # Parse the response to extract a duration
        days_to_add = self._parse_expiration_duration(response_text)
        
        if days_to_add is not None:
            estimated_expiration_date = datetime.date.today() + datetime.timedelta(days=days_to_add)
            print(f"AI Service: Estimated expiration for '{item_name}' is {estimated_expiration_date}.")
            return estimated_expiration_date
        else:
            print(f"AI Service: Could not parse a specific duration for '{item_name}'.")
            return None

    def _parse_expiration_duration(self, response_text):
        """
        Parse AI response text to extract duration in days.
        
        Args:
            response_text (str): The AI response containing expiration information
            
        Returns:
            int or None: Number of days until expiration, or None if cannot parse
        """
        if not response_text:
            return None
            
        # This is a simplified parsing logic. Real-world parsing would be more complex.
        days_to_add = None
        response_lower = response_text.lower()
        
        if "days" in response_lower:
            match = re.search(r'(\d+)-?(\d+)?\s*days', response_lower, re.IGNORECASE)
            if match:
                if match.group(2): # Range like 5-7 days
                    days_to_add = int((int(match.group(1)) + int(match.group(2))) / 2) # Average
                else: # Single number like 7 days
                    days_to_add = int(match.group(1))
        elif "week" in response_lower:
            match = re.search(r'(\d+)-?(\d+)?\s*week', response_lower, re.IGNORECASE)
            if match:
                if match.group(2): # Range like 1-2 weeks
                    days_to_add = int((int(match.group(1)) + int(match.group(2))) / 2 * 7) # Average in days
                else: # Single number like 1 week
                    days_to_add = int(match.group(1)) * 7
        elif "months" in response_lower or "month" in response_lower:
            match = re.search(r'(\d+)-?(\d+)?\s*month', response_lower, re.IGNORECASE)
            if match:
                if match.group(2):
                    days_to_add = int((int(match.group(1)) + int(match.group(2))) / 2 * 30) # Average in days
                else:
                    days_to_add = int(match.group(1)) * 30
        elif "check the printed date" in response_lower or "varies greatly" in response_lower:
            # For items where AI suggests checking printed date, or cannot give a generic estimate,
            # we might prompt the user for manual input or use a short default.
            # For now, returning None, indicating manual input might be needed.
            print(f"AI Service: Could not determine a generic expiration. Manual input might be needed.")
            return None
            
        return days_to_add

    def get_recipes_for_ingredients(self, ingredients_list, meal_type=None, user_preferences=None):
        """
        Uses Google Vertex AI Gemini API to get recipe suggestions based on available ingredients.

        Args:
            ingredients_list (list): A list of item names (strings) available in the fridge.
            meal_type (str, optional): e.g., "lunch", "dinner".
            user_preferences (dict, optional): User's dietary restrictions, preferred cuisines.

        Returns:
            list: A list of recipe suggestions (dicts with recipe name, ingredients, instructions).
                  Returns an empty list if no recipes are found or on error.
        """
        if not ingredients_list:
            return []

        if not self.project_id or not self.credentials:
            print("Error: Google Cloud credentials not found.")
            return self._get_fallback_recipes(ingredients_list)

        # Join ingredients into comma-separated string
        ingredient_list = ", ".join(ingredients_list)
        
        # Build prompt with ingredients, meal type, and user preferences
        prompt = f"I have the following ingredients in my fridge: {ingredient_list}."
        
        if meal_type:
            prompt += f" I want to make a {meal_type}."
            
        if user_preferences:
            if user_preferences.get("dietary_restrictions"):
                prompt += f" I have these dietary restrictions: {', '.join(user_preferences['dietary_restrictions'])}."
            if user_preferences.get("preferred_cuisines"):
                prompt += f" I prefer {', '.join(user_preferences['preferred_cuisines'])} cuisine."
        
        # Complete the prompt with format instructions
        prompt += (
            " Please suggest 3 recipes I can make using these ingredients (it's okay to use just a subset of them). "
            "For each recipe, provide: 1) Recipe name, 2) Ingredients needed from my list, 3) Detailed cooking instructions, "
            "4) Approximate cooking time, 5) A source URL for the recipe or similar recipes, 6) Nutritional information per serving "
            "(calories, protein, carbs, and fat), and 7) A brief health assessment. Format the response as a JSON array where each object has the exact keys: "
            "\"name\", \"ingredients\" (as array of strings), \"instructions\", \"cooking_time\" (in minutes), \"source_url\", "
            "\"nutrition\" (object with calories, protein, carbs, fat), and \"health_assessment\"."
        )
        
        try:
            # Make API request to Vertex AI
            print(f"Making request to Vertex AI Gemini API for recipes with {len(ingredients_list)} ingredients")
            content = self._call_vertex_ai_api(prompt)
            
            if not content:
                print("Error: No response from Vertex AI API.")
                return self._get_fallback_recipes(ingredients_list)
            
            # Try to parse the content as JSON
            try:
                # First try to parse the entire content as JSON
                recipes = json.loads(content)
                # If already an array, return it directly
                if isinstance(recipes, list):
                    print(f"Successfully retrieved {len(recipes)} recipes")
                    return recipes
                # If not an array, but has a recipes key, return that
                elif isinstance(recipes, dict) and "recipes" in recipes:
                    print(f"Successfully retrieved {len(recipes['recipes'])} recipes")
                    return recipes["recipes"]
            except json.JSONDecodeError:
                # If that fails, try to find JSON array in the content
                json_match = re.search(r'\[\s*{.*}\s*\]', content, re.DOTALL)
                if json_match:
                    recipes = json.loads(json_match.group(0))
                    print(f"Successfully extracted {len(recipes)} recipes from partial JSON")
                    return recipes
                
                # If no JSON array found, try to extract structured data from text
                print("Warning: Couldn't parse JSON from Vertex AI response. Attempting to extract structured data.")
                fallback_recipes = self._extract_recipes_from_text(content, ingredients_list)
                if fallback_recipes:
                    return fallback_recipes
            
            # If all parsing fails, use fallback
            print("Error: Failed to parse recipe data from Vertex AI response.")
            return self._get_fallback_recipes(ingredients_list)
            
        except Exception as e:
            print(f"Error calling Vertex AI API: {str(e)}")
            return self._get_fallback_recipes(ingredients_list)

    def _extract_recipes_from_text(self, text, ingredients_list):
        """
        Attempt to extract recipe information from unstructured text.
        
        Args:
            text (str): The text to parse
            ingredients_list (list): Original ingredients list for fallback
            
        Returns:
            list: Extracted recipes
        """
        recipes = []
        
        # Simple pattern matching to find recipe sections
        recipe_blocks = re.split(r'\d+\.\s+', text)[1:] # Split on numbered list indicators
        
        for block in recipe_blocks:
            try:
                # Try to extract name
                name_match = re.search(r'^([^:]+?)(?::|$)', block)
                name = name_match.group(1).strip() if name_match else "Recipe"
                
                # Try to extract ingredients
                ingredients_match = re.search(r'(?:ingredients|needed)[:\s]+(.*?)(?:instructions|directions|steps|$)', 
                                            block, re.IGNORECASE | re.DOTALL)
                if ingredients_match:
                    ingredients_text = ingredients_match.group(1).strip()
                    # Split by commas, dashes, or new lines
                    ingredients = [i.strip() for i in re.split(r'[,\n-]', ingredients_text) if i.strip()]
                else:
                    ingredients = ingredients_list[:3]  # Use first few from original list
                
                # Try to extract instructions
                instructions_match = re.search(r'(?:instructions|directions|steps)[:\s]+(.*?)(?:cooking time|preparation time|source|$)', 
                                             block, re.IGNORECASE | re.DOTALL)
                instructions = instructions_match.group(1).strip() if instructions_match else "No instructions provided."
                
                # Try to extract cooking time
                cooking_time_match = re.search(r'(?:cooking time|preparation time)[:\s]+(\d+)(?:\s*minutes|\s*mins)?', 
                                             block, re.IGNORECASE)
                cooking_time = int(cooking_time_match.group(1)) if cooking_time_match else 20  # Default 20 minutes
                
                # Try to extract source URL
                url_match = re.search(r'(?:source|url|link|website)[:\s]+(https?://\S+)', block, re.IGNORECASE)
                source_url = url_match.group(1) if url_match else f"https://www.google.com/search?q=recipe+{'+'.join(name.split())}"
                
                recipes.append({
                    "name": name,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "cooking_time": cooking_time,
                    "source_url": source_url
                })
            except Exception as e:
                print(f"Error parsing recipe block: {str(e)}")
                continue
                
        return recipes if recipes else None

    def _get_fallback_recipes(self, ingredients_list):
        """Provide fallback recipes when API calls fail"""
        print("Using fallback recipe generation")
        fallback_recipes = []
        
        # Create a generic recipe based on the ingredients
        if ingredients_list:
            main_ingredient = ingredients_list[0].capitalize()
            search_query = '+'.join(ingredients_list[:3])
            fallback_recipes.append({
                "name": f"Simple {main_ingredient} Recipe",
                "ingredients": ingredients_list[:5],  # Use up to 5 ingredients
                "instructions": f"Combine {', '.join(ingredients_list[:3])} in a suitable way based on your cooking experience.",
                "source_url": f"https://www.google.com/search?q=recipe+with+{search_query}",
                "cooking_time": 20  # Default cooking time
            })
            
        return fallback_recipes

    def analyze_food_image(self, image_data, mime_type="image/jpeg"):
        """
        Analyze an image to identify food items and estimate their expiration.
        
        Args:
            image_data (bytes): The image data
            mime_type (str): MIME type of the image (default: image/jpeg)
            
        Returns:
            dict: Analysis results with identified items and expiration estimates
        """
        if not self.project_id or not self.credentials:
            print("Error: Google Cloud credentials not found for image analysis.")
            return {"items": [], "error": "Credentials not available"}
            
        prompt = (
            "Analyze this image and identify all food items visible. For each food item, provide:\n"
            "1. The name of the food item\n"
            "2. An estimate of its current freshness/condition (fresh, slightly aged, needs attention)\n"
            "3. Typical shelf life when stored properly\n"
            "4. Storage recommendations\n\n"
            "Format your response as a JSON array where each object has the keys: "
            "\"name\", \"condition\", \"typical_shelf_life\", \"storage_recommendations\"."
        )
        
        try:
            print("Analyzing food image with Vertex AI...")
            response_text = self._call_vertex_ai_api(prompt, image_data=image_data, mime_type=mime_type)
            
            if not response_text:
                return {"items": [], "error": "No response from AI"}
                
            # Try to parse the response as JSON
            try:
                items = json.loads(response_text)
                if isinstance(items, list):
                    return {"items": items, "error": None}
                elif isinstance(items, dict) and "items" in items:
                    return {"items": items["items"], "error": None}
                else:
                    # If not structured JSON, try to extract information from text
                    return self._extract_food_items_from_text(response_text)
            except json.JSONDecodeError:
                # Fallback to text parsing
                return self._extract_food_items_from_text(response_text)
                
        except Exception as e:
            print(f"Error analyzing food image: {str(e)}")
            return {"items": [], "error": str(e)}

    def _extract_food_items_from_text(self, text):
        """
        Extract food item information from unstructured text response.
        
        Args:
            text (str): The AI response text
            
        Returns:
            dict: Extracted food items with error info
        """
        items = []
        # Simple pattern to extract food items from text
        # This is a basic implementation - could be enhanced
        lines = text.split('\n')
        
        current_item = {}
        for line in lines:
            line = line.strip()
            if not line:
                if current_item:
                    items.append(current_item)
                    current_item = {}
                continue
                
            # Look for patterns like "1. Apple" or "- Banana"
            if re.match(r'^\d+\.|\-|\*', line):
                if current_item:
                    items.append(current_item)
                # Extract item name
                name_match = re.search(r'(?:\d+\.|\-|\*)\s*([^:]+)', line)
                if name_match:
                    current_item = {
                        "name": name_match.group(1).strip(),
                        "condition": "unknown",
                        "typical_shelf_life": "varies",
                        "storage_recommendations": "store properly"
                    }
        
        # Add the last item if exists
        if current_item:
            items.append(current_item)
            
        return {"items": items, "error": None if items else "Could not parse food items"}

# Example Usage (for testing this module directly):
if __name__ == "__main__":
    ai = AIService()
    
    # Check if credentials are properly loaded
    if ai.credentials:
        print("✅ Google Cloud credentials loaded successfully")
        print(f"📁 Project ID: {ai.project_id}")
    else:
        print("❌ Google Cloud credentials not found - some features may not work")
        print("   Make sure GOOGLE_APPLICATION_CREDENTIALS and PROJECT_ID are set in your .env file")
    
    print("\n" + "="*50)
    print("TESTING EXPIRATION INFO")
    print("="*50)

    # Test expiration info with real AI queries
    items_to_check = ["apple", "milk_carton", "banana", "unknown_item"]
    for item in items_to_check:
        print(f"\n🔍 Testing expiration info for: {item}")
        exp_date = ai.get_general_expiration_info(item)
        if exp_date:
            print(f"✅ Estimated expiration for {item}: {exp_date.strftime('%Y-%m-%d')}")
        else:
            print(f"❌ Could not get expiration for {item}.")
        print("-" * 30)

    print("\n" + "="*50)
    print("TESTING RECIPE GENERATION")
    print("="*50)

    # Test recipe generation with Vertex AI
    fridge_inventory = ["eggs", "cheese_block", "lettuce_head"]
    print(f"\n🍳 Testing recipe generation with ingredients: {', '.join(fridge_inventory)}")
    
    import time
    start_time = time.time()
    recipes = ai.get_recipes_for_ingredients(
        fridge_inventory, 
        meal_type="lunch",
        user_preferences={
            "dietary_restrictions": ["no nuts"],
            "preferred_cuisines": ["Mediterranean"]
        }
    )
    end_time = time.time()
    
    print(f"⏱️  Time taken: {end_time - start_time:.2f} seconds")
    
    if recipes:
        print(f"\n✅ Found {len(recipes)} recipes for {', '.join(fridge_inventory)}:")
        for i, recipe in enumerate(recipes, 1):
            print(f"\n📄 Recipe {i}: {recipe.get('name', 'Unnamed Recipe')}")
            print(f"   🥘 Ingredients: {', '.join(recipe.get('ingredients', []))}")
            print(f"   ⏲️  Cooking time: {recipe.get('cooking_time', 'N/A')} minutes")
            if recipe.get('instructions'):
                instructions = recipe['instructions'][:100] + "..." if len(recipe.get('instructions', '')) > 100 else recipe.get('instructions', '')
                print(f"   📝 Instructions: {instructions}")
            if recipe.get('source_url'):
                print(f"   🔗 Source: {recipe['source_url']}")
    else:
        print(f"❌ No recipes found for {', '.join(fridge_inventory)}.")
    
    print("\n" + "="*50)
    print("TESTING IMAGE ANALYSIS (Optional)")
    print("="*50)
    
    # Example of how to use image analysis (if you have an image file)
    print("\n🖼️  Image analysis example:")
    print("   To test image analysis, you would use:")
    print("   with open('path/to/food_image.jpg', 'rb') as f:")
    print("       image_data = f.read()")
    print("       result = ai.analyze_food_image(image_data, 'image/jpeg')")
    print("       print(result)")
    
    print("\n🎉 Testing completed!")

