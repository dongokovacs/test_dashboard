import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseTestCases } from '@/lib/parse-test-cases';

export async function GET() {
  try {
    const testsDir = path.join(process.cwd(), 'tests');
    
    if (!fs.existsSync(testsDir)) {
      return NextResponse.json({ error: 'Tests directory not found' }, { status: 404 });
    }

    // Load latest test results
    let testResults: any = null;
    try {
      const resultsPath = path.join(process.cwd(), 'test-results');
      const resultFiles = fs.readdirSync(resultsPath)
        .filter(f => f.startsWith('results-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (resultFiles.length > 0) {
        const latestResults = fs.readFileSync(path.join(resultsPath, resultFiles[0]), 'utf-8');
        testResults = JSON.parse(latestResults);
      }
    } catch (err) {
      console.log('No test results found');
    }

    const testSuites: any[] = [];
    
    // Recursively find all .spec.ts files
    function findSpecFiles(dir: string): string[] {
      const files: string[] = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findSpecFiles(fullPath));
        } else if (item.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
      
      return files;
    }
    
    const specFiles = findSpecFiles(testsDir);
    
    for (const filePath of specFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);
        const suite = parseTestCases(content, relativePath);
        
        if (suite && suite.testCases.length > 0) {
          // Match test results with test cases
          if (testResults?.suites) {
            suite.testCases.forEach(testCase => {
              // Find matching test result by title
              const matchingResult = findTestResult(testResults.suites, testCase.title);
              if (matchingResult) {
                testCase.status = matchingResult.status;
                testCase.errorMessage = matchingResult.errorMessage;
              }
            });
          }
          
          testSuites.push({
            ...suite,
            filePath: relativePath
          });
        }
      } catch (err) {
        console.error(`Error parsing ${filePath}:`, err);
      }
    }
    
    return NextResponse.json({
      suites: testSuites,
      totalTests: testSuites.reduce((sum, suite) => sum + suite.testCases.length, 0),
      totalSuites: testSuites.length
    });
  } catch (error) {
    console.error('Error loading test cases:', error);
    return NextResponse.json(
      { error: 'Failed to load test cases' },
      { status: 500 }
    );
  }
}

// Helper function to strip ANSI color codes from text
function stripAnsiCodes(text: string): string {
  // Remove ANSI escape sequences: \x1b[...m or [[...m
  return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[\[?[0-9;]*m/g, '');
}

// Helper function to find test result by title
function findTestResult(suites: any[], testTitle: string): { status: 'passed' | 'failed' | 'skipped'; errorMessage?: string } | null {
  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.title === testTitle && spec.tests?.[0]?.results?.[0]) {
          const result = spec.tests[0].results[0];
          const status = result.status === 'passed' ? 'passed' : 
                        result.status === 'skipped' ? 'skipped' : 'failed';
          
          // Extract error message if test failed
          let errorMessage: string | undefined;
          if (status === 'failed' && result.error) {
            const rawMessage = result.error.message || JSON.stringify(result.error);
            // Strip ANSI color codes for clean display
            errorMessage = stripAnsiCodes(rawMessage);
          }
          
          return {
            status,
            errorMessage
          };
        }
      }
    }
    if (suite.suites) {
      const found = findTestResult(suite.suites, testTitle);
      if (found) return found;
    }
  }
  return null;
}
