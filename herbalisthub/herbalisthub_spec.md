# HerbalistHub - Web Application Specification

## Part 1: The Essentials - Core Requirements

### 1.1 Project Overview

**Project Name:** HerbalistHub  
**Version:** 1.0.0  
**Last Updated:** October 2025  
**Status:** Initial Specification

**Purpose:**  
A comprehensive web application platform for herbalists to manage their practice, track inventory, engage with clients, and share knowledge. The system combines professional practice management tools with public-facing content and community features.

**Target Users:**
- Primary: Professional herbalists and herbal practitioners
- Secondary: Clients seeking herbal consultations
- Tertiary: General public interested in herbal information

### 1.2 Functional Requirements

#### Core Features

1. **Inventory Management System**
    - Track herbs, roots, tinctures, and preparations
    - Monitor expiration dates with automated alerts
    - Batch tracking and quality control
    - Storage location and condition tracking
    - Supplier management and reorder automation

2. **Client Management Portal**
    - Customizable intake forms
    - Appointment scheduling with Google Calendar integration
    - Secure messaging system
    - Client history and treatment tracking
    - Document management

3. **Formula & Recipe Builder**
    - Create and save herbal formulas with precise ratios
    - Scale recipes automatically
    - Version control for modifications
    - Cost calculation and pricing tools
    - Publishing capability for public sharing

4. **Public Content Platform**
    - Blog with categories and discussions
    - Event calendar
    - Photo gallery
    - Published formulas with comment threads
    - Newsletter management

5. **Authentication & Authorization**
    - Multi-provider authentication (Google, Facebook, Email)
    - Email verification
    - Role-based access control (Admin, Client, Public)
    - Secure session management

### 1.3 Non-Functional Requirements

#### Performance Requirements
- Page load time < 3 seconds
- Support 100+ concurrent users
- 99.9% uptime availability
- Real-time messaging latency < 500ms
- Database query response < 200ms

#### Security Requirements
- HTTPS/TLS encryption for all communications
- HIPAA-compliant data storage for health information
- PCI compliance for payment processing (future)
- Regular security audits and penetration testing
- Data encryption at rest and in transit

#### Usability Requirements
- Mobile-responsive design
- WCAG 2.1 AA accessibility compliance
- Intuitive navigation with < 3 clicks to any feature
- Multi-language support (initially English)
- Offline mode for critical features

#### Scalability Requirements
- Horizontal scaling capability
- Database sharding support
- CDN integration for static assets
- Microservices-ready architecture
- Load balancing support

### 1.4 User Stories

#### As an Herbalist Admin:
- I want to track my herb inventory so I never run out of critical supplies
- I want to create and modify intake forms so I can gather relevant client information
- I want to schedule appointments that sync with my Google Calendar
- I want to publish blog posts and formulas to educate my community
- I want to track client histories to provide better care
- I want to calculate costs and set pricing for my preparations

#### As a Client:
- I want to book appointments online at convenient times
- I want to fill out intake forms before my consultation
- I want to message my herbalist securely between appointments
- I want to access my treatment history and recommendations
- I want to participate in discussions about herbal topics

#### As a Public User:
- I want to read blog posts about herbal medicine
- I want to view published formulas and recipes
- I want to attend events and workshops
- I want to sign up for newsletters
- I want to engage in community discussions

## Part 2: Technical Specification

### 2.1 Technology Stack

#### Frontend
- **Framework:** Next.js 15+ with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand + React Query
- **Forms:** react-hook-form + Zod validation
- **Rich Text:** Tiptap editor
- **Charts:** Recharts

#### Backend
- **API:** Next.js API Routes
- **ORM:** Prisma with MySQL
- **Authentication:** NextAuth.js (Auth.js)
- **File Storage:** S3
- **Email:** Resend
- **Real-time:** Pusher

