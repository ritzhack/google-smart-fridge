#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting SmartFridge Backend Setup...${NC}"

# Check if Python 3.9+ is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.9 or higher.${NC}"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.9"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo -e "${GREEN}Python version $PYTHON_VERSION detected${NC}"
else
    echo -e "${RED}Python 3.9 or higher is required. Current version: $PYTHON_VERSION${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment${NC}"
        exit 1
    fi
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip

# Install requirements
echo -e "${YELLOW}Installing requirements...${NC}"
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install requirements${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOL
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/smartfridge
MYSQL_URI=mysql://root:password@localhost/smartfridge

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
EOL
    echo -e "${YELLOW}Please update the .env file with your actual configuration values${NC}"
fi

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}To activate the virtual environment, run:${NC}"
echo -e "source venv/bin/activate"
echo -e "${YELLOW}To start the server, run:${NC}"
echo -e "python src/main.py" 