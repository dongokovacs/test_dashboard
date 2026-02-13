"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MetricCard } from "@/components/metric-card"
import { TestTrendsChart } from "@/components/test-trends-chart"
import { SuiteDurationChart } from "@/components/suite-duration-chart"
import { TestResultsTable } from "@/components/test-results-table"
import { DatePicker } from "@/components/date-picker"
import { HistoricalSummary } from "@/components/historical-summary"
import { SlowestTestsWidget } from "@/components/slowest-tests-widget"
import { FlakyTestsWidget } from "@/components/flaky-tests-widget"
import { Button } from "@/components/ui/button"
import type { DashboardMetrics, TestResult } from "@/lib/transform-results"

export default function Home() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const url = selectedDate 
          ? `/api/test-results?date=${selectedDate}` 
          : '/api/test-results'
        
        console.log('Fetching data from:', url)
        const response = await fetch(url)
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error response:', errorData)
          throw new Error('Failed to fetch test results')
        }
        
        const data = await response.json()
        console.log('Data received:', data)
        setMetrics(data.metrics)
        setTestResults(data.testResults)
        setFileName(data.fileName || '')
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedDate])

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const response = await fetch('/api/test-results/archive', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to archive results')
      
      const data = await response.json()
      alert(data.message || `Successfully archived ${data.count} file(s)`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive results')
    } finally {
      setArchiving(false)
    }
  }

  const handleGeneratePDF = () => {
    window.print()
  }

  const handleDateClick = (date: string) => {
    console.log('handleDateClick called with:', date)
    setSelectedDate(date)
    setError(null)
  }

  const handleClearDateFilter = () => {
    setSelectedDate(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 flex items-center justify-center">
        <div className="text-muted-foreground">Loading test results...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b pb-4">
          <Link href="/">
            <Button variant="default">
              📊 Dashboard
            </Button>
          </Link>
          <Link href="/test-cases">
            <Button variant="outline">
              📋 Test Cases
            </Button>
          </Link>
          <Link href="/case-times">
            <Button variant="outline">
              ⏱️ Case Times
            </Button>
          </Link>
          <Link href="/coverage">
            <Button variant="outline">
              📈 Coverage
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Test Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Playwright test results monitoring and traceability
              {selectedDate && (
                <>
                  {' · '}
                  <span className="font-medium text-primary">
                    Viewing {new Date(selectedDate + 'T00:00:00').toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {' '}
                  <button 
                    onClick={handleClearDateFilter}
                    className="text-xs underline hover:text-primary"
                  >
                    (show latest)
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePDF} 
              variant="outline"
            >
              📄 Export PDF
            </Button>
            <Button 
              onClick={handleArchive} 
              disabled={archiving}
              variant="outline"
            >
              {archiving ? 'Archiving...' : '📦 Archive Results'}
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Tests"
              value={metrics.totalTests}
              description="All test cases"
              icon="trend"
            />
            <MetricCard
              title="Passed Tests"
              value={metrics.passedTests}
              description={`${metrics.passRate.toFixed(1)}% pass rate`}
              icon="pass"
            />
            <MetricCard
              title="Failed Tests"
              value={metrics.failedTests}
              description={`${((metrics.failedTests / metrics.totalTests) * 100).toFixed(1)}% failure rate`}
              icon="fail"
              failedTests={testResults.filter(t => t.status === 'failed').map(t => t.name)}
            />
            <MetricCard
              title="Avg Duration"
              value={`${metrics.avgDuration.toFixed(1)}s`}
              description="Per test execution"
              icon="duration"
            />
          </div>
        )}

        {/* Charts and Date Picker Section */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col gap-4">
            <TestTrendsChart onDateClick={handleDateClick} />
            <SuiteDurationChart onDateClick={handleDateClick} />
          </div>
          <div>
            <DatePicker onDateSelect={handleDateClick} selectedDate={selectedDate} />
          </div>
        </div>

        {/* Flaky Tests Widget */}
        <div className="grid gap-4 md:grid-cols-1">
          <FlakyTestsWidget />
        </div>

        {/* Historical Summary */}
        <div className="grid gap-4 md:grid-cols-1">
          <HistoricalSummary onDateClick={handleDateClick} />
        </div>

        {/* Slowest Tests Widget */}
        <div className="grid gap-4 md:grid-cols-1">
          <SlowestTestsWidget tests={testResults} limit={5} />
        </div>

        {/* Current/Selected Results Table */}
        <div className="grid gap-4 md:grid-cols-1">
          <TestResultsTable results={testResults} fileName={fileName} />
        </div>
      </main>
    </div>
  )
}
