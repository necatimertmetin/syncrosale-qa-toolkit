# Syncrosale Test Tool - Copilot Integration Guide

## Overview
This JavaScript automation test tool is designed to work seamlessly with GitHub Copilot for QA automation in the Syncrosale backend project.

## Quick Integration

### For Backend Project
The test tool integrates with your backend workspace via:

1. **JSON API Mode** (Copilot can call this)
   ```bash
   npm run api:list          # List available tests
   npm run api:validate      # Validate environment
   ```

2. **CLI Mode** (Human-driven testing)
   ```bash
   npm start                 # Interactive test menu
   ```

## Available Test Categories

### DATA CHECKS ✓
- **Data Reconciliation**: Syncro CSV ↔ Amazon TXT comparison
- **Profit Validation**: Price calculation verification
- **Buyable But Not Active**: Inventory inconsistency detection
- **Order Audit**: Transaction integrity validation
- **Product Audit**: Product data consistency checks

### SECURITY CHECKS 🔒
- **Input Validation**: SQL injection, XSS prevention
- **Authorization/Isolation**: Role-based access control
- **Error Leakage**: Sensitive data exposure detection
- **Rate Limiting**: API throttling validation
- **Performance**: Response time and memory analysis

## Copilot Integration Points

### 1. Ask Copilot for QA Test Plan
```
"Generate QA test checklist for SYNC-9999 branch"
```
→ Copilot reads backend code changes
→ Suggests tests based on changed files
→ Lists test-tool options

### 2. Ask Copilot to Run Tests
```
"Run data reconciliation test with this CSV"
```
→ Copilot calls test-tool API
→ Provides results directly

### 3. Validate Before Merge
```
"Check if SYNC-9999 branch is ready to merge"
```
→ Copilot analyzes changes
→ Runs relevant security/data checks
→ Generates merge readiness report

## Environment Setup

### Required Variables (.env file)
```
# Backend access
BACKEND_ACCOUNT=your-account
API_KEY=your-api-key
AWS_CREDENTIALS=path-to-credentials

# Test data
CSV_DATA_PATH=path/to/your/data.csv
AMAZON_DATA_PATH=path/to/amazon/txt
```

## API Endpoints (JSON Output)

### List Tests
```bash
npm run api -- --action=list
```
Returns: Available tools with descriptions

### Validate Setup
```bash
npm run api -- --action=validate
```
Returns: Environment checks, credentials validation

### Run Test
```bash
npm run api -- --action=run --tool="Data Reconciliation" --file=data.csv
```
Returns: JSON test results

## Automation Examples

### CI/CD Pipeline Integration
```bash
# In your pipeline script
cd test-tool
npm install
npm run api:validate
# Parse JSON output, set CI pass/fail
```

### Local Pre-commit Hook
```bash
# In git pre-commit hook
./test-tool/scripts/pre-commit.sh
```

## Tool Paths for Copilot

When Copilot needs to reference test tool:
```
Backend Project: C:\Users\necat\Desktop\Syncrosale\syncrosale-backend
Test Tool: C:\Users\necat\Desktop\Syncrosale\utils\test-tool
```

## Troubleshooting

### Missing Dependencies
```bash
npm install
```

### Environment Error
```bash
# Check if .env is configured
npm run api:validate
```

### Tests Not Running
```bash
npm start  # Use interactive mode to debug
```

## Contributing

To add new test checks:
1. Add check in `src/checks/[category]/`
2. Register in `src/cli/tools.js`
3. Update this README

---

*Maintained for Syncrosale QA automation. Last updated: March 2026*
