import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const testResultsDir = path.join('C:', 'GIT', 'cua', 'test-results')
    
    if (!fs.existsSync(testResultsDir)) {
      return NextResponse.json({ error: 'Test results directory not found' }, { status: 404 })
    }
    
    // Read all JSON files from test-results directory
    const files = fs.readdirSync(testResultsDir).filter(file => file.endsWith('.json'))
    
    const allResults = files.map(file => {
      const filePath = path.join(testResultsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    })
    
    return NextResponse.json({ files, results: allResults })
  } catch (error) {
    console.error('Error reading test results:', error)
    return NextResponse.json({ error: 'Failed to load test results' }, { status: 500 })
  }
}
