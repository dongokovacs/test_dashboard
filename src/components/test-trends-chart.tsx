"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

interface TrendData {
  date: string
  passed: number
  failed: number
}

const chartConfig = {
  passed: {
    label: "Passed",
    color: "hsl(142, 76%, 36%)",
  },
  failed: {
    label: "Failed",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig

interface TestTrendsChartProps {
  onDateClick?: (date: string) => void
}

export function TestTrendsChart({ onDateClick }: TestTrendsChartProps) {
  const [chartData, setChartData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch('/api/test-results/trends')
        if (!response.ok) throw new Error('Failed to fetch trends')
        
        const data = await response.json()
        setChartData(data)
      } catch (error) {
        console.error('Error fetching trends:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
    
    // Refresh every 30 seconds
    //const interval = setInterval(fetchTrends, 30000)
    //return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results Trend</CardTitle>
        <CardDescription>
          {loading ? "Loading..." : `Test execution results from ${chartData.length} run(s)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
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
                  console.log('Chart clicked - date:', clickedDate)
                  if (onDateClick && clickedDate) {
                    onDateClick(clickedDate)
                  }
                }
              }}
              style={{ cursor: onDateClick ? 'pointer' : 'default' }}
            >
              <CartesianGrid vertical={false} />
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
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="failed"
                type="natural"
                fill="var(--color-failed)"
                fillOpacity={0.4}
                stroke="var(--color-failed)"
                stackId="a"
              />
              <Area
                dataKey="passed"
                type="natural"
                fill="var(--color-passed)"
                fillOpacity={0.4}
                stroke="var(--color-passed)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
