# Quick Start - Deploy ASX Portfolio OS

**Goal**: Get your frontend live on Vercel in 10 minutes

## Current Status ✅

- ✅ Backend deployed and running on Render
- ✅ Database populated (1.2M prices, 1.7k fundamentals)
- ✅ Frontend code complete (all MVP Phase 1 components)
- ✅ All code committed to GitHub
- ⏳ Frontend deployment (you are here)
- ⏳ Model A training (needed for real signals)

---

## Step 1: Validate Frontend (2 minutes)

Run the validation script to ensure everything is ready:

```bash
cd /Users/jamespcino/Projects/asx-portfolio-os
./scripts/validate_frontend_build.sh
```

Expected output: `✅ ALL CHECKS PASSED!` or minor warnings

---

## Step 2: Deploy to Vercel (5 minutes)

### 2.1 Open Vercel Dashboard

Go to: https://vercel.com/dashboard

If you don't have an account:
1. Click "Sign Up"
2. Choose "Continue with GitHub"
3. Authorize Vercel

### 2.2 Import Project

1. Click **"Add New Project"**
2. In the search box, type: `asx-portfolio-os`
3. Click **"Import"** next to your repository

### 2.3 Configure Project

On the configuration screen:

**Framework Preset**: Next.js *(should auto-detect)*

**Root Directory**:
```
frontend
```
⚠️ **CRITICAL**: Click "Edit" and set this to `frontend`

**Build & Output Settings**: *(leave as defaults)*
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables**: Click "Add" and enter:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://asx-portfolio-os.onrender.com/api/v1` |
| `NEXT_PUBLIC_API_KEY` | `HugoRalph2026_DB_Pass_01` |

Click "Add" after each variable.

### 2.4 Deploy

1. Click **"Deploy"** button
2. Wait 2-3 minutes for the build
3. You'll see a success screen with your URL

**Your Production URL** will be something like:
```
https://asx-portfolio-os-[unique-id].vercel.app
```

---

## Step 3: Test Your Deployment (3 minutes)

### 3.1 Landing Page

Visit your Vercel URL

**Check**:
- [ ] Page loads without errors
- [ ] Search bar is visible and interactive
- [ ] Sample signals show (CBA.AX, BHP.AX, WES.AX)
- [ ] "Get Started" button works

### 3.2 Dashboard

Navigate to: `https://your-url.vercel.app/app/dashboard`

