#!/bin/bash

# HerbalistHub Development Environment Setup Script
# This script sets up the complete development environment

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🌿 HerbalistHub Development Environment Setup 🌿          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check Python version
echo "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d " " -f 2 | cut -d "." -f 1,2)
    MIN_VERSION="3.8"
    if [ "$(printf '%s\n' "$MIN_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" = "$MIN_VERSION" ]; then
        print_success "Python $PYTHON_VERSION found"
    else
        print_error "Python 3.8 or higher is required (found $PYTHON_VERSION)"
        exit 1
    fi
else
    print_error "Python 3 is not installed"
    exit 1
fi

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
else
    print_error "Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check for API key
echo ""
echo "Checking for Claude API key..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    print_warning "ANTHROPIC_API_KEY not found in environment"
    echo ""
    echo "Please enter your Claude API key:"
    read -s API_KEY
    echo ""

    # Create .env file
    echo "ANTHROPIC_API_KEY=$API_KEY" > agent/.env
    print_success "API key saved to agent/.env"
else
    print_success "API key found in environment"
fi

# Create virtual environment
echo ""
echo "Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
print_success "pip upgraded"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
pip install -r agent/requirements.txt
print_success "Python dependencies installed"

# Install Node.js dependencies
echo ""
echo "Installing Node.js dependencies for HerbalistHub..."
if [ ! -f "package.json" ]; then
    # Initialize Next.js project
    echo "Initializing Next.js project..."
    npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-git
fi

# Install additional dependencies
npm install prisma @prisma/client next-auth @auth/prisma-adapter
npm install zustand react-query react-hook-form zod @hookform/resolvers
npm install @radix-ui/themes tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install lucide-react recharts pusher pusher-js
npm install --save-dev @types/node

print_success "Node.js dependencies installed"

# Setup Prisma
echo ""
echo "Setting up Prisma..."
if [ ! -f "prisma/schema.prisma" ]; then
    npx prisma init
    print_success "Prisma initialized"
else
    print_warning "Prisma already initialized"
fi

# Create necessary directories
echo ""
echo "Creating project structure..."
directories=(
    "app/api/auth/[...nextauth]"
    "app/api/herbs"
    "app/api/appointments"
    "app/api/formulas"
    "app/(dashboard)"
    "app/(public)"
    "components/ui"
    "components/forms"
    "components/layouts"
    "lib"
    "hooks"
    "types"
    "public/images"
    "docs"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done
print_success "Project structure created"

# Install Aider
echo ""
echo "Installing Aider..."
pip install aider-chat
print_success "Aider installed"

# Configure Git (if not already initialized)
if [ ! -d ".git" ]; then
    echo ""
    echo "Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - HerbalistHub project setup"
    print_success "Git repository initialized"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# Dependencies
node_modules/
venv/
.env
.env.local

# Build outputs
.next/
out/
dist/
build/

# Database
*.db
*.sqlite

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Python
__pycache__/
*.py[cod]
*$py.class
*.pkl

# Agent files
agent/agent_state.pkl
agent/progress.json
agent/orchestrator_status.json
agent/aider_history.json
agent/aider_context.json
EOF
    print_success ".gitignore created"
fi

# Create environment template
if [ ! -f ".env.example" ]; then
    cat > .env.example << EOF
# Database
DATABASE_URL="mysql://user:password@localhost:3306/herbalisthub"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Claude API
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET=""

# Pusher (Real-time)
PUSHER_APP_ID=""
NEXT_PUBLIC_PUSHER_KEY=""
PUSHER_SECRET=""
NEXT_PUBLIC_PUSHER_CLUSTER=""

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="noreply@herbalisthub.com"
EOF
    print_success ".env.example created"
fi

# Create start scripts
echo ""
echo "Creating start scripts..."

# Create start.sh
cat > start.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
python agent/orchestrator.py --mode hybrid
EOF
chmod +x start.sh

# Create dev.sh
cat > dev.sh << 'EOF'
#!/bin/bash
# Start Next.js development server
npm run dev &
DEV_PID=$!

# Start agent orchestrator
source venv/bin/activate
python agent/orchestrator.py --mode hybrid

# Cleanup on exit
trap "kill $DEV_PID" EXIT
EOF
chmod +x dev.sh

print_success "Start scripts created"

# Final summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure your database in .env file:"
echo "   DATABASE_URL='mysql://user:password@localhost:3306/herbalisthub'"
echo ""
echo "2. Start the development orchestrator:"
echo "   ./start.sh"
echo ""
echo "3. Or start with Next.js dev server:"
echo "   ./dev.sh"
echo ""
echo "Available commands during development:"
echo "  - stop: Save progress and exit"
echo "  - pause: Pause development"
echo "  - resume: Resume development"
echo "  - status: Show current status"
echo "  - help: Show available commands"
echo ""
echo "For more information, see agent/README.md"
echo ""
print_success "Happy coding! 🌿"