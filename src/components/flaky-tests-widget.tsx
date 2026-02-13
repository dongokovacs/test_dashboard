"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TestStatus {
  date: string
  status: 'passed' | 'failed' | 'skipped'
  time: string
}

interface FlakyTest {
  testName: string
  projectName: string
  filePath: string
  statuses: TestStatus[]
}

export function FlakyTestsWidget() {
  const [flakyTests, setFlakyTests] = useState<FlakyTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFlakyTests() {
      try {
        const response = await fetch('/api/flaky-tests')
        if (!response.ok) throw new Error('Failed to fetch flaky tests')
        
        const data = await response.json()
        setFlakyTests(data.flakyTests || [])
      } catch (err) {
        console.error('Error fetching flaky tests:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFlakyTests()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Flaky Tests (Last 3 Days)
          </CardTitle>
          <CardDescription>Loading flaky test detection...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    if (status === 'passed') {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-black">
          {status}
        </Badge>
      )
    }
    
    if (status === 'failed') {
      return <Badge variant="destructive">{status}</Badge>
    }
    
    return <Badge variant="secondary">{status}</Badge>
  }

  const getStatusIcon = (statuses: TestStatus[]) => {
    const hasFailure = statuses.some(s => s.status === 'failed')
    const hasSuccess = statuses.some(s => s.status === 'passed')
    
    if (hasFailure && hasSuccess) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Flaky Tests (Last 3 Days)
        </CardTitle>
        <CardDescription>
          Tests with inconsistent results across the last 3 test runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {flakyTests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium">🎉 No flaky tests detected!</p>
            <p className="text-sm mt-2">All tests have consistent results</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flakyTests.map((test, index) => (
              <div 
                key={index} 
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2 mb-2">
                  {getStatusIcon(test.statuses)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{test.testName}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {test.projectName} • {test.filePath}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {test.statuses.map((statusItem, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2"
                    >
                      <span className="text-muted-foreground font-mono">
                        {statusItem.date} {statusItem.time}
                      </span>
                      {getStatusBadge(statusItem.status)}
                    </div>
                  ))}
                </div>

                {/* Pattern indicator */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Pattern:</span>
                    {test.statuses.map((s, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        {s.status === 'passed' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {s.status === 'failed' && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {s.status === 'skipped' && <span className="h-3 w-3 text-gray-400">−</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {flakyTests.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Found <strong>{flakyTests.length}</strong> flaky test{flakyTests.length !== 1 ? 's' : ''} 
              {' '}with inconsistent results
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
