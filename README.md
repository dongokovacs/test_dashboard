# Playwright Test Results Dashboard

A web-based dashboard for visualizing and analyzing Playwright test results with real-time insights, historical trends, and interactive reports.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?style=flat&logo=tailwindcss)

## ✨ Features

- 📊 **Real-time Metrics** - Pass/fail rates, test counts, execution times
- 📈 **Trend Analysis** - Historical charts showing test stability over time  
- 🐛 **Flaky Test Detection** - Automatically identifies unreliable tests
- ⏱️ **Performance Tracking** - Execution time history and slowest tests
- 📋 **Test Case Management** - Browse and search all tests in your suite
- 📦 **Archive Management** - Store and compare historical results
- 📄 **PDF Export** - Generate stakeholder-ready reports
- 🔄 **Auto-refresh** - Real-time updates every 30 seconds

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Playwright test suite with JSON reporter

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/test_dashboard.git
cd test_dashboard

# Install dependencies
npm install

# Create required directories
mkdir test-results archive tests

# Start the dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configure Playwright

Add JSON reporter to your `playwright.config.ts`:

```typescript
export default defineConfig({
  reporter: [['json', { outputFile: 'test-results/results.json' }]],
  // ... other config
});
```

Run your tests:

```bash
npx playwright test
```

The dashboard will automatically detect and display your results!

## 📁 Project Structure

```
test_dashboard/
├── src/app/              # Next.js pages and API routes
├── src/components/       # React components
├── src/lib/             # Utilities and parsers
├── test-results/        # Place your Playwright JSON results here
├── archive/             # Archived historical results
└── tests/              # Your Playwright tests (optional)
```

## 🎯 Usage

### Main Dashboard
- View test metrics, trends, and results
- Select dates to compare historical runs
- Archive results for long-term tracking
- Export PDF reports

### Pages
- **/** - Main dashboard with metrics and results
- **/test-cases** - Browse all test cases
- **/coverage** - View test coverage
- **/case-times** - Analyze test performance

### Archiving Results
Click **"📦 Archive Results"** to save current results to the `archive/` folder for historical trend analysis.

## 🔧 Troubleshooting

**Dashboard shows "No results found"**  
→ Run Playwright tests with JSON reporter configured, ensure `test-results/results.json` exists

**Blank dashboard or errors**  
→ Check that your JSON has at minimum: `{"suites": []}`

**Archive files not detected**  
→ Place files in `archive/` folder with naming: `results-YYYY-MM-DD.json`

**Dashboard doesn't update**  
→ Hard refresh (Ctrl+Shift+R) or wait for auto-refresh (30s)

## 🛠️ Tech Stack

Next.js 16 • TypeScript • React 19 • Tailwind CSS • Recharts • shadcn/ui

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License - feel free to use this project for your testing needs.

---

**Built for better test visibility** 🚀
