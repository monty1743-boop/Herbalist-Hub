"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  TrendingUp,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Pill,
  Activity,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format, differenceInDays } from "date-fns"

interface TreatmentProgressProps {
  userId: string
}

interface TreatmentPlan {
  id: string
  name: string
  description: string
  practitioner: {
    id: string
    name: string
  }
  startDate: Date
  endDate: Date
  currentPhase: string
  totalPhases: number
  overallProgress: number
  status: "active" | "completed" | "paused" | "discontinued"
  nextMilestone: {
    title: string
    date: Date
    description: string
  }
  formulas: Array<{
    id: string
    name: string
    dosage: string
    frequency: string
    status: "active" | "completed" | "discontinued"
  }>
  goals: Array<{
    id: string
    title: string
    progress: number
    status: "on_track" | "needs_attention" | "achieved"
    lastUpdated: Date
  }>
  recentUpdates: Array<{
    id: string
    type: "adjustment" | "progress" | "milestone"
    title: string
    description: string
    date: Date
  }>
}

export function TreatmentProgress({ userId }: TreatmentProgressProps) {
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTreatmentProgress()
  }, [userId])

  const fetchTreatmentProgress = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockTreatmentPlan: TreatmentPlan = {
          id: "treatment1",
          name: "Digestive Health Protocol",
          description: "Comprehensive approach to restore digestive balance and energy",
          practitioner: {
            id: "dr1",
            name: "Dr. Sarah Chen"
          },
          startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
          currentPhase: "Phase 2: Restoration",
          totalPhases: 3,
          overallProgress: 65,
          status: "active",
          nextMilestone: {
            title: "Week 8 Assessment",
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            description: "Comprehensive review of digestive symptoms and energy levels"
          },
          formulas: [
            {
              id: "f1",
              name: "Digestive Harmony Blend",
              dosage: "1 tsp",
              frequency: "3x daily before meals",
              status: "active"
            },
            {
              id: "f2", 
              name: "Energy Support Formula",
              dosage: "2 capsules",
              frequency: "2x daily with breakfast and lunch",
              status: "active"
            },
            {
              id: "f3",
              name: "Liver Detox Tea",
              dosage: "1 cup",
              frequency: "Daily before bed",
              status: "completed"
            }
          ],
          goals: [
            {
              id: "g1",
              title: "Reduce Digestive Discomfort",
              progress: 80,
              status: "on_track",
              lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
              id: "g2",
              title: "Improve Energy Levels",
              progress: 70,
              status: "on_track", 
              lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: "g3",
              title: "Better Sleep Quality",
              progress: 45,
              status: "needs_attention",
              lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
          ],
          recentUpdates: [
            {
              id: "u1",
              type: "progress",
              title: "Significant Improvement in Digestion",
              description: "Patient reports 80% reduction in bloating and gas after meals",
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
              id: "u2",
              type: "adjustment",
              title: "Formula Dosage Adjustment",
              description: "Increased Energy Support Formula to optimize morning energy",
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          ]
        }
        
        setTreatmentPlan(mockTreatmentPlan)
        setLoading(false)
      }, 600)
    } catch (error) {
      console.error("Error fetching treatment progress:", error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "text-green-600"
      case "needs_attention": 
        return "text-yellow-600"
      case "achieved":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on_track":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "needs_attention":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "achieved":
        return <Target className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Treatment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="md" text="Loading treatment progress..." />
        </CardContent>
      </Card>
    )
  }

  if (!treatmentPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Treatment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Treatment Plan</h3>
            <p className="text-muted-foreground mb-4">
              Schedule a consultation to begin your personalized treatment journey
            </p>
            <Button asChild>
              <Link href="/appointments/book">
                Book Consultation
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const treatmentDuration = differenceInDays(treatmentPlan.endDate, treatmentPlan.startDate)
  const daysElapsed = differenceInDays(new Date(), treatmentPlan.startDate)
  const timeProgress = Math.min((daysElapsed / treatmentDuration) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Main Treatment Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {treatmentPlan.name}
              </CardTitle>
              <CardDescription>
                With {treatmentPlan.practitioner.name} • {treatmentPlan.currentPhase}
              </CardDescription>
            </div>
            <Badge variant={treatmentPlan.status === "active" ? "default" : "secondary"}>
              {treatmentPlan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{treatmentPlan.overallProgress}%</span>
            </div>
            <Progress value={treatmentPlan.overallProgress} className="h-2" />
          </div>

          {/* Time Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Time Progress</span>
              <span className="text-sm text-muted-foreground">
                Day {daysElapsed} of {treatmentDuration}
              </span>
            </div>
            <Progress value={timeProgress} className="h-1.5" />
          </div>

          {/* Next Milestone */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-primary">{treatmentPlan.nextMilestone.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {treatmentPlan.nextMilestone.description}
                </p>
                <p className="text-sm text-primary mt-2">
                  {formatDistanceToNow(treatmentPlan.nextMilestone.date, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{treatmentPlan.formulas.filter(f => f.status === "active").length}</p>
              <p className="text-sm text-muted-foreground">Active Formulas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {treatmentPlan.goals.filter(g => g.status === "on_track" || g.status === "achieved").length}
              </p>
              <p className="text-sm text-muted-foreground">Goals On Track</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{daysElapsed}</p>
              <p className="text-sm text-muted-foreground">Days Active</p>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href="/history">
              View Full Treatment History
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Current Formulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Current Formulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {treatmentPlan.formulas.filter(f => f.status === "active").map((formula) => (
              <div key={formula.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{formula.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formula.dosage} • {formula.frequency}
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Health Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {treatmentPlan.goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{goal.title}</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(goal.status)}
                    <span className="text-sm font-medium">{goal.progress}%</span>
                  </div>
                </div>
                <Progress value={goal.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Last updated {formatDistanceToNow(goal.lastUpdated, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}