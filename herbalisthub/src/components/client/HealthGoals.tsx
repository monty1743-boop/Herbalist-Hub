"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Calendar,
  Activity,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"

interface HealthGoalsProps {
  userId: string
  limit?: number
}

interface HealthGoal {
  id: string
  title: string
  description: string
  category: string
  targetValue?: number
  currentValue?: number
  unit?: string
  targetDate: Date
  status: "on_track" | "needs_attention" | "achieved" | "overdue"
  priority: "low" | "medium" | "high"
  createdAt: Date
  lastUpdated: Date
  progress: number
  milestones: Array<{
    id: string
    title: string
    completed: boolean
    completedAt?: Date
  }>
  recentEntries: Array<{
    id: string
    value: number
    date: Date
    notes?: string
  }>
}

export function HealthGoals({ userId, limit = 4 }: HealthGoalsProps) {
  const [goals, setGoals] = useState<HealthGoal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealthGoals()
  }, [userId])

  const fetchHealthGoals = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockGoals: HealthGoal[] = [
          {
            id: "goal1",
            title: "Improve Energy Levels",
            description: "Maintain consistent energy throughout the day without afternoon crashes",
            category: "Energy & Vitality",
            targetValue: 8,
            currentValue: 6.5,
            unit: "out of 10",
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            status: "on_track",
            priority: "high",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            progress: 75,
            milestones: [
              { id: "m1", title: "Complete first week of formula", completed: true, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
              { id: "m2", title: "Establish consistent sleep schedule", completed: true, completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
              { id: "m3", title: "Reach energy level 7/10 consistently", completed: false }
            ],
            recentEntries: [
              { id: "e1", value: 6.5, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), notes: "Good energy in morning, slight dip after lunch" },
              { id: "e2", value: 7, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), notes: "Best day yet! Consistent energy" }
            ]
          },
          {
            id: "goal2",
            title: "Reduce Digestive Discomfort",
            description: "Eliminate bloating and gas after meals",
            category: "Digestive Health",
            targetValue: 90,
            currentValue: 70,
            unit: "% improvement",
            targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            status: "on_track",
            priority: "high",
            createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            progress: 78,
            milestones: [
              { id: "m4", title: "Identify trigger foods", completed: true, completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
              { id: "m5", title: "Complete digestive reset phase", completed: true, completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
              { id: "m6", title: "Achieve 80% improvement", completed: false }
            ],
            recentEntries: [
              { id: "e3", value: 70, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), notes: "Much better today, only minor bloating" },
              { id: "e4", value: 65, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), notes: "Had dairy yesterday, some discomfort" }
            ]
          },
          {
            id: "goal3",
            title: "Better Sleep Quality",
            description: "Get 7-8 hours of restful sleep consistently",
            category: "Sleep & Recovery",
            targetValue: 8,
            currentValue: 6,
            unit: "hours",
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "needs_attention",
            priority: "medium",
            createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            progress: 45,
            milestones: [
              { id: "m7", title: "Establish bedtime routine", completed: true, completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
              { id: "m8", title: "Consistent 7+ hours for a week", completed: false },
              { id: "m9", title: "Improve sleep quality score", completed: false }
            ],
            recentEntries: [
              { id: "e5", value: 6, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), notes: "Woke up once during night" },
              { id: "e6", value: 5.5, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), notes: "Difficult to fall asleep" }
            ]
          },
          {
            id: "goal4",
            title: "Stress Management",
            description: "Develop effective stress coping strategies",
            category: "Mental Wellness",
            targetValue: 3,
            currentValue: 5.5,
            unit: "stress level (1-10)",
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: "on_track",
            priority: "medium",
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            progress: 35,
            milestones: [
              { id: "m10", title: "Learn meditation techniques", completed: true, completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
              { id: "m11", title: "Practice daily for 2 weeks", completed: false },
              { id: "m12", title: "Achieve stress level below 4", completed: false }
            ],
            recentEntries: [
              { id: "e7", value: 5.5, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), notes: "Work was stressful but meditation helped" },
              { id: "e8", value: 6, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), notes: "High stress day, forgot to meditate" }
            ]
          }
        ]
        
        setGoals(mockGoals.slice(0, limit))
        setLoading(false)
      }, 400)
    } catch (error) {
      console.error("Error fetching health goals:", error)
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "achieved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "on_track":
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      case "needs_attention":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "overdue":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "achieved":
        return "bg-green-50 text-green-700 border-green-200"
      case "on_track":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "needs_attention":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "overdue":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Health Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="md" text="Loading health goals..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Health Goals
            </CardTitle>
            <CardDescription>
              Track your progress towards better health
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/goals">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <div className="space-y-6">
            {goals.map((goal) => (
              <div key={goal.id} className="border rounded-lg p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{goal.title}</h3>
                      <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                    <Badge className={getStatusColor(goal.status)}>
                      {getStatusIcon(goal.status)}
                      <span className="ml-1">{goal.status.replace("_", " ")}</span>
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-bold">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                {/* Current vs Target */}
                {goal.targetValue && goal.currentValue && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-semibold">
                        {goal.currentValue} {goal.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="font-semibold">
                        {goal.targetValue} {goal.unit}
                      </p>
                    </div>
                  </div>
                )}

                {/* Target Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Target: {format(goal.targetDate, "MMM d, yyyy")}</span>
                  <span>({formatDistanceToNow(goal.targetDate, { addSuffix: true })})</span>
                </div>

                {/* Milestones Progress */}
                <div>
                  <p className="text-sm font-medium mb-2">Milestones</p>
                  <div className="space-y-1">
                    {goal.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2 text-sm">
                        {milestone.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 border border-gray-300 rounded-full" />
                        )}
                        <span className={milestone.completed ? "text-green-700" : "text-muted-foreground"}>
                          {milestone.title}
                        </span>
                        {milestone.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(milestone.completedAt, { addSuffix: true })})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest Entry */}
                {goal.recentEntries.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">Latest Entry</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {goal.recentEntries[0].value} {goal.unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(goal.recentEntries[0].date, { addSuffix: true })}
                      </span>
                    </div>
                    {goal.recentEntries[0].notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        "{goal.recentEntries[0].notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Health Goals Set</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your health journey by setting meaningful goals
            </p>
            <Button asChild>
              <Link href="/goals/new">
                <Plus className="h-4 w-4 mr-2" />
                Set Your First Goal
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}