---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[BUG] '
labels: ['bug', 'needs-triage']
assignees: ''
---

## Bug Description

**Describe the bug:**
<!-- A clear and concise description of what the bug is -->


**Severity:**
- [ ] Critical - System down or data corruption
- [ ] High - Major functionality broken
- [ ] Medium - Feature not working as expected
- [ ] Low - Minor issue or cosmetic problem

---

## Reproduction Steps

**Steps to reproduce the behavior:**
1. 
2. 
3. 
4. 

**Expected behavior:**
<!-- What did you expect to happen? -->


**Actual behavior:**
<!-- What actually happened? -->


---

## Environment

**Where did this bug occur?**
- [ ] Production
- [ ] Development
- [ ] Local environment

**System Information:**
- OS: [e.g., Ubuntu 22.04, macOS 13.0]
- Python version: [e.g., 3.11.4]
- Browser (if frontend bug): [e.g., Chrome 120, Safari 17]
- API version/commit: [e.g., v1.2.0, commit abc123]

---

## Error Logs

**Error messages or stack traces:**
```
Paste error logs here
```

**Relevant API responses:**
```json
{
  "error": "Example error response"
}
```

---

## Impact Assessment

**Which components are affected?**
<!-- Check all that apply -->
- [ ] Portfolio Management
- [ ] Signal Generation
- [ ] Model Training/Inference
- [ ] Data Pipeline
- [ ] API Endpoints
- [ ] Frontend UI
- [ ] Authentication
- [ ] Database
- [ ] Background Jobs

**Data integrity impact:**
- [ ] Yes - Data may be corrupted or incorrect
- [ ] No - Functional issue only

**If data integrity is affected, describe:**
<!-- Which data is affected? Time range? Number of records? -->


**User impact:**
- Number of users affected: 
- Workaround available: [ ] Yes [ ] No
- If yes, describe workaround: 

---

## Root Cause Analysis (if known)

**Suspected cause:**
<!-- What do you think is causing this bug? -->


**Related code/components:**
<!-- File paths, function names, or areas of code -->


---

## Proposed Fix

**How should this be fixed?**
<!-- Your suggestion for fixing the bug -->


**Alternative approaches:**


---

## Additional Context

**Screenshots:**
<!-- If applicable, add screenshots to help explain the problem -->


**Related issues or PRs:**
<!-- Link to related issues or pull requests -->


**When did this start happening?**
<!-- Date/time when bug was first observed -->


---

## Fix Checklist

<!-- Once work begins, track progress here -->

- [ ] Bug reproduced locally
- [ ] Root cause identified
- [ ] Branch created: `bugfix/PROJ-XXX_description`
- [ ] Fix implemented
- [ ] Regression tests added
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] Deployed to production
- [ ] Bug verified fixed
- [ ] Post-mortem completed (for critical/high severity)
