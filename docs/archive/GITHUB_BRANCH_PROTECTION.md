# GitHub Branch Protection Setup
## Mandatory Configuration for Code Quality Enforcement

> **PURPOSE**: Configure GitHub to automatically block bad code from reaching production

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Access Branch Protection Settings

1. Go to your GitHub repository:
   ```
   https://github.com/Jp8617465-sys/asx-portfolio-os
   ```

2. Click **Settings** (top navigation)

3. Click **Branches** (left sidebar)

4. Click **Add rule** or **Add branch protection rule**

---

## 📋 Configuration for `main` Branch

### Branch Name Pattern:
```
main
```

### Protection Rules to Enable:

#### 1. Require Pull Request Reviews
```
✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ✅ Require review from Code Owners (if CODEOWNERS file exists)
```

**Why**: Prevents accidental direct commits to main

#### 2. Require Status Checks
```
✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging

   Status checks that are required:
   ✅ quality-checks / Code Quality & Type Checking
   ✅ test / Unit & Integration Tests (80% Coverage Required)
   ✅ build / Production Build
```

**Why**: Ensures CI/CD pipeline passes before merge

#### 3. Require Conversation Resolution
```
✅ Require conversation resolution before merging
```

**Why**: All PR comments must be addressed

#### 4. Require Signed Commits (Optional but Recommended)
```
✅ Require signed commits
```

**Why**: Verifies commit authenticity

#### 5. Require Linear History (Optional)
```
✅ Require linear history
```

**Why**: Keeps git history clean (requires squash merges)

#### 6. Administrator Enforcement
```
✅ Do not allow bypassing the above settings

OR (if you need admin flexibility):

✅ Include administrators
```

**Why**: Even admins must follow rules (recommended)

#### 7. Restrict Pushes (Recommended)
```
✅ Restrict who can push to matching branches
   Add: Administrators, Maintainers
```

**Why**: Only authorized users can push to main

#### 8. Allow Force Pushes (LEAVE UNCHECKED)
```
❌ Allow force pushes
```

**Why**: Force pushes can corrupt history

#### 9. Allow Deletions (LEAVE UNCHECKED)
```
❌ Allow deletions
```

**Why**: Prevents accidental branch deletion

---

## ✅ Verification

After configuring, verify:

### Test 1: Try to Push Directly to Main
```bash
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test"
git push origin main
```

**Expected Result**: ❌ GitHub rejects the push
```
remote: error: GH006: Protected branch update failed
```

### Test 2: Try to Merge Without CI Passing
1. Create a PR with failing tests
2. Try to click "Merge pull request"

**Expected Result**: ❌ Merge button is disabled
```
"Required status check test has not succeeded"
```

### Test 3: Successful Merge Flow
1. Create feature branch
2. Make changes + write tests
3. Push and create PR
4. Wait for CI to pass (green checkmarks)
5. Get 1 approval
6. Merge button becomes enabled ✅

---

## 📊 Visual Indicators

### Pull Request Page Will Show:

#### When CI is Running:
```
🟡 Some checks haven't completed yet
   🟡 quality-checks / Code Quality & Type Checking — In progress
   🟡 test / Unit & Integration Tests — Queued
   🟡 build / Production Build — Queued
```

#### When CI Fails:
```
❌ All checks have failed
   ❌ test / Unit & Integration Tests — Failed
      Coverage: 75.2% (Required: 80%)
   ✅ quality-checks / Code Quality & Type Checking — Passed
   ❌ build / Production Build — Failed

[Merge pull request] ← BUTTON DISABLED
```

#### When CI Passes:
```
✅ All checks have passed
   ✅ quality-checks / Code Quality & Type Checking — Passed
   ✅ test / Unit & Integration Tests — Passed (Coverage: 82.5%)
   ✅ build / Production Build — Passed

✅ Approved by 1 reviewer

[Merge pull request] ← BUTTON ENABLED ✅
```

