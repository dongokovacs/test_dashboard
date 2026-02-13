# Test Cases Management Feature

## Overview
This feature automatically extracts and displays test cases from Playwright spec files in a searchable, filterable UI.

## What's Included

### 1. **Test Case Parser** (`src/lib/parse-test-cases.ts`)
- Extracts test metadata from `.spec.ts` files
- Parses test steps with business reasons
- Generates unique test case IDs
- Supports JSDoc comments for test descriptions

### 2. **API Route** (`src/app/api/test-cases/route.ts`)
- Scans `../tests` directory recursively
- Finds all `.spec.ts` files
- Returns parsed test suites and cases as JSON

### 3. **UI Components**
- **Test Case Card** (`src/components/test-case-card.tsx`)
  - Displays individual test case with expandable steps
  - Shows tags, features, and metadata
  - Highlights business reasons for each step
  
- **Test Cases Page** (`src/app/test-cases/page.tsx`)
  - Searchable test case library
  - Filter by tags (e.g., `@forex`, `@contract`)
  - Filter by feature (e.g., Forex application)
  - Responsive grid layout

### 4. **Navigation**
- Added navigation bar to `layout.tsx`
- Links to Dashboard (📊) and Test Cases (📋)

## Features

### Search & Filter
- **Search**: Find test cases by title or step descriptions
- **Tag Filter**: Filter by test tags (`@forex`, `@contract`, `@payment`, etc.)
- **Feature Filter**: Filter by feature/module
- **Clear Filters**: Reset all filters instantly

### Test Case Display
Each test case shows:
- ✅ **Title**: Business-readable test name
- 🏷️ **Tags**: Test categorization
- 📝 **Steps**: Numbered test steps with:
  - Step description
  - Field being tested
  - Expected outcome
  - Business reason (highlighted in blue)
- 📄 **Metadata**: File path, test ID, tags

### Example Test Case

Based on your `forexContract.spec.ts`:

```
ID: BRF-123
Title: Validate backend-required fields for Forex application
Feature: Forex application
Tags: @forex, @contract

Steps:
1. Ensure account owner is required
   Field: AccownerId
   Expected: Field Account owner is required
   💼 Backend requires account owner selection per banking regulations

2. Ensure application number is required with max 6 characters
   Field: Number
   Expected: Field Number is required
   💼 Backend enforces 6-char max application number per internal policy
```

## How It Works

### Automatic Parsing
The parser extracts:
1. **Test suites**: From `test.describe()` blocks
2. **Test cases**: From `test()` function calls with tags
3. **Steps**: From `await test.step()` calls
4. **Business reasons**: From `// Business Reason:` comments
5. **Field names**: From `ContractTests.verify*()` calls

### Example Source Code
```typescript
test('Validate backend-required fields for Forex application', 
  { tag: ['@forex', '@contract'] }, 
  async ({ authenticatedPage: page }) => {
    
  await test.step('Ensure account owner is required', async () => {
    await ContractTests.verifyRequiredFieldContract(
      page,
      'Input.AccownerId',
      'Field Account owner is required',
    );
    // Business Reason: Backend requires account owner selection per banking regulations
  });
});
```

### Parsed Output
```json
{
  "id": "BRF-123",
  "title": "Validate backend-required fields for Forex application",
  "feature": "Forex application",
  "tags": ["@forex", "@contract"],
  "steps": [
    {
      "stepNumber": 1,
      "description": "Ensure account owner is required",
      "field": "AccownerId",
      "expectedOutcome": "Field Account owner is required",
      "businessReason": "Backend requires account owner selection per banking regulations"
    }
  ]
}
```

## Usage

### Access Test Cases
1. Start the dev server: `cd workspace && npm run dev`
2. Navigate to: http://localhost:3000/test-cases (or 3001 if 3000 is busy)
3. Browse all test cases from your Playwright specs

### Add New Test Cases
Just write Playwright tests following your existing pattern:
- Use `test.describe()` for test suites
- Add JSDoc comments with "Purpose:" for descriptions
- Use `{ tag: ['@category'] }` in test definitions
- Add `// Business Reason:` comments in test steps
- The parser will automatically pick them up!

### Supported Test Patterns
✅ Contract tests (data-val attributes)  
✅ Proxy tests (aria-invalid validation)  
✅ End-to-end tests  
✅ Any test with `test.step()` structure

## Tech Stack
- **Next.js 15** (App Router)
- **shadcn/ui** components
- **TypeScript**
- **Tailwind CSS**

## Installed Components
- ✅ Accordion
- ✅ Select
- ✅ Input
- ✅ Badge
- ✅ Button
- ✅ Card

## Future Enhancements

Possible additions:
1. Export test cases to Excel/PDF
2. Link to Qase test management
3. Track test execution history
4. Generate test case documentation
5. Compare test coverage across features
6. Add test case editing capability

## Notes

- Test cases are parsed **on-demand** (no pre-processing needed)
- Parser scans `../tests` directory relative to workspace
- Changes to spec files are reflected on page refresh
- Removed `await page.pause()` from line 108 in forexContract.spec.ts
