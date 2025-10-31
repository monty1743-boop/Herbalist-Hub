import { create } from "zustand"
import { persist } from "zustand/middleware"

// UI state interface
interface UIState {
  // Theme
  theme: "light" | "dark" | "system"
  
  // Navigation
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Modals
  modals: {
    [key: string]: {
      isOpen: boolean
      data?: any
    }
  }
  
  // Notifications/Toasts
  notifications: Array<{
    id: string
    type: "success" | "error" | "warning" | "info"
    title: string
    description?: string
    timestamp: number
    duration?: number
  }>
  
  // Loading states
  globalLoading: boolean
  loadingStates: {
    [key: string]: boolean
  }
  
  // Preferences
  preferences: {
    language: string
    timezone: string
    dateFormat: string
    currency: string
    itemsPerPage: number
    showHelpTooltips: boolean
    enableSounds: boolean
    enablePushNotifications: boolean
  }
  
  // Actions
  setTheme: (theme: UIState["theme"]) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Modal actions
  openModal: (modalId: string, data?: any) => void
  closeModal: (modalId: string) => void
  closeAllModals: () => void
  isModalOpen: (modalId: string) => boolean
  getModalData: (modalId: string) => any
  
  // Notification actions
  addNotification: (notification: Omit<UIState["notifications"][0], "id" | "timestamp">) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  setLoading: (key: string, loading: boolean) => void
  isLoading: (key: string) => boolean
  
  // Preference actions
  setPreference: <K extends keyof UIState["preferences"]>(
    key: K,
    value: UIState["preferences"][K]
  ) => void
  setPreferences: (preferences: Partial<UIState["preferences"]>) => void
  resetPreferences: () => void
}

const defaultPreferences: UIState["preferences"] = {
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: "MM/dd/yyyy",
  currency: "USD",
  itemsPerPage: 20,
  showHelpTooltips: true,
  enableSounds: true,
  enablePushNotifications: true,
}

// Create UI store
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: "system",
      sidebarOpen: true,
      sidebarCollapsed: false,
      modals: {},
      notifications: [],
      globalLoading: false,
      loadingStates: {},
      preferences: defaultPreferences,
      
      // Theme actions
      setTheme: (theme) => set(() => ({ theme })),
      
      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (sidebarOpen) => set(() => ({ sidebarOpen })),
      
      setSidebarCollapsed: (sidebarCollapsed) =>
        set(() => ({ sidebarCollapsed })),
      
      // Modal actions
      openModal: (modalId, data) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: { isOpen: true, data },
          },
        })),
      
      closeModal: (modalId) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: { isOpen: false, data: undefined },
          },
        })),
      
      closeAllModals: () => set(() => ({ modals: {} })),
      
      isModalOpen: (modalId) => {
        const state = get()
        return state.modals[modalId]?.isOpen || false
      },
      
      getModalData: (modalId) => {
        const state = get()
        return state.modals[modalId]?.data
      },
      
      // Notification actions
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(2, 15)
        const timestamp = Date.now()
        
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id, timestamp },
          ],
        }))
        
        // Auto-remove notification after duration
        const duration = notification.duration || 5000
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, duration)
        }
      },
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () => set(() => ({ notifications: [] })),
      
      // Loading actions
      setGlobalLoading: (globalLoading) => set(() => ({ globalLoading })),
      
      setLoading: (key, loading) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        })),
      
      isLoading: (key) => {
        const state = get()
        return state.loadingStates[key] || false
      },
      
      // Preference actions
      setPreference: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        })),
      
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
          },
        })),
      
      resetPreferences: () =>
        set(() => ({ preferences: defaultPreferences })),
    }),
    {
      name: "herbalisthub-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        preferences: state.preferences,
      }),
    }
  )
)

// Selectors for better performance
export const useTheme = () => useUIStore((state) => state.theme)
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen)
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed)
export const useNotifications = () => useUIStore((state) => state.notifications)
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading)
export const usePreferences = () => useUIStore((state) => state.preferences)

// Modal hooks
export const useModal = (modalId: string) => {
  const isOpen = useUIStore((state) => state.isModalOpen(modalId))
  const data = useUIStore((state) => state.getModalData(modalId))
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  
  return {
    isOpen,
    data,
    open: (data?: any) => openModal(modalId, data),
    close: () => closeModal(modalId),
  }
}

// Loading hook
export const useLoadingState = (key: string) => {
  const isLoading = useUIStore((state) => state.isLoading(key))
  const setLoading = useUIStore((state) => state.setLoading)
  
  return {
    isLoading,
    setLoading: (loading: boolean) => setLoading(key, loading),
  }
}

// Notification hook
export const useNotification = () => {
  const addNotification = useUIStore((state) => state.addNotification)
  
  return {
    success: (title: string, description?: string, duration?: number) =>
      addNotification({ type: "success", title, description, duration }),
    error: (title: string, description?: string, duration?: number) =>
      addNotification({ type: "error", title, description, duration }),
    warning: (title: string, description?: string, duration?: number) =>
      addNotification({ type: "warning", title, description, duration }),
    info: (title: string, description?: string, duration?: number) =>
      addNotification({ type: "info", title, description, duration }),
  }
}