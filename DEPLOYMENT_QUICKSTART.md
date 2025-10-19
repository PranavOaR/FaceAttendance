# Deployment Quick Start Guide

## ✅ What's Been Configured

Your project is now ready for deployment with:
1. ✅ Firebase Hosting configuration for frontend
2. ✅ Docker configuration for backend
3. ✅ Automated deployment script
4. ✅ GitHub Actions CI/CD workflow
5. ✅ Environment variable templates

## 🚀 Deploy Now (Manual)

### Step 1: Install Required Tools

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Google Cloud CLI (macOS)
brew install --cask google-cloud-sdk
```

### Step 2: Login to Services

```bash
# Login to Firebase
firebase login

# Login to Google Cloud
gcloud auth login
```

### Step 3: Run Deployment Script

```bash
# Make sure you're in the project root
cd /Users/pranavrao/Desktop/IDT\ Project/face-recognition-attendance

# Run the deployment script
./deploy.sh
```

The script will:
- Build your Next.js frontend
- Deploy Python backend to Cloud Run
- Deploy frontend to Firebase Hosting
- Configure environment variables

## 🤖 Automated Deployment (GitHub Actions)

### Setup Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **GCP_SA_KEY**: Google Cloud Service Account JSON key
   ```bash
   # Create service account
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"
   
   # Grant permissions
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   
   # Create key
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   
   # Copy contents of key.json to GCP_SA_KEY secret
   ```

2. **FIREBASE_SERVICE_ACCOUNT**: Firebase service account (same as above or separate)

3. **GCP_PROJECT_ID**: Your Firebase/GCP project ID

### Enable Auto-Deploy

Once secrets are configured, every push to `main` branch will automatically deploy!

## 📊 Cost Estimate (Free Tier)

### Firebase Hosting
- ✅ **FREE**: 10 GB storage, 360 MB/day transfer
- Your app: ~50 MB → Essentially free

### Google Cloud Run
- ✅ **FREE TIER**: 2 million requests/month
- After free tier: ~$0.00001667/request
- Estimated: $0-5/month for small usage

### Firebase Firestore
- ✅ **FREE TIER**: 50,000 reads, 20,000 writes/day
- Estimated: Free for 100-500 students

### Firebase Storage
- ✅ **FREE TIER**: 5 GB storage, 1 GB/day downloads
- 1000 student photos (~50 MB): Essentially free

**Total Estimated Cost: $0-5/month** 💰

## 🔧 Configuration

### Update Backend URL in Frontend

After deploying backend, update `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://face-recognition-backend-xxxxx-uc.a.run.app
```

Then redeploy frontend:
```bash
npm run build
firebase deploy --only hosting
```

## 🌐 Access Your Deployed App

After deployment:

**Frontend URL**: 
- Firebase Hosting: `https://YOUR_PROJECT_ID.web.app`
- Custom domain: Configure in Firebase Console

**Backend URL**: 
- Cloud Run: `https://face-recognition-backend-xxxxx-uc.a.run.app`
- API Docs: `https://face-recognition-backend-xxxxx-uc.a.run.app/docs`

## 🐛 Troubleshooting

### Issue: "Permission denied" on Cloud Run
**Solution**: 
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL@gmail.com" \
  --role="roles/run.admin"
```

### Issue: Backend deployment fails
**Solution**: 
- Check Docker builds locally: `cd backend && docker build -t test .`
- Check Cloud Run logs: `gcloud run logs read face-recognition-backend`

### Issue: Frontend shows 404
**Solution**: 
- Ensure `npm run build` creates `out` folder
- Check `firebase.json` points to `out` directory

### Issue: CORS errors
**Solution**: Update `backend/main.py` CORS settings to include your Firebase domain

## 📚 Next Steps

1. ✅ Deploy using `./deploy.sh`
2. ✅ Test all features on deployed version
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring in Cloud Console
5. ✅ Configure GitHub Actions for auto-deploy
6. ✅ Add error tracking (Sentry, optional)

## 📖 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

## 💡 Tips

- **First deployment**: Takes 5-10 minutes
- **Subsequent deployments**: 2-3 minutes
- **Cold starts**: First request may be slow (3-5s), consider minimum instances
- **Monitoring**: Check Cloud Run logs regularly
- **Backups**: Firebase automatically backs up Firestore

## 🆘 Need Help?

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guide
2. View logs: `gcloud run logs read face-recognition-backend`
3. Firebase Support: https://firebase.google.com/support
4. GitHub Issues: https://github.com/PranavOaR/FaceAttendance/issues

---

**Ready to deploy? Run `./deploy.sh` and go live in minutes!** 🚀
