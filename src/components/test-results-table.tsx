"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react"
import type { TestResult } from "@/lib/transform-results"

interface TestResultsTableProps {
  results: TestResult[]
  fileName?: string
}

const statusColors = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  skipped: "bg-yellow-500",
}

const STORAGE_KEY = 'test-manual-statuses'

// Helper to load from localStorage
const loadManualStatuses = (): Record<string, 'passed' | 'failed' | 'skipped'> => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('📦 Loaded manual statuses from localStorage:', parsed)
      return parsed
    }
  } catch (error) {
    console.error('Failed to load manual statuses from localStorage:', error)
  }
  return {}
}

export function TestResultsTable({ results, fileName }: TestResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [manualStatuses, setManualStatuses] = useState<Record<string, 'passed' | 'failed' | 'skipped'>>(loadManualStatuses)

  // Save manual statuses to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(manualStatuses).length > 0) {
      console.log('💾 Saving manual statuses to localStorage:', manualStatuses)
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manualStatuses))
    } catch (error) {
      console.error('Failed to save manual statuses to localStorage:', error)
    }
  }, [manualStatuses])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleStatus = (e: React.MouseEvent, testId: string, currentStatus: 'passed' | 'failed' | 'skipped') => {
    e.stopPropagation() // Prevent row expansion when clicking badge
    
    // Only allow toggling between passed and failed
    const newStatus = currentStatus === 'failed' ? 'passed' : 'failed'
    console.log(`🔄 Toggling test ${testId}: ${currentStatus} → ${newStatus}`)
    setManualStatuses(prev => {
      const updated = {
        ...prev,
        [testId]: newStatus
      }
      console.log('📝 New manual statuses state:', updated)
      return updated
    })
  }

  const getTestStatus = (test: TestResult): 'passed' | 'failed' | 'skipped' => {
    return manualStatuses[test.id] || test.status
  }

  const clearManualOverrides = () => {
    console.log('🗑️ Clearing all manual overrides')
    setManualStatuses({})
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasManualOverrides = Object.keys(manualStatuses).length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>
              Recent Test Executions
              {fileName && (
                <span className="ml-3 text-sm font-normal text-muted-foreground">
                  ({fileName})
                </span>
              )}
            </CardTitle>
            <CardDescription>Click on a test to view its steps · Click on status badge to toggle passed/failed</CardDescription>
          </div>
          {hasManualOverrides && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearManualOverrides}
              className="text-xs"
            >
              🔄 Clear Manual Overrides ({Object.keys(manualStatuses).length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Test ID</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No test results available
                </TableCell>
              </TableRow>
            ) : (
              results.map((test) => {
                const isExpanded = expandedRows.has(test.id)
                const hasSteps = test.steps && test.steps.length > 0
                const currentStatus = getTestStatus(test)
                const wasManuallyChanged = manualStatuses[test.id] !== undefined

                return (
                  <React.Fragment key={test.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => hasSteps && toggleRow(test.id)}>
                      <TableCell>
                        {hasSteps && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{test.id}</TableCell>
                      <TableCell>{test.name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`${statusColors[currentStatus]} cursor-pointer hover:opacity-80 transition-opacity ${
                            wasManuallyChanged ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                          }`} 
                          variant="outline"
                          onClick={(e) => toggleStatus(e, test.id, currentStatus)}
                          title={wasManuallyChanged 
                            ? `Manually changed to ${currentStatus} (click to toggle)` 
                            : 'Click to toggle status'}
                        >
                          {currentStatus}
                          {wasManuallyChanged && <span className="ml-1">✏️</span>}
                        </Badge>
                      </TableCell>
                      <TableCell>{test.duration}</TableCell>
                      <TableCell className="text-muted-foreground">{test.timestamp}</TableCell>
                    </TableRow>
                    {isExpanded && hasSteps && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                          <div className="p-4 pl-16">
                            <h4 className="font-semibold mb-3 text-sm">Test Steps:</h4>
                            <div className="space-y-2">
                              {test.steps!.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  {step.error ? (
                                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium">{step.title}</div>
                                    <div className="text-muted-foreground text-xs">
                                      Duration: {(step.duration / 1000).toFixed(2)}s
                                    </div>
                                    {step.error && (
                                      <div className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded">
                                        {step.error.message || 'Error occurred'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
