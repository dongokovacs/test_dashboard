import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface TestExecution {
  date: string
  duration: number
  status: 'passed' | 'failed' | 'skipped'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')
    
    if (!testId) {
      return NextResponse.json({ error: 'testId parameter is required' }, { status: 400 })
    }
    
    // Parse testId: "filename.spec.ts::Test Name"
    const [fileName, testName] = testId.split('::')
    
    const resultsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'archive')
    const rootResults = path.join(process.cwd(), 'results.json')
    
    // Get all result files sorted by date
    const allFiles: { path: string, date: string }[] = []
    
    // Add root results.json
    if (fs.existsSync(rootResults)) {
      allFiles.push({
        path: rootResults,
        date: new Date(fs.statSync(rootResults).mtime).toISOString().split('T')[0]
      })
    }
    
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const match = f.match(/results-(\d{4}-\d{2}-\d{2})\.json/)
          return {
            path: path.join(resultsDir, f),
            date: match ? match[1] : new Date(fs.statSync(path.join(resultsDir, f)).mtime).toISOString().split('T')[0]
          }
        })
      allFiles.push(...files)
    }
    
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const match = f.match(/results-(\d{4}-\d{2}-\d{2})\.json/)
          return {
            path: path.join(archiveDir, f),
            date: match ? match[1] : new Date(fs.statSync(path.join(archiveDir, f)).mtime).toISOString().split('T')[0]
          }
        })
      allFiles.push(...files)
    }
    
    // Sort by date
    allFiles.sort((a, b) => a.date.localeCompare(b.date))
    
    // Find test executions across all files
    const executions: TestExecution[] = []
    let fullTestName = testName
    
    for (const file of allFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'))
        
        if (data.suites) {
          for (const topSuite of data.suites) {
            const processSuite = (suite: any): boolean => {
              // Check if this suite matches our file
              if (suite.file === fileName || suite.title === fileName) {
                // Process specs in this suite
                if (suite.specs) {
                  for (const spec of suite.specs) {
                    if (spec.title === testName) {
                      fullTestName = spec.title
                      
                      // Get duration and status from tests array
                      if (spec.tests && spec.tests.length > 0) {
                        const test = spec.tests[0]
                        const result = test.results?.[0]
                        
                        if (result) {
                          const duration = result.duration ? result.duration / 1000 : 0
                          const status = result.status || 'skipped'
                          
                          executions.push({
                            date: file.date,
                            duration: parseFloat(duration.toFixed(2)),
                            status: status as 'passed' | 'failed' | 'skipped'
                          })
                          
                          return true
                        }
                      }
                    }
                  }
                }
              }
              
              // Recursively check nested suites
              if (suite.suites) {
                for (const nestedSuite of suite.suites) {
                  if (processSuite(nestedSuite)) {
                    return true
                  }
                }
              }
              
              return false
            }
            
            processSuite(topSuite)
          }
        }
      } catch (err) {
        console.error(`Error parsing ${file.path}:`, err)
      }
    }
    
    console.log(`Found ${executions.length} executions for ${testName}`)
    
    return NextResponse.json({
      testId,
      testName: fullTestName,
      filePath: fileName,
      executions
    })
  } catch (error) {
    console.error('Error reading test history:', error)
    return NextResponse.json({ 
      error: 'Failed to load test history',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
