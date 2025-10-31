import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Role } from "@prisma/client"

// Authentication state interface
interface AuthState {
  // User data
  user: {
    id: string
    name: string | null
    email: string
    role: Role
    image: string | null
  } | null
  
  // Session state
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: AuthState["user"]) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Helper methods
  isHerbalist: () => boolean
  isAdmin: () => boolean
  isClient: () => boolean
  hasRole: (roles: Role[]) => boolean
}

// Create authentication store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Actions
      setUser: (user) =>
        set(() => ({
          user,
          isAuthenticated: !!user,
          error: null,
        })),
      
      clearUser: () =>
        set(() => ({
          user: null,
          isAuthenticated: false,
          error: null,
        })),
      
      setLoading: (isLoading) => set(() => ({ isLoading })),
      
      setError: (error) => set(() => ({ error })),
      
      // Helper methods
      isHerbalist: () => {
        const state = get()
        return state.user?.role === Role.HERBALIST || state.user?.role === Role.ADMIN
      },
      
      isAdmin: () => {
        const state = get()
        return state.user?.role === Role.ADMIN
      },
      
      isClient: () => {
        const state = get()
        return state.user?.role === Role.CLIENT
      },
      
      hasRole: (roles) => {
        const state = get()
        return state.user ? roles.includes(state.user.role) : false
      },
    }),
    {
      name: "herbalisthub-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)

// Role-based selectors
export const useIsHerbalist = () => useAuthStore((state) => state.isHerbalist())
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin())
export const useIsClient = () => useAuthStore((state) => state.isClient())