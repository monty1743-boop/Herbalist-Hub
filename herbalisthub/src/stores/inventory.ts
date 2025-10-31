import { create } from "zustand"
import { Herb, HerbType } from "@prisma/client"

// Inventory state interface
interface InventoryState {
  // Data
  herbs: Herb[]
  selectedHerb: Herb | null
  
  // UI state
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: {
    type?: HerbType
    supplier?: string
    lowStock?: boolean
    expiringSoon?: boolean
    qualityGrade?: string
  }
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Sorting
  sortBy: "name" | "quantity" | "expirationDate" | "costPerUnit" | "createdAt"
  sortOrder: "asc" | "desc"
  
  // Actions
  setHerbs: (herbs: Herb[]) => void
  addHerb: (herb: Herb) => void
  updateHerb: (id: string, updates: Partial<Herb>) => void
  removeHerb: (id: string) => void
  setSelectedHerb: (herb: Herb | null) => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: Partial<InventoryState["filters"]>) => void
  clearFilters: () => void
  
  // Pagination actions
  setPagination: (pagination: Partial<InventoryState["pagination"]>) => void
  setPage: (page: number) => void
  
  // Sorting actions
  setSorting: (sortBy: InventoryState["sortBy"], sortOrder: InventoryState["sortOrder"]) => void
  
  // Helper methods
  getFilteredHerbs: () => Herb[]
  getLowStockHerbs: () => Herb[]
  getExpiringSoonHerbs: () => Herb[]
  getTotalValue: () => number
  getHerbById: (id: string) => Herb | undefined
}

// Create inventory store
export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial state
  herbs: [],
  selectedHerb: null,
  isLoading: false,
  error: null,
  searchQuery: "",
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  sortBy: "name",
  sortOrder: "asc",
  
  // Actions
  setHerbs: (herbs) => set(() => ({ herbs })),
  
  addHerb: (herb) =>
    set((state) => ({
      herbs: [...state.herbs, herb],
    })),
  
  updateHerb: (id, updates) =>
    set((state) => ({
      herbs: state.herbs.map((herb) =>
        herb.id === id ? { ...herb, ...updates } : herb
      ),
      selectedHerb:
        state.selectedHerb?.id === id
          ? { ...state.selectedHerb, ...updates }
          : state.selectedHerb,
    })),
  
  removeHerb: (id) =>
    set((state) => ({
      herbs: state.herbs.filter((herb) => herb.id !== id),
      selectedHerb: state.selectedHerb?.id === id ? null : state.selectedHerb,
    })),
  
  setSelectedHerb: (herb) => set(() => ({ selectedHerb: herb })),
  
  // UI actions
  setLoading: (isLoading) => set(() => ({ isLoading })),
  setError: (error) => set(() => ({ error })),
  setSearchQuery: (searchQuery) => set(() => ({ searchQuery })),
  
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  
  clearFilters: () => set(() => ({ filters: {} })),
  
  // Pagination actions
  setPagination: (newPagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    })),
  
  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),
  
  // Sorting actions
  setSorting: (sortBy, sortOrder) => set(() => ({ sortBy, sortOrder })),
  
  // Helper methods
  getFilteredHerbs: () => {
    const state = get()
    let filtered = state.herbs
    
    // Apply search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (herb) =>
          herb.name.toLowerCase().includes(query) ||
          herb.latinName?.toLowerCase().includes(query) ||
          herb.description?.toLowerCase().includes(query)
      )
    }
    
    // Apply filters
    if (state.filters.type) {
      filtered = filtered.filter((herb) => herb.type === state.filters.type)
    }
    
    if (state.filters.supplier) {
      filtered = filtered.filter((herb) => herb.supplier === state.filters.supplier)
    }
    
    if (state.filters.lowStock) {
      filtered = filtered.filter((herb) => {
        const minStock = herb.minimumStock || 0
        return Number(herb.quantity) <= Number(minStock)
      })
    }
    
    if (state.filters.expiringSoon) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      
      filtered = filtered.filter((herb) => {
        if (!herb.expirationDate) return false
        return new Date(herb.expirationDate) <= thirtyDaysFromNow
      })
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (state.sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "quantity":
          aValue = Number(a.quantity)
          bValue = Number(b.quantity)
          break
        case "expirationDate":
          aValue = a.expirationDate ? new Date(a.expirationDate) : new Date(0)
          bValue = b.expirationDate ? new Date(b.expirationDate) : new Date(0)
          break
        case "costPerUnit":
          aValue = Number(a.costPerUnit || 0)
          bValue = Number(b.costPerUnit || 0)
          break
        case "createdAt":
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        default:
          return 0
      }
      
      if (state.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    
    return filtered
  },
  
  getLowStockHerbs: () => {
    const state = get()
    return state.herbs.filter((herb) => {
      const minStock = herb.minimumStock || 0
      return Number(herb.quantity) <= Number(minStock)
    })
  },
  
  getExpiringSoonHerbs: () => {
    const state = get()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    return state.herbs.filter((herb) => {
      if (!herb.expirationDate) return false
      return new Date(herb.expirationDate) <= thirtyDaysFromNow
    })
  },
  
  getTotalValue: () => {
    const state = get()
    return state.herbs.reduce((total, herb) => {
      const quantity = Number(herb.quantity)
      const cost = Number(herb.costPerUnit || 0)
      return total + quantity * cost
    }, 0)
  },
  
  getHerbById: (id) => {
    const state = get()
    return state.herbs.find((herb) => herb.id === id)
  },
}))

// Selectors for better performance
export const useHerbs = () => useInventoryStore((state) => state.herbs)
export const useSelectedHerb = () => useInventoryStore((state) => state.selectedHerb)
export const useInventoryLoading = () => useInventoryStore((state) => state.isLoading)
export const useInventoryError = () => useInventoryStore((state) => state.error)
export const useInventoryFilters = () => useInventoryStore((state) => state.filters)
export const useFilteredHerbs = () => useInventoryStore((state) => state.getFilteredHerbs())
export const useLowStockHerbs = () => useInventoryStore((state) => state.getLowStockHerbs())
export const useExpiringSoonHerbs = () => useInventoryStore((state) => state.getExpiringSoonHerbs())
export const useInventoryTotalValue = () => useInventoryStore((state) => state.getTotalValue())