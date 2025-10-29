#!/usr/bin/env python3
"""
Aider Integration for HerbalistHub Development
Provides intelligent code generation using Claude API
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import anthropic
from dataclasses import dataclass

# Configuration
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
PROJECT_ROOT = Path(__file__).parent.parent
AGENT_DIR = Path(__file__).parent
AIDER_HISTORY = AGENT_DIR / "aider_history.json"
AIDER_CONTEXT = AGENT_DIR / "aider_context.json"

@dataclass
class AiderConfig:
    """Aider configuration settings"""
    model: str = "claude-3-5-sonnet-20241022"
    edit_format: str = "diff"
    auto_commits: bool = True
    auto_test: bool = False
    voice_language: str = "en"
    dark_mode: bool = True
    show_diffs: bool = True

class AiderOrchestrator:
    """Orchestrates Aider for intelligent code generation"""

    def __init__(self, api_key: str = CLAUDE_API_KEY):
        self.api_key = api_key
        self.client = anthropic.Anthropic(api_key=api_key)
        self.config = AiderConfig()
        self.history = self.load_history()
        self.context = self.load_context()

    def load_history(self) -> List[Dict]:
        """Load Aider command history"""
        if AIDER_HISTORY.exists():
            with open(AIDER_HISTORY, 'r') as f:
                return json.load(f)
        return []

    def save_history(self, entry: Dict):
        """Save Aider command to history"""
        self.history.append({
            **entry,
            "timestamp": datetime.now().isoformat()
        })
        with open(AIDER_HISTORY, 'w') as f:
            json.dump(self.history, f, indent=2)

    def load_context(self) -> Dict:
        """Load project context for better code generation"""
        if AIDER_CONTEXT.exists():
            with open(AIDER_CONTEXT, 'r') as f:
                return json.load(f)
        return {
            "project": "HerbalistHub",
            "tech_stack": {
                "frontend": ["Next.js 14+", "TypeScript", "Tailwind CSS", "shadcn/ui"],
                "backend": ["Next.js API Routes", "Prisma", "MySQL"],
                "auth": "NextAuth.js",
                "storage": "AWS S3",
                "realtime": "Pusher"
            },
            "conventions": {
                "naming": "camelCase for functions, PascalCase for components",
                "imports": "Absolute imports from @/",
                "components": "Functional components with TypeScript",
                "api": "RESTful conventions",
                "database": "Prisma schema with proper relationships"
            }
        }

    def prepare_context_prompt(self, task: str) -> str:
        """Prepare context-aware prompt for Aider"""
        context = f"""Project: {self.context['project']}

Tech Stack:
- Frontend: {', '.join(self.context['tech_stack']['frontend'])}
- Backend: {', '.join(self.context['tech_stack']['backend'])}
- Authentication: {self.context['tech_stack']['auth']}
- File Storage: {self.context['tech_stack']['storage']}
- Real-time: {self.context['tech_stack']['realtime']}

Coding Conventions:
- {self.context['conventions']['naming']}
- {self.context['conventions']['imports']}
- {self.context['conventions']['components']}
- {self.context['conventions']['api']}
- {self.context['conventions']['database']}

Task: {task}

Please follow these conventions and create production-ready code."""
        return context

    def run_aider_command(
        self,
        prompt: str,
        files: List[str] = None,
        mode: str = "create",
        auto_commit: bool = True
    ) -> Tuple[bool, str]:
        """Execute Aider command with specified parameters"""

        # Build the Aider command
        cmd = [
            "aider",
            "--model", f"anthropic/{self.config.model}",
            "--edit-format", self.config.edit_format,
            "--yes",  # Auto-confirm file creation
        ]

        # Add API key
        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = self.api_key

        # Add files to edit/create
        if files:
            for file in files:
                file_path = PROJECT_ROOT / file
                cmd.append(str(file_path))

        # Add auto-commit flag
        if auto_commit and self.config.auto_commits:
            cmd.append("--auto-commits")

        # Add the prompt
        context_prompt = self.prepare_context_prompt(prompt)

        # Save command to history
        self.save_history({
            "command": " ".join(cmd),
            "prompt": prompt,
            "files": files,
            "mode": mode
        })

        try:
            # Run Aider with the prompt
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=str(PROJECT_ROOT),
                text=True
            )

            # Send the prompt to Aider
            stdout, stderr = process.communicate(input=context_prompt)

            if process.returncode == 0:
                return True, stdout
            else:
                return False, stderr

        except Exception as e:
            return False, str(e)

    def create_component(self, component_name: str, component_type: str = "page"):
        """Create a new React component"""
        prompt = f"""Create a new {component_type} component called {component_name}.

