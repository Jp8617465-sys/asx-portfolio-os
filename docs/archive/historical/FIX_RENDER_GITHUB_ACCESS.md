# Fix Render GitHub Access Issue

## Problem
Render can't clone your repository:
```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
==> Unable to clone https://github.com/Jp8617465-sys/asx-portfolio-os
```

This means either:
1. Your GitHub repository is **private** and Render doesn't have access
2. Render service is not connected to your GitHub account

---

## Solution: Give Render Access to Your Repository

### Option A: Make Repository Public (Quickest)

1. Go to https://github.com/Jp8617465-sys/asx-portfolio-os/settings
2. Scroll down to **Danger Zone**
3. Click **Change visibility**
4. Select **Make public**
5. Confirm by typing the repository name

**Then in Render**:
1. Go to your service dashboard
2. Click **Manual Deploy** → **Deploy latest commit**
3. Build should succeed

---

### Option B: Connect Render to Your GitHub Account (Recommended)

#### Step 1: Authorize Render in GitHub

1. Go to https://dashboard.render.com/
2. Click on your service: **asx-portfolio-api**
3. Go to **Settings** tab
4. Look for **Repository** section
5. Click **Connect Account** or **Reconnect**

#### Step 2: Grant Permissions

GitHub will ask you to:
1. Authorize Render app
2. Select which repositories Render can access
3. Choose **Only select repositories** → Select `asx-portfolio-os`
4. Click **Install & Authorize**

#### Step 3: Verify Connection

Back in Render:
1. Click **Manual Deploy** → **Deploy latest commit**
2. Build should now succeed
3. Logs should show:
   ```
   ==> Cloning from https://github.com/Jp8617465-sys/asx-portfolio-os
   ✓ Cloned successfully
   ==> Building...
   ```

---

## Alternative: Use Render's Git Integration

If the above doesn't work, try creating a new service with proper GitHub integration:

### Step 1: Create New Web Service

1. Go to https://dashboard.render.com/create
2. Select **New Web Service**
3. Click **Connect GitHub** (authorize if needed)
4. Select repository: `Jp8617465-sys/asx-portfolio-os`

### Step 2: Configure Service

```yaml
Name: asx-portfolio-api
Environment: Python 3
Region: Oregon
Branch: main
Build Command: pip install -r requirements-ml.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port 10000
Plan: Free
```

### Step 3: Add Environment Variables

Copy all variables from `RENDER_SETUP.md`:
- JWT_SECRET_KEY
- OS_API_KEY
- DATABASE_URL
- SUPABASE_DB_URL
- EODHD_API_KEY

### Step 4: Deploy

Click **Create Web Service** and wait for build to complete.

---

## Verification

After fixing access, your build logs should show:
```
==> Cloning from https://github.com/Jp8617465-sys/asx-portfolio-os
Cloning into '.'...
✓ Successfully cloned

==> Building...
pip install -r requirements-ml.txt
✓ Installation complete

==> Starting...
✅ Database: Supabase connected
✅ JWT Secret: Configured
Application startup complete
```

---

## Common Issues

### "Repository not found"
- Check repository name is correct: `Jp8617465-sys/asx-portfolio-os`
- Verify you're logged into correct GitHub account

### "Access denied"
- Revoke Render's GitHub authorization and reconnect:
  - Go to https://github.com/settings/installations
  - Find "Render" app
  - Click **Configure**
  - Add repository access

### Build succeeds but app crashes
- Check environment variables are set (see RENDER_SETUP.md)
- Verify JWT_SECRET_KEY is set
- Check runtime logs for specific errors

---

## Need Help?

If issues persist:
1. Share full Render build logs
2. Check Render's GitHub integration status
3. Verify repository exists and you have access
4. Try manual deploy after fixing access
