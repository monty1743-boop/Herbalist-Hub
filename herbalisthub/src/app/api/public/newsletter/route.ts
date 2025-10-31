import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { z } from "zod"

const subscriptionSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  interests: z.array(z.string()).optional(),
  source: z.string().optional().default("WEBSITE"),
})

const unsubscribeSchema = z.object({
  email: z.string().email(),
  token: z.string().optional(),
})

// POST /api/public/newsletter - Subscribe to newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = subscriptionSchema.parse(body)

    // Check if subscription already exists
    const existingSubscription = await prisma.newsletterSubscription.findUnique({
      where: { email: data.email },
    })

    if (existingSubscription) {
      if (existingSubscription.status === "ACTIVE") {
        return NextResponse.json({
          success: true,
          message: "Email is already subscribed to our newsletter",
          isExisting: true,
        })
      } else {
        // Reactivate subscription
        await prisma.newsletterSubscription.update({
          where: { email: data.email },
          data: {
            status: "ACTIVE",
            firstName: data.firstName || existingSubscription.firstName,
            lastName: data.lastName || existingSubscription.lastName,
            interests: data.interests || existingSubscription.interests,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Successfully resubscribed to our newsletter",
          isReactivated: true,
        })
      }
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID()

    // Create new subscription
    const subscription = await prisma.newsletterSubscription.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        interests: data.interests,
        source: data.source,
        status: "ACTIVE",
        subscribedAt: new Date(),
        unsubscribeToken,
      },
    })

    // TODO: Send welcome email
    // await sendWelcomeEmail(subscription)

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to our newsletter",
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error("Error creating newsletter subscription:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid subscription data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to subscribe to newsletter" },
      { status: 500 }
    )
  }
}

// DELETE /api/public/newsletter - Unsubscribe from newsletter
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const token = searchParams.get("token")

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for unsubscribe" },
        { status: 400 }
      )
    }

    const data = unsubscribeSchema.parse({ email, token })

    // Find the subscription
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { email: data.email },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Email not found in our newsletter list" },
        { status: 404 }
      )
    }

    if (subscription.status === "UNSUBSCRIBED") {
      return NextResponse.json({
        success: true,
        message: "Email is already unsubscribed",
        isAlreadyUnsubscribed: true,
      })
    }

    // Verify token if provided (for link-based unsubscribe)
    if (data.token && subscription.unsubscribeToken !== data.token) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 400 }
      )
    }

    // Update subscription status
    await prisma.newsletterSubscription.update({
      where: { email: data.email },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from our newsletter",
    })
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid unsubscribe data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to unsubscribe from newsletter" },
      { status: 500 }
    )
  }
}

// GET /api/public/newsletter/preferences - Get newsletter preferences (for managing subscriptions)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const token = searchParams.get("token")

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      )
    }

    const subscription = await prisma.newsletterSubscription.findFirst({
      where: {
        email,
        unsubscribeToken: token,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found or invalid token" },
        { status: 404 }
      )
    }

    // Get available interest categories
    const availableInterests = [
      "Herbal Medicine",
      "Nutrition",
      "Wellness Tips",
      "Recipes & Formulas",
      "Events & Workshops",
      "Practice Updates",
    ]

    return NextResponse.json({
      subscription: {
        email: subscription.email,
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        interests: subscription.interests || [],
        status: subscription.status,
        subscribedAt: subscription.subscribedAt,
      },
      availableInterests,
    })
  } catch (error) {
    console.error("Error fetching newsletter preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}