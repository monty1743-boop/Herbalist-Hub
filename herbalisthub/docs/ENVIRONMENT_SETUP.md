# Environment Setup Guide

This guide will help you set up the development environment for HerbalistHub.

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

## Quick Setup

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd herbalisthub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual values. For development, you can use the default database settings.

4. **Start the database**
   ```bash
   npm run docker:up
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Environment Variables

### Required for Development

```env
DATABASE_URL="mysql://herbalist_user:herbalist_password@localhost:3306/herbalisthub_dev"
NEXTAUTH_SECRET="your-32-character-secret-key"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-32-character-jwt-secret"
```

### Optional for Development

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `SMTP_*` variables - For email functionality
- `AWS_*` variables - For file uploads

## Database Management

### Start/Stop Database
```bash
# Start all services (MySQL, phpMyAdmin, Redis)
npm run docker:up

# Stop all services
npm run docker:down

# Clean up (removes volumes)
npm run docker:clean
```

### Database Operations
```bash
# Create and run migrations
npm run db:migrate

# Reset database (careful!)
npm run db:reset

# Generate Prisma client
npm run db:generate

# Open Prisma Studio
npx prisma studio
```

### Database Access

- **MySQL**: `localhost:3306`
  - Username: `herbalist_user`
  - Password: `herbalist_password`
  - Database: `herbalisthub_dev`

- **phpMyAdmin**: `http://localhost:8080`
- **Redis**: `localhost:6379`

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format
npm run format:check
```

## Generating Secure Keys

Use these commands to generate secure keys for your environment:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running
2. Check if MySQL container is healthy: `docker ps`
3. Verify environment variables in `.env.local`
4. Try resetting the database: `npm run docker:clean && npm run docker:up`

### Port Conflicts

If ports 3000, 3306, 8080, or 6379 are in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`
3. Update `DATABASE_URL` if you change MySQL port

### TypeScript Errors

1. Ensure all dependencies are installed: `npm install`
2. Generate Prisma client: `npm run db:generate`
3. Restart TypeScript server in your IDE

### Environment Variable Errors

1. Copy `.env.example` to `.env.local`
2. Fill in all required variables
3. Restart the development server

## Production Deployment

For production deployment, ensure you have:

1. All required environment variables set
2. Proper SSL certificates
3. Secure database with proper credentials
4. HTTPS for NEXTAUTH_URL
5. Proper AWS credentials for file storage

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Enable audit logging in production
- Regularly rotate API keys and secrets
- Use HTTPS in production

## Need Help?

- Check the troubleshooting section above
- Review the application logs
- Ensure all environment variables are set correctly
- Verify database connectivity