---

## 🔧 Additional Configuration (Optional)

### 1. CODEOWNERS File
Create `.github/CODEOWNERS`:
```
# Require review from specific people for certain files

# Frontend
/frontend/     @Jp8617465-sys @frontend-lead

# Backend
/api/          @Jp8617465-sys @backend-lead

# Infrastructure
/.github/      @Jp8617465-sys @devops-lead

# Documentation
*.md           @Jp8617465-sys
```

### 2. Auto-merge When CI Passes
GitHub Settings → Enable auto-merge:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    # Auto-merge minor/patch updates when CI passes
    pull-request-branch-name:
      separator: "-"
```

### 3. Required Check Timeout
If CI doesn't complete in 1 hour, consider it failed.

---

## 📋 Branch Protection for `develop` Branch (Optional)

If you have a `develop` branch for staging:

### Configuration:
```
Branch name pattern: develop

✅ Require a pull request before merging
   ✅ Require approvals: 1

✅ Require status checks to pass before merging
   ✅ quality-checks
   ✅ test
   ✅ build

❌ Do not allow bypassing settings
   (Less strict than main - allow admin bypass)
```

---

## 🚨 Emergency Override Process

### When You MUST Bypass Protection:

**Scenario**: Critical production bug, need hotfix immediately

**Process**:
1. Create hotfix branch from `main`
2. Fix the bug
3. Push directly to `main` (admin only):
   ```bash
   git push origin hotfix/critical-fix:main --force
   ```
4. **IMMEDIATELY**:
   - Create issue documenting bypass
   - Schedule time to add tests
   - Update runbook

**Audit Trail**: GitHub logs all protection bypasses

---

## 📊 Monitoring & Reporting

### Weekly Review:
- [ ] Check protection rule violations
- [ ] Review bypass incidents
- [ ] Analyze CI failure patterns

### GitHub Insights:
Settings → Insights → Pulse
- Shows PR merge rate
- CI pass/fail rate
- Time to merge

---

## 🎓 Training Team

### Developer Onboarding Checklist:
- [ ] Read TESTING_GUIDE.md
- [ ] Read ENFORCEMENT_GUIDE.md
- [ ] Practice creating PR with failing CI
- [ ] Practice fixing and getting CI green
- [ ] Successfully merge first PR

### Common Questions:

**Q: Why can't I push to main anymore?**
**A**: Branch protection is enabled. Use feature branches + PRs.

**Q: My PR is blocked by CI. What now?**
**A**: Run `npm run pre-commit` locally to see what failed. Fix and push again.

**Q: Can I temporarily disable protection?**
**A**: Only admins can, and only for emergencies. Don't ask unless critical.

---

## ✅ Success Criteria

After setup, you should observe:

**Week 1:**
- [ ] Zero direct commits to `main`
- [ ] All changes via PRs
- [ ] CI runs on every PR

**Month 1:**
- [ ] 90%+ of PRs pass CI first time
- [ ] Average time-to-merge < 4 hours
- [ ] Zero production bugs from untested code

**Quarter 1:**
- [ ] 100% test coverage compliance
- [ ] CI/CD pipeline trusted by team
- [ ] Faster development velocity

---

## 🔗 Related Documentation

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Overall testing strategy
- [ENFORCEMENT_GUIDE.md](./ENFORCEMENT_GUIDE.md) - 80% coverage policy
- [SETUP_TESTING.md](./frontend/SETUP_TESTING.md) - Local setup
- [GitHub Docs: Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

## 📞 Support

**Issues configuring?**
- GitHub Support: https://support.github.com/
- Internal: Contact DevOps team

**Questions about policy?**
- Read: ENFORCEMENT_GUIDE.md
- Ask: Engineering Lead / CIO

---

**Last Updated**: January 2026
**Policy Owner**: CIO / Engineering Lead
**Review Frequency**: Quarterly
**Compliance**: MANDATORY
