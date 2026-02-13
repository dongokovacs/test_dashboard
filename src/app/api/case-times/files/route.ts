import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface TestFileGroup {
  fileName: string
  tests: {
    testId: string
    testName: string
  }[]
}

export async function GET() {
  try {
    const resultsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'archive')
    const rootResults = path.join(process.cwd(), 'results.json')
    
    // Get all result files
    const allFiles: string[] = []
    
    // Add root results.json if exists
    if (fs.existsSync(rootResults)) {
      allFiles.push(rootResults)
    }
    
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(resultsDir, f))
      allFiles.push(...files)
    }
    
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(archiveDir, f))
      allFiles.push(...files)
    }
    
    // Extract unique test files and tests
    const testFilesMap = new Map<string, Map<string, string>>()
    
    for (const filePath of allFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        
        if (data.suites) {
          for (const topSuite of data.suites) {
            const fileName = topSuite.file || topSuite.title || 'unknown.spec.ts'
            
            if (!testFilesMap.has(fileName)) {
              testFilesMap.set(fileName, new Map())
            }
            
            const testsMap = testFilesMap.get(fileName)!
            
            // Process nested suites
            const processSuite = (suite: any) => {
              if (suite.specs) {
                for (const spec of suite.specs) {
                  const testName = spec.title
                  const testId = `${fileName}::${testName}`
                  testsMap.set(testId, testName)
                }
              }
              
              if (suite.suites) {
                for (const nestedSuite of suite.suites) {
                  processSuite(nestedSuite)
                }
              }
            }
            
            processSuite(topSuite)
          }
        }
      } catch (err) {
        console.error(`Error parsing ${filePath}:`, err)
      }
    }
    
    // Convert to array format
    const files: TestFileGroup[] = Array.from(testFilesMap.entries())
      .map(([fileName, testsMap]) => ({
        fileName,
        tests: Array.from(testsMap.entries()).map(([testId, testName]) => ({ 
          testId, 
          testName 
        }))
      }))
      .filter(f => f.tests.length > 0)
      .sort((a, b) => a.fileName.localeCompare(b.fileName))
    
    console.log(`Found ${files.length} test files with tests`)
    
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error reading test files:', error)
    return NextResponse.json({ 
      error: 'Failed to load test files',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
