import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { transformPlaywrightResults, type PlaywrightResults } from '@/lib/transform-results'

export async function GET(request: Request) {
  try {
    // Get the date query parameter if provided
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    // Path to test results directory
    const resultsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'archive')
    
    let resultsPath: string | null = null
    
    // If date is specified, look for that specific file
    if (dateParam) {
      // Try archive first
      const archiveFile = path.join(archiveDir, `results-${dateParam}.json`)
      if (fs.existsSync(archiveFile)) {
        resultsPath = archiveFile
      } else {
        // Try test-results directory
        const testResultsFile = path.join(resultsDir, `results-${dateParam}.json`)
        if (fs.existsSync(testResultsFile)) {
          resultsPath = testResultsFile
        }
      }
    } else {
      // No date specified - get the most recent results file
      resultsPath = path.join(resultsDir, 'results.json')
      
      // If results.json doesn't exist, look for results-YYYY-MM-DD.json files in test-results
      if (!fs.existsSync(resultsPath)) {
        if (fs.existsSync(resultsDir)) {
          const files = fs.readdirSync(resultsDir)
            .filter(f => f.startsWith('results-') && f.endsWith('.json'))
            .sort()
            .reverse() // Most recent first
          
          if (files.length > 0) {
            resultsPath = path.join(resultsDir, files[0])
          }
        }
        
        // If still no file found, check archive directory
        if (!resultsPath || !fs.existsSync(resultsPath)) {
          if (fs.existsSync(archiveDir)) {
            const archiveFiles = fs.readdirSync(archiveDir)
              .filter(f => f.startsWith('results-') && f.endsWith('.json'))
              .sort()
              .reverse() // Most recent first
            
            if (archiveFiles.length > 0) {
              resultsPath = path.join(archiveDir, archiveFiles[0])
            }
          }
        }
      }
    }
    
    console.log('Looking for results at:', resultsPath)
    console.log('File exists:', resultsPath ? fs.existsSync(resultsPath) : false)
    
    if (!resultsPath || !fs.existsSync(resultsPath)) {
      return NextResponse.json({ 
        error: 'Test results not found',
        path: resultsPath,
        date: dateParam 
      }, { status: 404 })
    }
    
    const rawData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as PlaywrightResults
    const transformedData = transformPlaywrightResults(rawData)
    
    // Add filename to response
    const fileName = path.basename(resultsPath)
    
    return NextResponse.json({
      ...transformedData,
      fileName
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error reading test results:', error)
    return NextResponse.json({ 
      error: 'Failed to load test results',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
