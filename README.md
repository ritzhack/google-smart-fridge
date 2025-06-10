# SmartFridge

An AI-powered smart fridge application that helps track food inventory, expiration dates, and provides intelligent recipe suggestions using computer vision and natural language processing.

## 🚀 Features

- **Inventory Management**: Add, update, and track food items in your fridge
- **Image Recognition**: Upload photos of your fridge to automatically identify food items
- **Expiration Tracking**: Get alerts for items approaching their expiration dates
- **AI Recipe Suggestions**: Get personalized recipe recommendations based on available ingredients
- **Smart Search**: Find similar items using image vector similarity
- **Real-time Updates**: Live inventory updates with modern web interface

## 🏗️ Architecture

### Backend (Flask)
- **Framework**: Flask with MongoDB Atlas
- **AI Integration**: Perplexity Sonar API for image recognition and recipe generation
- **Image Processing**: Base64 encoding with vector similarity matching
- **Database**: MongoDB Atlas for persistent storage

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React hooks and context

## 🔑 API Usage Explanation

### Perplexity Sonar API Integration

This project extensively uses the **Perplexity Sonar API** for two main AI-powered features:

#### 1. Image Recognition for Food Items

**Location**: `backend/src/helper/identify_object_from_picutre.py`

The application uses Perplexity's vision capabilities to identify food items from uploaded images:

**Key Features**:
- Processes base64-encoded images
- Returns structured JSON with item names, counts, and expiration dates
- Uses Pydantic models for response validation
- Handles both local images and URLs

#### 2. Recipe Generation

**Location**: `backend/src/services/ai_service.py`

The AI service uses Perplexity to generate personalized recipes based on available ingredients:

**Advanced Features**:
- Contextual recipe suggestions based on available ingredients
- Dietary restriction support
- Nutritional information inclusion
- Structured JSON response parsing
- Fallback mechanisms for API failures

#### 3. Image Vector Similarity

**Location**: `backend/src/helper/process_image_vectors.py`

The application implements intelligent image matching:
- Stores image vectors for known food items
- Compares new images against stored vectors
- Falls back to Perplexity API for unknown items
- Reduces API calls through smart caching

### API Key Management

The application securely manages API credentials using environment variables:

```bash
# Required in .env file
GOOGLE_APPLICATION_CREDENTIALS='path to your json'
MONGODB_URI=your_mongodb_connection_string
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Python 3.9+** with pip
- **Node.js 18+** with npm/pnpm/yarn
- **MongoDB Atlas** account and cluster
- **Perplexity API** key ([Get one here](https://www.perplexity.ai/))

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd SmartFridge
```

### 2. Backend Setup (Flask)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys and database URL
```

**Required Environment Variables** (`.env`):
```env
PERPLEXITY_KEY=your_perplexity_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartfridge
FLASK_ENV=development
```

### 3. Frontend Setup (React)

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
pnpm install
# Or with npm: npm install
# Or with yarn: yarn install
```

### 4. Database Setup

1. Create a MongoDB Atlas cluster
2. Create a database named `smartfridge`
3. Add your connection string to the `.env` file
4. The application will automatically create required collections

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
# Ensure virtual environment is activated
python src/main.py
```

The Flask server will start on `http://localhost:5001`

### Start Frontend Server

```bash
cd frontend
pnpm run dev
# Or: npm run dev / yarn dev
```

The React application will start on `http://localhost:3000`

## 🧪 Testing the Application

### 1. Inventory Management
- **Add Items**: Use the form to manually add items with name and quantity
- **Upload Images**: Take photos of your fridge to automatically identify items
- **View Inventory**: Browse your current inventory with expiration dates

### 2. Image Recognition Testing
- Upload clear photos of food items
- The system will use Perplexity AI to identify items and estimate expiration dates
- Test with various food types: fruits, vegetables, dairy, packaged goods

### 3. Recipe Generation
- Add multiple ingredients to your inventory
- Click "Generate Recipe Suggestions"
- The AI will provide 3 personalized recipes with:
  - Ingredient lists
  - Step-by-step instructions
  - Cooking times
  - Nutritional information

### 4. Expiration Alerts
- Items approaching expiration (within 3 days) will be highlighted
- Use the "Check for Expiring Items" feature for quick overview

## 📁 Project Structure

```
SmartFridge/
├── backend/
│   ├── src/
│   │   ├── helper/
│   │   │   ├── identify_object_from_picutre.py  # Perplexity image recognition
│   │   │   ├── process_image_vectors.py         # Image similarity matching
│   │   │   └── process_inventory.py             # Inventory processing
│   │   ├── services/
│   │   │   └── ai_service.py                    # Perplexity recipe generation
│   │   ├── routes/
│   │   │   └── inventory_routes.py              # API endpoints
│   │   ├── models/
│   │   ├── test/                                # API testing scripts
│   │   └── main.py                              # Flask application entry
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/                          # React components
│   │   ├── hooks/                               # Custom hooks
│   │   └── lib/                                 # Utilities
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🔧 API Endpoints

### Inventory Management
- `POST /api/inventory/items` - Add new item
- `GET /api/inventory/items` - Get all items
- `PUT /api/inventory/items/<id>` - Update item
- `DELETE /api/inventory/items/<id>` - Delete item

### Image Processing
- `POST /api/inventory/upload-image` - Upload single image for recognition
- `POST /api/inventory/upload-image-pair` - Upload image pair for similarity matching

### AI Features
- `GET /api/inventory/expiring-items` - Get items expiring soon
- `POST /api/inventory/recipe-suggestions` - Generate recipe suggestions

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify your MongoDB URI in `.env`
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Check network connectivity

2. **Perplexity API Errors**
   - Verify your API key is correct
   - Check API rate limits
   - Ensure sufficient API credits

3. **Image Upload Issues**
   - Check image file size (max 10MB)
   - Ensure images are in supported formats (JPEG, PNG)
   - Verify base64 encoding is working

4. **Frontend Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Debug Mode

Enable debug logging by setting:
```env
FLASK_ENV=development
FLASK_DEBUG=True
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the Apache License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Perplexity AI** for providing the Sonar API for image recognition and recipe generation
- **MongoDB Atlas** for cloud database services
- **Radix UI** for accessible React components
- **Tailwind CSS** for utility-first styling

## 🙏 Disclaimer

Note for Demo Purpose: The manual image upload feature shown in this demo is for demonstration and testing purposes only. In the actual SmartFridge implementation, this process will be fully automated through integrated camera sensors that automatically capture images when hands approach or leave the fridge. Users will not need to manually take or upload photos - the system will seamlessly track all items being added or removed in real-time without any user intervention.
