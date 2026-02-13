import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const resultsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'archive')
    
    const dates = new Set<string>()
    
    // Read from test-results directory
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(file => file.startsWith('results-') && file.endsWith('.json'))
      
      files.forEach(file => {
        const match = file.match(/results-(\d{4}-\d{2}-\d{2})\.json/)
        if (match) {
          dates.add(match[1])
        }
      })
    }
    
    // Read from archive directory
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir)
        .filter(file => file.startsWith('results-') && file.endsWith('.json'))
      
      files.forEach(file => {
        const match = file.match(/results-(\d{4}-\d{2}-\d{2})\.json/)
        if (match) {
          dates.add(match[1])
        }
      })
    }
    
    // Sort dates in descending order (newest first)
    const sortedDates = Array.from(dates).sort().reverse()
    
    return NextResponse.json(sortedDates, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error reading available dates:', error)
    return NextResponse.json({ error: 'Failed to load available dates' }, { status: 500 })
  }
}
