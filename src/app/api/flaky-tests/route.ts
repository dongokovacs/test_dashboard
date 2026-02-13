import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

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

interface TestResult {
  title: string
  status: string
  projectName: string
  file: string
  startTime?: string
}

interface ResultsFile {
  suites: Array<{
    specs: Array<{
      title: string
      tests: Array<{
        projectName: string
        results: Array<{
          status: string
          startTime: string
        }>
      }>
    }>
    suites?: any[]
  }>
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function extractTests(data: ResultsFile): TestResult[] {
  const tests: TestResult[] = []

  function processSuite(suite: any, filePath: string = '') {
    // Process specs in current suite
    if (suite.specs && Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const specFile = spec.file || filePath
        
        if (spec.tests && Array.isArray(spec.tests)) {
          for (const test of spec.tests) {
            if (test.results && test.results.length > 0) {
              const result = test.results[0]
              tests.push({
                title: spec.title,
                status: result.status,
                projectName: test.projectName,
                file: specFile,
                startTime: result.startTime
              })
            }
          }
        }
      }
    }

    // Recursively process nested suites
    if (suite.suites && Array.isArray(suite.suites)) {
      for (const nestedSuite of suite.suites) {
        processSuite(nestedSuite, suite.file || filePath)
      }
    }
  }

  if (data.suites && Array.isArray(data.suites)) {
    for (const suite of data.suites) {
      processSuite(suite)
    }
  }

  return tests
}

export async function GET() {
  try {
    const archivePath = path.join(process.cwd(), 'archive')
    
    // Get today's date and calculate previous 2 days
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const dayBeforeYesterday = new Date(today)
    dayBeforeYesterday.setDate(today.getDate() - 2)

    const dates = [dayBeforeYesterday, yesterday, today]
    const dateStrings = dates.map(d => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })

    console.log('Looking for results files:', dateStrings.map(d => `results-${d}.json`))

    // Read all three results files
    const resultsData: Array<{ date: string; tests: TestResult[] }> = []

    for (const dateStr of dateStrings) {
      const fileName = `results-${dateStr}.json`
      const filePath = path.join(archivePath, fileName)

      try {
        // Check if file exists before reading
        await fs.access(filePath)
        
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const data: ResultsFile = JSON.parse(fileContent)
        const tests = extractTests(data)
        resultsData.push({ date: dateStr, tests })
        console.log(`Loaded ${tests.length} tests from ${fileName}`)
      } catch (err) {
        // File doesn't exist or is unreadable - skip silently
        console.log(`Skipping ${fileName} - file not found`)
      }
    }

    if (resultsData.length < 2) {
      return NextResponse.json({
        flakyTests: [],
        message: 'Not enough test result files found (need at least 2 days)'
      })
    }

    // Build a map: testKey -> [status1, status2, status3]
    const testMap = new Map<string, Map<string, TestStatus>>()

    for (const { date, tests } of resultsData) {
      for (const test of tests) {
        const testKey = `${test.projectName}|||${test.title}|||${test.file}`
        
        if (!testMap.has(testKey)) {
          testMap.set(testKey, new Map())
        }

        const statusMap = testMap.get(testKey)!
        statusMap.set(date, {
          date: formatDate(test.startTime || date),
          status: test.status as 'passed' | 'failed' | 'skipped',
          time: formatTime(test.startTime || date)
        })
      }
    }

    // Find flaky tests: tests where status changed across days
    const flakyTests: FlakyTest[] = []

    for (const [testKey, statusMap] of testMap.entries()) {
      const [projectName, testName, filePath] = testKey.split('|||')
      
      // Get statuses in reverse chronological order (newest first)
      const statuses: TestStatus[] = dateStrings
        .reverse()
        .map(date => statusMap.get(date))
        .filter((s): s is TestStatus => s !== undefined)

      // Check if there are at least 2 different statuses
      const uniqueStatuses = new Set(statuses.map(s => s.status))
      
      if (uniqueStatuses.size > 1) {
        flakyTests.push({
          testName,
          projectName,
          filePath,
          statuses
        })
      }
    }

    // Sort by test name
    flakyTests.sort((a, b) => a.testName.localeCompare(b.testName))

    console.log(`Found ${flakyTests.length} flaky tests`)

    return NextResponse.json({
      flakyTests,
      datesAnalyzed: dateStrings,
      totalTestsAnalyzed: testMap.size
    })

  } catch (error) {
    console.error('Error analyzing flaky tests:', error)
    return NextResponse.json(
      { error: 'Failed to analyze flaky tests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
