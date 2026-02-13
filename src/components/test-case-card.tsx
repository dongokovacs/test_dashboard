"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TestCase } from "@/lib/parse-test-cases"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useEffect, useState } from "react"

interface TestCaseCardProps {
  testCase: TestCase
  expandAll?: boolean
}

export function TestCaseCard({ testCase, expandAll = false }: TestCaseCardProps) {
  const [openItems, setOpenItems] = useState<string>("steps")

  useEffect(() => {
    setOpenItems(expandAll ? "steps" : "")
  }, [expandAll])

  // Determine background color based on status
  const getStatusColor = () => {
    if (!testCase.status) return ''
    switch (testCase.status) {
      case 'passed':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
      case 'failed':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
      case 'skipped':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
      default:
        return ''
    }
  }

  return (
    <Card className={`test-case-card ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{testCase.title}</CardTitle>
              <Badge variant="outline" className="ml-auto">
                {testCase.id}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">Feature: {testCase.feature}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm">{testCase.steps.length} steps</span>
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {testCase.tags.map((tag) => {
            // Determine tag color based on tag type
            let tagClass = "badge";
            if (tag.includes('contract')) {
              tagClass += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            } else if (tag.includes('functional')) {
              tagClass += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            } else if (tag.includes('workflow')) {
              tagClass += " bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
            } else if (tag.includes('payment')) {
              tagClass += " bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
            } else if (tag.includes('dictionary')) {
              tagClass += " bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
            } else if (tag.includes('forex')) {
              tagClass += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
            } else if (tag.includes('registration')) {
              tagClass += " bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
            }
            
            return (
              <Badge key={tag} variant="secondary" className={tagClass}>
                {tag}
              </Badge>
            );
          })}
        </div>
        {/* Print-only file path */}
        <div className="hidden print:block text-xs text-muted-foreground mt-2">
          <strong>File:</strong> {testCase.filePath}
        </div>
        {/* Error message for failed tests */}
        {testCase.status === 'failed' && testCase.errorMessage && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 font-semibold text-sm">❌ Error:</span>
              <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono flex-1">{testCase.errorMessage}</pre>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" value={openItems} onValueChange={setOpenItems}>
          <AccordionItem value="steps">
            <AccordionTrigger data-accordion-trigger>Test Steps</AccordionTrigger>
            <AccordionContent data-accordion-content>
              <div className="space-y-4">
                {testCase.steps.map((step) => (
                  <div key={step.stepNumber} className="border-l-2 border-primary/20 pl-4 py-2 test-step">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {step.stepNumber}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.description}</p>
                        {step.field && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Field: <code className="bg-muted px-1 py-0.5 rounded">{step.field}</code>
                          </p>
                        )}
                        {step.expectedOutcome && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expected: {step.expectedOutcome}
                          </p>
                        )}
                        {step.businessReason && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                            💼 {step.businessReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="metadata" className="print:hidden">
            <AccordionTrigger data-accordion-trigger>Metadata</AccordionTrigger>
            <AccordionContent data-accordion-content>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">File Path:</span>
                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                    {testCase.filePath}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Test ID:</span>
                  <span className="ml-2">{testCase.id}</span>
                </div>
                <div>
                  <span className="font-medium">Tags:</span>
                  <span className="ml-2">{testCase.tags.join(', ')}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
