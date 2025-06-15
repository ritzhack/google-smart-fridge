# SmartFridge App - Project Completion Report

## Project Overview

This project is a full-stack AI-powered Smart Fridge Application. It enables users to track items in their fridge, monitor expiration dates, receive alerts for expiring items, and get recipe suggestions based on available ingredients using Google Cloud AI and computer vision.

## Features Implemented

1. **Inventory Management:**
    * Users can manually add items with their names and quantities to the fridge inventory via a web interface.
    * The system attempts to determine a general expiration date for added items using Google Cloud AI.
    * The current inventory, along with expiration dates, is displayed to the user.
    * Full CRUD operations for inventory items are supported through the backend API and frontend UI.
    * Users can upload images of their fridge to automatically identify items using Google Cloud Vision.

2. **Expiration Alerts:**
    * Users can check for items expiring soon via the web interface.
    * The system provides alerts for items expiring within 3 days.
    * These alerts are displayed on the frontend.

3. **Recipe Generation:**
    * Users can request recipe suggestions based on the current items in their fridge inventory.
    * The system uses Google Cloud AI to generate recipes.
    * Generated recipes, including name, ingredients, and instructions, are displayed on the web interface.

## Technology Stack

* **Backend:**
  * Framework: Python with Flask
  * Database: MongoDB Atlas
  * AI: Google Cloud Vertex AI (Gemini model) for image and recipe processing
  * Image Processing: Sentence Transformers for vector similarity
  * Setup: Automated with `setup.sh` and `.env` file
* **Frontend:**
  * Framework: React (Vite + TypeScript)
  * UI Library: Radix UI
  * Styling: Tailwind CSS
  * API Communication: Fetch/Axios
* **Development Environment:** Cross-platform (macOS, Linux, Windows)

## Key Project Files Structure

```
SmartFridge/
├── backend/
│   ├── setup.sh
│   ├── requirements.txt
│   ├── .env
│   └── src/
│       ├── helper/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── test/
│       └── main.py
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Environment Variables

The backend requires a `.env` file in the `backend/` directory with the following variables:

```env
PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
MONGODB_URI=your_mongodb_atlas_connection_string
FLASK_ENV=development
FLASK_DEBUG=True
```

## Setup & Running Instructions

**Backend (Flask):**

1. Navigate to `backend/`.
2. Run the setup script:

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   This will create a virtual environment, install dependencies, and create a `.env` file if needed.
3. Update `.env` with your actual credentials and connection strings.
4. Start the backend server:

   ```bash
   source venv/bin/activate
   python src/main.py
   ```

   The API will be available at `http://localhost:5001`.

**Frontend (React):**

1. Navigate to `frontend/`.
2. Install dependencies:

   ```bash
   pnpm install
   # Or: npm install / yarn install
   ```

3. Start the development server:

   ```bash
   pnpm run dev
   # Or: npm run dev / yarn dev
   ```

   The UI will be accessible at `http://localhost:3000`.

## Limitations and Future Enhancements

* **Automated Notifications:** Currently, expiration alerts are triggered manually. Future work could add scheduled notifications.
* **Image Processing:** Relies on Google Cloud Vision; further improvements could include local fallback or more advanced models.
* **User Interface:** The UI can be further enhanced for better UX, user accounts, and more features.
* **Deployment:** The app is set up for local development. Production deployment would require containerization and cloud hosting.

This project provides a robust foundation for a smart fridge application leveraging modern AI and cloud technologies.
