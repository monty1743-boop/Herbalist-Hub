# Database Specification - HerbalistHub

## Tech Stack
- **Database:** MySQL
- **ORM:** Prisma
- **Framework:** Next.js 14 + TypeScript

## Required Models

### Authentication
```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  emailVerified    DateTime?
  name             String?
  role             Role      @default(CLIENT)
  image            String?
  accounts         Account[]
  sessions         Session[]
  appointments     Appointment[]
  messages         Message[]
  intakeSubmissions IntakeSubmission[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum Role {
  ADMIN
  CLIENT  
  PUBLIC
}
```

### Inventory Management
```prisma
model Herb {
  id               String    @id @default(cuid())
  name             String
  latinName        String?
  type             HerbType
  quantity         Float
  unit             String
  supplier         String?
  batchNumber      String?
  harvestDate      DateTime?
  expirationDate   DateTime?
  location         String?
  storageConditions Json?
  notes            String?
  image            String?
  preparations     Preparation[]
  formulaIngredients FormulaIngredient[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
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

model Preparation {
  id               String    @id @default(cuid())
  name             String
  type             PreparationType
  herbs            Herb[]
  menstruumRatio   String?
  macerationStart  DateTime?
  macerationEnd    DateTime?
  yield            Float?
  yieldUnit        String?
  batchNumber      String
  shelfLife        Int?
  cost             Decimal?
  price            Decimal?
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
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
```

### Formulas
```prisma
model Formula {
  id               String    @id @default(cuid())
  name             String
  description      String?
  ingredients      FormulaIngredient[]
  instructions     String
  dosage           String?
  contraindications String?
  isPublic         Boolean   @default(false)
  version          Int       @default(1)
  blogPosts        BlogPost[]
  discussions      Discussion[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model FormulaIngredient {
  id        String  @id @default(cuid())
  formulaId String
  formula   Formula @relation(fields: [formulaId], references: [id])
  herbId    String
  herb      Herb    @relation(fields: [herbId], references: [id])
  quantity  Float
  unit      String
  notes     String?
}
```

### Client Management
```prisma
model IntakeForm {
  id          String    @id @default(cuid())
  name        String
  description String?
  fields      Json
  isActive    Boolean   @default(true)
  submissions IntakeSubmission[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model IntakeSubmission {
  id         String     @id @default(cuid())
  formId     String
  form       IntakeForm @relation(fields: [formId], references: [id])
  userId     String
  user       User       @relation(fields: [userId], references: [id])
  responses  Json
  submittedAt DateTime  @default(now())
}

model Appointment {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  startTime     DateTime
  endTime       DateTime
  type          String
  status        AppointmentStatus
  notes         String?
  googleEventId String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

### Content & Communication
```prisma
model BlogPost {
  id           String    @id @default(cuid())
  title        String
  slug         String    @unique
  content      String
  excerpt      String?
  featuredImage String?
  published    Boolean   @default(false)
  publishedAt  DateTime?
  categories   Category[]
  tags         Tag[]
  formulaId    String?
  formula      Formula?  @relation(fields: [formulaId], references: [id])
  discussions  Discussion[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Event {
  id           String    @id @default(cuid())
  title        String
  description  String
  startDateTime DateTime
  endDateTime  DateTime
  location     String?
  virtualLink  String?
  maxAttendees Int?
  registrations EventRegistration[]
  image        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Message {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  subject   String
  content   String
  isRead    Boolean  @default(false)
  adminReply String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Requirements
1. MySQL compatible schema
2. Include proper relationships and foreign keys
3. Add indexes for performance on frequently queried fields
4. Include audit fields (createdAt, updatedAt) on all models
5. Use appropriate data types (String, DateTime, Json, Decimal, etc.)
6. Add constraints and defaults where appropriate
7. Support for HIPAA compliance with proper data handling