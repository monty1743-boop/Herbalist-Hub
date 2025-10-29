"""
Agent Skills for HerbalistHub Development
Specialized capabilities for each development agent
"""

from typing import Dict, List, Any, Optional
from pathlib import Path
import json
import subprocess
import re

class BaseSkill:
    """Base class for all agent skills"""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.project_root = Path(__file__).parent.parent

    def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """Execute the skill and return results"""
        raise NotImplementedError

    def validate(self, *args, **kwargs) -> bool:
        """Validate skill execution parameters"""
        return True

class DatabaseSchemaSkill(BaseSkill):
    """Skill for creating and managing Prisma database schemas"""

    def __init__(self):
        super().__init__(
            name="DatabaseSchema",
            description="Create and manage Prisma database schemas for MySQL"
        )

    def execute(self, models: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate Prisma schema for specified models"""
        schema_path = self.project_root / "prisma" / "schema.prisma"

        # Base schema configuration
        schema = """// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

"""

        # Generate models
        for model in models:
            schema += self._generate_model(model)
            schema += "\n\n"

        # Write schema file
        schema_path.parent.mkdir(exist_ok=True)
        with open(schema_path, 'w') as f:
            f.write(schema)

        # Run Prisma generate
        try:
            subprocess.run(["npx", "prisma", "generate"], cwd=self.project_root, check=True)
            subprocess.run(["npx", "prisma", "format"], cwd=self.project_root, check=True)

            return {
                "status": "success",
                "message": f"Schema created with {len(models)} models",
                "path": str(schema_path)
            }
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(schema_path)
            }

    def _generate_model(self, model: Dict[str, Any]) -> str:
        """Generate a single Prisma model"""
        lines = [f"model {model['name']} {{"]

        # Add fields
        for field in model.get('fields', []):
            field_def = f"  {field['name']:<20} {field['type']:<15}"

            # Add modifiers
            if field.get('id'):
                field_def += " @id"
            if field.get('unique'):
                field_def += " @unique"
            if field.get('default'):
                field_def += f" @default({field['default']})"
            if field.get('relation'):
                field_def += f" @relation(fields: [{field['relation']['fields']}], references: [{field['relation']['references']}])"

            lines.append(field_def)

        # Add timestamps
        if model.get('timestamps', True):
            lines.append(f"  {'createdAt':<20} {'DateTime':<15} @default(now())")
            lines.append(f"  {'updatedAt':<20} {'DateTime':<15} @updatedAt")

        lines.append("}")
        return "\n".join(lines)

class ComponentGeneratorSkill(BaseSkill):
    """Skill for generating React/Next.js components"""

    def __init__(self):
        super().__init__(
            name="ComponentGenerator",
            description="Generate TypeScript React components with Tailwind CSS"
        )

    def execute(
        self,
        name: str,
        type: str = "component",
        props: List[Dict[str, str]] = None,
        features: List[str] = None
    ) -> Dict[str, Any]:
        """Generate a React component"""

        # Determine file path
        if type == "page":
            file_path = self.project_root / "app" / name.lower() / "page.tsx"
        elif type == "layout":
            file_path = self.project_root / "app" / name.lower() / "layout.tsx"
        else:
            file_path = self.project_root / "components" / f"{name}.tsx"

        # Generate component code
        component_code = self._generate_component(name, props, features)

        # Create file
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(component_code)

        return {
            "status": "success",
            "message": f"Component {name} created",
            "path": str(file_path)
        }

    def _generate_component(
        self,
        name: str,
        props: List[Dict[str, str]] = None,
        features: List[str] = None
    ) -> str:
        """Generate component code"""

        # Import statements
        imports = ["'use client'", ""]

        if features and "state" in features:
            imports.append("import { useState, useEffect } from 'react'")
        if features and "form" in features:
            imports.append("import { useForm } from 'react-hook-form'")
            imports.append("import { zodResolver } from '@hookform/resolvers/zod'")
            imports.append("import * as z from 'zod'")

        imports.extend([
            "import { cn } from '@/lib/utils'",
            ""
        ])

        # Props interface
        interface = ""
        if props:
            interface = f"interface {name}Props {{\n"
            for prop in props:
                interface += f"  {prop['name']}{'?' if prop.get('optional') else ''}: {prop['type']}\n"
            interface += "}\n\n"

        # Component function
        props_param = f": {name}Props" if props else ""
        component = f"""export default function {name}({{
  {', '.join([p['name'] for p in props])} if props else ''}
}}{props_param} {{
  // Component logic
  {self._generate_hooks(features)}

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{name}</h1>
      {self._generate_jsx(features)}
    </div>
  )
}}"""

        return "\n".join(imports) + interface + component

    def _generate_hooks(self, features: List[str] = None) -> str:
        """Generate React hooks based on features"""
        if not features:
            return ""

        hooks = []
        if "state" in features:
            hooks.append("const [loading, setLoading] = useState(false)")
            hooks.append("const [data, setData] = useState(null)")
        if "form" in features:
            hooks.append("const form = useForm()")

        return "\n  ".join(hooks)

    def _generate_jsx(self, features: List[str] = None) -> str:
        """Generate JSX based on features"""
        if not features:
            return "<p>Component content</p>"

        jsx_parts = []
        if "loading" in features:
            jsx_parts.append("{loading && <div>Loading...</div>}")
        if "form" in features:
            jsx_parts.append("<form onSubmit={form.handleSubmit(onSubmit)}>Form fields</form>")

        return "\n      ".join(jsx_parts) if jsx_parts else "<p>Component content</p>"

class APIEndpointSkill(BaseSkill):
    """Skill for creating Next.js API endpoints"""

    def __init__(self):
        super().__init__(
            name="APIEndpoint",
            description="Create Next.js App Router API endpoints"
        )

    def execute(
        self,
        path: str,
        methods: List[str],
        auth_required: bool = True,
        validation_schema: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Generate API endpoint"""

        # Create file path
        file_path = self.project_root / "app" / "api" / path / "route.ts"

        # Generate endpoint code
        endpoint_code = self._generate_endpoint(methods, auth_required, validation_schema)

        # Create file
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(endpoint_code)

        return {
            "status": "success",
            "message": f"API endpoint /{path} created",
            "path": str(file_path),
            "methods": methods
        }

    def _generate_endpoint(
        self,
        methods: List[str],
        auth_required: bool,
        validation_schema: Dict[str, Any]
    ) -> str:
        """Generate endpoint code"""

        imports = [
            "import { NextRequest, NextResponse } from 'next/server'",
            "import { prisma } from '@/lib/prisma'"
        ]

        if auth_required:
            imports.append("import { getServerSession } from 'next-auth'")
            imports.append("import { authOptions } from '@/lib/auth'")

        if validation_schema:
            imports.append("import * as z from 'zod'")

        code = "\n".join(imports) + "\n\n"

        # Generate handler for each method
        for method in methods:
            handler = f"""export async function {method}(request: NextRequest) {{
  try {{
    {self._generate_auth_check(auth_required)}
    {self._generate_validation(validation_schema) if method in ['POST', 'PUT', 'PATCH'] else ''}

    // Handler logic here
    const result = await prisma.model.findMany()

    return NextResponse.json({{ success: true, data: result }})
  }} catch (error) {{
    console.error('{method} error:', error)
    return NextResponse.json(
      {{ success: false, error: 'Internal server error' }},
      {{ status: 500 }}
    )
  }}
}}

"""
            code += handler

        return code

    def _generate_auth_check(self, auth_required: bool) -> str:
        """Generate authentication check"""
        if not auth_required:
            return ""

        return """// Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }"""

    def _generate_validation(self, schema: Dict[str, Any]) -> str:
        """Generate validation logic"""
        if not schema:
            return ""

        return """// Validate request body
    const body = await request.json()
    const validationResult = schema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 400 }
      )
    }"""

