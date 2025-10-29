# 🌿 HerbalistHub AI Development System

A sophisticated AI-powered development system using AutoGen agents and Aider with Claude API to build the HerbalistHub web application.

## 🎯 Overview

This system orchestrates multiple specialized AI agents to collaboratively develop a full-stack web application. It combines:

- **AutoGen**: Multi-agent collaboration framework for complex tasks
- **Aider**: AI pair programming for code generation
- **Claude API**: Anthropic's advanced language model
- **Specialized Skills**: Custom abilities for each development domain

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- MySQL 8.0+
- Claude API key from Anthropic

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd herbalisthub

# Run the setup script
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. Check system requirements
2. Create virtual environment
3. Install all dependencies
4. Initialize project structure
5. Configure Git repository
6. Create start scripts

### Configuration

1. **Set your Claude API key:**
   ```bash
   export ANTHROPIC_API_KEY='your-api-key-here'
   ```
   Or add to `agent/.env`:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

2. **Configure database** in `.env`:
   ```
   DATABASE_URL="mysql://user:password@localhost:3306/herbalisthub"
   ```

3. **Add other service credentials** as needed (see `.env.example`)

## 🎮 Usage

### Starting Development

```bash
# Start in hybrid mode (recommended)
./start.sh

# Or with specific mode
python agent/orchestrator.py --mode hybrid

# Resume from last checkpoint
python agent/orchestrator.py --resume

# Check current status
python agent/orchestrator.py --status
```

### Development Modes

1. **Hybrid Mode** (Recommended)
    - Combines AutoGen agents and Aider
    - Optimal task allocation
    - Best overall results

2. **AutoGen Mode**
    - Pure multi-agent collaboration
    - Good for planning and architecture
    - Comprehensive discussions

3. **Aider Mode**
    - Direct code generation
    - Fast implementation
    - Good for specific features

### Interactive Commands

During development, you can use these commands:

- `stop` - Save progress and exit
- `pause` - Pause execution
- `resume` - Resume execution
- `status` - Show current status
- `help` - Display available commands
- `skill <name> <args>` - Execute a specific skill
- `aider <command>` - Run Aider command

## 🤖 Agent Architecture

### Specialized Agents

1. **Project Manager**
    - Tracks development phases
    - Assigns tasks to agents
    - Monitors progress and dependencies

2. **System Architect**
    - Designs system architecture
    - Makes technology decisions
    - Ensures best practices

3. **Frontend Developer**
    - Creates React/Next.js components
    - Implements UI with Tailwind CSS
    - Handles state management

4. **Backend Developer**
    - Builds API endpoints
    - Implements business logic
    - Manages authentication

5. **Database Engineer**
    - Designs database schema
    - Optimizes queries
    - Manages migrations

6. **DevOps Engineer**
    - Sets up infrastructure
    - Configures CI/CD
    - Handles deployment

7. **QA Engineer**
    - Writes tests
    - Performs quality checks
    - Ensures coverage

8. **Integration Specialist**
    - Connects third-party services
    - Implements APIs
    - Manages OAuth

9. **UI/UX Specialist**
    - Designs user experiences
    - Creates design systems
    - Ensures accessibility

10. **Code Reviewer**
    - Reviews code quality
    - Checks security
    - Ensures standards

### Agent Skills

Each agent has specialized skills:

- **DatabaseSchema**: Create Prisma schemas
- **ComponentGenerator**: Generate React components
- **APIEndpoint**: Create API routes
- **TestGenerator**: Write tests
- **Integration**: Setup third-party services

## 📁 Project Structure

```
herbalisthub/
├── agent/                  # AI orchestration system
│   ├── orchestrator.py     # Main orchestrator
│   ├── autogen_config.py   # AutoGen agents setup
│   ├── aider_integration.py # Aider integration
│   ├── agent_skills.py     # Agent capabilities
│   └── requirements.txt    # Python dependencies
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (dashboard)/       # Admin pages
│   └── (public)/          # Public pages
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/               # Database schema
├── public/               # Static assets
└── docs/                 # Documentation
```

## 🔄 Development Phases

The system follows these phases from the specification:

### Phase 1: Foundation (Weeks 1-4)
- Project setup
- Authentication system
- User management
- Database schema
- Admin dashboard

### Phase 2: Core Inventory (Weeks 5-8)
- Herb management CRUD
- Preparation tracking
- Expiration alerts
- Reporting

### Phase 3: Client Management (Weeks 9-12)
- Intake forms
- Appointment scheduling
- Google Calendar integration
- Messaging

### Phase 4: Formula & Recipe (Weeks 13-16)
- Formula builder
- Recipe scaling
- Cost calculations
- Publishing

### Phase 5: Public Platform (Weeks 17-20)
- Blog system
- Event management
- Photo gallery
- Forums

### Phase 6: Polish & Launch (Weeks 21-24)
- Performance optimization
- Security audit
- Testing
- Deployment

## 💾 State Management

The system maintains state across sessions:

- **agent_state.pkl**: AutoGen agent state
- **progress.json**: Development progress log
- **orchestrator_status.json**: Overall system status
- **aider_history.json**: Aider command history

To reset all progress:
```bash
python agent/orchestrator.py --reset
```

## 🛠️ Manual Interventions

### Using Aider Directly

```bash
# Activate virtual environment
source venv/bin/activate

# Run Aider with Claude
aider --model anthropic/claude-3-5-sonnet-20241022

# Create a specific component
python agent/aider_integration.py
# Select option 4: Create a new component
```

### Executing Skills Manually

```python
# In Python
from agent.agent_skills import execute_skill

# Create database schema
execute_skill("database", [{
    "name": "User",
    "fields": [
        {"name": "id", "type": "String", "id": True},
        {"name": "email", "type": "String", "unique": True}
    ]
}])

# Generate component
execute_skill("component", "HerbList", "component")

# Create API endpoint
execute_skill("api", "/api/herbs", ["GET", "POST"])
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```bash
   export ANTHROPIC_API_KEY='your-key'
   ```

2. **Module Import Errors**
   ```bash
   pip install -r agent/requirements.txt
   ```

3. **Database Connection Failed**
    - Check MySQL is running
    - Verify credentials in .env
    - Run: `npx prisma db push`

4. **Port Already in Use**
   ```bash
   lsof -i :3000  # Find process
   kill -9 <PID>  # Kill process
   ```

### Logs and Debugging

- Check `agent/progress.json` for task history
- Review `agent/orchestrator_status.json` for current state
- Enable verbose logging:
  ```python
  # In orchestrator.py
  import logging
  logging.basicConfig(level=logging.DEBUG)
  ```

## 📚 Additional Resources

### Documentation
- [AutoGen Documentation](https://microsoft.github.io/autogen/)
- [Aider Documentation](https://aider.chat/)
- [Claude API Reference](https://docs.anthropic.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

### Customization

To add new agents or skills:

1. **New Agent**: Add to `autogen_config.py`
2. **New Skill**: Add to `agent_skills.py`
3. **New Phase**: Update `orchestrator.py`

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Use semantic commit messages

## 📜 License

[Your License Here]

## 🙏 Acknowledgments

- Anthropic for Claude API
- Microsoft for AutoGen framework
- Aider for AI pair programming
- The open-source community

---

**Note**: This system is designed to work autonomously but benefits from human oversight for critical decisions and quality assurance.

For support or questions, please open an issue or contact the development team.