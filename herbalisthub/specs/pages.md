# Pages Specification - HerbalistHub

## Tech Stack
- **Framework:** Next.js 14 App Router + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** NextAuth.js middleware
- **Data Fetching:** React Query + Server Components
- **SEO:** Next.js metadata API

## Required Pages Structure

### Public Pages
```typescript
// app/page.tsx - Landing page
interface LandingPageProps {
  featuredPosts: BlogPost[];
  upcomingEvents: Event[];
  publicFormulas: Formula[];
}

// app/blog/page.tsx - Blog listing
interface BlogPageProps {
  searchParams: {
    category?: string;
    tag?: string;
    search?: string;
    page?: string;
  };
}

// app/blog/[slug]/page.tsx - Individual blog post
interface BlogPostPageProps {
  params: { slug: string };
}

// app/formulas/page.tsx - Public formula gallery
interface FormulasPageProps {
  searchParams: {
    search?: string;
    category?: string;
    page?: string;
  };
}

// app/formulas/[id]/page.tsx - Formula detail view
interface FormulaDetailPageProps {
  params: { id: string };
}

// app/events/page.tsx - Events calendar
interface EventsPageProps {
  searchParams: {
    month?: string;
    year?: string;
  };
}

// app/events/[id]/page.tsx - Event details
interface EventDetailPageProps {
  params: { id: string };
}
```

### Authentication Pages
```typescript
// app/auth/signin/page.tsx - Sign in
interface SignInPageProps {
  searchParams: {
    callbackUrl?: string;
    error?: string;
  };
}

// app/auth/signup/page.tsx - Registration
interface SignUpPageProps {
  searchParams: {
    callbackUrl?: string;
  };
}

// app/auth/verify/page.tsx - Email verification
interface VerifyPageProps {
  searchParams: {
    token?: string;
    email?: string;
  };
}
```

### Dashboard Pages (Admin)
```typescript
// app/dashboard/page.tsx - Admin overview
interface DashboardPageProps {
  // Server component - fetch stats
  stats: {
    totalHerbs: number;
    totalClients: number;
    upcomingAppointments: number;
    lowStockItems: number;
  };
}

// app/dashboard/herbs/page.tsx - Herb inventory management
interface HerbInventoryPageProps {
  searchParams: {
    search?: string;
    type?: HerbType;
    status?: 'all' | 'low-stock' | 'expired';
    page?: string;
  };
}

// app/dashboard/herbs/[id]/page.tsx - Individual herb details
interface HerbDetailPageProps {
  params: { id: string };
}

// app/dashboard/herbs/new/page.tsx - Add new herb
interface NewHerbPageProps {}

// app/dashboard/clients/page.tsx - Client management
interface ClientManagementPageProps {
  searchParams: {
    search?: string;
    status?: 'active' | 'inactive';
    page?: string;
  };
}

// app/dashboard/clients/[id]/page.tsx - Client profile
interface ClientProfilePageProps {
  params: { id: string };
  // Show appointment history, intake forms, messages
}

// app/dashboard/appointments/page.tsx - Appointment calendar
interface AppointmentCalendarPageProps {
  searchParams: {
    view?: 'calendar' | 'list';
    month?: string;
    year?: string;
  };
}

// app/dashboard/formulas/page.tsx - Formula management
interface FormulaManagementPageProps {
  searchParams: {
    search?: string;
    status?: 'public' | 'private';
    page?: string;
  };
}

// app/dashboard/formulas/[id]/page.tsx - Formula editor
interface FormulaEditorPageProps {
  params: { id: string };
}

// app/dashboard/formulas/new/page.tsx - Create formula
interface NewFormulaPageProps {}
```

### Client Portal Pages
```typescript
// app/portal/page.tsx - Client dashboard
interface ClientPortalPageProps {
  // Show upcoming appointments, messages, intake forms
  user: User;
  upcomingAppointments: Appointment[];
  unreadMessages: Message[];
  pendingIntakeForms: IntakeForm[];
}

// app/portal/appointments/page.tsx - Client appointments
interface ClientAppointmentsPageProps {
  searchParams: {
    status?: AppointmentStatus;
    page?: string;
  };
}

// app/portal/appointments/book/page.tsx - Book appointment
interface BookAppointmentPageProps {
  searchParams: {
    date?: string;
    time?: string;
  };
}

// app/portal/messages/page.tsx - Client messages
interface ClientMessagesPageProps {
  searchParams: {
    page?: string;
  };
}

// app/portal/intake/[formId]/page.tsx - Fill intake form
interface IntakeFormPageProps {
  params: { formId: string };
}

// app/portal/history/page.tsx - Treatment history
interface TreatmentHistoryPageProps {
  user: User;
  appointments: Appointment[];
  formSubmissions: IntakeSubmission[];
}
```

## Page Implementation Requirements

### Layout Structure
```typescript
// app/layout.tsx - Root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <SessionProvider>
          <QueryClient>
            <Navigation />
            <main>{children}</main>
            <Footer />
          </QueryClient>
        </SessionProvider>
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx - Dashboard layout
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

### Authentication Guards
```typescript
// Middleware for protected routes
export function middleware(request: NextRequest) {
  // Check authentication for /dashboard and /portal routes
  // Redirect unauthenticated users to /auth/signin
  // Check role permissions (admin vs client)
}

// Auth guards in page components
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/signin');
  }
  
  // Page content...
}
```

### Data Fetching Patterns
```typescript
// Server Components - Direct database access
async function getHerbs(searchParams: SearchParams) {
  const herbs = await prisma.herb.findMany({
    where: buildWhereClause(searchParams),
    include: { preparations: true },
    orderBy: { createdAt: 'desc' },
  });
  return herbs;
}

// Client Components - React Query
function useHerbs(filters: HerbFilters) {
  return useQuery({
    queryKey: ['herbs', filters],
    queryFn: () => fetchHerbs(filters),
  });
}
```

### SEO & Metadata
```typescript
// Static metadata
export const metadata: Metadata = {
  title: 'HerbalistHub - Professional Herbal Practice Management',
  description: 'Comprehensive platform for herbalists...',
};

// Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.featuredImage],
    },
  };
}
```

### Error Handling
```typescript
// app/error.tsx - Global error boundary
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/not-found.tsx - 404 page
export default function NotFound() {
  return (
    <div className="not-found-page">
      <h2>Page Not Found</h2>
      <p>Could not find the requested resource.</p>
    </div>
  );
}
```

### Loading States
```typescript
// app/dashboard/loading.tsx - Dashboard loading
export default function Loading() {
  return (
    <div className="dashboard-loading">
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
```

## Responsive Design Requirements
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interface on mobile
- Collapsible navigation on smaller screens
- Optimized table layouts for mobile
- Progressive enhancement for advanced features