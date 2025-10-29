#!/usr/bin/env python3
"""
Main Orchestration Script for HerbalistHub Development
Manages AutoGen agents, Aider integration, and development workflow
"""

import os
import sys
import json
import time
import signal
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import threading
import queue

# Add agent directory to path
sys.path.append(str(Path(__file__).parent))

from autogen_config import ProjectOrchestrator
from aider_integration import AiderOrchestrator, AiderTaskRunner
from agent_skills import execute_skill, list_skills

class DevelopmentOrchestrator:
    """Main orchestrator for the entire development process"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.running = False
        self.paused = False
        self.command_queue = queue.Queue()
        self.project_root = Path(__file__).parent.parent
        self.agent_dir = Path(__file__).parent
        self.status_file = self.agent_dir / "orchestrator_status.json"

        # Initialize sub-orchestrators
        self.autogen = ProjectOrchestrator()
        self.aider = AiderOrchestrator(self.api_key)
        self.aider_runner = AiderTaskRunner(self.aider)

        # Load status
        self.status = self.load_status()

    def load_status(self) -> Dict:
        """Load orchestrator status"""
        if self.status_file.exists():
            with open(self.status_file, 'r') as f:
                return json.load(f)
        return {
            "current_phase": "Phase 1: Foundation",
            "current_task": None,
            "mode": "autogen",  # autogen, aider, or hybrid
            "started_at": None,
            "last_activity": None,
            "total_tasks_completed": 0
        }

    def save_status(self):
        """Save orchestrator status"""
        self.status["last_activity"] = datetime.now().isoformat()
        with open(self.status_file, 'w') as f:
            json.dump(self.status, f, indent=2)

    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            print("\n\n🛑 Received interrupt signal. Saving state...")
            self.stop()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    def start(self, mode: str = "hybrid"):
        """Start the development process"""
        self.running = True
        self.status["mode"] = mode
        self.status["started_at"] = datetime.now().isoformat()
        self.save_status()

        print("\n" + "="*60)
        print("🚀 Starting HerbalistHub Development Orchestrator")
        print(f"Mode: {mode}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60 + "\n")

        # Setup signal handlers
        self.setup_signal_handlers()

        # Start command listener in a separate thread
        command_thread = threading.Thread(target=self.command_listener, daemon=True)
        command_thread.start()

        # Display available commands
        self.show_commands()

        # Main execution loop
        if mode == "autogen":
            self.run_autogen_mode()
        elif mode == "aider":
            self.run_aider_mode()
        elif mode == "hybrid":
            self.run_hybrid_mode()
        else:
            print(f"Unknown mode: {mode}")

    def stop(self):
        """Stop the development process"""
        self.running = False
        print("\n📊 Saving progress...")
        self.autogen.save_state()
        self.save_status()
        print("✅ Progress saved successfully")
        print(f"Total tasks completed: {self.status['total_tasks_completed']}")

    def pause(self):
        """Pause the development process"""
        self.paused = True
        print("\n⏸️ Development paused. Type 'resume' to continue.")

    def resume(self):
        """Resume the development process"""
        self.paused = False
        print("\n▶️ Development resumed.")

    def command_listener(self):
        """Listen for user commands in a separate thread"""
        while self.running:
            try:
                command = input().strip().lower()
                self.command_queue.put(command)
            except EOFError:
                break

    def process_commands(self):
        """Process queued commands"""
        while not self.command_queue.empty():
            command = self.command_queue.get()

            if command == "stop":
                self.stop()
            elif command == "pause":
                self.pause()
            elif command == "resume":
                self.resume()
            elif command == "status":
                self.show_status()
            elif command == "help":
                self.show_commands()
            elif command.startswith("skill "):
                skill_cmd = command.replace("skill ", "")
                self.execute_skill_command(skill_cmd)
            elif command.startswith("aider "):
                aider_cmd = command.replace("aider ", "")
                self.execute_aider_command(aider_cmd)

    def show_commands(self):
        """Display available commands"""
        print("\n📋 Available Commands:")
        print("  stop     - Stop and save progress")
        print("  pause    - Pause execution")
        print("  resume   - Resume execution")
        print("  status   - Show current status")
        print("  help     - Show this help")
        print("  skill <name> <args> - Execute a skill")
        print("  aider <command> - Run Aider command")
        print("\n")

    def show_status(self):
        """Display current status"""
        state = self.autogen.state
        print("\n📊 Current Status:")
        print(f"  Mode: {self.status['mode']}")
        print(f"  Phase: {state['current_phase']}")
        print(f"  Current Task: {state.get('current_task', 'None')}")
        print(f"  Completed Tasks: {len(state['completed_tasks'])}")
        print(f"  Total Tasks Completed: {self.status['total_tasks_completed']}")
        print(f"  Files Created: {len(state['files_created'])}")
        print(f"  Last Activity: {self.status.get('last_activity', 'Never')}")
        print("\n")

    def execute_skill_command(self, command: str):
        """Execute a skill command"""
        parts = command.split()
        if not parts:
            print("Available skills:", ", ".join(list_skills()))
            return

        skill_name = parts[0]
        args = parts[1:] if len(parts) > 1 else []

        print(f"\n🔧 Executing skill: {skill_name}")
        result = execute_skill(skill_name, *args)
        print(f"Result: {result}")

    def execute_aider_command(self, command: str):
        """Execute an Aider command"""
        print(f"\n🤖 Executing Aider command: {command}")
        success, output = self.aider.run_aider_command(command)
        if success:
            print(f"✅ Success:\n{output[:500]}...")
        else:
            print(f"❌ Error: {output}")

    def run_autogen_mode(self):
        """Run in AutoGen-only mode"""
        print("🤖 Running in AutoGen mode...")

        # Resume from last checkpoint
        state = self.autogen.resume()

        while self.running:
            if not self.paused:
                # Run AutoGen orchestrator
                try:
                    self.autogen.run()
                    self.status["total_tasks_completed"] += 1
                    self.save_status()
                except Exception as e:
                    print(f"❌ Error in AutoGen: {e}")
                    time.sleep(5)

            # Process commands
            self.process_commands()
            time.sleep(1)

    def run_aider_mode(self):
        """Run in Aider-only mode"""
        print("🤖 Running in Aider mode...")

        # Development phases for Aider
        phases = [
            ("setup", self.aider_runner.setup_project),
            ("auth", self.aider_runner.implement_auth_system),
            ("inventory", self.aider_runner.implement_inventory_system),
        ]

        for phase_name, phase_func in phases:
            if not self.running:
                break

            while self.paused:
                self.process_commands()
                time.sleep(1)

            print(f"\n📦 Starting phase: {phase_name}")
            self.status["current_phase"] = phase_name
            self.save_status()

            try:
                phase_func()
                self.status["total_tasks_completed"] += 1
                self.save_status()
            except Exception as e:
                print(f"❌ Error in phase {phase_name}: {e}")

            # Process commands
            self.process_commands()

    def run_hybrid_mode(self):
        """Run in hybrid mode (AutoGen + Aider)"""
        print("🤖 Running in Hybrid mode (AutoGen + Aider)...")

        # Define task allocation
        tasks = [
            {
                "name": "Project Setup",
                "tool": "aider",
                "function": lambda: self.aider_runner.setup_project()
            },
            {
                "name": "Database Schema",
                "tool": "skill",
                "function": lambda: execute_skill("database", [
                    {"name": "User", "fields": []},
                    {"name": "Herb", "fields": []},
                    {"name": "Appointment", "fields": []}
                ])
            },
            {
                "name": "Authentication System",
                "tool": "aider",
                "function": lambda: self.aider_runner.implement_auth_system()
            },
            {
                "name": "Core Components",
                "tool": "autogen",
                "function": lambda: self.autogen.execute_phase(
                    "Phase 1: Foundation",
                    ["Build admin dashboard skeleton"]
                )
            },
            {
                "name": "Inventory Management",
                "tool": "hybrid",
                "function": lambda: self.implement_inventory_hybrid()
            }
        ]

        for task in tasks:
            if not self.running:
                break

            while self.paused:
                self.process_commands()
                time.sleep(1)

            print(f"\n📋 Task: {task['name']} (Tool: {task['tool']})")
            self.status["current_task"] = task['name']
            self.save_status()

            try:
                task['function']()
                self.status["total_tasks_completed"] += 1
                self.save_status()
                print(f"✅ Completed: {task['name']}")
            except Exception as e:
                print(f"❌ Error in task {task['name']}: {e}")

            # Process commands
            self.process_commands()

    def implement_inventory_hybrid(self):
        """Implement inventory system using both AutoGen and Aider"""
        print("\n🔄 Hybrid Implementation: Inventory System")

        # Use AutoGen for planning
        print("1️⃣ AutoGen: Planning inventory architecture...")
        self.autogen.agents["architect"].initiate_chat(
            self.autogen.agents["project_manager"],
            message="Design the inventory management system architecture"
        )

        # Use Aider for code generation
        print("2️⃣ Aider: Generating inventory components...")
        components = [
            "HerbList",
            "HerbForm",
            "PreparationTracker",
            "ExpirationAlerts"
        ]
        for component in components:
            self.aider.create_component(component, "component")

        # Use skills for database schema
        print("3️⃣ Skills: Creating database schema...")
        execute_skill("database", [
            {
                "name": "Herb",
                "fields": [
                    {"name": "id", "type": "String", "id": True},
                    {"name": "name", "type": "String"},
                    {"name": "quantity", "type": "Float"},
                    {"name": "unit", "type": "String"},
                    {"name": "expirationDate", "type": "DateTime"}
                ]
            }
        ])

        # Use AutoGen for testing
        print("4️⃣ AutoGen: Creating tests...")
        self.autogen.agents["qa_engineer"].initiate_chat(
            self.autogen.agents["project_manager"],
            message="Create tests for the inventory management system"
        )


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="HerbalistHub Development Orchestrator")
    parser.add_argument(
        "--mode",
        choices=["autogen", "aider", "hybrid"],
        default="hybrid",
        help="Development mode (default: hybrid)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current status and exit"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset all progress and start fresh"
    )

    args = parser.parse_args()

    # Check for API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        print("\n📝 Instructions:")
        print("1. Export your API key:")
        print("   export ANTHROPIC_API_KEY='your-api-key-here'")
        print("\n2. Or create a .env file in the agent directory with:")
        print("   ANTHROPIC_API_KEY=your-api-key-here")
        sys.exit(1)

    # Initialize orchestrator
    orchestrator = DevelopmentOrchestrator(api_key)

    # Handle different command options
    if args.status:
        orchestrator.show_status()
        sys.exit(0)

    if args.reset:
        print("⚠️ Warning: This will reset all progress!")
        confirm = input("Type 'yes' to confirm: ")
        if confirm.lower() == "yes":
            # Remove state files
            state_files = [
                orchestrator.agent_dir / "agent_state.pkl",
                orchestrator.agent_dir / "progress.json",
                orchestrator.agent_dir / "orchestrator_status.json",
                orchestrator.agent_dir / "aider_history.json"
            ]
            for file in state_files:
                if file.exists():
                    file.unlink()
            print("✅ Progress reset successfully")
        sys.exit(0)

    # Display startup banner
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🌿 HerbalistHub Development Orchestrator 🌿              ║
║                                                              ║
║     Powered by AutoGen + Aider + Claude API                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)

    if args.resume:
        print("📂 Resuming from last checkpoint...")
    else:
        print("🆕 Starting fresh development...")

    # Start the orchestrator
    try:
        orchestrator.start(mode=args.mode)
    except KeyboardInterrupt:
        print("\n\n🛑 Interrupted by user")
        orchestrator.stop()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        orchestrator.stop()
        raise


if __name__ == "__main__":
    main()