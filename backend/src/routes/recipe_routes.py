# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/routes/recipe_routes.py
from flask import Blueprint, request, jsonify
from src.db_connector import get_db_instance
from src.services.ai_service import AIService
from src.models.recipe import Recipe
from bson import ObjectId

recipe_bp = Blueprint("recipe_bp", __name__, url_prefix="/api/recipes")
db = get_db_instance()
ai_service = AIService()

@recipe_bp.route("/generate", methods=["POST"])
def generate_recipes():
    data = request.get_json()
    ingredients_list = data.get("ingredients")
    meal_type = data.get("meal_type") # e.g., "lunch", "dinner"
    user_id = data.get("user_id", "default_user") # For fetching preferences

    if not ingredients_list:
        return jsonify({"error": "Ingredients list is required"}), 400

    # Fetch user preferences (simplified for now)
    user_prefs_data = db.user_preferences.find_one({"user_id": user_id})
    user_preferences = None
    if user_prefs_data:
        user_preferences = {
            "dietary_restrictions": user_prefs_data.get("dietary_restrictions", []),
            "preferred_cuisines": user_prefs_data.get("preferred_cuisines", [])
        }

    try:
        recipes = ai_service.get_recipes_for_ingredients(ingredients_list, meal_type, user_preferences)
        # For now, we are not saving these generated recipes to DB unless user favorites them.
        return jsonify(recipes), 200
    except Exception as e:
        return jsonify({"error": f"Error generating recipes: {str(e)}"}), 500

# --- Routes for Saved/Favorite Recipes (CRUD) ---

@recipe_bp.route("/favorites", methods=["POST"])
def add_favorite_recipe():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("ingredients") or not data.get("instructions"):
        return jsonify({"error": "Missing recipe name, ingredients, or instructions"}), 400

    new_recipe = Recipe(
        name=data.get("name"),
        ingredients=data.get("ingredients", []),
        instructions=data.get("instructions"),
        source_url=data.get("source_url"),
        meal_type=data.get("meal_type")
    )
    try:
        recipe_dict = new_recipe.to_dict()
        del recipe_dict["_id"] # MongoDB will generate it
        result = db.recipes.insert_one(recipe_dict)
        created_recipe = db.recipes.find_one({"_id": result.inserted_id})
        return jsonify(Recipe.from_dict(created_recipe).to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recipe_bp.route("/favorites", methods=["GET"])
def get_favorite_recipes():
    try:
        recipes_cursor = db.recipes.find() # In a multi-user app, filter by user_id
        recipes_list = [Recipe.from_dict(r).to_dict() for r in recipes_cursor]
        return jsonify(recipes_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recipe_bp.route("/favorites/<recipe_id>", methods=["GET"])
def get_favorite_recipe_by_id(recipe_id):
    try:
        recipe_data = db.recipes.find_one({"_id": ObjectId(recipe_id)})
        if recipe_data:
            return jsonify(Recipe.from_dict(recipe_data).to_dict()), 200
        else:
            return jsonify({"error": "Favorite recipe not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recipe_bp.route("/favorites/<recipe_id>", methods=["DELETE"])
def delete_favorite_recipe(recipe_id):
    try:
        result = db.recipes.delete_one({"_id": ObjectId(recipe_id)})
        if result.deleted_count:
            return jsonify({"message": "Favorite recipe deleted successfully"}), 200
        else:
            return jsonify({"error": "Favorite recipe not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

