"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle } from "lucide-react"
import type { TestResult } from "@/lib/transform-results"

interface SlowestTestsWidgetProps {
  tests: TestResult[]
  limit?: number
}

export function SlowestTestsWidget({ tests, limit = 10 }: SlowestTestsWidgetProps) {
  // Convert duration string to milliseconds for sorting
  const testsWithDuration = tests.map(test => {
    const durationMatch = test.duration.match(/([\d.]+)s/)
    const durationMs = durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0
    return { ...test, durationMs }
  })

  // Sort by duration descending and take top N
  const slowestTests = testsWithDuration
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit)

  const getDurationColor = (durationMs: number) => {
    return "text-white" // White text for all durations
  }

  const getDurationBadgeVariant = (durationMs: number): "default" | "secondary" | "destructive" | "outline" => {
    if (durationMs > 15000) return "destructive"
    if (durationMs > 5000) return "secondary"
    return "outline"
  }

  const totalDuration = slowestTests.reduce((sum, test) => sum + test.durationMs, 0)
  const avgDuration = slowestTests.length > 0 ? totalDuration / slowestTests.length : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Slowest Tests
        </CardTitle>
        <CardDescription>
          Top {limit} tests by execution time
          {slowestTests.length > 0 && (
            <> · Avg: {(avgDuration / 1000).toFixed(1)}s</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {slowestTests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No test data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead className="w-32">File</TableHead>
                  <TableHead className="text-right w-24">Duration</TableHead>
                  <TableHead className="text-center w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowestTests.map((test, index) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {test.durationMs > 15000 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" aria-label="Very slow test" />
                        )}
                        <span className="truncate max-w-md">{test.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {test.file ? test.file.split('/').pop() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={getDurationBadgeVariant(test.durationMs)}
                        className={getDurationColor(test.durationMs)}
                      >
                        {test.duration}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {test.status === 'passed' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✓
                        </Badge>
                      )}
                      {test.status === 'failed' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          ✗
                        </Badge>
                      )}
                      {test.status === 'skipped' && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                          ⊘
                        </Badge>
                      )}
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