Requirements:
1. Use TypeScript with proper type definitions
2. Use Tailwind CSS for styling
3. Include shadcn/ui components where appropriate
4. Make it responsive and accessible
5. Follow React best practices
6. Add proper error handling
7. Include loading states where needed"""

        if component_type == "page":
            file_path = f"app/{component_name.lower()}/page.tsx"
        else:
            file_path = f"components/{component_name}.tsx"

        return self.run_aider_command(prompt, [file_path], mode="create")

    def create_api_endpoint(self, endpoint: str, method: str, description: str):
        """Create a new API endpoint"""
        prompt = f"""Create a {method} API endpoint at /api/{endpoint}.

Description: {description}

Requirements:
1. Use Next.js 14 App Router API conventions
2. Implement proper error handling
3. Add input validation with Zod
4. Include authentication checks with NextAuth
5. Use Prisma for database operations
6. Return proper HTTP status codes
7. Include TypeScript types
8. Add rate limiting if needed"""

        file_path = f"app/api/{endpoint}/route.ts"
        return self.run_aider_command(prompt, [file_path], mode="create")

    def create_database_schema(self, models: List[str]):
        """Create or update Prisma schema"""
        prompt = f"""Update the Prisma schema to include these models: {', '.join(models)}.

Requirements:
1. Follow Prisma best practices
2. Include proper relationships between models
3. Add appropriate indexes for performance
4. Include timestamps (createdAt, updatedAt)
5. Use proper field types and constraints
6. Add enum types where appropriate
7. Include cascade rules for relationships"""

        return self.run_aider_command(prompt, ["prisma/schema.prisma"], mode="edit")

    def implement_feature(self, feature_name: str, requirements: List[str]):
        """Implement a complete feature"""
        prompt = f"""Implement the {feature_name} feature.

Requirements:
{chr(10).join(f'{i+1}. {req}' for i, req in enumerate(requirements))}

Create all necessary files including:
- React components
- API endpoints
- Database schema updates
- Types and interfaces
- Tests if applicable"""

        return self.run_aider_command(prompt, mode="create")

    def refactor_code(self, files: List[str], improvements: List[str]):
        """Refactor existing code"""
        prompt = f"""Refactor the specified files with these improvements:
{chr(10).join(f'- {imp}' for imp in improvements)}

Ensure:
1. No breaking changes
2. Maintain backwards compatibility
3. Improve performance where possible
4. Add proper TypeScript types
5. Follow project conventions"""

        return self.run_aider_command(prompt, files, mode="edit")

    def fix_bug(self, description: str, files: List[str] = None):
        """Fix a bug in the codebase"""
        prompt = f"""Fix this bug: {description}

Steps:
1. Identify the root cause
2. Implement a fix
3. Add error handling to prevent recurrence
4. Add comments explaining the fix
5. Test the fix thoroughly"""

        return self.run_aider_command(prompt, files, mode="edit")

    def add_tests(self, files: List[str], test_type: str = "unit"):
        """Add tests for specified files"""
        prompt = f"""Add {test_type} tests for the specified files.

Requirements:
1. Use Jest and React Testing Library
2. Aim for high code coverage (>80%)
3. Test happy paths and edge cases
4. Include proper mocking where needed
5. Follow AAA pattern (Arrange, Act, Assert)
6. Add descriptive test names"""

        test_files = [f.replace('.tsx', '.test.tsx').replace('.ts', '.test.ts') for f in files]
        return self.run_aider_command(prompt, test_files, mode="create")

    def optimize_performance(self, area: str):
        """Optimize performance in specific area"""
        prompt = f"""Optimize performance in the {area} area.

Focus on:
1. Reducing bundle size
2. Implementing code splitting
3. Adding lazy loading
4. Optimizing database queries
5. Implementing caching strategies
6. Reducing API calls
7. Using React performance patterns (memo, useMemo, useCallback)"""

        return self.run_aider_command(prompt, mode="edit")

    def generate_documentation(self, component: str):
        """Generate documentation for a component or feature"""
        prompt = f"""Generate comprehensive documentation for {component}.

