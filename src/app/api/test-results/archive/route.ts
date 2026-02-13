import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const resultsDir = path.join(process.cwd(), 'test-results')
    // Store archive in the project root
    const archiveDir = path.join(process.cwd(), 'archive')
    
    // Create archive directory if it doesn't exist
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true })
    }
    
    // Find all results-*.json files in test-results directory
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.startsWith('results-') && file.endsWith('.json'))
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No results to archive' }, { status: 404 })
    }
    
    const archived: string[] = []
    const merged: string[] = []
    
    // Copy or merge each file to archive
    files.forEach(file => {
      const sourcePath = path.join(resultsDir, file)
      const destPath = path.join(archiveDir, file)
      
      // Check if file already exists in archive
      if (fs.existsSync(destPath)) {
        try {
          // Merge test results from both files
          const existingData = JSON.parse(fs.readFileSync(destPath, 'utf-8'))
          const newData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
          
          // Merge Playwright JSON reporter format (suites array)
          const mergedResults = {
            ...newData, // Use new data as base (keeps latest config)
            suites: [...(existingData.suites || []), ...(newData.suites || [])],
          }
          
          fs.writeFileSync(destPath, JSON.stringify(mergedResults, null, 2))
          merged.push(file)
          
          const existingSuites = existingData.suites?.length || 0
          const newSuites = newData.suites?.length || 0
          console.log(`✅ Merged ${file}: ${existingSuites} + ${newSuites} = ${mergedResults.suites.length} test suites`)
        } catch (error) {
          console.error(`Failed to merge ${file}, overwriting instead:`, error)
          fs.copyFileSync(sourcePath, destPath)
          archived.push(file)
        }
      } else {
        // New file - just copy it
        fs.copyFileSync(sourcePath, destPath)
        archived.push(file)
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      archived,
      merged,
      count: archived.length + merged.length,
      message: merged.length > 0 
        ? `Archived ${archived.length} new file(s) and merged ${merged.length} existing file(s)` 
        : `Archived ${archived.length} file(s)`
    })
  } catch (error) {
    console.error('Error archiving results:', error)
    return NextResponse.json({ 
      error: 'Failed to archive results',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
