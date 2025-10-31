"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Target,
  BarChart3,
  LineChart
} from "lucide-react"
import { format, subDays, differenceInDays } from "date-fns"

interface ProgressVisualizationProps {
  userId: string
}

interface ProgressMetric {
  id: string
  name: string
  unit: string
  currentValue: number
  targetValue?: number
  category: "symptoms" | "energy" | "sleep" | "wellness"
  data: Array<{
    date: Date
    value: number
    notes?: string
  }>
  trend: "improving" | "declining" | "stable"
  trendPercentage: number
}

interface Milestone {
  id: string
  title: string
  description: string
  targetDate: Date
  achieved: boolean
  achievedDate?: Date
  category: string
  impact: string
}

export function ProgressVisualization({ userId }: ProgressVisualizationProps) {
  const [metrics, setMetrics] = useState<ProgressMetric[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<"week" | "month" | "quarter">("month")

  useEffect(() => {
    fetchProgressData()
  }, [userId, selectedTimeRange])

  const fetchProgressData = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockMetrics: ProgressMetric[] = [
          {
            id: "energy",
            name: "Daily Energy Level",
            unit: "out of 10",
            currentValue: 7.2,
            targetValue: 8,
            category: "energy",
            data: generateMockData(selectedTimeRange, 4, 7.2),
            trend: "improving",
            trendPercentage: 35
          },
          {
            id: "digestion",
            name: "Digestive Comfort",
            unit: "out of 10",
            currentValue: 8.1,
            targetValue: 9,
            category: "symptoms",
            data: generateMockData(selectedTimeRange, 3, 8.1),
            trend: "improving",
            trendPercentage: 60
          },
          {
            id: "sleep",
            name: "Sleep Quality",
            unit: "hours",
            currentValue: 6.8,
            targetValue: 8,
            category: "sleep",
            data: generateMockData(selectedTimeRange, 5, 6.8),
            trend: "improving",
            trendPercentage: 20
          },
          {
            id: "stress",
            name: "Stress Level",
            unit: "out of 10",
            currentValue: 4.2,
            targetValue: 3,
            category: "wellness",
            data: generateMockData(selectedTimeRange, 7, 4.2),
            trend: "improving",
            trendPercentage: 25
          }
        ]

        const mockMilestones: Milestone[] = [
          {
            id: "m1",
            title: "Digestive Symptoms Reduced by 50%",
            description: "Achieve significant reduction in bloating and discomfort",
            targetDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            achieved: true,
            achievedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            category: "symptoms",
            impact: "Major improvement in daily comfort and quality of life"
          },
          {
            id: "m2",
            title: "Sustained Energy Throughout Day",
            description: "Maintain energy level above 7/10 for full week",
            targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            achieved: false,
            category: "energy",
            impact: "Increased productivity and life enjoyment"
          },
          {
            id: "m3",
            title: "Consistent 8-Hour Sleep",
            description: "Achieve 8 hours of quality sleep for 5 consecutive nights",
            targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            achieved: false,
            category: "sleep",
            impact: "Improved recovery and mental clarity"
          }
        ]

        setMetrics(mockMetrics)
        setMilestones(mockMilestones)
        setLoading(false)
      }, 600)
    } catch (error) {
      console.error("Error fetching progress data:", error)
      setLoading(false)
    }
  }

  const generateMockData = (timeRange: string, startValue: number, endValue: number) => {
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const progress = (days - 1 - i) / (days - 1)
      const value = startValue + (endValue - startValue) * progress + (Math.random() - 0.5) * 0.8
      data.push({
        date: subDays(new Date(), i),
        value: Math.max(0, Math.min(10, Number(value.toFixed(1))))
      })
    }
    
    return data
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-green-600"
      case "declining":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "energy":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "symptoms":
        return "bg-red-50 text-red-700 border-red-200"
      case "sleep":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "wellness":
        return "bg-blue-50 text-blue-700 border-blue-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="md" text="Loading progress data..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Progress Overview
              </CardTitle>
              <CardDescription>
                Track your health metrics and treatment milestones
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedTimeRange === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeRange("week")}
              >
                1W
              </Button>
              <Button
                variant={selectedTimeRange === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeRange("month")}
              >
                1M
              </Button>
              <Button
                variant={selectedTimeRange === "quarter" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeRange("quarter")}
              >
                3M
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{metric.name}</CardTitle>
                  <Badge variant="outline" className={getCategoryColor(metric.category)}>
                    {metric.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                      {metric.trend === "improving" ? "+" : metric.trend === "declining" ? "-" : ""}
                      {metric.trendPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current vs Target */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{metric.currentValue}</p>
                    <p className="text-sm text-muted-foreground">{metric.unit}</p>
                  </div>
                  {metric.targetValue && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-sm font-medium">{metric.targetValue} {metric.unit}</p>
                    </div>
                  )}
                </div>

                {/* Simple Progress Visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(metric.data[0].date, "MMM d")}</span>
                    <span>{format(metric.data[metric.data.length - 1].date, "MMM d")}</span>
                  </div>
                  <div className="h-16 relative bg-gray-50 rounded">
                    <svg
                      className="w-full h-full"
                      viewBox={`0 0 ${metric.data.length - 1} 10`}
                      preserveAspectRatio="none"
                    >
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.1"
                        className="text-primary"
                        points={metric.data
                          .map((point, index) => `${index},${10 - point.value}`)
                          .join(" ")}
                      />
                    </svg>
                  </div>
                </div>

                {/* Latest Entry */}
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Latest entry</p>
                  <p className="text-sm">
                    {metric.data[metric.data.length - 1].value} {metric.unit} • {" "}
                    {format(metric.data[metric.data.length - 1].date, "MMM d")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Treatment Milestones
          </CardTitle>
          <CardDescription>
            Key achievements and upcoming goals in your treatment journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`border rounded-lg p-4 ${
                  milestone.achieved
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <Badge
                        variant={milestone.achieved ? "default" : "secondary"}
                        className={
                          milestone.achieved
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {milestone.achieved ? "Achieved" : "In Progress"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                    <p className="text-sm text-gray-500 italic">{milestone.impact}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {milestone.achieved
                          ? `Achieved ${format(milestone.achievedDate!, "MMM d")}`
                          : `Target ${format(milestone.targetDate, "MMM d")}`}
                      </span>
                    </div>
                    {!milestone.achieved && (
                      <p className="text-xs">
                        {differenceInDays(milestone.targetDate, new Date())} days remaining
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}