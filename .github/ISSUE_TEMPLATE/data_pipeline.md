---
name: Data Pipeline Issue
about: Report or propose changes to data pipelines, feature engineering, or ETL processes
title: '[DATA] '
labels: ['data-pipeline', 'needs-triage']
assignees: ''
---

## Data Pipeline Information

**Which pipeline is affected?**
- [ ] Price Data Ingestion (`sync_live_prices_job.py`)
- [ ] Feature Engineering (`build_extended_feature_set.py`)
- [ ] Fundamentals Data (`ingest_fundamentals_job.py`)
- [ ] Sentiment Data (`ingest_asx_announcements_job.py`)
- [ ] Signal Generation (`generate_signals.py`)
- [ ] Portfolio Sync (`portfolio_fusion_job.py`)
- [ ] Other: ___

**Is this a:**
- [ ] Bug in existing pipeline
- [ ] Enhancement to existing pipeline
- [ ] New pipeline/data source
- [ ] Performance optimization
- [ ] Data quality issue

---

## Issue Description

**Describe the issue or enhancement:**
<!-- Clear description of the problem or proposed change -->


**Current behavior:**
<!-- How does it work now? -->


**Expected/Desired behavior:**
<!-- How should it work? -->


---

## Data Details

### Data Source
- Source API/Database: 
- Endpoint/Table: 
- Update frequency: [ ] Real-time [ ] Daily [ ] Weekly [ ] Monthly
- Historical data range: YYYY-MM-DD to YYYY-MM-DD

### Data Volume
- Number of symbols: 
- Time period: 
- Approximate records: 
- Storage size: ___ MB/GB

### Data Quality
**Current data quality issues (if any):**
- Missing data: ___%
- Duplicate records: [ ] Yes [ ] No
- Outliers/Anomalies: [ ] Yes [ ] No
- Timestamp issues: [ ] Yes [ ] No

---

## Time Series Integrity

**Critical for quantitative trading platform**

**Does this change affect time series data?**
- [ ] Yes
- [ ] No

**If yes, verify:**
- [ ] No data leakage (future data not used to compute past features)
- [ ] All timestamps are timezone-aware (UTC)
- [ ] Chronological ordering preserved
- [ ] No off-by-one errors in date calculations
- [ ] Historical data immutability maintained (append-only)
- [ ] Feature engineering uses only data up to t-1

**Validation approach:**
<!-- How will you verify time series integrity? -->


---

## Feature Engineering (if applicable)

**New features to add:**
1. 
2. 
3. 

**Feature calculation logic:**
<!-- Describe the calculation, including lookback periods -->


**Feature dependencies:**
<!-- What data/other features are required? -->


**Feature validation:**
- [ ] Feature values are in expected range
- [ ] No NaN/Inf values (or properly handled)
- [ ] Feature distribution analyzed
- [ ] Correlation with existing features checked
- [ ] Stationarity tested (for time series features)

---

## Impact Assessment

### Data Integrity
- [ ] No risk of data corruption
- [ ] Backward compatible with existing data
- [ ] Data migration plan documented (if schema changes)

### Performance
- Expected pipeline runtime: ___ minutes
- Database impact: [ ] Read-only [ ] Writes
- API rate limits considered: [ ] Yes [ ] N/A
- Resource usage: CPU: ___%, Memory: ___ MB

### Dependencies
**Upstream dependencies:**
<!-- What data sources does this depend on? -->


**Downstream dependencies:**
<!-- What systems/models depend on this data? -->


---

## Testing Plan

**How will you test this change?**

### Unit Tests
- [ ] Data validation tests
- [ ] Feature calculation tests
- [ ] Error handling tests
- [ ] Edge case tests (missing data, outliers, etc.)

### Integration Tests
- [ ] End-to-end pipeline test
- [ ] Database integration test
- [ ] API integration test (if applicable)

### Data Quality Tests
- [ ] Completeness checks (expected number of records)
- [ ] Consistency checks (no duplicates, valid ranges)
- [ ] Timeliness checks (data freshness)
- [ ] Accuracy checks (spot-check against source)

### Time Series Validation
```bash
python3 scripts/validate_time_series.py --feature <feature_name>
python3 jobs/validate_no_leakage.py --feature <feature_name>
```

---

## Rollback Plan

**If this pipeline change causes issues:**

1. Immediate action: 
2. Data recovery: 
3. Rollback steps: 

**Backup strategy:**
- [ ] Data backed up before changes
- [ ] Rollback script prepared
- [ ] Recovery tested

---

## Monitoring

**How will you monitor this pipeline in production?**

- [ ] Job execution success/failure tracking
- [ ] Data quality metrics dashboard
- [ ] Alert on data anomalies
- [ ] Performance monitoring (runtime, resource usage)

**Key metrics to track:**
- Pipeline success rate: ___%
- Average runtime: ___ minutes
- Data completeness: ___%
- Data freshness: < ___ hours

---

## Security & Compliance

**Data sensitivity:**
- [ ] Public market data (no PII)
- [ ] User portfolio data (contains PII)
- [ ] Internal only

**Access controls:**
- [ ] API keys properly secured (in environment variables)
- [ ] Database credentials protected
- [ ] No secrets in code

**Data retention:**
- Retention period: ___ days/years
- Archival strategy: 
- Compliance requirements: 

---

## Additional Context

**Related issues/PRs:**


**External documentation:**
<!-- API docs, data dictionaries, etc. -->


**Timeline:**
<!-- When is this needed? -->


---

## Implementation Checklist

<!-- Track progress once work begins -->

- [ ] Design documented
- [ ] Branch created: `data/PROJ-XXX_description`
- [ ] Pipeline code implemented
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Time series validation passed
- [ ] No data leakage verified
- [ ] Data quality checks implemented
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Dry run in development
- [ ] Production deployment
- [ ] Monitoring verified
- [ ] Data quality verified (7 days post-deployment)
