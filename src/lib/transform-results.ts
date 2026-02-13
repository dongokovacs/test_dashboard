export interface PlaywrightTestResult {
  title: string
  status: 'passed' | 'failed' | 'skipped' | 'timedOut'
  duration: number
  retry: number
  startTime: string
  attachments?: any[]
  steps?: TestStep[]
  errors?: any[]
}

export interface TestStep {
  title: string
  duration: number
  error?: any
}

export interface PlaywrightSuite {
  title: string
  file: string
  tests?: PlaywrightTestResult[]
  suites?: PlaywrightSuite[]
  specs?: any[]
}

export interface PlaywrightResults {
  config: any
  suites: PlaywrightSuite[]
  errors: any[]
  stats: {
    startTime: string
    duration: number
    expected: number
    skipped: number
    unexpected: number
    flaky: number
  }
}

export interface DashboardMetrics {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  avgDuration: number
  passRate: number
}

export interface TestResult {
  id: string
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: string
  timestamp: string
  file?: string
  steps?: TestStep[]
}

function extractTests(suite: PlaywrightSuite, results: TestResult[] = []): TestResult[] {
  if (suite.specs && suite.specs.length > 0) {
    suite.specs.forEach((spec: any, index: number) => {
      if (spec.tests && spec.tests.length > 0) {
        spec.tests.forEach((test: any) => {
          // Check if test has results, otherwise mark as skipped
          const result = test.results?.[0]
          
          // Include tests even without results (they are skipped)
          if (result || test.expectedStatus === 'skipped' || !test.results || test.results.length === 0) {
            const steps: TestStep[] = result?.steps?.map((step: any) => ({
              title: step.title,
              duration: step.duration || 0,
              error: step.error
            })) || []

            // Determine status
            let status: 'passed' | 'failed' | 'skipped' = 'skipped'
            if (result) {
              if (result.status === 'passed') status = 'passed'
              else if (result.status === 'skipped') status = 'skipped'
              else status = 'failed'
            }

            results.push({
              id: `TEST-${results.length + 1}`,
              name: spec.title || 'Untitled Test',
              status,
              duration: result ? `${(result.duration / 1000).toFixed(1)}s` : '0.0s',
              timestamp: result?.startTime 
                ? new Date(result.startTime).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                : 'Not executed',
              file: suite.file,
              steps: steps
            })
          }
        })
      }
    })
  }
  
  if (suite.suites && suite.suites.length > 0) {
    suite.suites.forEach(subSuite => extractTests(subSuite, results))
  }
  
  return results
}

export function transformPlaywrightResults(data: PlaywrightResults): {
  metrics: DashboardMetrics
  testResults: TestResult[]
} {
  const testResults: TestResult[] = []
  
  data.suites.forEach(suite => {
    extractTests(suite, testResults)
  })
  
  const passedTests = testResults.filter(t => t.status === 'passed').length
  const failedTests = testResults.filter(t => t.status === 'failed').length
  const skippedTests = testResults.filter(t => t.status === 'skipped').length
  const totalTests = testResults.length
  
  const totalDuration = testResults.reduce((sum, test) => {
    return sum + parseFloat(test.duration)
  }, 0)
  
  const avgDuration = totalTests > 0 ? totalDuration / totalTests : 0
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
  
  return {
    metrics: {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      avgDuration,
      passRate
    },
    testResults
  }
}