class TestGeneratorSkill(BaseSkill):
    """Skill for generating tests"""

    def __init__(self):
        super().__init__(
            name="TestGenerator",
            description="Generate Jest tests for components and functions"
        )

    def execute(
        self,
        target_file: str,
        test_type: str = "unit",
        coverage_target: int = 80
    ) -> Dict[str, Any]:
        """Generate test file"""

        # Create test file path
        test_file = target_file.replace('.tsx', '.test.tsx').replace('.ts', '.test.ts')
        test_path = self.project_root / test_file

        # Read target file to understand what to test
        target_path = self.project_root / target_file
        if target_path.exists():
            with open(target_path, 'r') as f:
                target_content = f.read()
        else:
            target_content = ""

        # Generate test code
        test_code = self._generate_tests(target_file, target_content, test_type)

        # Create test file
        test_path.parent.mkdir(parents=True, exist_ok=True)
        with open(test_path, 'w') as f:
            f.write(test_code)

        return {
            "status": "success",
            "message": f"Tests created for {target_file}",
            "path": str(test_path),
            "type": test_type,
            "coverage_target": coverage_target
        }

    def _generate_tests(self, file: str, content: str, test_type: str) -> str:
        """Generate test code based on file content"""

        # Determine if it's a component or function
        is_component = '.tsx' in file or 'export default function' in content

        if is_component:
            return self._generate_component_tests(file)
        else:
            return self._generate_function_tests(file)

    def _generate_component_tests(self, file: str) -> str:
        """Generate component tests"""
        component_name = Path(file).stem

        return f"""import {{ render, screen, waitFor }} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {component_name} from './{component_name}'

describe('{component_name}', () => {{
  it('renders without crashing', () => {{
    render(<{component_name} />)
    expect(screen.getByText(/{component_name}/i)).toBeInTheDocument()
  }})

  it('handles user interaction', async () => {{
    const user = userEvent.setup()
    render(<{component_name} />)

    // Test user interactions
    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {{
      expect(screen.getByText(/result/i)).toBeInTheDocument()
    }})
  }})

  it('displays loading state', () => {{
    render(<{component_name} loading={{true}} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  }})

  it('handles errors gracefully', () => {{
    render(<{component_name} error="Test error" />)
    expect(screen.getByText(/test error/i)).toBeInTheDocument()
  }})
}})"""

    def _generate_function_tests(self, file: str) -> str:
        """Generate function tests"""
        module_name = Path(file).stem

        return f"""import * as module from './{module_name}'

describe('{module_name}', () => {{
  describe('main functionality', () => {{
    it('should work with valid input', () => {{
      const result = module.mainFunction('valid input')
      expect(result).toBeDefined()
      expect(result).toEqual(expect.any(Object))
    }})

    it('should handle edge cases', () => {{
      expect(() => module.mainFunction(null)).not.toThrow()
      expect(() => module.mainFunction(undefined)).not.toThrow()
      expect(() => module.mainFunction('')).not.toThrow()
    }})

    it('should validate input properly', () => {{
      expect(() => module.mainFunction({{invalid: true}})).toThrow()
    }})
  }})

  describe('helper functions', () => {{
    it('should process data correctly', () => {{
      const input = {{test: 'data'}}
      const output = module.helperFunction(input)
      expect(output).toMatchSnapshot()
    }})
  }})
}})"""

