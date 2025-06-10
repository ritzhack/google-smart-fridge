from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pymongo
import os
import json
from dotenv import load_dotenv
import traceback
import sys

load_dotenv("../../.venv/.env", override=True)

_db_instance = None

def get_db_instance():
    global _db_instance
    if _db_instance is None:
        try:
            uri = os.getenv("MONGODB_URI")
            if not uri:
                print("MONGODB_URI not found in environment variables. Please set it in your .env file.")
                return None
            
            client = MongoClient(uri, server_api=ServerApi('1'))
            _db_instance = client["fridge_db"]
            client.admin.command('ping')
            print("Successfully connected to MongoDB Atlas!")
            print(f"Using database: {_db_instance.name}")
            
            collections = _db_instance.list_collection_names()
            print(f"Collections in database: {collections}")
            
        except pymongo.errors.ConfigurationError as e:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
            print(f"MongoDB Atlas Configuration Error: {e}. Error details: {error_details}")
            print("Ensure your MONGODB_URI is correct and your IP is whitelisted in Atlas.")
            _db_instance = None
        except pymongo.errors.ConnectionFailure as e:
            print(f"MongoDB Atlas Connection Failure: {e}")
            _db_instance = None
        except Exception as e:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            error_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
            print(f"An unexpected error occurred during MongoDB connection: {e}")
            print(f"Error details: {error_details}")
            _db_instance = None
    return _db_instance

def close_db_connection():
    global _db_instance
    if _db_instance is not None:
        print("MongoDB connection resources would be released here if applicable.")
        _db_instance = None
