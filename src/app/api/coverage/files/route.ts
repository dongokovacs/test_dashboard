import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface SpecFileCoverage {
  fileName: string
  relativePath: string
  filePath: string
  size: number
  modified: Date
  coveragePercentage: number
  uncoveredLines: number[]
  testCount: number
  stepCount: number
  requirementIds: string[]
  requirementCoverage: number
}

// Analyze spec file content for coverage metrics
function analyzeSpecFile(filePath: string): {
  testCount: number
  stepCount: number
  requirementIds: string[]
} {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Count all test cases (not test.describe, test.step, test.beforeEach, test.afterEach, test.skip)
    // Match: test( or test.only( but NOT test.describe( or test.step(
    const testMatches = content.match(/(?<!\.)\btest\s*\(|test\.only\s*\(/g) || []
    const testCount = testMatches.length
    
    // Count test steps
    const stepMatches = content.match(/test\.step\s*\(/g) || []
    const stepCount = stepMatches.length
    
    // Extract requirement IDs (REQ-XXX-XXX-XXX-NNN)
    const reqMatches = content.match(/REQ-[A-Z]+-[A-Z]+-[A-Z]+-\d+/g) || []
    const requirementIds = [...new Set(reqMatches)] // Remove duplicates
    
    return {
      testCount,
      stepCount,
      requirementIds
    }
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error)
    return {
      testCount: 0,
      stepCount: 0,
      requirementIds: []
    }
  }
}

// Load mapping.json to calculate requirement coverage
function loadMappingData(): Record<string, string> {
  try {
    const mappingPath = path.join(process.cwd(), 'mapping.json')
    if (fs.existsSync(mappingPath)) {
      const content = fs.readFileSync(mappingPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading mapping.json:', error)
  }
  return {}
}

// Recursive function to find all .spec.ts files
function findSpecFiles(dir: string, baseDir: string, mappingData: Record<string, string>): SpecFileCoverage[] {
  const results: SpecFileCoverage[] = []
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively search in subdirectories
        results.push(...findSpecFiles(fullPath, baseDir, mappingData))
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        const stats = fs.statSync(fullPath)
        const relativePath = path.relative(baseDir, fullPath)
        
        // Analyze file content
        const analysis = analyzeSpecFile(fullPath)
        
        // Calculate requirement coverage
        // Step 1: Extract requirement prefixes from found requirements
        // E.g., REQ-DIC-DETAILS-UIC-001 → REQ-DIC-DETAILS-UIC
        const reqPrefixes = new Set(
          analysis.requirementIds.map(reqId => {
            const parts = reqId.split('-')
            // Keep all parts except the last numeric part
            return parts.slice(0, -1).join('-')
          })
        )
        
        // Step 2: Find all requirements in mapping that share the same prefix
        const relevantReqs = Object.keys(mappingData).filter(reqId => {
          // Check if this requirement ID matches any of the prefixes
          return Array.from(reqPrefixes).some(prefix => 
            reqId.startsWith(prefix + '-')
          )
        })
        
        // Step 3: Calculate coverage percentage
        const coveredReqs = analysis.requirementIds
        const requirementCoverage = relevantReqs.length > 0
          ? (coveredReqs.length / relevantReqs.length) * 100
          : analysis.testCount > 0 ? 100 : 0
        
        results.push({
          fileName: entry.name,
          relativePath: relativePath.replace(/\\/g, '/'),
          filePath: fullPath,
          size: stats.size,
          modified: stats.mtime,
          coveragePercentage: requirementCoverage,
          uncoveredLines: [], // Could be enhanced to show uncovered requirements
          testCount: analysis.testCount,
          stepCount: analysis.stepCount,
          requirementIds: analysis.requirementIds,
          requirementCoverage
        })
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
  
  return results
}

export async function GET() {
  try {
    // Path to tests directory
    const testsDir = path.join(process.cwd(), 'tests')
    
    if (!fs.existsSync(testsDir)) {
      return NextResponse.json({ error: 'Tests directory not found' }, { status: 404 })
    }

    // Load mapping data for requirement coverage calculation
    const mappingData = loadMappingData()

    // Get all .spec.ts files recursively with real coverage analysis
    const files = findSpecFiles(testsDir, testsDir, mappingData)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath))

    return NextResponse.json({ 
      files,
      count: files.length,
      totalTests: files.reduce((sum, f) => sum + f.testCount, 0),
      totalSteps: files.reduce((sum, f) => sum + f.stepCount, 0),
      totalRequirements: Object.keys(mappingData).length,
      mapping: mappingData  // Include mapping data for frontend
    })
  } catch (error) {
    console.error('Error fetching spec files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spec files' },
      { status: 500 }
    )
  }
}
