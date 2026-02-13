"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HistoricalData {
  date: string
  passed: number
  failed: number
  total: number
  passRate: number
}

interface HistoricalSummaryProps {
  onDateClick?: (date: string) => void
}

export function HistoricalSummary({ onDateClick }: HistoricalSummaryProps) {
  const [data, setData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const response = await fetch('/api/test-results/trends')
        if (!response.ok) throw new Error('Failed to fetch historical data')
        
        const trends = await response.json()
        
        const historicalData: HistoricalData[] = trends.map((item: any) => ({
          date: item.date,
          passed: item.passed,
          failed: item.failed,
          total: item.passed + item.failed,
          passRate: ((item.passed / (item.passed + item.failed)) * 100) || 0
        })).reverse() // Newest first
        
        setData(historicalData)
      } catch (error) {
        console.error('Error fetching historical data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistoricalData()
  }, [])

  const getTrend = (index: number): React.ReactElement | null => {
    if (index >= data.length - 1) return null
    
    const current = data[index].passRate
    const previous = data[index + 1].passRate
    
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Summary</CardTitle>
        <CardDescription>
          {loading ? "Loading..." : `All test runs (${data.length} total)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading historical data...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No historical data available</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Passed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow
                    key={item.date}
                    className={onDateClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onDateClick && onDateClick(item.date)}
                  >
                    <TableCell className="font-medium">
                      {new Date(item.date + 'T00:00:00').toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">{item.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {item.passed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.failed > 0 ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {item.failed}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.passRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrend(index)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
