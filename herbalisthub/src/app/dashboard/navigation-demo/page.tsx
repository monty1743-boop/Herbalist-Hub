import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/navigation"
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Navigation,
  Menu,
  Sidebar,
  ChevronRight
} from "lucide-react"

export const metadata: Metadata = {
  title: "Navigation Demo | HerbalistHub",
  description: "Demonstration of responsive navigation components",
}

export default function NavigationDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Responsive Navigation System
        </h1>
        <p className="text-muted-foreground mt-2">
          A comprehensive navigation system that adapts to different screen sizes and devices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mobile Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              Mobile Navigation
            </CardTitle>
            <CardDescription>
              Optimized for smartphones and small screens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Slide-out sidebar menu</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Bottom navigation bar</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Touch-optimized buttons</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Gesture-friendly navigation</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Breakpoint:</strong> &lt; 768px
              </p>
              <p className="text-sm text-gray-600">
                Features a hamburger menu that opens a full-screen sidebar with all navigation options.
                Also includes a bottom navigation bar for quick access to key features.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tablet Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tablet className="h-5 w-5 text-green-600" />
              Tablet Navigation
            </CardTitle>
            <CardDescription>
              Hybrid approach for medium screens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Overlay sidebar menu</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Larger touch targets</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Expanded search bar</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Role-based filtering</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Breakpoint:</strong> 768px - 1024px
              </p>
              <p className="text-sm text-gray-600">
                Uses a slide-out sidebar similar to mobile but with larger dimensions and 
                enhanced touch targets optimized for tablet usage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-purple-600" />
              Desktop Navigation
            </CardTitle>
            <CardDescription>
              Full-featured for large screens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Fixed sidebar navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Collapsible sidebar</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Tooltip navigation when collapsed</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Feature</Badge>
                <span className="text-sm">Full search functionality</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Breakpoint:</strong> &gt;= 1024px
              </p>
              <p className="text-sm text-gray-600">
                Features a persistent sidebar that can be collapsed to save space. 
                When collapsed, shows tooltips on hover for navigation items.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-orange-600" />
              Navigation Features
            </CardTitle>
            <CardDescription>
              Advanced features across all screen sizes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Smart</Badge>
                <span className="text-sm">Role-based navigation filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Smart</Badge>
                <span className="text-sm">Active route highlighting</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Smart</Badge>
                <span className="text-sm">Notification badges</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Smart</Badge>
                <span className="text-sm">Breadcrumb navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Smart</Badge>
                <span className="text-sm">Auto-close on route change</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                The navigation system automatically adapts based on user roles, 
                showing only relevant menu items. It includes real-time notification 
                badges and smart breadcrumb generation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsive Breakpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Breakpoints</CardTitle>
          <CardDescription>
            How the navigation adapts at different screen sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Mobile</h3>
              <p className="text-sm text-gray-600 mt-1">&lt; 768px</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <Menu className="h-3 w-3" />
                  <span>Hamburger menu</span>
                </div>
                <div className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  <span>Bottom nav bar</span>
                </div>
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Tablet className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Tablet</h3>
              <p className="text-sm text-gray-600 mt-1">768px - 1024px</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <Sidebar className="h-3 w-3" />
                  <span>Overlay sidebar</span>
                </div>
                <div className="flex items-center gap-1">
                  <Menu className="h-3 w-3" />
                  <span>Touch optimized</span>
                </div>
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold">Desktop</h3>
              <p className="text-sm text-gray-600 mt-1">&gt;= 1024px</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <Sidebar className="h-3 w-3" />
                  <span>Fixed sidebar</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <span>Collapsible</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Navigation Demo (Mobile Only) */}
      <BottomNavigation className="relative position-static md:hidden bg-gray-100 border border-gray-200 rounded-lg" />
    </div>
  )
}