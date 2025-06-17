# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/models/item.py
import datetime

class Item:
    def __init__(self, name, quantity, expiration_date=None, date_added=None, image_url=None, image_data=None, _id=None):
        self._id = _id # MongoDB ObjectId
        self.name = name
        self.quantity = quantity
        self.date_added = date_added if date_added else datetime.datetime.utcnow()
        self.expiration_date = expiration_date
        self.image_url = image_url
        self.image_data = image_data  # Base64 encoded image data

    def to_dict(self):
        data = {
            "name": self.name,
            "quantity": self.quantity,
            "date_added": self.date_added,
            "expiration_date": self.expiration_date,
            "image_url": self.image_url,
            "image_data": self.image_data
        }
        if self._id:
            data["_id"] = str(self._id) # Convert ObjectId to string for JSON serialization
        return data

    @staticmethod
    def from_dict(data):
        return Item(
            name=data.get("name"),
            quantity=data.get("quantity"),
            expiration_date=data.get("expiration_date"),
            date_added=data.get("date_added"),
            image_url=data.get("image_url"),
            image_data=data.get("image_data"),
            _id=data.get("_id")
        )

