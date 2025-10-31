# UI Components Specification - HerbalistHub

## Tech Stack
- **Framework:** React + Next.js 14 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Forms:** react-hook-form + Zod validation
- **State:** Zustand + React Query
- **Icons:** Lucide React

## Required Component Categories

### Form Components
```typescript
// HerbForm - Create/edit herb inventory
interface HerbFormProps {
  herb?: Herb;
  onSubmit: (data: HerbFormData) => void;
  isLoading?: boolean;
}

// ClientForm - Client information management
interface ClientFormProps {
  client?: User;
  onSubmit: (data: ClientFormData) => void;
  isLoading?: boolean;
}

// IntakeForm - Dynamic intake form builder
interface IntakeFormProps {
  form: IntakeForm;
  onSubmit: (responses: Record<string, any>) => void;
  isLoading?: boolean;
}

// FormulaForm - Create/edit herbal formulas
interface FormulaFormProps {
  formula?: Formula;
  onSubmit: (data: FormulaFormData) => void;
  isLoading?: boolean;
}

// AppointmentForm - Appointment scheduling
interface AppointmentFormProps {
  appointment?: Appointment;
  availableSlots: TimeSlot[];
  onSubmit: (data: AppointmentFormData) => void;
  isLoading?: boolean;
}
```

### List Components
```typescript
// HerbList - Inventory display with search/filter
interface HerbListProps {
  herbs: Herb[];
  onEdit: (herb: Herb) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  filters: HerbFilters;
  onFilterChange: (filters: HerbFilters) => void;
}

// ClientList - Client management
interface ClientListProps {
  clients: User[];
  onEdit: (client: User) => void;
  onView: (client: User) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
}

// AppointmentList - Calendar view with status
interface AppointmentListProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  view: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

// FormulaList - Recipe management
interface FormulaListProps {
  formulas: Formula[];
  onEdit: (formula: Formula) => void;
  onTogglePublic: (id: string) => void;
  showPublicOnly?: boolean;
}
```

### Card Components
```typescript
// HerbCard - Individual herb display
interface HerbCardProps {
  herb: Herb;
  onEdit: () => void;
  onDelete: () => void;
  showActions?: boolean;
}

// ClientCard - Client summary display
interface ClientCardProps {
  client: User;
  onView: () => void;
  onMessage: () => void;
  lastAppointment?: Appointment;
}

// EventCard - Event promotion
interface EventCardProps {
  event: Event;
  onRegister?: () => void;
  isRegistered?: boolean;
  showRegistration?: boolean;
}

// FormulaCard - Recipe display
interface FormulaCardProps {
  formula: Formula;
  onView: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}
```

### Navigation Components
```typescript
// Header - Main site navigation
interface HeaderProps {
  user?: User;
  onSignOut: () => void;
}

// Sidebar - Admin dashboard navigation
interface SidebarProps {
  currentPath: string;
  isCollapsed?: boolean;
  onToggle: () => void;
}

// Breadcrumbs - Page navigation
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

// TabNavigation - Section switching
interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}
```

### Modal Components
```typescript
// ConfirmDialog - Confirmation prompts
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

// FormModal - Modal wrapper for forms
interface FormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ImageModal - Image gallery viewer
interface ImageModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

### Layout Components
```typescript
// DashboardLayout - Admin interface wrapper
interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// PublicLayout - Public site wrapper
interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

// PageLayout - Generic page structure
interface PageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}
```

### Utility Components
```typescript
// LoadingSpinner - Loading states
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

// EmptyState - No data display
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

// SearchInput - Search functionality
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

// DataTable - Generic table with sorting/pagination
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination?: PaginationConfig;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
}
```

## Implementation Requirements

### Styling Guidelines
- Use Tailwind CSS for all styling
- Implement shadcn/ui components as base
- Responsive design (mobile-first approach)
- Dark mode support via CSS variables
- Consistent spacing using Tailwind scale
- Accessible color contrast ratios

### Component Patterns
- TypeScript interfaces for all props
- Default props and prop validation
- Error boundaries for complex components
- Loading and error states
- Responsive behavior
- Keyboard navigation support

### Form Validation
- react-hook-form integration
- Zod schema validation
- Real-time validation feedback
- Accessible error messaging
- File upload handling
- Form persistence (draft saving)

### State Management
- React Query for server state
- Zustand for client state
- Optimistic updates
- Cache invalidation
- Error handling and retry logic

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- Focus management
- ARIA labels and descriptions
- Color contrast validation