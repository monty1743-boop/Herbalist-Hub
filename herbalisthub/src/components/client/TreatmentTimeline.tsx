"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Calendar,
  Clock,
  User,
  FileText,
  Pill,
  Activity,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  TestTube,
  Camera,
  Target
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { ConsultationSummary } from "./ConsultationSummary"
import { ProgressVisualization } from "./ProgressVisualization"

interface TreatmentTimelineProps {
  userId: string
}

interface TimelineEvent {
  id: string
  type: "consultation" | "formula_change" | "progress_update" | "test_result" | "milestone"
  title: string
  date: Date
  practitioner?: {
    id: string
    name: string
    title: string
  }
  consultation?: {
    id: string
    type: "initial" | "follow_up" | "check_in" | "urgent"
    duration: number
    notes: string
    symptoms: string[]
    recommendations: string[]
    formulas: Array<{
      id: string
      name: string
      action: "added" | "modified" | "discontinued"
      dosage?: string
      instructions?: string
    }>
    nextSteps: string[]
    followUpDate?: Date
  }
  progressUpdate?: {
    metric: string
    previousValue: number
    newValue: number
    unit: string
    notes: string
  }
  testResult?: {
    testName: string
    results: Record<string, any>
    interpretation: string
    recommendations: string[]
  }
  milestone?: {
    title: string
    description: string
    achieved: boolean
    impact: string
  }
  attachments?: Array<{
    id: string
    name: string
    type: string
    url: string
  }>
}

