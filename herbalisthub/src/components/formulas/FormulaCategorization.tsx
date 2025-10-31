"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Tag,
  Plus,
  X,
  Folder,
  Target,
  Lightbulb,
  Save,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"

interface FormulaCategorization {
  category?: string
  tags: string[]
  difficulty?: "beginner" | "intermediate" | "advanced"
  therapeuticActions?: string[]
  indications?: string[]
  contraindications?: string
  notes?: string
}

interface FormulaCategorization {
  formulaId: string
  initialData?: Partial<FormulaCategorization>
  onSave?: (data: FormulaCategorization) => void
  readonly?: boolean
}

const categories = [
  { value: "digestive", label: "Digestive Health", description: "Formulas for digestive support and gut health" },
  { value: "respiratory", label: "Respiratory Health", description: "Lung, throat, and breathing support" },
  { value: "nervous", label: "Nervous System", description: "Stress, anxiety, sleep, and neurological support" },
  { value: "immune", label: "Immune Support", description: "Immune system strengthening and infection support" },
  { value: "cardiovascular", label: "Cardiovascular Health", description: "Heart and circulation support" },
  { value: "detox", label: "Detoxification", description: "Liver, kidney, and general detox support" },
  { value: "womens-health", label: "Women's Health", description: "Reproductive health and hormonal balance" },
  { value: "mens-health", label: "Men's Health", description: "Male reproductive and hormonal health" },
  { value: "topical", label: "Topical Applications", description: "External use formulas - salves, oils, liniments" },
  { value: "general", label: "General Wellness", description: "Overall health and vitality support" }
]

const commonTherapeuticActions = [
  "adaptogenic", "anti-inflammatory", "antimicrobial", "antioxidant", "antispasmodic",
  "astringent", "carminative", "cholagogue", "diaphoretic", "diuretic", "emmenagogue",
  "expectorant", "hepatic", "nervine", "sedative", "stimulant", "tonic", "vulnerary"
]

const commonIndications = [
  "stress", "anxiety", "insomnia", "digestive upset", "inflammation", "immune weakness",
  "circulation issues", "respiratory congestion", "hormonal imbalance", "fatigue",
  "depression", "headaches", "muscle tension", "joint pain", "skin conditions"
]

