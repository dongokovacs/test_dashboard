"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import { Button } from "@/components/ui/button"

interface SuiteDurationData {
  date: string
  [key: string]: number | string // Dynamic spec file names as keys
}

interface SuiteDurationChartProps {
  onDateClick?: (date: string) => void
}

export function SuiteDurationChart({ onDateClick }: SuiteDurationChartProps) {
  const [chartData, setChartData] = useState<SuiteDurationData[]>([])
  const [suiteNames, setSuiteNames] = useState<string[]>([])
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSuiteDurations() {
      try {
        const response = await fetch('/api/test-results/suite-durations')
        if (!response.ok) throw new Error('Failed to fetch suite durations')
        
        const data = await response.json()
        setChartData(data.chartData)
        setSuiteNames(data.suiteNames)
      } catch (error) {
        console.error('Error fetching suite durations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuiteDurations()
  }, [])

  // Filter suite names based on selection
  const displaySuiteNames = selectedSuite ? [selectedSuite] : suiteNames

  // Generate dynamic chart config based on suite names
  const chartConfig: ChartConfig = displaySuiteNames.reduce((acc, suiteName, index) => {
    const colors = [
      "hsl(220, 70%, 50%)",   // Blue
      "hsl(142, 76%, 36%)",   // Green
      "hsl(0, 84%, 60%)",     // Red
      "hsl(280, 65%, 60%)",   // Purple
      "hsl(30, 93%, 47%)",    // Orange
      "hsl(180, 77%, 47%)",   // Cyan
      "hsl(340, 75%, 55%)",   // Pink
      "hsl(60, 90%, 50%)",    // Yellow
      "hsl(320, 70%, 55%)",   // Magenta
      "hsl(200, 80%, 45%)",   // Sky Blue
      "hsl(160, 70%, 40%)",   // Teal
      "hsl(25, 85%, 55%)",    // Coral
      "hsl(270, 60%, 55%)",   // Violet
      "hsl(350, 80%, 60%)",   // Rose
      "hsl(120, 60%, 45%)",   // Lime
      "hsl(190, 75%, 50%)",   // Turquoise
      "hsl(40, 88%, 52%)",    // Gold
      "hsl(300, 65%, 58%)",   // Orchid
    ]
    
    // Find original index in full suiteNames array for consistent colors
    const originalIndex = suiteNames.indexOf(suiteName)
    
    // Sanitize suite name for CSS variable (remove dots and special chars)
    const sanitizedName = suiteName.replace(/[^a-zA-Z0-9]/g, '_')
    
    acc[sanitizedName] = {
      label: suiteName.replace('.spec.ts', ''),
      color: colors[originalIndex % colors.length],
    }
    return acc
  }, {} as ChartConfig)

  const handleLegendClick = (suiteName: string) => {
    if (selectedSuite === suiteName) {
      setSelectedSuite(null) // Deselect if clicking the same suite
    } else {
      setSelectedSuite(suiteName)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Suite Duration Trends</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : selectedSuite 
                ? `Viewing ${selectedSuite.replace('.spec.ts', '')} from ${chartData.length} run(s)`
                : `Execution time by spec file from ${chartData.length} run(s)`
              }
            </CardDescription>
          </div>
          {selectedSuite && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedSuite(null)}
            >
              Show All Suites
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No suite duration data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 0,
                right: 0,
                top: 5,
                bottom: 5,
              }}
              onClick={(event: any) => {
                if (event && event.activePayload && event.activePayload.length > 0) {
                  const clickedDate = event.activePayload[0].payload.date
                  console.log('Suite chart clicked - date:', clickedDate)
                  if (onDateClick && clickedDate) {
                    onDateClick(clickedDate)
                  }
                }
              }}
              style={{ cursor: onDateClick ? 'pointer' : 'default' }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}s`}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                content={<ChartTooltipContent 
                  indicator="line"
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  formatter={(value, name, props) => {
                    const suiteName = String(name)
                    const displayName = suiteName.replace('.spec.ts', '')
                    const testCount = props.payload[`${suiteName}_count`]
                    
                    // Format duration
                    const duration = Number(value)
                    let durationText = ''
                    if (duration >= 60) {
                      const minutes = Math.floor(duration / 60)
                      const seconds = Math.round(duration % 60)
                      durationText = `${minutes}m ${seconds}s`
                    } else {
                      durationText = `${duration.toFixed(1)}s`
                    }
                    
                    return [
                      `${durationText}${testCount ? ` (${testCount})` : ''}`,
                      displayName
                    ]
                  }}
                />}
              />
              <Legend 
                verticalAlign="top" 
                verticalAlign="top" 
                height={36}
                formatter={(value) => String(value).replace('.spec.ts', '')}
                onClick={(e) => handleLegendClick(e.value as string)}
                wrapperStyle={{ cursor: 'pointer' }}
              />
              {displaySuiteNames.map((suiteName) => {
                const sanitizedName = suiteName.replace(/[^a-zA-Z0-9]/g, '_')
                return (
                  <Bar
                    key={suiteName}
                    dataKey={suiteName}
                    fill={`var(--color-${sanitizedName})`}
                    radius={[4, 4, 0, 0]}
                  />
                )
              })}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
