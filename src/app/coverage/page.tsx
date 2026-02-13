"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CoverageData {
  fileName: string
  relativePath: string
  filePath: string
  size: number
  modified: string
  coveragePercentage: number
  uncoveredLines: number[]
  testCount: number
  stepCount: number
  requirementIds: string[]
  requirementCoverage: number
}

export default function CoveragePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coverageFiles, setCoverageFiles] = useState<CoverageData[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [selectedFile, setSelectedFile] = useState<string>("all")
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [totalStats, setTotalStats] = useState({
    totalTests: 0,
    totalSteps: 0,
    totalRequirements: 0
  })

  // Fetch coverage data
  useEffect(() => {
    async function fetchCoverageData() {
      try {
        const response = await fetch('/api/coverage/files')
        if (!response.ok) throw new Error('Failed to fetch coverage data')
        
        const data = await response.json()
        setCoverageFiles(data.files)
        setMapping(data.mapping || {})
        setTotalStats({
          totalTests: data.totalTests || 0,
          totalSteps: data.totalSteps || 0,
          totalRequirements: data.totalRequirements || 0
        })
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchCoverageData()
  }, [])

  // Extract unique folders from file names
  const allFolders = Array.from(
    new Set(
      coverageFiles.map(file => {
        // Normalize path separators (handle both / and \)
        const normalizedPath = file.relativePath.replace(/\\/g, '/')
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
  const filteredCoverageFiles = coverageFiles.filter(file => {
    // Folder filter
    if (selectedFolder !== "all") {
      const normalizedPath = file.relativePath.replace(/\\/g, '/')
      const pathParts = normalizedPath.split('/')
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('\\') : 'root'
      if (folderPath !== selectedFolder) return false
    }
    
    return true
  })

  const selectedCoverage = filteredCoverageFiles.find(f => f.relativePath === selectedFile)

  // Calculate overall statistics
  const overallStats = {
    totalFiles: coverageFiles.length,
    averageCoverage: coverageFiles.length > 0 
      ? coverageFiles.reduce((sum, f) => sum + f.requirementCoverage, 0) / coverageFiles.length 
      : 0,
    totalSize: coverageFiles.reduce((sum, f) => sum + f.size, 0),
    filesAbove80: coverageFiles.filter(f => f.requirementCoverage >= 80).length,
    totalTests: totalStats.totalTests,
    totalSteps: totalStats.totalSteps,
    totalRequirements: totalStats.totalRequirements
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading coverage data...</div>
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
            <Button variant="outline">
              ⏱️ Case Times
            </Button>
          </Link>
          <Link href="/coverage">
            <Button variant="default">
              📈 Coverage
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Coverage</h1>
          <p className="text-muted-foreground mt-1">
            View code coverage details for your test files
          </p>
        </div>

        {/* Overall Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Spec Files</CardDescription>
              <CardTitle className="text-3xl">{overallStats.totalFiles}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Test Cases</CardDescription>
              <CardTitle className="text-3xl">{overallStats.totalTests}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Test Steps</CardDescription>
              <CardTitle className="text-3xl">{overallStats.totalSteps}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg. Req Coverage</CardDescription>
              <CardTitle className="text-3xl">{overallStats.averageCoverage.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>Filter by folder and choose a file to view its coverage details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Folder</label>
                <Select value={selectedFolder} onValueChange={(value) => {
                  setSelectedFolder(value)
                  setSelectedFile("all") // Reset file when folder changes
                }}>
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">File</label>
                  {selectedCoverage && (
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedCoverage.testCount} {selectedCoverage.testCount === 1 ? 'test' : 'tests'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {selectedCoverage.stepCount} {selectedCoverage.stepCount === 1 ? 'step' : 'steps'}
                      </Badge>
                    </div>
                  )}
                </div>
                <Select value={selectedFile} onValueChange={setSelectedFile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a file..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Spec Files</SelectItem>
                    {filteredCoverageFiles.map((file) => (
                      <SelectItem key={file.relativePath} value={file.relativePath}>
                        {file.relativePath.split('/').pop()?.split('\\').pop()} ({file.coveragePercentage.toFixed(1)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Details */}
        {selectedCoverage && (
          <Card>
            <CardHeader>
              <CardTitle>Coverage Details</CardTitle>
              <CardDescription>{selectedCoverage.relativePath}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Requirement Coverage</div>
                    <Badge variant={selectedCoverage.requirementCoverage >= 80 ? "default" : "outline"} className="mt-1">
                      {selectedCoverage.requirementCoverage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Test Cases</div>
                    <div className="text-sm font-medium mt-1">
                      {selectedCoverage.testCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Test Steps</div>
                    <div className="text-sm font-medium mt-1">
                      {selectedCoverage.stepCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">File Size</div>
                    <div className="text-sm font-medium mt-1">
                      {(selectedCoverage.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Last Modified</div>
                    <div className="text-sm font-medium mt-1">
                      {new Date(selectedCoverage.modified).toLocaleDateString('hu-HU')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Requirements Covered</div>
                    <div className="text-sm font-medium mt-1">
                      {selectedCoverage.requirementIds.length}
                    </div>
                  </div>
                </div>
                {selectedCoverage.requirementIds.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Requirement IDs:</div>
                    <div className="space-y-2">
                      {selectedCoverage.requirementIds.map(reqId => (
                        <div key={reqId} className="flex flex-col gap-1 p-2 bg-muted rounded-md">
                          <Badge variant="secondary" className="text-xs w-fit">
                            {reqId}
                          </Badge>
                          {mapping[reqId] && (
                            <div className="text-sm text-muted-foreground">
                              {mapping[reqId]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!selectedCoverage && selectedFile === "all" && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              📊 {filteredCoverageFiles.length} spec files available - Select a file to view coverage details
            </CardContent>
          </Card>
        )}
        
        {!selectedCoverage && selectedFile !== "all" && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No coverage data found for this file
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}