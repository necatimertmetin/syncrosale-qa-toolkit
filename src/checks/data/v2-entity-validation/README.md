# V2 Entity Validation Tool - README

## Purpose
Backend-independent database validation tool for SYNC-9999 V2 entities. Detects data corruption, constraint violations, and business logic errors directly from the database **without connecting to the backend application**.

## Key Features  

✅ **Backend Independent** - Reads database directly, no backend load  
✅ **20+ Validation Checks** - Comprehensive bug detection  
✅ **Priority Levels** - CRITICAL, HIGH, MEDIUM issues  
✅ **FK/Constraint Checks** - Data integrity validation  
✅ **Business Logic Validation** - Price order, profit calculations, etc.  
✅ **JSON Output** - Copilot & CI/CD compatible  

## Installation

```bash
cd test-tool
npm install
```

## Configuration

### Environment Variables (.env)
```bash
# Database Connection
DB_HOST=localhost           # PostgreSQL host
DB_PORT=5432               # PostgreSQL port
DB_NAME=syncrosale         # Database name
DB_USER=postgres           # Database user
DB_PASSWORD=yourpassword   # Database password
```

### Usage

#### Interactive (Human)
```bash
npm start
# Select "V2 Entity Validation (SYNC-9999)" from menu
```

#### CLI (Automated)
```bash
node src/checks/data/v2-entity-validation/run.js \
  --db-host=backend-machine.local \
  --db-port=5432 \
  --db-name=syncrosale \
  --db-user=postgres
```

#### Docker Environment
```bash
# If backend is in Docker
docker exec -it syncro-postgres psql -U postgres -d syncrosale
# Get connection details
docker inspect syncro-postgres | grep IPAddress
```

## What Gets Validated

### 🔴 CRITICAL CHECKS (stops deployment if found)
- ✗ Price order violation: min > std or std > max
- ✗ Stock goes negative
- ✗ Foreign key violations (orphaned records)
- ✗ Profit calculation errors
- ✗ Missing required data

### 🟠 HIGH PRIORITY CHECKS
- ✗ Currency mismatch across price tiers
- ✗ Price component inconsistency (null/not-null mix)
- ✗ Missing data flag inconsistency
- ✗ Dimension metadata mismatch
- ✗ Handling days order invalid

### 🟡 MEDIUM CHECKS
- ✗ Invalid enum values
- ✗ Duplicate image ranks
- ✗ Invalid image URLs
- ✗ Missing bullet points in product detail

## Data Model Checked

### Tables
- `sync_product_v2` - Base product entity
- `sync_store_product_price_v2` - Pricing, stock, profit
- `sync_marketplace_product_v2` - Marketplace listings
- `sync_marketplace_product_offer_v2` - Offer details
- `sync_product_detail_v2` - Product descriptions
- `sync_product_image_v2` - Product images
- `sync_product_restriction_v2` - Product restrictions

### Sample Bugs Detected

#### 1. Price Order Violation
```
PRODUCT: seller/store/product-id
min_final_price: 100.00
final_price: 80.00  ← ERROR: min > std
max_final_price: 200.00
```

#### 2. Foreign Key Violation
```
marketplace_product_id: 12345
asin: B0123456789  ← NOT FOUND in sync_product_v2
Orphaned record detected!
```

#### 3. Profit Calculation Error
```
final_price: 150.00
costs: (product=50 + shipping=20 + tax=10) = 80
actual_profit: 69.00
expected_profit: 70.00  ← MISMATCH
```

#### 4. Missing Data Inconsistency
```
missing_data_flag: true
stock: 10  ← ERROR: flag says missing but has stock
prices: 100.00  ← ERROR: has prices
```

## Output Format

### Console (Human-readable)
```
================================================================================
V2 ENTITY VALIDATION REPORT
================================================================================

📊 SUMMARY:
  Passed: 15 / 20
  Total Issues: 127
  🔴 CRITICAL: 8 | 🟠 HIGH: 23 | 🟡 MEDIUM: 96

🔴 CRITICAL ISSUES:
  - Price Order Check (3 found)
    1. seller/store/prod-id: min(100) > std(80)
    2. seller/store/prod-id: std(100) > max(90)
    ...

📈 ENTITY STATISTICS:
  sync_product_v2: 5000 total (4500 active, 500 inactive)
  sync_store_product_price_v2: 8000 total (7800 active, 200 deleted)
  ...
================================================================================
```

### JSON (Copilot/CI/CD)
```json
{
  "timestamp": "2026-03-18T10:30:00Z",
  "summary": {
    "totalChecksPassed": 15,
    "totalChecksFailed": 5,
    "totalIssuesFound": 127,
    "criticalCount": 8,
    "highCount": 23,
    "mediumCount": 96
  },
  "severity": {
    "CRITICAL": [
      {
        "checkName": "Price Order Check",
        "issueCount": 3,
        "issues": [...]
      }
    ]
  },
  "statistics": {...}
}
```

## Exit Codes
- `0` - All validations passed
- `1` - Issues found (critical or high priority)

## Performance

Typical run times:
- 5,000 products: 2-5 seconds
- 10,000 products: 5-10 seconds
- 50,000 products: 20-30 seconds

Queries are optimized with:
- LIMIT 1000 per check (stop early if issues found)
- Connection pooling (2 connections max)
- 30-second query timeout

## Database Requirements

✅ Supported: PostgreSQL 12+  
⚠️ Requires: SELECT permissions only (read-only execution)

## Troubleshooting

### Connection Failed
```
ERROR: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Check DB_HOST, DB_PORT in .env. If backend is remote:
```bash
ssh backend-user@backend-machine
psql -h localhost -U postgres -d syncrosale -c "SELECT VERSION();"
```

### Query Timeout
```
ERROR: statement timeout
```
**Solution:** DB under heavy load. Try running off-peak or increase timeout:
```bash
DB_QUERY_TIMEOUT=60000 node src/checks/data/v2-entity-validation/run.js
```

### Missing Tables
```
ERROR: relation "sync_product_v2" does not exist
```
**Solution:** Schema not created yet. Verify migrations are up-to-date on backend:
```bash
# On backend
mvn liquibase:update
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Validate V2 Entities
  run: |
    cd test-tool
    npm install
    node src/checks/data/v2-entity-validation/run.js \
      --db-host=${{ secrets.DB_HOST }} \
      --db-user=reader \
      --db-name=syncrosale
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## Questions?

- **Performance Issue?** Check database indexes on query columns
- **False Positive?** Review the actual query in `queries.js`
- **Need New Check?** Add query to `queries.js` + validator to `validators.js`

---

*Tool created for SYNC-9999 test automation. Backend independent validation.*
