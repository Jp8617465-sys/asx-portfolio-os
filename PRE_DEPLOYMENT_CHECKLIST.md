# Pre-Deployment Checklist

**Project**: ASX Portfolio OS
**Date**: January 16, 2026
**Deployment Target**: Vercel (Frontend) + Render (Backend)

Use this checklist to ensure everything is ready before deploying to production.

---

## 📋 Backend Checklist (Render)

### ✅ Environment Setup

- [x] Render account created
- [x] GitHub repository connected
- [x] Backend deployed to Render
- [x] Health endpoint responding: `https://asx-portfolio-os.onrender.com/health`
- [x] Database (Supabase) configured and connected
- [x] All environment variables set:
  - [x] `DATABASE_URL`
  - [x] `EODHD_API_KEY`
  - [x] `OS_API_KEY`
  - [x] `NEWS_API_KEY`

### ✅ Data Population

- [x] Universe table populated (2,394 tickers)
- [x] Historical prices loaded (1.2M records, 2+ years)
- [x] Fundamentals fetched (~1,700 tickers, 67% coverage)
- [ ] **Model A trained** ⚠️ PENDING
- [ ] **Signals table populated** ⚠️ PENDING

### ⏳ Model Training (Critical - Blocks Real Data)

**Status**: Not yet trained
**Impact**: Frontend will show mock data until trained

**Action Required**:
1. Choose training method:
   - **Option A**: Google Colab (recommended) - `notebooks/train_model_a_colab.ipynb`
   - **Option B**: Render shell - `python scripts/train_production_models.py`
   - **Option C**: Local with production DB - requires setup

2. After training:
   ```bash
   # Verify model exists
   ls -lh outputs/model_a_v1_2_classifier.pkl

   # Generate initial signals
   python jobs/generate_signals.py

   # Test API
   curl https://asx-portfolio-os.onrender.com/api/v1/signals/live/CBA.AX
   ```

### ✅ API Endpoints

Test these endpoints before frontend deployment:

```bash
# Health check
curl https://asx-portfolio-os.onrender.com/health
# Expected: {"status": "healthy"}

# Search stocks
curl https://asx-portfolio-os.onrender.com/api/v1/search?q=CBA
# Expected: {"status": "success", "data": [{...}]}

# Get signal (after Model A trained)
curl -H "x-api-key: YOUR_API_KEY" \
  https://asx-portfolio-os.onrender.com/api/v1/signals/live/CBA.AX
# Expected: {"ticker": "CBA.AX", "signal": "BUY", ...}
```

### ✅ Cron Jobs (Optional for MVP)

- [ ] Daily price updates configured
- [ ] Weekly fundamentals refresh scheduled
- [ ] Daily signal generation (after Model A trained)

---

## 📋 Frontend Checklist (Vercel)

### ✅ Code Quality

Run validation script:
```bash
./scripts/validate_frontend_build.sh
```

Expected: All checks pass or only minor warnings

Manual checks:
- [x] All components created (9 components)
- [x] All pages created (3 pages: landing, dashboard, stock detail)
- [x] Design tokens configured
- [x] API client configured
- [x] TypeScript types defined
- [x] No TypeScript errors
- [x] No linting errors
- [x] Dependencies installed (`npm install`)

### ✅ Configuration Files

