import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { transformPlaywrightResults, type PlaywrightResults } from '@/lib/transform-results'

export async function GET() {
  try {
    const archiveDir = path.join(process.cwd(), 'archive')
    
    if (!fs.existsSync(archiveDir)) {
      return NextResponse.json([])
    }
    
    const files = fs.readdirSync(archiveDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse() // Latest first
    
    const historicalData = files.map(file => {
      const filePath = path.join(archiveDir, file)
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlaywrightResults
      const transformedData = transformPlaywrightResults(rawData)
      
      return {
        date: file.replace('results-', '').replace('.json', ''),
        ...transformedData
      }
    })
    
    return NextResponse.json(historicalData)
  } catch (error) {
    console.error('Error reading historical results:', error)
    return NextResponse.json({ error: 'Failed to load historical results' }, { status: 500 })
  }
}
