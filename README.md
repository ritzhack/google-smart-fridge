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
- **AI Integration**: Google Cloud AI Platform for image recognition and recipe generation
- **Image Processing**: Sentence Transformers for vector similarity matching
- **Database**: MongoDB Atlas for persistent storage

### Frontend (React)

- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React hooks and context

## 🔑 API Usage Explanation

### Google Cloud AI Platform Integration

This project uses the **Google Cloud AI Platform** for AI-powered features:

#### 1. Image Recognition for Food Items

The application uses Google Cloud's vision capabilities to identify food items from uploaded images:

**Key Features**:

- Processes images using Google Cloud Vision API
- Returns structured JSON with item names and counts
- Handles both local images and URLs

#### 2. Recipe Generation

The AI service uses Google Cloud AI Platform to generate personalized recipes based on available ingredients:

**Advanced Features**:

- Contextual recipe suggestions based on available ingredients
- Dietary restriction support
- Nutritional information inclusion
- Structured JSON response parsing
- Fallback mechanisms for API failures

#### 3. Image Vector Similarity

The application implements intelligent image matching using Sentence Transformers:

- Stores image vectors for known food items
- Compares new images against stored vectors
- Falls back to Google Cloud Vision API for unknown items
- Reduces API calls through smart caching

### API Key Management

The application securely manages API credentials using environment variables:

```env
# Required in .env file
PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
MONGODB_URI=your_mongodb_atlas_connection_string
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Python 3.9+** with pip
- **Node.js 18+** with npm/pnpm/yarn
- **MongoDB Atlas** cluster
- **Google Cloud Platform** project with Vertex AI enabled

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd SmartFridge
```

### 2. Backend Setup (Flask)

#### Option 1: Using Setup Script (Recommended)

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

The setup script will:

- Check Python version (requires 3.9+)
- Create and activate a virtual environment
- Install all required dependencies
- Create a default .env file (if not present)
- Provide instructions for next steps

#### Option 2: Manual Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Create .env file and add your API keys and database URLs
```

**Required Environment Variables** (`.env`):

```env
PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
MONGODB_URI=your_mongodb_atlas_connection_string
FLASK_ENV=development
FLASK_DEBUG=True
```

### 3. Frontend Setup (React)

```bash
cd frontend
pnpm install
# Or: npm install / yarn install
```

### 4. Database Setup

1. Create a MongoDB Atlas cluster and database named `smartfridge`
2. Add your connection string to the `.env` file
3. The application will automatically create required collections

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate
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

## 📁 Project Structure

```
SmartFridge/
├── backend/
│   ├── setup.sh                         # Backend setup script
│   ├── src/
│   │   ├── helper/
│   │   │   ├── identify_object_from_picutre.py  # Google Cloud Vision integration
│   │   │   ├── process_image_vectors.py         # Sentence Transformers integration
│   │   │   └── process_inventory.py             # Inventory processing
│   │   ├── services/
│   │   │   └── ai_service.py                    # Google Cloud AI Platform integration
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

1. **Database Connection Failed**
   - Verify your MongoDB Atlas URI in `.env`
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Check network connectivity

2. **Google Cloud API Errors**
   - Verify your credentials file and PROJECT_ID are correct
   - Check API quotas and limits
   - Ensure Vertex AI is enabled

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

- **Google Cloud Platform** for providing AI services
- **MongoDB Atlas** for cloud database services
- **Radix UI** for accessible React components
- **Tailwind CSS** for utility-first styling

## 🙏 Disclaimer

Note for Demo Purpose: The manual image upload feature shown in this demo is for demonstration and testing purposes only. In the actual SmartFridge implementation, this process will be fully automated through integrated camera sensors that automatically capture images when hands approach or leave the fridge. Users will not need to manually take or upload photos - the system will seamlessly track all items being added or removed in real-time without any user intervention.