**Check**:
- [ ] Stats cards render (may show 0s - that's OK)
- [ ] Top signals grid displays
- [ ] Watchlist table shows empty state

### 3.3 Stock Detail

Navigate to: `https://your-url.vercel.app/stock/CBA.AX`

**Check**:
- [ ] Confidence gauge animates (mock data)
- [ ] Price chart renders (mock data)
- [ ] Signal badge displays
- [ ] No errors in browser console (F12)

### 3.4 API Connectivity

Open browser console (F12) and run:

```javascript
fetch('https://asx-portfolio-os.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

**Expected**: `{status: "healthy", timestamp: "..."}`

If this works, your frontend can talk to your backend! ✅

---

## 🎉 Success!

Your frontend is now live! Here's what you have:

✅ **Production Frontend**: https://your-url.vercel.app
✅ **Backend API**: https://asx-portfolio-os.onrender.com
✅ **Database**: Supabase with 1.2M price records

---

## ⚠️ Known Limitation: Mock Data

**Current State**: Your frontend is using mock/placeholder data for:
- Stock signals (BUY/SELL/HOLD)
- Confidence scores
- SHAP reasoning factors
- Accuracy metrics

**Why**: Model A hasn't been trained yet to generate real predictions.

**Impact**: Users can explore the UI, but all predictions are fake.

---

## Next Critical Step: Train Model A

To get **real AI predictions**, you need to train Model A.

### Option A: Google Colab (Recommended)

1. Open: https://colab.research.google.com
2. Upload: `notebooks/train_model_a_colab.ipynb`
3. Run all cells
4. Wait ~10-20 minutes
5. Download `model_a_v1_2_classifier.pkl`

### Option B: Render Shell

1. Go to https://dashboard.render.com
2. Open your `asx-portfolio-os` service
3. Click "Shell" tab
4. Run:
   ```bash
   python scripts/train_production_models.py --tune-hyperparams --n-trials 30
   ```
5. Wait ~30-60 minutes

### After Training

Generate signals:

```bash
# Run this on Render shell or locally with production DB
python jobs/generate_signals.py
```

Test live signal:

```bash
curl https://asx-portfolio-os.onrender.com/api/v1/signals/live/CBA.AX
```

Expected: Real signal with confidence score!

Then refresh your Vercel site - it will now show **real predictions**! 🚀

---

## Troubleshooting

### Issue: Build Failed on Vercel

**Symptom**: Red X during build, error logs mention missing files

**Solutions**:
1. Check Root Directory is set to `frontend` (not `/` or blank)
2. Verify all dependencies in `package.json`
3. Check build logs for specific error
4. Contact me with error logs

### Issue: 404 Not Found

**Symptom**: Vercel deployed but pages show 404

**Solution**: Root Directory is wrong. Go to:
- Vercel Dashboard → Settings → General
- Root Directory: Change to `frontend`
- Redeploy

### Issue: API Calls Fail

**Symptom**: Dashboard shows errors, console shows `CORS` or `Network Error`

**Solutions**:
1. Verify environment variables are set correctly
2. Check backend is running: https://asx-portfolio-os.onrender.com/health
3. Check CORS configuration on backend
4. Verify API key matches backend `OS_API_KEY`

### Issue: Page Loads But Looks Broken

**Symptom**: No styling, layout issues

**Solution**: Tailwind CSS not loading
1. Check `tailwind.config.js` exists
2. Verify `postcss.config.js` exists
3. Rebuild: Vercel Dashboard → Deployments → Redeploy

---

## Custom Domain (Optional)

Want a custom domain like `asxportfolio.com`?

1. Buy domain (Namecheap, GoDaddy, etc.)
2. Vercel Dashboard → Settings → Domains
3. Click "Add Domain"
4. Follow DNS configuration instructions
5. Wait 5-60 minutes for DNS propagation

---

## Monitoring (Recommended)

Set up free monitoring:

### 1. Uptime Monitoring

**Service**: UptimeRobot (free)
**URL**: https://uptimerobot.com

Setup:
1. Create account
2. Add monitor: `https://asx-portfolio-os.onrender.com/health`
3. Set interval: 5 minutes
4. Alert: Email if down > 5 minutes

### 2. Error Tracking

**Service**: Sentry (free tier: 5k errors/month)
**URL**: https://sentry.io

Setup:
1. Create account
2. Create Next.js project
3. Follow installation guide
4. Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel env vars

### 3. Analytics

**Built-in**: Vercel Analytics
- Go to Vercel Dashboard → Analytics
- Enable (free tier)
- View Core Web Vitals, traffic, etc.

---

## What's Next?

### Short-term (This Week)
1. ✅ Deploy frontend to Vercel
2. ⏳ Train Model A
3. ⏳ Generate signals
4. ⏳ Test with real data
5. Share with 10 friends for feedback

### Medium-term (Next 2 Weeks)
1. Implement Phase 2 (Portfolio Management)
2. Add Phase 3 (Alerts & Monitoring)
3. Optimize performance (Lighthouse 95+)
4. Beta launch on Reddit r/ASX_Bets

### Long-term (Month 2+)
1. Add Models B & C (fundamentals + sentiment)
2. Mobile app (React Native)
3. Advanced features (backtesting, custom timeframes)
4. Scale to 1,000+ users

---

## Support

**Questions?** Check these resources:
- Frontend README: `frontend/README.md`
- Deployment Guide: `DEPLOYMENT_GUIDE.md`
- Pre-Deployment Checklist: `PRE_DEPLOYMENT_CHECKLIST.md`
- GitHub Issues: https://github.com/Jp8617465-sys/asx-portfolio-os/issues

**Need Help?**
- Open a GitHub issue with:
  - Error logs (from Vercel or browser console)
  - Screenshots
  - Steps to reproduce

---

## Congratulations! 🎉

You've deployed ASX Portfolio OS to production!

**Next action**: Train Model A to unlock real predictions

Your production stack:
- ✅ Frontend: Vercel
- ✅ Backend: Render
- ✅ Database: Supabase
- ✅ All systems operational

**Share your success**: Tweet your live URL with #ASXPortfolioOS! 🚀
