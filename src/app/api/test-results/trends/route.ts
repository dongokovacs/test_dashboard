import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { PlaywrightResults } from '@/lib/transform-results'

interface TrendData {
  date: string
  passed: number
  failed: number
}

function extractTestsFromData(rawData: PlaywrightResults): { passed: number; failed: number; date: string } {
  let passed = 0
  let failed = 0
  
  function extractTests(suite: any) {
    if (suite.specs && suite.specs.length > 0) {
      suite.specs.forEach((spec: any) => {
        if (spec.tests && spec.tests.length > 0) {
          spec.tests.forEach((test: any) => {
            const result = test.results?.[0]
            if (result) {
              if (result.status === 'passed') {
                passed++
              } else if (result.status === 'failed' || result.status === 'timedOut') {
                failed++
              }
            }
          })
        }
      })
    }
    
    if (suite.suites && suite.suites.length > 0) {
      suite.suites.forEach((subSuite: any) => extractTests(subSuite))
    }
  }
  
  rawData.suites.forEach(suite => extractTests(suite))
  
  // Extract date from stats.startTime
  const date = rawData.stats.startTime 
    ? new Date(rawData.stats.startTime).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]
  
  return { passed, failed, date }
}

export async function GET() {
  try {
    const resultsDir = path.join(process.cwd(), 'test-results')
    // Read from archive folder
    const archiveDir = path.join(process.cwd(), 'archive')
    
    const trendDataMap: Record<string, { passed: number; failed: number }> = {}
    const processedDates = new Set<string>()
    
    // PRIORITY 1: Read all results-*.json files from test-results directory (latest runs)
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(file => file.startsWith('results') && file.endsWith('.json'))
      
      files.forEach(file => {
        try {
          const filePath = path.join(resultsDir, file)
          const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlaywrightResults
          const { passed, failed, date } = extractTestsFromData(rawData)
          
          // Use test-results data (latest run takes precedence)
          if (!trendDataMap[date]) {
            trendDataMap[date] = { passed: 0, failed: 0 }
          }
          trendDataMap[date].passed += passed
          trendDataMap[date].failed += failed
          processedDates.add(date)
        } catch (err) {
          console.error(`Error processing file ${file}:`, err)
        }
      })
    }
    
    // PRIORITY 2: Read archived results (only for dates NOT in test-results)
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir).filter(file => file.endsWith('.json'))
      
      files.forEach(file => {
        try {
          const filePath = path.join(archiveDir, file)
          const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlaywrightResults
          const { passed, failed, date } = extractTestsFromData(rawData)
          
          // Only use archived data if NOT already processed from test-results
          if (!processedDates.has(date)) {
            if (!trendDataMap[date]) {
              trendDataMap[date] = { passed: 0, failed: 0 }
            }
            trendDataMap[date].passed += passed
            trendDataMap[date].failed += failed
          }
        } catch (err) {
          console.error(`Error processing archived file ${file}:`, err)
        }
      })
    }
    
    // Convert to array and sort by date
    const trendData: TrendData[] = Object.entries(trendDataMap)
      .map(([date, counts]) => ({
        date,
        passed: counts.passed,
        failed: counts.failed
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    console.log('Trend data:', trendData)
    
    return NextResponse.json(trendData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error reading test trends:', error)
    return NextResponse.json({ error: 'Failed to load test trends' }, { status: 500 })
  }
}