export function TreatmentTimeline({ userId }: TreatmentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEventType, setSelectedEventType] = useState<string>("all")
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTreatmentHistory()
  }, [userId])

  const fetchTreatmentHistory = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockEvents: TimelineEvent[] = [
          {
            id: "event1",
            type: "consultation",
            title: "Follow-up Consultation",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            practitioner: {
              id: "dr1",
              name: "Dr. Sarah Chen",
              title: "Licensed Herbalist"
            },
            consultation: {
              id: "consult1",
              type: "follow_up",
              duration: 60,
              notes: "Patient reports significant improvement in digestive symptoms. Energy levels have increased notably. Sleep quality still needs attention. Overall very positive progress.",
              symptoms: [
                "Reduced bloating (80% improvement)",
                "Less frequent gas",
                "Improved energy levels",
                "Still experiencing some sleep disruption"
              ],
              recommendations: [
                "Continue current digestive formula with minor adjustments",
                "Add sleep support herbs to evening routine",
                "Increase morning exercise to 20 minutes",
                "Keep food diary for next 2 weeks"
              ],
              formulas: [
                {
                  id: "f1",
                  name: "Digestive Harmony Blend",
                  action: "modified",
                  dosage: "1 tsp",
                  instructions: "Increased to 3x daily, take 15 minutes before meals"
                },
                {
                  id: "f2",
                  name: "Sleep Support Formula",
                  action: "added",
                  dosage: "2 capsules",
                  instructions: "Take 1 hour before bedtime"
                }
              ],
              nextSteps: [
                "Continue current protocol for 2 more weeks",
                "Schedule follow-up in 3 weeks",
                "Lab work in 4 weeks to check progress markers"
              ],
              followUpDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
            }
          },
          {
            id: "event2", 
            type: "progress_update",
            title: "Energy Level Improvement",
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            progressUpdate: {
              metric: "Daily Energy Level",
              previousValue: 4,
              newValue: 7,
              unit: "out of 10",
              notes: "Sustained energy throughout the day without afternoon crash. Feeling much more motivated and productive."
            }
          },
          {
            id: "event3",
            type: "consultation",
            title: "Initial Consultation",
            date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            practitioner: {
              id: "dr1",
              name: "Dr. Sarah Chen",
              title: "Licensed Herbalist"
            },
            consultation: {
              id: "consult2",
              type: "initial",
              duration: 90,
              notes: "Comprehensive intake revealed chronic digestive issues with associated fatigue. Patient motivated to address root causes through herbal medicine and lifestyle modifications.",
              symptoms: [
                "Chronic bloating after meals",
                "Frequent gas and discomfort",
                "Low energy, especially afternoons",
                "Poor sleep quality",
                "Occasional food sensitivities"
              ],
              recommendations: [
                "Begin gentle digestive support protocol",
                "Eliminate inflammatory foods for 4 weeks",
                "Implement stress reduction techniques",
                "Increase water intake to 8 glasses daily"
              ],
              formulas: [
                {
                  id: "f1",
                  name: "Digestive Harmony Blend",
                  action: "added",
                  dosage: "1/2 tsp",
                  instructions: "Start with 2x daily before largest meals"
                },
                {
                  id: "f3",
                  name: "Liver Detox Tea",
                  action: "added",
                  dosage: "1 cup",
                  instructions: "Daily before bed for 3 weeks"
                }
              ],
              nextSteps: [
                "Follow elimination diet protocol",
                "Start herbal formulas as directed",
                "Begin symptom journal",
                "Schedule follow-up in 3 weeks"
              ],
              followUpDate: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000)
            }
          },
          {
            id: "event4",
            type: "test_result",
            title: "Comprehensive Digestive Panel Results",
            date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
            testResult: {
              testName: "Comprehensive Digestive Stool Analysis",
              results: {
                "Beneficial Bacteria": "Low",
                "Pathogenic Bacteria": "Elevated",
                "Digestive Enzymes": "Insufficient",
                "Inflammation Markers": "Moderate elevation",
                "Gut Permeability": "Increased"
              },
              interpretation: "Results indicate gut dysbiosis with compromised digestive function and mild inflammation. This aligns with reported symptoms of bloating, gas, and fatigue.",
              recommendations: [
                "Targeted probiotic supplementation",
                "Digestive enzyme support",
                "Anti-inflammatory herbs",
                "Gut healing protocol"
              ]
            }
          },
          {
            id: "event5",
            type: "milestone",
            title: "Treatment Goals Assessment",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            milestone: {
              title: "Phase 1 Goals Achieved",
              description: "Successfully completed initial stabilization phase of treatment",
              achieved: true,
              impact: "80% reduction in digestive symptoms, 60% improvement in energy levels"
            }
          }
        ]
        
        setEvents(mockEvents.sort((a, b) => b.date.getTime() - a.date.getTime()))
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error("Error fetching treatment history:", error)
      setLoading(false)
    }
  }

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "consultation":
        return <Stethoscope className="h-5 w-5 text-blue-600" />
      case "formula_change":
        return <Pill className="h-5 w-5 text-green-600" />
      case "progress_update":
        return <Activity className="h-5 w-5 text-purple-600" />
      case "test_result":
        return <TestTube className="h-5 w-5 text-orange-600" />
      case "milestone":
        return <Target className="h-5 w-5 text-indigo-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "consultation":
        return "bg-blue-50 border-blue-200"
      case "formula_change":
        return "bg-green-50 border-green-200"
      case "progress_update":
        return "bg-purple-50 border-purple-200"
      case "test_result":
        return "bg-orange-50 border-orange-200"
      case "milestone":
        return "bg-indigo-50 border-indigo-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.consultation?.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.practitioner?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedEventType === "all" || event.type === selectedEventType
    
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading treatment history..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search consultations, notes, or practitioner names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Events</option>
                <option value="consultation">Consultations</option>
                <option value="formula_change">Formula Changes</option>
                <option value="progress_update">Progress Updates</option>
                <option value="test_result">Test Results</option>
                <option value="milestone">Milestones</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Visualization */}
      <ProgressVisualization userId={userId} />

      {/* Timeline */}
      <div className="space-y-4">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event, index) => (
            <Card key={event.id} className={`${getEventTypeColor(event.type)} border-l-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {event.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(event.date, "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <span>({formatDistanceToNow(event.date, { addSuffix: true })})</span>
                        {event.practitioner && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{event.practitioner.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    {expandedEvents.has(event.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {expandedEvents.has(event.id) && (
                <CardContent className="pt-0">
                  {event.consultation && (
                    <ConsultationSummary consultation={event.consultation} />
                  )}
                  
                  {event.progressUpdate && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Progress Update</h4>
                      <div className="bg-white/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{event.progressUpdate.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{event.progressUpdate.previousValue}</span>
                            <span>→</span>
                            <span className="font-bold text-green-600">{event.progressUpdate.newValue}</span>
                            <span className="text-sm text-gray-500">{event.progressUpdate.unit}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{event.progressUpdate.notes}</p>
                      </div>
                    </div>
                  )}

                  {event.testResult && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Test Results: {event.testResult.testName}</h4>
                      <div className="bg-white/50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(event.testResult.results).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-sm">{key}:</span>
                              <span className="text-sm font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Interpretation:</p>
                          <p className="text-sm text-gray-600">{event.testResult.interpretation}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Recommendations:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {event.testResult.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {event.milestone && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Milestone Achievement</h4>
                      <div className="bg-white/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">{event.milestone.description}</p>
                        <p className="text-sm font-medium text-green-600">{event.milestone.impact}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No treatment history found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedEventType !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Your treatment history will appear here as you have consultations and track progress"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}