"""
AutoGen Configuration for HerbalistHub Development
Orchestrates multiple specialized agents for full-stack development
"""

import os
import json
import pickle
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import autogen
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from autogen.agentchat.contrib.retrieve_assistant_agent import RetrieveAssistantAgent
from autogen.code_utils import extract_code

# Configuration
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
PROJECT_ROOT = Path(__file__).parent.parent
AGENT_DIR = Path(__file__).parent
STATE_FILE = AGENT_DIR / "agent_state.pkl"
PROGRESS_LOG = AGENT_DIR / "progress.json"

# Claude Configuration for AutoGen
config_list_claude = [
    {
        "model": "claude-3-5-sonnet-20241022",
        "api_key": CLAUDE_API_KEY,
        "api_type": "anthropic",
        "api_base": "https://api.anthropic.com/v1",
        "temperature": 0.7,
        "max_tokens": 8192,
    }
]

# LLM Config
llm_config = {
    "config_list": config_list_claude,
    "cache_seed": 42,  # For reproducible outputs
    "temperature": 0.7,
    "functions": [
        {
            "name": "save_progress",
            "description": "Save current development progress",
            "parameters": {
                "type": "object",
                "properties": {
                    "phase": {"type": "string"},
                    "task": {"type": "string"},
                    "status": {"type": "string"},
                    "files_created": {"type": "array", "items": {"type": "string"}},
                    "next_steps": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["phase", "task", "status"]
            }
        },
        {
            "name": "execute_aider",
            "description": "Execute Aider for code generation",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string"},
                    "files": {"type": "array", "items": {"type": "string"}},
                    "mode": {"type": "string", "enum": ["create", "edit", "refactor"]}
                },
                "required": ["prompt", "mode"]
            }
        }
    ]
}

