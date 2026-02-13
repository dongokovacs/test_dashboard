import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { PlaywrightResults } from '@/lib/transform-results'

interface SuiteDuration {
  date: string
  [suiteName: string]: number | string | { duration: number; testCount: number }
}

interface SuiteInfo {
  duration: number
  testCount: number
}

function extractSuiteDurations(rawData: PlaywrightResults): { date: string; suites: Record<string, SuiteInfo> } {
  const suiteDurations: Record<string, SuiteInfo> = {}
  
  function processSuite(suite: any) {
    // Get spec file name
    if (suite.file) {
      const specFileName = path.basename(suite.file)
      
      // Calculate total duration and test count for this spec file
      let totalDuration = 0
      let testCount = 0
      
      if (suite.specs && suite.specs.length > 0) {
        suite.specs.forEach((spec: any) => {
          if (spec.tests && spec.tests.length > 0) {
            spec.tests.forEach((test: any) => {
              testCount++
              const result = test.results?.[0]
              if (result && result.duration) {
                totalDuration += result.duration
              }
            })
          }
        })
      }
      
      // Add or accumulate duration and test count for this spec file
      if (!suiteDurations[specFileName]) {
        suiteDurations[specFileName] = { duration: 0, testCount: 0 }
      }
      suiteDurations[specFileName].duration += totalDuration / 1000 // Convert to seconds
      suiteDurations[specFileName].testCount += testCount
    }
    
    // Process nested suites
    if (suite.suites && suite.suites.length > 0) {
      suite.suites.forEach((subSuite: any) => processSuite(subSuite))
    }
  }
  
  rawData.suites.forEach(suite => processSuite(suite))
  
  // Extract date from stats.startTime
  const date = rawData.stats.startTime 
    ? new Date(rawData.stats.startTime).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]
  
  return { date, suites: suiteDurations }
}

export async function GET() {
  try {
    const resultsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'archive')
    
    const durationDataMap: Record<string, Record<string, SuiteInfo>> = {}
    const allSuiteNames = new Set<string>()
    const processedDates = new Set<string>()
    
    // PRIORITY 1: Process test-results directory (latest runs)
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(file => file.startsWith('results') && file.endsWith('.json'))
      
      files.forEach(file => {
        try {
          const filePath = path.join(resultsDir, file)
          const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlaywrightResults
          const { date, suites } = extractSuiteDurations(rawData)
          
          // Use test-results data (latest run takes precedence)
          if (!durationDataMap[date]) {
            durationDataMap[date] = {}
          }
          
          // Add suite durations and test counts
          Object.entries(suites).forEach(([suiteName, info]) => {
            allSuiteNames.add(suiteName)
            if (!durationDataMap[date][suiteName]) {
              durationDataMap[date][suiteName] = { duration: 0, testCount: 0 }
            }
            durationDataMap[date][suiteName].duration += info.duration
            durationDataMap[date][suiteName].testCount += info.testCount
          })
          
          processedDates.add(date)
        } catch (err) {
          console.error(`Error processing file ${file}:`, err)
        }
      })
    }
    
    // PRIORITY 2: Process archive directory (only for dates NOT in test-results)
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir).filter(file => file.endsWith('.json'))
      
      files.forEach(file => {
        try {
          const filePath = path.join(archiveDir, file)
          const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlaywrightResults
          const { date, suites } = extractSuiteDurations(rawData)
          
          // Only use archived data if NOT already processed from test-results
          if (!processedDates.has(date)) {
            if (!durationDataMap[date]) {
              durationDataMap[date] = {}
            }
            
            // Add suite durations and test counts
            Object.entries(suites).forEach(([suiteName, info]) => {
              allSuiteNames.add(suiteName)
              if (!durationDataMap[date][suiteName]) {
                durationDataMap[date][suiteName] = { duration: 0, testCount: 0 }
              }
              durationDataMap[date][suiteName].duration += info.duration
              durationDataMap[date][suiteName].testCount += info.testCount
            })
          }
        } catch (err) {
          console.error(`Error processing archived file ${file}:`, err)
        }
      })
    }
    
    // Convert to chart data format
    const chartData: SuiteDuration[] = Object.entries(durationDataMap)
      .map(([date, suites]) => {
        const entry: SuiteDuration = { date }
        Object.entries(suites).forEach(([suiteName, info]) => {
          entry[suiteName] = info.duration
          entry[`${suiteName}_count`] = info.testCount
        })
        return entry
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const suiteNames = Array.from(allSuiteNames).sort()
    
    return NextResponse.json({
      chartData,
      suiteNames,
      totalDates: chartData.length
    })
  } catch (error) {
    console.error('Error in suite-durations API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suite duration data' },
      { status: 500 }
    )
  }
}