class IntegrationSkill(BaseSkill):
    """Skill for third-party integrations"""

    def __init__(self):
        super().__init__(
            name="Integration",
            description="Integrate third-party services and APIs"
        )

    def execute(
        self,
        service: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Set up third-party integration"""

        integrations = {
            "google-calendar": self._setup_google_calendar,
            "pusher": self._setup_pusher,
            "resend": self._setup_resend,
            "s3": self._setup_s3
        }

        if service in integrations:
            return integrations[service](config)
        else:
            return {
                "status": "error",
                "message": f"Unknown service: {service}"
            }

    def _setup_google_calendar(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Set up Google Calendar integration"""

        # Create Google Calendar service file
        service_code = """import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client,
})

export async function createEvent(event: any, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken })

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  })

  return response.data
}

export async function getEvents(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken })

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return response.data.items
}

export async function updateEvent(eventId: string, updates: any, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken })

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: updates,
  })

  return response.data
}

export async function deleteEvent(eventId: string, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  })

  return { success: true }
}"""

        file_path = self.project_root / "lib" / "google-calendar.ts"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(service_code)

        return {
            "status": "success",
            "message": "Google Calendar integration set up",
            "path": str(file_path),
            "env_vars": [
                "GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_SECRET",
                "GOOGLE_REDIRECT_URI"
            ]
        }

    def _setup_pusher(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Set up Pusher for real-time features"""

        server_code = """import Pusher from 'pusher'

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

export async function sendMessage(channel: string, event: string, data: any) {
  return await pusher.trigger(channel, event, data)
}"""

        client_code = """import Pusher from 'pusher-js'

let pusherClient: Pusher | null = null

export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }

  return pusherClient
}

