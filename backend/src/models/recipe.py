# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/models/recipe.py

class Recipe:
    def __init__(self, name, ingredients, instructions, source_url=None, meal_type=None, _id=None):
        self._id = _id
        self.name = name
        self.ingredients = ingredients # List of strings or dicts
        self.instructions = instructions
        self.source_url = source_url
        self.meal_type = meal_type

    def to_dict(self):
        data = {
            "name": self.name,
            "ingredients": self.ingredients,
            "instructions": self.instructions,
            "source_url": self.source_url,
            "meal_type": self.meal_type
        }
        if self._id:
            data["_id"] = str(self._id)
        return data

    @staticmethod
    def from_dict(data):
        return Recipe(
            name=data.get("name"),
            ingredients=data.get("ingredients", []),
            instructions=data.get("instructions"),
            source_url=data.get("source_url"),
            meal_type=data.get("meal_type"),
            _id=data.get("_id")
        )

# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/models/user_preference.py
class UserPreference:
    def __init__(self, dietary_restrictions=None, preferred_cuisines=None, learned_preferences=None, user_id="default_user", _id=None):
        self._id = _id
        self.user_id = user_id # For single user prototype, can be a fixed ID
        self.dietary_restrictions = dietary_restrictions if dietary_restrictions else []
        self.preferred_cuisines = preferred_cuisines if preferred_cuisines else []
        self.learned_preferences = learned_preferences if learned_preferences else {}

    def to_dict(self):
        data = {
            "user_id": self.user_id,
            "dietary_restrictions": self.dietary_restrictions,
            "preferred_cuisines": self.preferred_cuisines,
            "learned_preferences": self.learned_preferences
        }
        if self._id:
            data["_id"] = str(self._id)
        return data

    @staticmethod
    def from_dict(data):
        return UserPreference(
            dietary_restrictions=data.get("dietary_restrictions", []),
            preferred_cuisines=data.get("preferred_cuisines", []),
            learned_preferences=data.get("learned_preferences", {}),
            user_id=data.get("user_id", "default_user"),
            _id=data.get("_id")
        )

