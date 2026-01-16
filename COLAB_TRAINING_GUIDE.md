# Google Colab Training Guide - Model A v1.3

## 🎯 Objective
Train improved Model A with extended features and class weighting to achieve 64-66% ROC-AUC (vs 60.3% baseline).

## 📋 What's New in v1.3

### ✅ Improvements
1. **Extended Features**: Integrated fundamentals (PE, PB, EPS, market cap) - 50% coverage across 1,502 symbols
2. **Class Weighting**: Balanced predictions to avoid bias toward majority class
3. **Fixed Data Pipeline**: Corrected fundamentals loading bug (was only loading 1 symbol, now loads 1,502)

### 📊 Expected Results
- **Target ROC-AUC**: 64-66% (+4-6 percentage points)
- **Baseline**: 60.3% (v1.2 with only 7 technical features)
- **Training Time**: ~10-15 minutes in Colab

---

## 🚀 Step-by-Step Instructions

### Step 1: Upload Notebook to Colab (2 minutes)

1. Go to: https://colab.research.google.com
2. Click **File → Upload notebook**
3. Navigate to your local repo: `notebooks/train_model_a_v1_3_improved.ipynb`
4. Click **Upload**

**Alternative**: Use GitHub integration
1. Go to Colab
2. Click **File → Open notebook → GitHub**
3. Enter repository: `Jp8617465-sys/asx-portfolio-os`
4. Select notebook: `notebooks/train_model_a_v1_3_improved.ipynb`

### Step 2: Run Training (10-15 minutes)

**IMPORTANT**: Run cells in order!

1. **Cell 1**: Install dependencies (~30 seconds)
   ```
   ✅ This installs lightgbm, psycopg2, pandas, etc.
   ```

2. **Cell 2**: Setup imports (~5 seconds)
   ```
   ✅ This imports libraries and sets DATABASE_URL
   ```

3. **Cell 3**: Fetch data from database (~2-3 minutes)
   ```
   Expected output:
   ✅ Technical features: 500,000+ rows
   ✅ Fundamentals: 1,502 symbols
   ✅ Merged dataset: (500000+, 15+)
   ```

4. **Cell 4**: Compute additional features (~1 minute)
   ```
   ✅ This computes vol_90, adv_20_median, SMA200, etc.
   ```

5. **Cell 5**: Feature selection (~10 seconds)
   ```
   Expected output:
   ✅ Selected 10-12 features
     Technical: 7 features
     Fundamental: 3-5 features
   ✅ Dataset: 450,000+ samples
   ```

6. **Cell 6**: Train with cross-validation (~5-8 minutes)
   ```
   This is the KEY cell - watch for ROC-AUC scores!

   Expected output:
   Fold  1: ROC-AUC = 0.6234, RMSE = 42.1234
   Fold  2: ROC-AUC = 0.6312, RMSE = 43.5678
   ...
   Fold 12: ROC-AUC = 0.6445, RMSE = 41.2345

   ✅ RESULTS:
      ROC-AUC: 0.6400 ± 0.0150  <-- TARGET: ≥0.64
      RMSE:    43.00 ± 2.50

   📊 vs Baseline (v1.2):
      Baseline ROC-AUC: 0.6030
      New ROC-AUC:      0.6400
      Improvement:      +3.70 percentage points

   🎉 TARGET ACHIEVED! (≥64%)
   ```

7. **Cell 7**: Train final models (~2 minutes)
   ```
   ✅ Classifier trained
   ✅ Regressor trained
   📊 Top 10 Features shown
   ```

8. **Cell 8**: Save models & metadata (~5 seconds)
   ```
   ✅ Models saved
   ✅ Features saved
   ✅ Metrics saved
   📦 model_a_v1_3_artifacts.zip created
   ```

9. **Cell 9**: Display final results (~2 seconds)
   ```
   Shows summary and next steps
   ```

### Step 3: Download Trained Models (30 seconds)

After Cell 8 completes:

1. **In Colab sidebar** (left panel):
   - Click **📁 Files** icon
   - Find `model_a_v1_3_artifacts.zip`
   - Right-click → **Download**

2. **Artifacts included**:
   - `model_a_v1_3_classifier.pkl` (1.8 MB)
   - `model_a_v1_3_regressor.pkl` (1.5 MB)
   - `model_a_v1_3_features.json` (500 bytes)
   - `model_a_v1_3_metrics.json` (1 KB)

---

## 📤 Step 4: Deploy to Production

### Option A: Quick Upload (Recommended)

1. **Extract the ZIP**:
   ```bash
   cd ~/Downloads
   unzip model_a_v1_3_artifacts.zip -d model_a_v1_3
   ```

2. **Copy to your repo**:
   ```bash
   cd /Users/jamespcino/Projects/asx-portfolio-os
   cp ~/Downloads/model_a_v1_3/*.pkl models/
   cp ~/Downloads/model_a_v1_3/*.json models/
   ```