export function subscribeToChannel(channelName: string, eventName: string, callback: (data: any) => void) {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(channelName)
  channel.bind(eventName, callback)

  return () => {
    channel.unbind(eventName, callback)
    pusher.unsubscribe(channelName)
  }
}"""

        # Create server-side Pusher file
        server_path = self.project_root / "lib" / "pusher-server.ts"
        server_path.parent.mkdir(parents=True, exist_ok=True)
        with open(server_path, 'w') as f:
            f.write(server_code)

        # Create client-side Pusher file
        client_path = self.project_root / "lib" / "pusher-client.ts"
        with open(client_path, 'w') as f:
            f.write(client_code)

        return {
            "status": "success",
            "message": "Pusher integration set up",
            "paths": [str(server_path), str(client_path)],
            "env_vars": [
                "PUSHER_APP_ID",
                "NEXT_PUBLIC_PUSHER_KEY",
                "PUSHER_SECRET",
                "NEXT_PUBLIC_PUSHER_CLUSTER"
            ]
        }

    def _setup_resend(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Set up Resend for email"""

        email_code = """import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'noreply@herbalisthub.com',
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to HerbalistHub!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining HerbalistHub.</p>
      <p>We're excited to have you as part of our community.</p>
    `,
  }),

  appointmentReminder: (appointment: any) => ({
    subject: 'Appointment Reminder',
    html: `
      <h2>Appointment Reminder</h2>
      <p>You have an appointment scheduled for ${appointment.date} at ${appointment.time}.</p>
    `,
  }),

  passwordReset: (resetLink: string) => ({
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
  }),
}"""

        file_path = self.project_root / "lib" / "email.ts"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(email_code)

        return {
            "status": "success",
            "message": "Resend email integration set up",
            "path": str(file_path),
            "env_vars": ["RESEND_API_KEY", "EMAIL_FROM"]
        }

    def _setup_s3(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Set up AWS S3 for file storage"""

        s3_code = """import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!

export async function uploadFile(file: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  await s3Client.send(command)

  return {
    success: true,
    url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  }
}

export async function getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })

  return url
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })

  return url
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)

  return { success: true }
}"""

        file_path = self.project_root / "lib" / "s3.ts"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(s3_code)

        return {
            "status": "success",
            "message": "AWS S3 integration set up",
            "path": str(file_path),
            "env_vars": [
                "AWS_REGION",
                "AWS_ACCESS_KEY_ID",
                "AWS_SECRET_ACCESS_KEY",
                "AWS_S3_BUCKET"
            ]
        }


# Skill Registry
AGENT_SKILLS = {
    "database": DatabaseSchemaSkill(),
    "component": ComponentGeneratorSkill(),
    "api": APIEndpointSkill(),
    "test": TestGeneratorSkill(),
    "integration": IntegrationSkill(),
}

def get_skill(name: str) -> Optional[BaseSkill]:
    """Get a skill by name"""
    return AGENT_SKILLS.get(name)

def list_skills() -> List[str]:
    """List all available skills"""
    return list(AGENT_SKILLS.keys())

def execute_skill(name: str, *args, **kwargs) -> Dict[str, Any]:
    """Execute a skill by name"""
    skill = get_skill(name)
    if skill:
        if skill.validate(*args, **kwargs):
            return skill.execute(*args, **kwargs)
        else:
            return {
                "status": "error",
                "message": "Validation failed"
            }
    else:
        return {
            "status": "error",
            "message": f"Skill '{name}' not found"
        }