export function FormulaCategorization({ 
  formulaId, 
  initialData, 
  onSave, 
  readonly = false 
}: FormulaCategorization) {
  const [data, setData] = useState<FormulaCategorization>({
    tags: [],
    therapeuticActions: [],
    indications: [],
    ...initialData
  })
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [newAction, setNewAction] = useState("")
  const [newIndication, setNewIndication] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  // Load initial data and fetch suggestions
  useEffect(() => {
    if (initialData) {
      setData(prev => ({ ...prev, ...initialData }))
    }
    fetchSuggestedTags()
  }, [initialData])

  const fetchSuggestedTags = async () => {
    try {
      const response = await fetch("/api/formulas/tags?limit=50")
      if (response.ok) {
        const result = await response.json()
        setSuggestedTags(result.tags || [])
      }
    } catch (error) {
      console.error("Error fetching suggested tags:", error)
    }
  }

  const updateData = <K extends keyof FormulaCategorization>(
    key: K, 
    value: FormulaCategorization[K]
  ) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const addTag = (tag: string) => {
    if (!tag.trim() || data.tags.includes(tag.trim())) return
    updateData("tags", [...data.tags, tag.trim().toLowerCase()])
    setNewTag("")
  }

  const removeTag = (tag: string) => {
    updateData("tags", data.tags.filter(t => t !== tag))
  }

  const addTherapeuticAction = (action: string) => {
    if (!action.trim() || data.therapeuticActions?.includes(action.trim())) return
    updateData("therapeuticActions", [...(data.therapeuticActions || []), action.trim().toLowerCase()])
    setNewAction("")
  }

  const removeTherapeuticAction = (action: string) => {
    updateData("therapeuticActions", data.therapeuticActions?.filter(a => a !== action) || [])
  }

  const addIndication = (indication: string) => {
    if (!indication.trim() || data.indications?.includes(indication.trim())) return
    updateData("indications", [...(data.indications || []), indication.trim().toLowerCase()])
    setNewIndication("")
  }

  const removeIndication = (indication: string) => {
    updateData("indications", data.indications?.filter(i => i !== indication) || [])
  }

  const handleSave = async () => {
    if (readonly) return

    setSaving(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/categorization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        toast.success("Categorization saved successfully")
        onSave?.(data)
      } else {
        throw new Error("Failed to save categorization")
      }
    } catch (error) {
      console.error("Error saving categorization:", error)
      toast.error("Failed to save categorization")
    } finally {
      setSaving(false)
    }
  }

  const getSelectedCategory = () => {
    return categories.find(cat => cat.value === data.category)
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800"
      case "intermediate": return "bg-yellow-100 text-yellow-800"
      case "advanced": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Formula Categorization
        </CardTitle>
        <CardDescription>
          Organize and classify this formula for better discovery and understanding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label>Primary Category</Label>
          <Select 
            value={data.category || ""} 
            onValueChange={(value) => updateData("category", value)}
            disabled={readonly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div>
                    <div className="font-medium">{category.label}</div>
                    <div className="text-xs text-muted-foreground">{category.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getSelectedCategory() && (
            <p className="text-sm text-muted-foreground">
              {getSelectedCategory()?.description}
            </p>
          )}
        </div>

        {/* Difficulty Level */}
        <div className="space-y-3">
          <Label>Difficulty Level</Label>
          <div className="flex gap-2">
            {["beginner", "intermediate", "advanced"].map((level) => (
              <Button
                key={level}
                variant={data.difficulty === level ? "default" : "outline"}
                size="sm"
                onClick={() => updateData("difficulty", level as any)}
                disabled={readonly}
                className={data.difficulty === level ? getDifficultyColor(level) : ""}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </Label>
          
          {!readonly && (
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
              />
              <Button 
                type="button" 
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Suggested Tags */}
          {!readonly && suggestedTags.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Suggested tags:
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedTags
                  .filter(tag => !data.tags.includes(tag))
                  .slice(0, 8)
                  .map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Current Tags */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  {!readonly && (
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Therapeutic Actions */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Therapeutic Actions
          </Label>
          
          {!readonly && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add therapeutic action..."
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTherapeuticAction(newAction)
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={() => addTherapeuticAction(newAction)}
                  disabled={!newAction.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {commonTherapeuticActions
                  .filter(action => !data.therapeuticActions?.includes(action))
                  .map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      onClick={() => addTherapeuticAction(action)}
                      className="text-xs"
                    >
                      {action}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {data.therapeuticActions && data.therapeuticActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.therapeuticActions.map((action) => (
                <Badge key={action} variant="outline" className="flex items-center gap-1">
                  {action}
                  {!readonly && (
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTherapeuticAction(action)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Indications */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Primary Indications
          </Label>
          
          {!readonly && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add indication..."
                  value={newIndication}
                  onChange={(e) => setNewIndication(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addIndication(newIndication)
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={() => addIndication(newIndication)}
                  disabled={!newIndication.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {commonIndications
                  .filter(indication => !data.indications?.includes(indication))
                  .map((indication) => (
                    <Button
                      key={indication}
                      variant="outline"
                      size="sm"
                      onClick={() => addIndication(indication)}
                      className="text-xs"
                    >
                      {indication}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {data.indications && data.indications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.indications.map((indication) => (
                <Badge key={indication} variant="default" className="flex items-center gap-1">
                  {indication}
                  {!readonly && (
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeIndication(indication)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <Label>Additional Notes</Label>
          <Textarea
            placeholder="Add any additional categorization notes..."
            value={data.notes || ""}
            onChange={(e) => updateData("notes", e.target.value)}
            disabled={readonly}
            rows={3}
          />
        </div>

        {!readonly && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Categorization"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}