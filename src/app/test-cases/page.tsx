"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TestCaseCard } from "@/components/test-case-card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TestSuite } from "@/lib/parse-test-cases"

export default function TestCasesPage() {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [selectedSpecFile, setSelectedSpecFile] = useState<string>("all")
  const [selectedTestCase, setSelectedTestCase] = useState<string>("all")
  const [expandAll, setExpandAll] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all')

  useEffect(() => {
    async function fetchTestCases() {
      try {
        const response = await fetch('/api/test-cases')
        if (!response.ok) throw new Error('Failed to fetch test cases')
        
        const data = await response.json()
        setSuites(data.suites)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTestCases()
  }, [])

  // Extract all unique tags and spec files
  const allTags = Array.from(
    new Set(
      suites.flatMap(suite => 
        suite.testCases.flatMap(tc => tc.tags)
      )
    )
  ).sort()

  // Extract unique folders from file paths
  const allFolders = Array.from(
    new Set(
      suites.flatMap(suite => 
        suite.testCases.map(tc => {
          const pathParts = tc.filePath.split('/')
          // Get folder path: tests/dictionary/partners -> dictionary/partners
          if (pathParts.length > 2) {
            return pathParts.slice(1, -1).join('/')
          }
          return 'root' // Root level tests
        })
      )
    )
  ).sort()

  // Filter spec files based on selected folder
  const allSpecFiles = Array.from(
    new Set(
      suites.flatMap(suite => 
        suite.testCases
          .filter(tc => {
            if (selectedFolder === "all") return true
            const pathParts = tc.filePath.split('/')
            const folderPath = pathParts.length > 2 ? pathParts.slice(1, -1).join('/') : 'root'
            return folderPath === selectedFolder
          })
          .map(tc => tc.filePath.split('/').pop() || tc.filePath)
      )
    )
  ).sort()

  // Count test cases per spec file (filtered by folder)
  const specFileTestCounts = allSpecFiles.map(specFile => {
    const count = suites.flatMap(suite => suite.testCases).filter(tc => {
      const fileName = tc.filePath.split('/').pop() || tc.filePath
      if (fileName !== specFile) return false
      
      // Also check folder match
      if (selectedFolder === "all") return true
      const pathParts = tc.filePath.split('/')
      const folderPath = pathParts.length > 2 ? pathParts.slice(1, -1).join('/') : 'root'
      return folderPath === selectedFolder
    }).length
    return { fileName: specFile, count }
  })

  // Get test cases for selected spec file (also filtered by folder)
  const testCasesForSelectedFile = selectedSpecFile === "all" 
    ? [] 
    : suites.flatMap(suite => 
        suite.testCases.filter(tc => {
          const specFileName = tc.filePath.split('/').pop() || tc.filePath
          if (specFileName !== selectedSpecFile) return false
          
          // Also check folder match if a folder is selected
          if (selectedFolder !== "all") {
            const pathParts = tc.filePath.split('/')
            const folderPath = pathParts.length > 2 ? pathParts.slice(1, -1).join('/') : 'root'
            return folderPath === selectedFolder
          }
          return true
        })
      ).sort((a, b) => a.title.localeCompare(b.title)) // Sort alphabetically
      .map(tc => ({
        id: tc.id,
        title: tc.title
      }))

  // Filter test cases
  const filteredSuites = suites.map(suite => ({
    ...suite,
    testCases: suite.testCases.filter(tc => {
      const matchesSearch = tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tc.steps.some(s => s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesTag = selectedTag === "all" || tc.tags.includes(selectedTag)
      
      // Folder matching
      const pathParts = tc.filePath.split('/')
      const folderPath = pathParts.length > 2 ? pathParts.slice(1, -1).join('/') : 'root'
      const matchesFolder = selectedFolder === "all" || folderPath === selectedFolder
      
      const specFileName = tc.filePath.split('/').pop() || tc.filePath
      const matchesSpecFile = selectedSpecFile === "all" || specFileName === selectedSpecFile
      const matchesTestCase = selectedTestCase === "all" || tc.id === selectedTestCase
      const matchesStatus = statusFilter === 'all' || tc.status === statusFilter
      
      return matchesSearch && matchesTag && matchesFolder && matchesSpecFile && matchesTestCase && matchesStatus
    })
  })).filter(suite => suite.testCases.length > 0)

  const totalTests = filteredSuites.reduce((sum, suite) => sum + suite.testCases.length, 0)
  const totalAllTests = suites.reduce((sum, suite) => sum + suite.testCases.length, 0)

  const handleExportAllPDF = () => {
    // Reset filters temporarily for full export
    const tempSearchTerm = searchTerm
    const tempTag = selectedTag
    const tempFolder = selectedFolder
    const tempSpecFile = selectedSpecFile
    const tempStatus = statusFilter
    
    setSearchTerm("")
    setSelectedTag("all")
    setSelectedFolder("all")
    setSelectedSpecFile("all")
    setStatusFilter('all')
    
    // Wait for state update then print
    setTimeout(() => {
      window.print()
      
      // Restore filters after print
      setTimeout(() => {
        setSearchTerm(tempSearchTerm)
        setSelectedTag(tempTag)
        setSelectedFolder(tempFolder)
        setSelectedSpecFile(tempSpecFile)
        setStatusFilter(tempStatus)
      }, 100)
    }, 100)
  }

  const handleExportFilteredPDF = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading test cases...</div>
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
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b pb-4">
          <Link href="/">
            <Button variant="outline">
              📊 Dashboard
            </Button>
          </Link>
          <Link href="/test-cases">
            <Button variant="default">
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all test cases from Playwright specs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {totalTests} {totalTests === 1 ? 'test' : 'tests'}
            </Badge>
            <div className="flex gap-2 print:hidden">
              <Button 
                onClick={() => setExpandAll(!expandAll)}
                variant="outline"
                title={expandAll ? "Collapse all test steps" : "Expand all test steps"}
              >
                {expandAll ? "📕 Collapse All" : "📖 Expand All"}
              </Button>
              <Button 
                onClick={handleExportAllPDF} 
                variant="outline"
                title={`Export all ${totalAllTests} test cases to PDF`}
              >
                📄 Export All
              </Button>
              <Button 
                onClick={handleExportFilteredPDF} 
                variant="outline"
                disabled={totalTests === 0}
                title={`Export ${totalTests} filtered test cases to PDF`}
              >
                📄 Export Filtered
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 print:hidden">
          <Button
            variant={statusFilter === 'failed' ? 'destructive' : 'outline'}
            onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
            className="flex-1 sm:flex-none"
          >
            ❌ FAILED
          </Button>
          <Button
            variant={statusFilter === 'passed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter(statusFilter === 'passed' ? 'all' : 'passed')}
            className="flex-1 sm:flex-none"
          >
            ✅ PASSED
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search test cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFolder} onValueChange={(value) => {
            setSelectedFolder(value)
            setSelectedSpecFile("all") // Reset spec file when folder changes
            setSelectedTestCase("all") // Reset test case too
          }}>
            <SelectTrigger className="w-full sm:w-[220px]">
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
          <Select value={selectedSpecFile} onValueChange={(value) => {
            setSelectedSpecFile(value)
            setSelectedTestCase("all") // Reset test case when file changes
          }}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select test file..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Spec Files</SelectItem>
              {specFileTestCounts.map(({ fileName, count }) => (
                <SelectItem key={fileName} value={fileName}>
                  {fileName} ({count} {count === 1 ? 'test' : 'tests'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={selectedTestCase} 
            onValueChange={setSelectedTestCase}
            disabled={selectedSpecFile === "all"}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder={selectedSpecFile === "all" ? "Select file first" : "Select a test..."} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Tests</SelectItem>
              {testCasesForSelectedFile.map(tc => (
                <SelectItem key={tc.id} value={tc.id}>
                  {tc.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchTerm || selectedTag !== "all" || selectedFolder !== "all" || selectedSpecFile !== "all" || selectedTestCase !== "all" || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setSelectedTag("all")
                setSelectedFolder("all")
                setSelectedSpecFile("all")
                setSelectedTestCase("all")
                setStatusFilter('all')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Test Suites */}
        {filteredSuites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No test cases found matching your filters
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSuites.map((suite, idx) => (
              <div key={idx} className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h2 className="text-xl font-semibold">{suite.name}</h2>
                  {suite.description && (
                    <p className="text-sm text-muted-foreground mt-1">{suite.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {suite.testCases.length} {suite.testCases.length === 1 ? 'test case' : 'test cases'}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {suite.testCases.map((testCase) => (
                    <TestCaseCard key={testCase.id} testCase={testCase} expandAll={expandAll} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