#### Infrastructure
- **Hosting:** AWS (EC2, S3, RDS, CloudFront)
- **Database:** MySQL
- **CDN:** Cloudflare
- **Monitoring:** Sentry
- **CI/CD:** GitHub Actions

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
├─────────────────────────────────────────────────────┤
│  Next.js Frontend (React + TypeScript + Tailwind)   │
├─────────────────────────────────────────────────────┤
│                    API Layer                         │
├─────────────────────────────────────────────────────┤
│         Next.js API Routes + Middleware              │
├─────────────────────────────────────────────────────┤
│                  Service Layer                       │
├──────────┬────────────┬─────────────┬──────────────┤
│ Auth     │ Business   │ Integration │ Real-time    │
│ Service  │ Logic      │ Services    │ Service      │
├──────────┴────────────┴─────────────┴──────────────┤
│                   Data Layer                         │
├─────────────────────────────────────────────────────┤
│     MySQL             │        S3                   │
└───────────────────────┴─────────────────────────────┘
```

### 2.3 Database Schema

#### Core Entities

```typescript
// Users & Authentication
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   DateTime?
  name            String?
  role            Role      @default(CLIENT)
  image           String?
  accounts        Account[]
  sessions        Session[]
  appointments    Appointment[]
  messages        Message[]
  intakeSubmissions IntakeSubmission[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Role {
  ADMIN
  CLIENT
  PUBLIC
}

// Inventory Management
model Herb {
  id              String    @id @default(cuid())
  name            String
  latinName       String?
  type            HerbType
  quantity        Float
  unit            String
  supplier        String?
  batchNumber     String?
  harvestDate     DateTime?
  expirationDate  DateTime?
  location        String?
  storageConditions Json?
  notes           Text?
  image           String?
  preparations    Preparation[]
  formulaIngredients FormulaIngredient[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum HerbType {
  FRESH_HERB
  DRIED_HERB
  ROOT
  BARK
  FLOWER
  SEED
  RESIN
  OTHER
}

// Preparations & Formulas
model Preparation {
  id              String    @id @default(cuid())
  name            String
  type            PreparationType
  herbs           Herb[]
  menstruumRatio  String?
  macerationStart DateTime?
  macerationEnd   DateTime?
  yield           Float?
  yieldUnit       String?
  batchNumber     String
  shelfLife       Int?      // in days
  cost            Decimal?
  price           Decimal?
  notes           Text?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum PreparationType {
  TINCTURE
  OIL
  SALVE
  TEA
  POWDER
  CAPSULE
  SYRUP
  OTHER
}

model Formula {
  id              String    @id @default(cuid())
  name            String
  description     Text?
  ingredients     FormulaIngredient[]
  instructions    Text
  dosage          String?
  contraindications String?
  isPublic        Boolean   @default(false)
  version         Int       @default(1)
  blogPosts       BlogPost[]
  discussions     Discussion[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Client Management
model IntakeForm {
  id              String    @id @default(cuid())
  name            String
  description     String?
  fields          Json      // Dynamic form fields
  isActive        Boolean   @default(true)
  submissions     IntakeSubmission[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Appointment {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  startTime       DateTime
  endTime         DateTime
  type            String
  status          AppointmentStatus
  notes           Text?
  googleEventId   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

// Content Management
model BlogPost {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  content         Text
  excerpt         String?
  featuredImage   String?
  published       Boolean   @default(false)
  publishedAt     DateTime?
  categories      Category[]
  tags            Tag[]
  formula         Formula?  @relation(fields: [formulaId], references: [id])
  formulaId       String?
  discussions     Discussion[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Event {
  id              String    @id @default(cuid())
  title           String
  description     Text
  startDateTime   DateTime
  endDateTime     DateTime
  location        String?
  virtualLink     String?
  maxAttendees    Int?
  registrations   EventRegistration[]
  image           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Messaging & Communication
model Message {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  subject         String
  content         Text
  isRead          Boolean   @default(false)
  adminReply      String?
  adminRepliedAt  DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Discussion {
  id              String    @id @default(cuid())
  content         Text
  authorName      String
  authorEmail     String
  blogPost        BlogPost? @relation(fields: [blogPostId], references: [id])
  blogPostId      String?
  formula         Formula?  @relation(fields: [formulaId], references: [id])
  formulaId       String?
  parentId        String?
  parent          Discussion? @relation("DiscussionReplies", fields: [parentId], references: [id])
  replies         Discussion[] @relation("DiscussionReplies")
  approved        Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 2.4 API Endpoints

#### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

#### Inventory Management
- `GET /api/herbs` - List all herbs
- `POST /api/herbs` - Create new herb entry
- `PUT /api/herbs/:id` - Update herb details
- `DELETE /api/herbs/:id` - Delete herb
- `GET /api/herbs/expiring` - Get expiring herbs
- `GET /api/preparations` - List preparations
- `POST /api/preparations` - Create preparation
- `PUT /api/preparations/:id` - Update preparation
- `DELETE /api/preparations/:id` - Delete preparation

#### Formula Management
- `GET /api/formulas` - List formulas
- `POST /api/formulas` - Create formula
- `PUT /api/formulas/:id` - Update formula
- `DELETE /api/formulas/:id` - Delete formula
- `POST /api/formulas/:id/publish` - Publish formula
- `POST /api/formulas/:id/scale` - Scale formula

#### Client Management
- `GET /api/intake-forms` - List intake forms
- `POST /api/intake-forms` - Create intake form
- `PUT /api/intake-forms/:id` - Update intake form
- `POST /api/intake-forms/:id/submit` - Submit intake form
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment
- `POST /api/appointments/sync-google` - Sync with Google Calendar

#### Content Management
- `GET /api/blog/posts` - List blog posts
- `POST /api/blog/posts` - Create blog post
- `PUT /api/blog/posts/:id` - Update blog post
- `DELETE /api/blog/posts/:id` - Delete blog post
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `POST /api/events/:id/register` - Register for event
- `GET /api/gallery` - List gallery images
- `POST /api/gallery/upload` - Upload images

#### Messaging
- `GET /api/messages` - List messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id/reply` - Admin reply
- `PUT /api/messages/:id/read` - Mark as read

#### Discussions
- `GET /api/discussions` - List discussions
- `POST /api/discussions` - Create discussion
- `PUT /api/discussions/:id/approve` - Approve discussion
- `DELETE /api/discussions/:id` - Delete discussion

### 2.5 Security Specifications

#### Authentication & Authorization
- JWT-based session management
- OAuth 2.0 integration (Google, Facebook)
- Email verification required
- Rate limiting on auth endpoints (5 attempts/minute)
- Password requirements: min 8 chars, 1 uppercase, 1 number, 1 special
- Two-factor authentication (future enhancement)

#### Data Protection
- All API endpoints require authentication except public content
- Role-based access control (RBAC) on all resources
- Field-level encryption for sensitive health data
- GDPR compliance for EU users
- Regular automated backups
- Audit logging for all data modifications

#### API Security
- CORS configuration for approved origins
- Request validation with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection with content security policy
- CSRF tokens for state-changing operations
- API rate limiting (100 requests/minute per user)

### 2.6 Integration Specifications

#### Google Calendar Integration
- OAuth 2.0 authentication flow
- Two-way sync for appointments
- Automatic event creation/updates
- Conflict detection
- Timezone handling

#### Email Service (Resend)
- Transactional email templates
- Appointment reminders (24hr, 1hr before)
- Newsletter campaigns
- Email verification
- Password reset flows

#### File Storage (S3)
- Image optimization and transformation
- Lazy loading support
- Automatic format conversion
- Secure upload URLs
- Gallery management

#### Real-time Messaging (Pusher)
- WebSocket connections for live chat
- Presence channels for online status
- Private channels for secure messaging
- Message delivery confirmation

## Part 3: UI/UX Specifications

### 3.1 Design System

#### Brand Colors
```css
--primary: #2D5016;     /* Forest Green */
--secondary: #8B7355;   /* Earth Brown */
--accent: #5D8A31;      /* Herb Green */
--success: #4CAF50;     /* Success Green */
--warning: #FF9800;     /* Warning Orange */
--danger: #F44336;      /* Danger Red */
--neutral: #9CA3AF;     /* Gray */
```

#### Typography
- Headings: Inter font family
- Body: System font stack
- Monospace: JetBrains Mono (for formulas)

#### Component Library
- Based on shadcn/ui components
- Custom components for:
    - Formula builder
    - Calendar picker
    - Herb selector
    - Batch tracker
    - Intake form builder

### 3.2 Page Structure

#### Public Pages
1. **Landing Page**
    - Hero section with CTA
    - Feature highlights
    - Testimonials
    - Newsletter signup

2. **Blog**
    - Grid/List view toggle
    - Category filtering
    - Search functionality
    - Related posts
    - Discussion threads

3. **Events**
    - Calendar view
    - List view
    - Registration forms
    - Event details modal

4. **Formulas**
    - Search and filter
    - Category browsing
    - Detail view with discussions
    - Print-friendly version

5. **Gallery**
    - Masonry grid layout
    - Lightbox viewer
    - Category filtering
    - Image metadata

#### Authenticated Pages

1. **Dashboard**
    - Quick stats widgets
    - Recent activity
    - Upcoming appointments
    - Expiring herbs alert
    - Quick actions

2. **Inventory Management**
    - Table view with sorting/filtering
    - Quick add forms
    - Bulk operations
    - Export functionality
    - Visual charts for quantities

3. **Formula Builder**
    - Drag-and-drop interface
    - Real-time calculations
    - Version history
    - Save as template
    - Publishing workflow

4. **Client Portal**
    - Client list with search
    - Client detail pages
    - Intake form responses
    - Treatment history
    - Secure messaging

5. **Appointment Calendar**
    - Month/Week/Day views
    - Drag-and-drop rescheduling
    - Availability settings
    - Google Calendar sync status
    - Appointment details modal

6. **Content Management**
    - Blog post editor
    - Media library
    - Event management
    - SEO settings
    - Preview mode

7. **Settings**
    - Profile management
    - Practice information
    - Intake form builder
    - Email preferences
    - Integration settings

### 3.3 Responsive Design

#### Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px - 1440px
- Large: 1440px+

#### Mobile Considerations
- Touch-friendly interface (44px min touch targets)
- Simplified navigation with hamburger menu
- Swipe gestures for calendar
- Offline mode for critical features
- Progressive Web App capabilities

## Part 4: Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup and configuration
- [ ] Authentication system
- [ ] User management
- [ ] Basic database schema
- [ ] Admin dashboard skeleton

### Phase 2: Core Inventory (Weeks 5-8)
- [ ] Herb management CRUD
- [ ] Preparation tracking
- [ ] Expiration alerts
- [ ] Basic reporting
- [ ] Import/Export functionality

### Phase 3: Client Management (Weeks 9-12)
- [ ] Intake form builder
- [ ] Appointment scheduling
- [ ] Google Calendar integration
- [ ] Client portal
- [ ] Messaging system

### Phase 4: Formula & Recipe (Weeks 13-16)
- [ ] Formula builder interface
- [ ] Recipe scaling
- [ ] Cost calculations
- [ ] Version control
- [ ] Publishing workflow

### Phase 5: Public Platform (Weeks 17-20)
- [ ] Blog system
- [ ] Event management
- [ ] Photo gallery
- [ ] Discussion forums
- [ ] Newsletter system

### Phase 6: Polish & Launch (Weeks 21-24)
- [ ] Performance optimization
- [ ] Security audit
- [ ] User testing
- [ ] Documentation
- [ ] Deployment and monitoring

## Part 5: Testing Strategy

### 5.1 Testing Levels

#### Unit Testing
- Jest + React Testing Library for components
- 80% code coverage target
- Mock external dependencies
- Test business logic separately

#### Integration Testing
- API endpoint testing with Supertest
- Database transaction testing
- External service integration tests
- Authentication flow testing

#### End-to-End Testing
- Playwright for critical user journeys
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile responsive testing
- Performance testing with Lighthouse

### 5.2 Test Scenarios

#### Critical Path Testing
1. User registration and login
2. Creating and managing herbs
3. Building and publishing formulas
4. Booking appointments
5. Submitting intake forms
6. Publishing blog posts
7. Processing messages

#### Edge Cases
- Network failures
- Concurrent user modifications
- Large dataset handling
- File upload limits
- Calendar sync conflicts
- Invalid form submissions

## Part 6: Deployment & DevOps

### 6.1 Environment Strategy
- **Development:** Local development with Docker
- **Staging:** Vercel preview deployments
- **Production:** Vercel production deployment

### 6.2 CI/CD Pipeline
```yaml
# GitHub Actions Workflow
- Linting and formatting checks
- Unit test execution
- Build verification
- Integration tests
- Deploy to Vercel preview
- E2E tests on preview
- Deploy to production
- Smoke tests
- Monitoring alerts
```

### 6.3 Monitoring & Analytics
- **Application Monitoring:** Sentry
- **Performance Monitoring:** Vercel Analytics
- **Uptime Monitoring:** UptimeRobot
- **Error Tracking:** Sentry
- **User Analytics:** Plausible Analytics

### 6.4 Backup & Recovery
- Daily automated database backups
- 30-day retention policy
- Point-in-time recovery capability
- Disaster recovery plan
- Regular restore testing

## Part 7: Documentation Requirements

### 7.1 Technical Documentation
- API documentation with OpenAPI/Swagger
- Database schema documentation
- Deployment guides
- Environment setup guides
- Troubleshooting guides

### 7.2 User Documentation
- User manual for herbalists
- Client portal guide
- Video tutorials
- FAQ section
- Feature walkthroughs

### 7.3 Developer Documentation
- Code style guide
- Component library documentation
- Contributing guidelines
- Architecture decision records
- Security best practices

## Part 8: Success Metrics

### 8.1 Technical Metrics
- Page load time < 3 seconds
- API response time < 200ms
- 99.9% uptime
- Zero critical security vulnerabilities
- 80% test coverage

### 8.2 Business Metrics
- User registration rate
- Active user retention (DAU/MAU)
- Appointment booking conversion
- Formula publication rate
- Client satisfaction score

### 8.3 User Experience Metrics
- Task completion rate > 90%
- Error rate < 1%
- User satisfaction score > 4.5/5
- Support ticket volume < 5% of users
- Feature adoption rate > 60%

## Part 9: Risk Management

### 9.1 Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach | Low | High | Encryption, security audits, compliance |
| System downtime | Medium | High | Redundancy, monitoring, quick recovery |
| Performance degradation | Medium | Medium | Caching, optimization, scaling |
| Integration failures | Medium | Medium | Fallback systems, error handling |

### 9.2 Business Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Low user adoption | Medium | High | User research, iterative development |
| Regulatory compliance | Low | High | Legal review, HIPAA compliance |
| Competitor emergence | Medium | Medium | Unique features, community building |
| Scope creep | High | Medium | Clear requirements, phase gates |

## Part 10: Future Enhancements

### Version 2.0 Features
- Mobile applications (iOS/Android)
- Payment processing for consultations
- Telehealth video consultations
- AI-powered herb recommendations
- Multi-language support
- Advanced analytics dashboard
- Wholesale/B2B portal
- Integration with POS systems
- Barcode/QR scanning
- Voice notes and transcription

### Long-term Vision
- Marketplace for herbalist products
- Professional certification tracking
- Research paper integration
- Community knowledge base
- Continuing education platform
- Supply chain integration
- Regulatory compliance automation
- International expansion

---

## Appendices

### A. Glossary
- **Tincture:** Liquid herbal extract using alcohol or glycerin
- **Menstruum:** The solvent used to extract herbs
- **Maceration:** The process of soaking herbs in solvent
- **Batch:** A specific production run of preparations
- **Formula:** A recipe combining multiple herbs

### B. Regulatory Considerations
- FDA compliance for dietary supplements
- HIPAA compliance for health information
- State licensing requirements
- Good Manufacturing Practices (GMP)
- FTC guidelines for health claims

### C. Third-Party Services
- AWS (Hosting)
- MySQL(Database)
- S3 (Image storage)
- Pusher (Real-time messaging)
- Resend (Email)
- Google Calendar API
- OAuth providers (Google, Facebook)

### D. Development Team Requirements
- Full-stack developer (Next.js/TypeScript)
- UI/UX designer
- Database administrator
- DevOps engineer
- Quality assurance tester
- Project manager
- Herbalist domain expert (consultant)

---

**Document Version:** 1.0.0  
**Created:** October 2025  
**Last Modified:** October 2025  
**Status:** Ready for Development  
**Approval:** Pending