Include:
1. Overview and purpose
2. API documentation
3. Usage examples
4. Props/Parameters documentation
5. Common use cases
6. Troubleshooting guide
7. Performance considerations"""

        doc_file = f"docs/{component.lower()}.md"
        return self.run_aider_command(prompt, [doc_file], mode="create")


class AiderTaskRunner:
    """Runs specific development tasks using Aider"""

    def __init__(self, orchestrator: AiderOrchestrator):
        self.orchestrator = orchestrator

    def setup_project(self):
        """Initial project setup"""
        tasks = [
            ("Create Next.js project structure", [
                "package.json",
                "tsconfig.json",
                "next.config.js",
                "tailwind.config.js"
            ]),
            ("Set up Prisma", [
                "prisma/schema.prisma"
            ]),
            ("Configure NextAuth", [
                "app/api/auth/[...nextauth]/route.ts",
                "lib/auth.ts"
            ]),
            ("Create base layout", [
                "app/layout.tsx",
                "app/page.tsx"
            ])
        ]

        for description, files in tasks:
            print(f"\n📦 {description}")
            success, output = self.orchestrator.run_aider_command(
                f"Set up {description} for HerbalistHub project",
                files,
                mode="create"
            )
            if success:
                print(f"✅ {description} completed")
            else:
                print(f"❌ Error: {output}")

    def implement_auth_system(self):
        """Implement complete authentication system"""
        print("\n🔐 Implementing Authentication System")

        # Create auth components
        components = [
            ("LoginForm", "component"),
            ("RegisterForm", "component"),
            ("ForgotPasswordForm", "component"),
            ("UserProfile", "component")
        ]

        for name, type in components:
            self.orchestrator.create_component(name, type)

        # Create auth API endpoints
        endpoints = [
            ("auth/register", "POST", "User registration endpoint"),
            ("auth/login", "POST", "User login endpoint"),
            ("auth/logout", "POST", "User logout endpoint"),
            ("auth/verify-email", "POST", "Email verification endpoint"),
            ("auth/reset-password", "POST", "Password reset endpoint")
        ]

        for endpoint, method, desc in endpoints:
            self.orchestrator.create_api_endpoint(endpoint, method, desc)

    def implement_inventory_system(self):
        """Implement inventory management system"""
        print("\n📦 Implementing Inventory System")

        # Update database schema
        self.orchestrator.create_database_schema([
            "Herb", "Preparation", "Supplier", "StorageLocation"
        ])

        # Create inventory components
        components = [
            ("HerbList", "component"),
            ("HerbForm", "component"),
            ("PreparationTracker", "component"),
            ("ExpirationAlerts", "component"),
            ("InventoryDashboard", "page")
        ]

        for name, type in components:
            self.orchestrator.create_component(name, type)

        # Create inventory API endpoints
        endpoints = [
            ("herbs", "GET", "List all herbs"),
            ("herbs", "POST", "Create new herb entry"),
            ("herbs/[id]", "PUT", "Update herb details"),
            ("herbs/[id]", "DELETE", "Delete herb"),
            ("herbs/expiring", "GET", "Get expiring herbs"),
            ("preparations", "GET", "List preparations"),
            ("preparations", "POST", "Create preparation")
        ]

        for endpoint, method, desc in endpoints:
            self.orchestrator.create_api_endpoint(endpoint, method, desc)


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🌿 HerbalistHub Development with Aider & Claude")
    print("="*60 + "\n")

    # Check for API key
    if not CLAUDE_API_KEY:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        print("Please set: export ANTHROPIC_API_KEY='your-api-key'")
        sys.exit(1)

    # Initialize orchestrator
    orchestrator = AiderOrchestrator()
    runner = AiderTaskRunner(orchestrator)

    # Menu for different operations
    while True:
        print("\n📋 Select an operation:")
        print("1. Initial project setup")
        print("2. Implement authentication system")
        print("3. Implement inventory system")
        print("4. Create a new component")
        print("5. Create a new API endpoint")
        print("6. Implement a custom feature")
        print("7. Fix a bug")
        print("8. Add tests")
        print("9. Generate documentation")
        print("0. Exit")

        choice = input("\nEnter your choice: ")

        if choice == "1":
            runner.setup_project()
        elif choice == "2":
            runner.implement_auth_system()
        elif choice == "3":
            runner.implement_inventory_system()
        elif choice == "4":
            name = input("Component name: ")
            type = input("Component type (page/component): ")
            orchestrator.create_component(name, type)
        elif choice == "5":
            endpoint = input("Endpoint path: ")
            method = input("HTTP method: ")
            desc = input("Description: ")
            orchestrator.create_api_endpoint(endpoint, method, desc)
        elif choice == "6":
            feature = input("Feature name: ")
            reqs = []
            print("Enter requirements (empty line to finish):")
            while True:
                req = input("- ")
                if not req:
                    break
                reqs.append(req)
            orchestrator.implement_feature(feature, reqs)
        elif choice == "7":
            desc = input("Bug description: ")
            files = input("Affected files (comma-separated, or leave empty): ")
            files = [f.strip() for f in files.split(",")] if files else None
            orchestrator.fix_bug(desc, files)
        elif choice == "8":
            files = input("Files to test (comma-separated): ")
            files = [f.strip() for f in files.split(",")]
            test_type = input("Test type (unit/integration/e2e): ")
            orchestrator.add_tests(files, test_type)
        elif choice == "9":
            component = input("Component/feature to document: ")
            orchestrator.generate_documentation(component)
        elif choice == "0":
            print("\n👋 Goodbye!")
            break
        else:
            print("Invalid choice, please try again.")


if __name__ == "__main__":
    main()