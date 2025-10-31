import { NextRequest, NextResponse } from "next/server"
import { FormulaPublishing } from "@/lib/formulas/publishing"

// GET - Get published formulas (public library)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const options = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      category: searchParams.get("category") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || "publishedAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }

    // Validate pagination limits
    if (options.limit > 100) {
      options.limit = 100
    }

    if (options.page < 1) {
      options.page = 1
    }

    // Get published formulas
    const result = await FormulaPublishing.getPublishedFormulas(options)

    return NextResponse.json({
      success: true,
      formulas: result.formulas,
      pagination: result.pagination,
      filters: {
        categories: [
          "digestive", "respiratory", "nervous", "immune", 
          "cardiovascular", "detox", "womens-health", "mens-health", 
          "topical", "general"
        ],
        difficulties: ["beginner", "intermediate", "advanced"],
        sortOptions: [
          { value: "publishedAt", label: "Recently Published" },
          { value: "name", label: "Name" },
          { value: "difficulty", label: "Difficulty" },
          { value: "finalPrice", label: "Price" },
        ]
      }
    })
  } catch (error) {
    console.error("Error fetching public formulas:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}