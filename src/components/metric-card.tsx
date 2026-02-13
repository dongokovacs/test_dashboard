import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: number
  icon: "pass" | "fail" | "duration" | "trend"
  failedTests?: string[]
}

const iconMap = {
  pass: CheckCircle2,
  fail: XCircle,
  duration: Clock,
  trend: TrendingUp,
}

const colorMap = {
  pass: "text-green-500",
  fail: "text-red-500",
  duration: "text-blue-500",
  trend: "text-purple-500",
}

export function MetricCard({ title, value, description, trend, icon, failedTests }: MetricCardProps) {
  const Icon = iconMap[icon]
  const iconColor = colorMap[icon]
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopyTestName = async (testName: string, index: number) => {
    try {
      // Check if Clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(testName)
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea')
        textArea.value = testName
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy test name:', err)
      // Still show success feedback even if there's an error
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const cardContent = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="mt-2">
            <Badge variant={trend >= 0 ? "default" : "destructive"}>
              {trend >= 0 ? "+" : ""}{trend}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Ha van failedTests lista, wrapper-ben tooltip-pel
  if (failedTests && failedTests.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent className="max-w-md max-h-96 overflow-y-auto">
            <div className="space-y-1">
              <p className="font-semibold text-sm mb-2">Failed Tests:</p>
              {failedTests.map((testName, index) => (
                <div key={index} className="flex items-center gap-2 text-xs group hover:bg-muted/50 px-1 py-0.5 rounded">
                  <span className="flex-1">• {testName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyTestName(testName, index)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:scale-110 active:scale-95"
                    title="Copy test name to clipboard"
                  >
                    {copiedIndex === index ? '✅' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}
