# 🧪 Syncrosale QA Toolkit

CLI-based toolkit for validating, analyzing, and reconciling SyncroSale data flows.

Built for QA engineers to quickly test API performance, validate business logic, and detect inconsistencies between SyncroSale and external systems (e.g., Amazon).

---

## 🚀 Features

### ⚡ API Performance Analyzer
- Measure response times
- Detect slow endpoints
- Identify bottlenecks

### 🔄 Data Reconciliation
- Compare SyncroSale vs Amazon data
- Detect:
  - Price mismatches
  - Stock mismatches
  - Missing records
- Generate structured reports

### 💰 Profit Validator
- Validate order profit calculations
- Detect inconsistencies in:
  - Revenue
  - Costs
  - Fees
- Useful for debugging profit card issues

### 🧪 Input Validation
- Test API edge cases
- Validate request payloads
- Detect validation gaps

### 🔐 Security Checks
- Basic security validations
- Input sanitization checks

---

## 🧱 Project Structure
syncrosale-qa-toolkit/
│
├── src/
│ ├── cli/ # CLI interface (menu, navigation)
│ ├── tools/ # QA tools (analyzer, validator, etc.)
│ ├── services/ # API calls
│ ├── utils/ # Helpers & formatters
│ └── config/ # Environment configs
│
├── results/ # Generated reports (ignored in git)
├── .env # Environment variables
├── package.json
└── README.md



---

## ⚙️ Installation

```bash
git clone <repo-url>
cd syncrosale-qa-toolkit
npm install
```


## ▶️ Usage

```bash
npm run start
```

Then navigate via CLI:
🧪 SYNCRO QA TOOLKIT
```bash
1. ⚡ API Performance Analyzer
2. 🔄 Data Reconciliation
3. 💰 Profit Validator
4. 🧪 Input Validation
5. 🔐 Security Checks
```
Use arrow keys or input selection depending on mode.

## 🌐 Environment Variables

Create a .env file:
```bash
SYNCRO_USERNAME = username
SYNCRO_PASSWORD = password
SYNCRO_CLIENT_ID = client-id
SYNCRO_AUTH_URL = https://your-auth-url.com
SYNCRO_API_URL = https://your-api-url.com
```
## 📊 Output

All generated reports are stored under:
```
/results
```
Example output:
```
{
  "type": "RECON",
  "asin": "B00TEST123",
  "status": "PRICE_MISMATCH",
  "syncroPrice": 120,
  "amazonPrice": 135,
  "priceDiff": 15
}
```

## 🛠 Tech Stack

Node.js

CLI (readline)

Chalk (CLI styling)

## 📌 Future Improvements

Dashboard UI (web-based)

Automated test scenarios

CI integration