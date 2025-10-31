# API Routes Specification - HerbalistHub

## Tech Stack
- **Framework:** Next.js 14 API Routes
- **Database:** Prisma + MySQL
- **Authentication:** NextAuth.js
- **Validation:** Zod schemas
- **TypeScript:** Full type safety

## Required API Routes

### Authentication
- `/api/auth/[...nextauth]/route.ts` - NextAuth.js configuration
  - Google, Facebook, Email providers
  - JWT + database sessions
  - Role-based access control

### Herbs & Inventory
- `/api/herbs/route.ts` - GET (list with search/filter), POST (create)
- `/api/herbs/[id]/route.ts` - GET, PUT, DELETE
- `/api/preparations/route.ts` - GET, POST
- `/api/preparations/[id]/route.ts` - GET, PUT, DELETE

### Formulas
- `/api/formulas/route.ts` - GET (with public filter), POST
- `/api/formulas/[id]/route.ts` - GET, PUT, DELETE
- `/api/formulas/[id]/publish/route.ts` - POST (toggle public)

### Client Management
- `/api/clients/route.ts` - GET (admin only), POST
- `/api/clients/[id]/route.ts` - GET, PUT, DELETE
- `/api/intake-forms/route.ts` - GET, POST
- `/api/intake-forms/[id]/route.ts` - GET, PUT, DELETE
- `/api/intake-forms/[id]/submissions/route.ts` - GET, POST

### Appointments
- `/api/appointments/route.ts` - GET, POST
- `/api/appointments/[id]/route.ts` - GET, PUT, DELETE
- `/api/appointments/available-slots/route.ts` - GET (calendar integration)

### Content Management
- `/api/blog/posts/route.ts` - GET (published + admin), POST
- `/api/blog/posts/[slug]/route.ts` - GET, PUT, DELETE
- `/api/events/route.ts` - GET, POST
- `/api/events/[id]/route.ts` - GET, PUT, DELETE
- `/api/events/[id]/register/route.ts` - POST, DELETE

### Communication
- `/api/messages/route.ts` - GET, POST
- `/api/messages/[id]/route.ts` - GET, PUT, DELETE
- `/api/messages/[id]/reply/route.ts` - POST

## Implementation Requirements

### Request/Response Patterns
```typescript
// GET endpoints - List with pagination
{
  data: T[],
  meta: {
    page: number,
    limit: number, 
    total: number,
    hasMore: boolean
  }
}

// POST/PUT endpoints - Single resource
{
  data: T,
  message: string
}

// Error responses
{
  error: string,
  code: string,
  details?: any
}
```

### Authentication Middleware
- Check user authentication status
- Verify role-based permissions (ADMIN, CLIENT, PUBLIC)
- Handle JWT validation and refresh

### Validation Requirements
- Use Zod schemas for all input validation
- Sanitize user inputs
- Type-safe request/response handling
- File upload validation for images

### Error Handling
- Consistent error response format
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Logging for debugging
- Rate limiting protection

### Search & Filtering
- Text search across relevant fields
- Date range filtering
- Category/tag filtering  
- Sorting options (name, date, etc.)
- Pagination support

### Security Features
- CSRF protection
- Input sanitization
- SQL injection prevention (via Prisma)
- File upload restrictions
- Rate limiting per endpoint

## Business Logic Requirements

### Inventory Management
- Track quantity changes with audit trail
- Expiration date alerts
- Low stock notifications
- Batch number tracking

### Appointment Scheduling
- Conflict detection
- Google Calendar integration
- Email notifications
- Cancellation policies

### Formula Management
- Version control for formula changes
- Cost calculation based on ingredient prices
- Public/private visibility controls
- Recipe scaling calculations

### Client Privacy
- HIPAA compliance for health data
- Secure message encryption
- Access logging for audit trails
- Data retention policies