- [x] `package.json` - All dependencies listed
- [x] `tsconfig.json` - Path aliases configured (@/*)
- [x] `tailwind.config.js` - Tailwind configured
- [x] `postcss.config.js` - PostCSS configured
- [x] `.gitignore` - node_modules, .next, .env.local excluded
- [x] `.env.example` - Environment variable template
- [x] `README.md` - Documentation complete

### ✅ Git Repository

- [x] All code committed to `main` branch
- [x] No sensitive files committed (.env, secrets)
- [x] Latest changes pushed to GitHub
- [x] Repository accessible to Vercel

Latest commits:
```bash
git log --oneline -5
# cb53be5 docs: Add Frontend MVP Phase 1 completion summary
# 4ee6214 docs: Add comprehensive frontend README
# 0a8dd94 chore: Add required frontend dependencies
# 1550790 feat: Complete MVP Phase 1 frontend implementation
```

### ⏳ Vercel Setup (Action Required)

Follow these steps to deploy:

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign in with GitHub
   - Authorize Vercel to access your repositories

2. **Import Project**
   - Click "Add New Project"
   - Select repository: `Jp8617465-sys/asx-portfolio-os`
   - Click "Import"

3. **Configure Build Settings**
   ```
   Framework Preset: Next.js (auto-detected)
   Root Directory: frontend ⚠️ CRITICAL
   Build Command: npm run build (auto-detected)
   Output Directory: .next (auto-detected)
   Install Command: npm install (auto-detected)
   Node Version: 18.x (recommended)
   ```

4. **Set Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables:

   ```
   NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com/api/v1
   NEXT_PUBLIC_API_KEY=REDACTED2026_DB_Pass_01
   ```

   Apply to: Production, Preview, Development

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Vercel will provide a URL (e.g., `asx-portfolio-os.vercel.app`)

### ✅ Post-Deployment Validation

After deployment, test these flows:

**Landing Page** (`/`)
- [ ] Page loads without errors
- [ ] Search bar renders and is interactive
- [ ] Sample signals display correctly
- [ ] Features section renders
- [ ] CTA buttons work
- [ ] Links navigate correctly

**Dashboard** (`/app/dashboard`)
- [ ] Page loads without errors
- [ ] Stats cards render (may show placeholder data)
- [ ] Top signals grid displays
- [ ] Watchlist table renders (empty state OK)
- [ ] Add to watchlist works (after Model A trained)

**Stock Detail** (`/stock/CBA.AX`)
- [ ] Page loads without errors
- [ ] Confidence gauge animates
- [ ] Price chart renders (mock data OK)
- [ ] Signal badge displays
- [ ] Reasoning panel shows factors (mock OK)
- [ ] Accuracy display renders (mock OK)
- [ ] Add to watchlist button works

**API Integration**
- [ ] Search calls backend API
- [ ] Stock data fetches from Render
- [ ] Error handling displays correctly
- [ ] Loading states work properly
- [ ] No CORS errors in browser console

**Performance**
- [ ] Lighthouse Performance score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s
- [ ] No JavaScript errors in console

---

## 📋 Integration Checklist

### ✅ Backend ↔ Frontend Communication

Test API connectivity:

1. **From Browser Console** (on deployed Vercel site):
   ```javascript
   fetch('https://asx-portfolio-os.onrender.com/health')
     .then(r => r.json())
     .then(console.log)
   // Expected: {status: "healthy"}
   ```

2. **CORS Configuration**
   - [ ] Backend allows Vercel domain in CORS origins
   - [ ] Preflight requests (OPTIONS) work
   - [ ] Headers correctly passed (x-api-key)

3. **API Key Authentication**
   - [ ] Frontend includes API key in requests
   - [ ] Backend accepts and validates API key
   - [ ] Unauthorized requests (401) handled gracefully

### ✅ Data Flow

End-to-end flow (after Model A trained):

```
User searches "CBA"
  → Frontend calls /api/v1/search?q=CBA
  → Backend queries database
  → Returns: [{"ticker": "CBA.AX", ...}]
  → Frontend displays results

User clicks CBA.AX
  → Navigate to /stock/CBA.AX
  → Frontend calls /api/v1/signals/live/CBA.AX
  → Backend runs inference (Model A)
  → Returns: {"signal": "BUY", "confidence": 78, ...}
  → Frontend renders gauge, chart, reasoning

User adds to watchlist
  → Frontend calls POST /api/v1/watchlist
  → Backend saves to database
  → Returns: {"status": "success"}
  → Frontend updates UI
```

---

## 📋 Security Checklist

### ✅ Secrets Management

- [x] No secrets in Git repository
- [x] `.env.local` in `.gitignore`
- [x] Environment variables set in Vercel dashboard
- [x] API keys rotated regularly (set reminder: 90 days)
- [ ] Backend CORS configured to allow only Vercel domain
- [ ] Rate limiting enabled on backend endpoints

### ✅ Best Practices

- [x] HTTPS enforced (automatic on Vercel/Render)
- [x] SQL injection prevention (parameterized queries)
- [ ] Input validation on API endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include secrets

---

## 📋 Monitoring & Alerts

### ⏳ Setup Monitoring (Recommended)

1. **Uptime Monitoring**
   - Service: UptimeRobot (free) or Better Uptime
   - Monitor: Backend health endpoint
   - Alert: Email if down > 5 minutes

2. **Error Tracking**
   - Service: Sentry (free tier: 5k errors/month)
   - Frontend: Add Sentry SDK to Next.js
   - Backend: Add Sentry SDK to FastAPI
   - Alert: Email for critical errors

3. **Performance Monitoring**
   - Vercel Analytics (built-in)
   - Track: Core Web Vitals, page load times
   - Goal: Keep Performance score > 80

### ⏳ Set Alerts

Configure alerts for:
- [ ] API downtime (> 5 minutes)
- [ ] Database connection failures
- [ ] High error rates (> 5% of requests)
- [ ] Slow API response times (> 2s average)
- [ ] Model prediction failures

---

## 📋 Documentation Checklist

### ✅ User-Facing Documentation

- [x] Frontend README with setup instructions
- [x] Deployment guide (DEPLOYMENT_GUIDE.md)
- [x] Environment variable template (.env.example)
- [ ] User guide (Phase 2)
- [ ] FAQ (Phase 2)

### ✅ Developer Documentation

- [x] API endpoints documented (in code)
- [x] Component specifications (in code)
- [x] Architecture overview (PROJECT_STATUS)
- [ ] API reference (Swagger/OpenAPI)
- [ ] Contributing guidelines

---

## 📋 Final Pre-Launch Checklist

Before announcing to users:

### ✅ Technical
- [ ] All above checklists completed
- [ ] Model A trained and generating signals
- [ ] No critical bugs in issue tracker
- [ ] Performance tests pass
- [ ] Security audit complete

### ✅ Content
- [ ] Landing page copy finalized
- [ ] Legal disclaimer added to footer
- [ ] Privacy policy created (if storing user data)
- [ ] Terms of service created

### ✅ Monitoring
- [ ] Uptime monitoring configured
- [ ] Error tracking configured
- [ ] Analytics configured (Google Analytics or Plausible)
- [ ] Alert channels set up (email, Slack, etc.)

### ✅ Backup & Recovery
- [ ] Database backup automated (Supabase does this)
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested

---

## 🚀 Launch Plan

### Phase 1: Soft Launch (Week 1)
1. Deploy to production
2. Share with 10-20 friends/testers
3. Collect feedback
4. Fix critical bugs
5. Monitor performance and errors

### Phase 2: Beta Launch (Week 2)
1. Post to Reddit r/ASX_Bets
2. Share on Twitter/LinkedIn
3. Target: 100+ users
4. Monitor server load and API usage
5. Iterate based on feedback

### Phase 3: Public Launch (Week 3-4)
1. Press release / blog post
2. Product Hunt launch
3. SEO optimization
4. Target: 1,000+ users
5. Scale infrastructure if needed

---

## 📞 Support Resources

- **GitHub Issues**: https://github.com/Jp8617465-sys/asx-portfolio-os/issues
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Render Dashboard**: https://dashboard.render.com
- **Supabase Dashboard**: https://app.supabase.com

---

## ✅ Sign-Off

Once all critical items are checked:

- [ ] Backend fully functional with real data
- [ ] Frontend deployed and accessible
- [ ] End-to-end testing passed
- [ ] Monitoring configured
- [ ] Ready for beta users

**Deployment Date**: _______________
**Deployed By**: _______________
**Production URL**: _______________

---

**Status**: ⏳ Ready for Vercel Deployment (Model A training pending for real data)

**Last Updated**: January 16, 2026
