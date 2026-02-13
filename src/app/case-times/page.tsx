"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface TestExecutionHistory {
  testId: string
  testName: string
  filePath: string
  executions: {
    date: string
    duration: number
    status: 'passed' | 'failed' | 'skipped'
  }[]
}

interface TestFileGroup {
  fileName: string
  tests: {
    testId: string
    testName: string
  }[]
}

export default function CaseTimesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testFiles, setTestFiles] = useState<TestFileGroup[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [selectedFile, setSelectedFile] = useState<string>("all")
  const [selectedTestId, setSelectedTestId] = useState<string>("all")
  const [testHistory, setTestHistory] = useState<TestExecutionHistory | null>(null)

  // Fetch available test files and tests
  useEffect(() => {
    async function fetchTestFiles() {
      try {
        const response = await fetch('/api/case-times/files')
        if (!response.ok) throw new Error('Failed to fetch test files')
        
        const data = await response.json()
        setTestFiles(data.files)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchTestFiles()
  }, [])

  // Fetch test history when a test is selected
  useEffect(() => {
    if (!selectedTestId || selectedTestId === "all") {
      setTestHistory(null)
      return
    }

    async function fetchTestHistory() {
      try {
        const response = await fetch(`/api/case-times/history?testId=${encodeURIComponent(selectedTestId)}`)
        if (!response.ok) throw new Error('Failed to fetch test history')
        
        const data = await response.json()
        setTestHistory(data)
      } catch (err) {
        console.error('Error fetching test history:', err)
        setTestHistory(null)
      }
    }

    fetchTestHistory()
  }, [selectedTestId])

  // Extract unique folders from file names
  const allFolders = Array.from(
    new Set(
      testFiles.map(file => {
        // Normalize path separators (handle both / and \)
        const normalizedPath = file.fileName.replace(/\\/g, '/')
        const pathParts = normalizedPath.split('/')
        
        // Get folder path: dictionary/newDomesticDetails/file.spec.ts -> dictionary\newDomesticDetails
        if (pathParts.length > 1) {
          // Remove filename (last element), keep all folder parts
          const folderPath = pathParts.slice(0, -1).join('\\')
          return folderPath
        }
        return 'root' // Root level tests (e.g., file.spec.ts)
      })
    )
  ).sort()

  // Filter files based on selected folder
  const filteredTestFiles = testFiles.filter(file => {
    // Folder filter
    if (selectedFolder !== "all") {
      const normalizedPath = file.fileName.replace(/\\/g, '/')
      const pathParts = normalizedPath.split('/')
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('\\') : 'root'
      if (folderPath !== selectedFolder) return false
    }
    
    return true
  })

  const selectedFileTests = selectedFile === "all" 
    ? [] 
    : filteredTestFiles.find(f => f.fileName === selectedFile)?.tests || []

  // Prepare chart data
  const chartData = testHistory ? {
    labels: testHistory.executions.map(e => e.date),
    datasets: [
      {
        label: 'Duration (seconds)',
        data: testHistory.executions.map(e => e.duration),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        pointBackgroundColor: testHistory.executions.map(e => 
          e.status === 'passed' ? 'rgb(34, 197, 94)' : 
          e.status === 'failed' ? 'rgb(239, 68, 68)' : 
          'rgb(234, 179, 8)'
        ),
        pointBorderColor: testHistory.executions.map(e => 
          e.status === 'passed' ? 'rgb(34, 197, 94)' : 
          e.status === 'failed' ? 'rgb(239, 68, 68)' : 
          'rgb(234, 179, 8)'
        ),
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  } : null

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: testHistory?.testName || 'Test Execution Times',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const execution = testHistory?.executions[context.dataIndex]
            return [
              `Duration: ${context.parsed?.y?.toFixed(2) ?? 'N/A'}s`,
              `Status: ${execution?.status}`
            ]
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Duration (seconds)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Execution Date'
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading test files...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b pb-4">
          <Link href="/">
            <Button variant="outline">
              📊 Dashboard
            </Button>
          </Link>
          <Link href="/test-cases">
            <Button variant="outline">
              📋 Test Cases
            </Button>
          </Link>
          <Link href="/case-times">
            <Button variant="default">
              ⏱️ Case Times
            </Button>
          </Link>
          <Link href="/coverage">
            <Button variant="outline">
              📈 Coverage
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Case Execution Times</h1>
          <p className="text-muted-foreground mt-1">
            Track individual test execution duration over time
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedFolder} onValueChange={(value) => {
            setSelectedFolder(value)
            setSelectedFile("all") // Reset file when folder changes
            setSelectedTestId("all") // Reset test too
          }}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by folder" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Folders</SelectItem>
              {allFolders.map(folder => (
                <SelectItem key={folder} value={folder}>
                  📁 {folder === 'root' ? 'Root (tests/)' : folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFile} onValueChange={(value) => {
            setSelectedFile(value)
            setSelectedTestId("all") // Reset test selection when file changes
          }}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select test file..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Spec Files</SelectItem>
              {filteredTestFiles.map((file) => (
                <SelectItem key={file.fileName} value={file.fileName}>
                  {file.fileName.split('/').pop()} ({file.tests.length} {file.tests.length === 1 ? 'test' : 'tests'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={selectedTestId} 
            onValueChange={setSelectedTestId}
            disabled={selectedFile === "all"}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder={selectedFile !== "all" ? "Select a test..." : "Select file first"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Tests</SelectItem>
              {selectedFileTests.map((test) => (
                <SelectItem key={test.testId} value={test.testId}>
                  {test.testName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statistics */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 items-center flex-wrap">{testHistory && (
              <>
                <Badge variant="outline">
                  {testHistory.executions.length} executions tracked
                </Badge>
                <Badge variant="outline">
                  Avg: {(testHistory.executions.reduce((sum, e) => sum + e.duration, 0) / testHistory.executions.length).toFixed(2)}s
                </Badge>
                <Badge variant="outline">
                  Min: {Math.min(...testHistory.executions.map(e => e.duration)).toFixed(2)}s
                </Badge>
                <Badge variant="outline">
                  Max: {Math.max(...testHistory.executions.map(e => e.duration)).toFixed(2)}s
                </Badge>
              </>
            )}
            {!testHistory && (
              <p className="text-sm text-muted-foreground">
                📊 {filteredTestFiles.reduce((sum, f) => sum + f.tests.length, 0)} test cases available
              </p>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        {testHistory && chartData && (
          <Card>
            <CardHeader>
              <CardTitle>Execution Time Trend</CardTitle>
              <CardDescription>{testHistory.testName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!testHistory && selectedTestId !== "all" && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No execution history found for this test
            </CardContent>
          </Card>
        )}

        {selectedTestId === "all" && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a test file and test case to view execution history
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