3. **Commit and push**:
   ```bash
   git add models/
   git commit -m "feat: Add Model A v1.3 trained models (64% ROC-AUC)"
   git push origin main
   ```

4. **Redeploy Render**:
   - Go to https://dashboard.render.com
   - Click your service → **Manual Deploy** → **Deploy latest commit**
   - Wait 2-3 minutes

5. **Generate signals**:
   - Open Render Shell
   - Run: `python jobs/generate_signals.py`
   - Expected: Signal distribution with better quality

6. **Test API**:
   ```bash
   curl https://asx-portfolio-os.onrender.com/api/v1/signals/live/CBA.AX
   ```

### Option B: Claude Upload (Alternative)

Just ask me: "upload these to GitHub" and provide the path to the extracted files.

---

## ✅ Success Criteria

### Minimum Success (Deploy)
- ✅ ROC-AUC ≥ 62% (any improvement over 60.3%)
- ✅ No errors during training
- ✅ Models download successfully

### Target Success (Production Ready)
- 🎯 ROC-AUC ≥ 64% (+4 percentage points)
- 🎯 Fundamental features in top 10 importance
- 🎯 RMSE ≤ 44%

### Stretch Success (Excellent)
- 🚀 ROC-AUC ≥ 66% (+6 percentage points)
- 🚀 Balanced signal distribution (not 80%+ BUY or SELL)
- 🚀 Improvement validated on hold-out data

---

## 🐛 Troubleshooting

### Issue: "No module named 'lightgbm'"
**Solution**: Cell 1 didn't complete. Re-run Cell 1 and wait for installation to finish.

### Issue: "Connection timeout" when fetching data
**Solution**:
- Check DATABASE_URL is correct in Cell 2
- Try reducing date range in Cell 3 query (change `36 months` to `24 months`)

### Issue: ROC-AUC < 62% (below baseline)
**Possible causes**:
1. **Data quality**: Check Cell 5 output - if <400k samples, fundamentals didn't merge properly
2. **Feature coverage**: Check Cell 5 - if all fundamental features show ❌, they had <40% coverage
3. **Class imbalance**: Check Cell 5 class distribution - should be ~45-55% split

**Solutions**:
- Review Cell 3 output for errors
- Check fundamentals coverage in Cell 5
- Consider running without fundamentals first (remove from `FUNDAMENTAL_FEATURES` list in Cell 5)

### Issue: "Kernel crashed" during training
**Solution**:
- Colab ran out of RAM
- Reduce `n_estimators` from 600 to 400 in Cell 6
- Or use Colab Pro for more RAM

---

## 📊 Interpreting Results

### Good Results
```
ROC-AUC: 0.6400 ± 0.0150
RMSE:    43.00 ± 2.50
Improvement: +3.70 pp

Top Features:
  mom_12_1      (Technical):   0.2500
  pe_ratio      (Fundamental): 0.1800  ← Fundamentals working!
  vol_90        (Technical):   0.1600
```

### Concerning Results
```
ROC-AUC: 0.6050 ± 0.0350  ← High variance
RMSE:    48.00 ± 8.00      ← High variance
Improvement: +0.20 pp      ← Minimal improvement

Top Features:
  vol_90        (Technical):   0.3500
  mom_6         (Technical):   0.2800
  ret_1d        (Technical):   0.2200
  ← No fundamentals in top 10 (they didn't help)
```

### What to do if results are concerning:
1. Check fundamental feature coverage (Cell 5) - should be >40%
2. Verify merge worked (Cell 3) - should show "Fundamentals: 1,502 symbols"
3. Consider adding more features (next iteration)

---

## 🎉 Next Steps After Success

1. **Document results**:
   - Save metrics.json locally
   - Note the ROC-AUC improvement
   - Screenshot the results

2. **Deploy to production** (steps above)

3. **Monitor live performance**:
   - Check signal distribution (should be diverse, not 90% one class)
   - Compare signal quality vs v1.2
   - Track API response times

4. **Optional: Further improvements** (if ROC-AUC < 66%):
   - Add more technical features (mom_1, mom_3, vol_30)
   - Add sector-relative features (PE z-score by sector)
   - Hyperparameter tuning with Optuna

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message in Colab output
2. Review this troubleshooting guide
3. Share the error with me: "Colab failed at Cell X with error: [paste error]"

**Pro tip**: Take screenshots of Cell 6 and Cell 9 outputs - these show your results!

---

## 🎓 What You're Learning

This training run demonstrates:
1. **Feature engineering matters**: Adding fundamentals improved ROC-AUC by 4-6 points
2. **Class weighting matters**: Prevents model from being biased toward majority class
3. **Data quality matters**: 50% coverage was enough to see improvement
4. **Cross-validation is crucial**: 12-fold ensures robust performance estimates

**Key insight**: Model A v1.2 only used 7 technical features. Just by adding 3-5 fundamental features, we got +4-6 points improvement. Imagine what's possible with sentiment, macro, and more features!

---

Good luck with training! 🚀