class ProjectOrchestrator:
    """Main orchestrator for the HerbalistHub development project"""

    def __init__(self):
        self.agents = {}
        self.state = self.load_state()
        self.progress = self.load_progress()
        self.initialize_agents()

    def load_state(self) -> Dict:
        """Load saved state from previous session"""
        if STATE_FILE.exists():
            with open(STATE_FILE, 'rb') as f:
                return pickle.load(f)
        return {
            "current_phase": "Phase 1: Foundation",
            "completed_tasks": [],
            "current_task": None,
            "files_created": [],
            "last_checkpoint": datetime.now().isoformat()
        }

    def save_state(self):
        """Save current state for resumability"""
        self.state["last_checkpoint"] = datetime.now().isoformat()
        with open(STATE_FILE, 'wb') as f:
            pickle.dump(self.state, f)

    def load_progress(self) -> List[Dict]:
        """Load progress log"""
        if PROGRESS_LOG.exists():
            with open(PROGRESS_LOG, 'r') as f:
                return json.load(f)
        return []

    def save_progress(self, entry: Dict):
        """Save progress entry"""
        self.progress.append({
            **entry,
            "timestamp": datetime.now().isoformat()
        })
        with open(PROGRESS_LOG, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def initialize_agents(self):
        """Initialize all specialized agents"""

        # Project Manager Agent
        self.agents["project_manager"] = AssistantAgent(
            name="ProjectManager",
            llm_config=llm_config,
            system_message="""You are the Project Manager for HerbalistHub development.

            Your responsibilities:
            1. Track project phases according to the specification
            2. Assign tasks to appropriate agents
            3. Monitor progress and dependencies
            4. Ensure quality and timeline adherence
            5. Coordinate between different specialist agents

            Current Development Phases:
            - Phase 1: Foundation (Weeks 1-4) - Auth, User management, Database, Dashboard
            - Phase 2: Core Inventory (Weeks 5-8) - Herb CRUD, Preparations, Alerts, Reports
            - Phase 3: Client Management (Weeks 9-12) - Intake forms, Scheduling, Calendar, Portal
            - Phase 4: Formula & Recipe (Weeks 13-16) - Formula builder, Scaling, Cost calc, Publishing
            - Phase 5: Public Platform (Weeks 17-20) - Blog, Events, Gallery, Discussions
            - Phase 6: Polish & Launch (Weeks 21-24) - Optimization, Security, Testing, Deployment

            Break down each phase into specific, actionable tasks for the development team."""
        )

        # System Architect Agent
        self.agents["architect"] = AssistantAgent(
            name="SystemArchitect",
            llm_config=llm_config,
            system_message="""You are the System Architect for HerbalistHub.

            Your expertise:
            1. Next.js 14+ architecture with TypeScript
            2. Database design with Prisma and MySQL
            3. API design and REST principles
            4. Authentication with NextAuth.js
            5. Real-time features with Pusher
            6. AWS infrastructure setup
            7. Security best practices

            Tech Stack:
            - Frontend: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
            - Backend: Next.js API Routes, Prisma ORM
            - Database: MySQL
            - Auth: NextAuth.js
            - Storage: AWS S3
            - Real-time: Pusher
            - Email: Resend

            Ensure all architectural decisions follow the specification and best practices."""
        )

        # Frontend Developer Agent
        self.agents["frontend_dev"] = AssistantAgent(
            name="FrontendDeveloper",
            llm_config=llm_config,
            system_message="""You are the Frontend Developer for HerbalistHub.

            Your expertise:
            1. Next.js 14+ with App Router
            2. TypeScript for type safety
            3. Tailwind CSS and shadcn/ui components
            4. State management with Zustand
            5. Data fetching with React Query
            6. Form handling with react-hook-form and Zod
            7. Rich text editing with Tiptap
            8. Data visualization with Recharts

            Design System:
            - Primary: #2D5016 (Forest Green)
            - Secondary: #8B7355 (Earth Brown)
            - Accent: #5D8A31 (Herb Green)
            - Mobile-first responsive design
            - Accessibility WCAG 2.1 AA compliance

            Create pixel-perfect, performant UI components following the specification."""
        )

        # Backend Developer Agent
        self.agents["backend_dev"] = AssistantAgent(
            name="BackendDeveloper",
            llm_config=llm_config,
            system_message="""You are the Backend Developer for HerbalistHub.

            Your expertise:
            1. Next.js API Routes development
            2. Prisma ORM with MySQL
            3. Authentication with NextAuth.js
            4. RESTful API design
            5. Data validation with Zod
            6. File uploads to S3
            7. Email integration with Resend
            8. Real-time features with Pusher

            Security focus:
            - JWT session management
            - RBAC implementation
            - Data encryption
            - Rate limiting
            - CORS configuration
            - SQL injection prevention

            Implement robust, secure, and scalable backend services."""
        )

        # Database Engineer Agent
        self.agents["database_engineer"] = AssistantAgent(
            name="DatabaseEngineer",
            llm_config=llm_config,
            system_message="""You are the Database Engineer for HerbalistHub.

            Your expertise:
            1. MySQL database design and optimization
            2. Prisma schema modeling
            3. Database migrations
            4. Indexing strategies
            5. Query optimization
            6. Data integrity and relationships
            7. Backup and recovery procedures

            Key Entities:
            - Users (authentication, roles)
            - Herbs (inventory tracking)
            - Preparations (tinctures, oils, etc.)
            - Formulas (recipes, versions)
            - Appointments (scheduling)
            - IntakeForms (dynamic forms)
            - BlogPosts (content)
            - Messages (secure communication)

            Design efficient, normalized schemas with proper relationships."""
        )

        # DevOps Engineer Agent
        self.agents["devops"] = AssistantAgent(
            name="DevOpsEngineer",
            llm_config=llm_config,
            system_message="""You are the DevOps Engineer for HerbalistHub.

            Your expertise:
            1. AWS infrastructure (EC2, S3, RDS, CloudFront)
            2. Docker containerization
            3. CI/CD with GitHub Actions
            4. Vercel deployment
            5. Environment configuration
            6. Monitoring with Sentry
            7. Performance optimization
            8. Security hardening

            Requirements:
            - 99.9% uptime
            - < 3 second page loads
            - Automated backups
            - Staging and production environments
            - Automated testing in CI/CD

            Set up robust infrastructure and deployment pipelines."""
        )

        # QA Engineer Agent
        self.agents["qa_engineer"] = AssistantAgent(
            name="QAEngineer",
            llm_config=llm_config,
            system_message="""You are the QA Engineer for HerbalistHub.

            Your expertise:
            1. Jest and React Testing Library
            2. E2E testing with Playwright
            3. API testing with Supertest
            4. Performance testing with Lighthouse
            5. Security testing
            6. Accessibility testing
            7. Cross-browser testing

            Testing Requirements:
            - 80% code coverage
            - Critical user journey tests
            - API endpoint validation
            - Performance benchmarks
            - Security vulnerability scanning
            - Mobile responsive testing

            Ensure quality through comprehensive testing strategies."""
        )

        # Integration Specialist Agent
        self.agents["integration_specialist"] = AssistantAgent(
            name="IntegrationSpecialist",
            llm_config=llm_config,
            system_message="""You are the Integration Specialist for HerbalistHub.

            Your expertise:
            1. Google Calendar API integration
            2. OAuth 2.0 implementation
            3. Email service (Resend) integration
            4. File storage (S3) integration
            5. Real-time messaging (Pusher)
            6. Payment processing (future)
            7. Third-party API integrations

            Key Integrations:
            - Google Calendar for appointment sync
            - OAuth providers (Google, Facebook)
            - Resend for transactional emails
            - S3 for file storage
            - Pusher for real-time features

            Implement reliable, secure third-party integrations."""
        )

        # UI/UX Specialist Agent
        self.agents["uiux_specialist"] = AssistantAgent(
            name="UIUXSpecialist",
            llm_config=llm_config,
            system_message="""You are the UI/UX Specialist for HerbalistHub.

            Your expertise:
            1. User research and personas
            2. Information architecture
            3. Wireframing and prototyping
            4. Responsive design patterns
            5. Accessibility standards
            6. User journey mapping
            7. Design systems

            Focus Areas:
            - Herbalist admin workflows
            - Client portal experience
            - Public content discovery
            - Mobile-first design
            - Formula builder interface
            - Inventory management UX

            Create intuitive, beautiful, and accessible user experiences."""
        )

        # Code Reviewer Agent
        self.agents["code_reviewer"] = AssistantAgent(
            name="CodeReviewer",
            llm_config=llm_config,
            system_message="""You are the Code Reviewer for HerbalistHub.

            Your responsibilities:
            1. Code quality and standards enforcement
            2. Security vulnerability detection
            3. Performance optimization suggestions
            4. Best practices validation
            5. Documentation completeness
            6. Test coverage verification

            Review Criteria:
            - TypeScript type safety
            - React best practices
            - API security
            - Database query optimization
            - Error handling
            - Code documentation
            - DRY principles
            - SOLID principles

            Provide constructive feedback to improve code quality."""
        )

        # User Proxy for Human Interaction
        self.agents["user_proxy"] = UserProxyAgent(
            name="UserProxy",
            human_input_mode="TERMINATE",
            max_consecutive_auto_reply=10,
            is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
            code_execution_config={
                "work_dir": str(PROJECT_ROOT),
                "use_docker": False,
            },
            llm_config=llm_config,
            system_message="You are the human developer overseeing the project. Review and approve major decisions."
        )

    def create_group_chat(self, agents: List[str], max_round: int = 50):
        """Create a group chat with specified agents"""
        selected_agents = [self.agents[name] for name in agents if name in self.agents]
        selected_agents.append(self.agents["user_proxy"])

        group_chat = GroupChat(
            agents=selected_agents,
            messages=[],
            max_round=max_round,
            speaker_selection_method="auto"
        )

        manager = GroupChatManager(
            groupchat=group_chat,
            llm_config=llm_config
        )

        return manager

    def execute_phase(self, phase: str, tasks: List[str]):
        """Execute a development phase with specific tasks"""
        print(f"\n{'='*60}")
        print(f"Executing {phase}")
        print(f"{'='*60}\n")

        self.state["current_phase"] = phase
        self.save_state()

        # Select agents based on phase
        if "Foundation" in phase:
            agents = ["project_manager", "architect", "backend_dev", "database_engineer", "devops"]
        elif "Inventory" in phase:
            agents = ["project_manager", "frontend_dev", "backend_dev", "database_engineer", "uiux_specialist"]
        elif "Client Management" in phase:
            agents = ["project_manager", "frontend_dev", "backend_dev", "integration_specialist", "uiux_specialist"]
        elif "Formula" in phase:
            agents = ["project_manager", "frontend_dev", "backend_dev", "uiux_specialist", "qa_engineer"]
        elif "Public Platform" in phase:
            agents = ["project_manager", "frontend_dev", "backend_dev", "uiux_specialist", "qa_engineer"]
        elif "Polish" in phase:
            agents = ["project_manager", "qa_engineer", "devops", "code_reviewer"]
        else:
            agents = ["project_manager", "architect", "frontend_dev", "backend_dev"]

        manager = self.create_group_chat(agents)

        for task in tasks:
            if task not in self.state["completed_tasks"]:
                print(f"\nStarting task: {task}")
                self.state["current_task"] = task
                self.save_state()

                # Initiate the task
                self.agents["user_proxy"].initiate_chat(
                    manager,
                    message=f"""Current Phase: {phase}
                    Task: {task}

                    Please complete this task according to the HerbalistHub specification.
                    Coordinate between agents to implement the required functionality.
                    Generate actual code files and ensure they follow best practices.
                    """
                )

                # Mark task as complete
                self.state["completed_tasks"].append(task)
                self.save_progress({
                    "phase": phase,
                    "task": task,
                    "status": "completed"
                })
                self.save_state()

    def resume(self):
        """Resume from last checkpoint"""
        print(f"\n{'='*60}")
        print(f"Resuming from: {self.state['current_phase']}")
        print(f"Last checkpoint: {self.state['last_checkpoint']}")
        print(f"Completed tasks: {len(self.state['completed_tasks'])}")
        print(f"{'='*60}\n")

        return self.state

    def run(self):
        """Run the complete development process"""
        phases = [
            {
                "name": "Phase 1: Foundation",
                "tasks": [
                    "Set up Next.js project with TypeScript",
                    "Configure Prisma with MySQL",
                    "Implement NextAuth.js authentication",
                    "Create user management system",
                    "Build admin dashboard skeleton"
                ]
            },
            {
                "name": "Phase 2: Core Inventory",
                "tasks": [
                    "Create herb management CRUD",
                    "Implement preparation tracking",
                    "Add expiration alerts system",
                    "Build inventory reporting",
                    "Add import/export functionality"
                ]
            },
            {
                "name": "Phase 3: Client Management",
                "tasks": [
                    "Build intake form builder",
                    "Implement appointment scheduling",
                    "Integrate Google Calendar",
                    "Create client portal",
                    "Add messaging system"
                ]
            },
            {
                "name": "Phase 4: Formula & Recipe",
                "tasks": [
                    "Create formula builder interface",
                    "Implement recipe scaling logic",
                    "Add cost calculations",
                    "Build version control system",
                    "Create publishing workflow"
                ]
            },
            {
                "name": "Phase 5: Public Platform",
                "tasks": [
                    "Implement blog system",
                    "Create event management",
                    "Build photo gallery",
                    "Add discussion forums",
                    "Implement newsletter system"
                ]
            },
            {
                "name": "Phase 6: Polish & Launch",
                "tasks": [
                    "Performance optimization",
                    "Security audit",
                    "User testing",
                    "Documentation",
                    "Deployment setup"
                ]
            }
        ]

        for phase_config in phases:
            if phase_config["name"] == self.state.get("current_phase") or \
               phase_config["name"] not in [p["name"] for p in phases[:phases.index(phase_config)]]:
                self.execute_phase(phase_config["name"], phase_config["tasks"])


if __name__ == "__main__":
    orchestrator = ProjectOrchestrator()

    # Check if resuming or starting fresh
    if STATE_FILE.exists():
        state = orchestrator.resume()
        print(f"Current task: {state.get('current_task', 'None')}")
    else:
        print("Starting fresh project...")

    # Run the orchestrator
    orchestrator.run()