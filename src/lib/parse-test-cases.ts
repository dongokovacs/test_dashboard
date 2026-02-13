/**
 * Test Case Parser
 * Extracts test case metadata from Playwright spec files
 */

export interface TestStep {
  stepNumber: number;
  description: string;
  businessReason?: string;
  field?: string;
  expectedOutcome?: string;
}

export interface TestCase {
  id: string;
  title: string;
  feature: string;
  tags: string[];
  filePath: string;
  steps: TestStep[];
  businessReason?: string;
  status?: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
}

export interface TestSuite {
  name: string;
  description?: string;
  testCases: TestCase[];
}

/**
 * Parse test cases from Playwright spec file content
 */
export function parseTestCases(fileContent: string, filePath: string): TestSuite | null {
  const lines = fileContent.split('\n');
  let currentSuite: TestSuite | null = null;
  let currentTest: TestCase | null = null;
  let currentStepNumber = 0;
  let insideTest = false;
  
  // Extract feature from folder structure (e.g., "tests/forex/file.spec.ts" -> "forex")
  const normalizedPath = filePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');
  const testsIndex = pathParts.findIndex(part => part === 'tests');
  const folderFeature = testsIndex !== -1 && pathParts.length > testsIndex + 1 
    ? pathParts[testsIndex + 1]
    : 'general';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extract test.describe
    const describeMatch = line.match(/test\.describe(?:\.only)?\(['"](.*?)['"],/);
    if (describeMatch) {
      const suiteName = describeMatch[1];
      
      // Look for JSDoc comment above
      let description = '';
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        if (lines[j].includes('* Purpose:') || lines[j].includes('Purpose:')) {
          description = lines[j].replace(/.*Purpose:\s*/, '').replace(/\*\/$/, '').trim();
          break;
        }
      }
      
      currentSuite = {
        name: suiteName,
        description: description || undefined,
        testCases: []
      };
    }
    
    // Extract test cases - support both with and without tags, handle multiline
    let title = '';
    let tags: string[] = [];
    
    // First try single-line test with tags: test('title', { tag: ['@tag'] }, ...)
    let testMatch = line.match(/test\(['"](.*?)['"],\s*{.*?tag:\s*\[(.*?)\]/);
    
    if (testMatch) {
      // Single-line test with tags
      title = testMatch[1];
      const tagsStr = testMatch[2];
      tags = tagsStr.split(',').map(t => t.trim().replace(/['"]/g, ''));
    } else {
      // Try multiline: test('title', { on current line, tag on next lines
      const multilineTestMatch = line.match(/test\(['"](.*?)['"],\s*{/);
      if (multilineTestMatch) {
        title = multilineTestMatch[1];
        
        // Look ahead for tag in next 3 lines
        for (let j = i + 1; j < lines.length && j < i + 4; j++) {
          const tagMatch = lines[j].match(/tag:\s*\[(.*?)\]/);
          if (tagMatch) {
            const tagsStr = tagMatch[1];
            tags = tagsStr.split(',').map(t => t.trim().replace(/['"]/g, ''));
            break;
          }
          // Stop if we hit the async function
          if (lines[j].includes('async')) break;
        }
      }
    }
    
    if (title) {
      // Save previous test if exists
      if (currentTest && currentSuite) {
        currentSuite.testCases.push(currentTest);
      }
      
      // Use folder name as feature (forex, payment, etc.)
      const feature = folderFeature;
      
      currentTest = {
        id: generateTestCaseId(title),
        title,
        feature,
        tags,
        filePath: filePath.replace(/\\/g, '/'),
        steps: []
      };
      
      currentStepNumber = 0;
      insideTest = true;
    }
    
    // Extract test steps
    if (insideTest && line.includes('await test.step(')) {
      // Match step description - handle nested quotes by matching the outer quotes
      const stepMatch = line.match(/await test\.step\(['"](.+?)['"],\s*async/);
      if (stepMatch) {
        currentStepNumber++;
        const description = stepMatch[1];
        
        // Look for business reason comment
        let businessReason: string | undefined;
        let field: string | undefined;
        let expectedOutcome: string | undefined;
        
        for (let j = i + 1; j < lines.length && j < i + 20; j++) {
          const commentLine = lines[j];
          
          if (commentLine.includes('// Business Reason:')) {
            businessReason = commentLine.replace(/.*\/\/\s*Business Reason:\s*/, '').trim();
          }
          
          // Extract field name from ContractTests calls
          if (commentLine.includes('ContractTests.verify')) {
            const fieldMatch = commentLine.match(/['"]Input\.(.*?)['"]/);
            if (fieldMatch) {
              field = fieldMatch[1];
            }
            
            const outcomeMatch = commentLine.match(/['"]Field (.*?)['"]/);
            if (outcomeMatch) {
              expectedOutcome = outcomeMatch[1];
            }
          }
          
          // Stop only at next step (not at inner closing braces)
          if (commentLine.includes('await test.step(')) {
            break;
          }
        }
        
        if (currentTest) {
          currentTest.steps.push({
            stepNumber: currentStepNumber,
            description,
            businessReason,
            field,
            expectedOutcome
          });
        }
      }
    }
  }
  
  // Add last test if exists
  if (currentTest && currentSuite) {
    currentSuite.testCases.push(currentTest);
  }
  
  return currentSuite;
}

/**
 * Generate a test case ID from title
 */
function generateTestCaseId(title: string): string {
  // Extract key words and create ID
  const cleaned = title
    .replace(/^Validate\s+/i, '')
    .replace(/\s+for\s+.*$/i, '');
  
  const words = cleaned
    .split(/[\s-]+/) // Split by space or hyphen
    .filter(w => w.length > 3)
    .slice(0, 3);
  
  const prefix = words.map(w => w[0].toUpperCase()).join('');
  const hash = Math.abs(hashCode(title)).toString().slice(0, 3);
  
  return `${prefix}-${hash}`;
}

/**
 * Simple hash function for strings
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
