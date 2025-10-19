# Firebase Deployment Guide

## Overview
This guide covers deploying the Face Recognition Attendance System to Firebase Hosting (frontend) and Google Cloud Run (backend).

## Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud CLI** installed:
   ```bash
   # macOS
   brew install --cask google-cloud-sdk
   ```

3. **Firebase project** already configured (you have this)

4. **Google Cloud project** linked to Firebase

## Deployment Steps

### 1. Login to Firebase and Google Cloud

```bash
# Login to Firebase
firebase login

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Deploy Backend to Google Cloud Run

```bash
# Navigate to backend directory
cd backend

# Build and deploy to Cloud Run
gcloud run deploy face-recognition-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_PROJECT_ID=YOUR_PROJECT_ID" \
  --memory=2Gi \
  --timeout=300

# Note the service URL provided after deployment
# Example: https://face-recognition-backend-xxxxx-uc.a.run.app
```

### 3. Update Frontend API URL

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_API_URL=https://face-recognition-backend-xxxxx-uc.a.run.app
```

### 4. Build and Deploy Frontend

```bash
# Navigate to project root
cd ..

# Build Next.js for static export
npm run build

# Initialize Firebase (if not already done)
firebase init hosting

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 5. Update Firebase Hosting Configuration

The `firebase.json` is already configured to proxy API requests to Cloud Run.

## Environment Variables

### Backend (Cloud Run)
Set these in Cloud Run:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key (or use default credentials)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: Your Cloud Run backend URL
- `NEXT_PUBLIC_FIREBASE_API_KEY`: From Firebase config
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: From Firebase config
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: From Firebase config
- `NEXT_PUBLIC_FIREBASE_APP_ID`: From Firebase config

## Cost Considerations

### Firebase Hosting
- **Free tier**: 10 GB storage, 360 MB/day transfer
- Sufficient for most use cases

### Google Cloud Run
- **Free tier**: 2 million requests/month, 360,000 GB-seconds
- Pay-as-you-go after that
- ~$0.00001667 per request after free tier

### Firebase Firestore
- **Free tier**: 50,000 reads, 20,000 writes, 20,000 deletes per day
- 1 GB storage

### Firebase Storage
- **Free tier**: 5 GB storage, 1 GB/day downloads
- $0.026/GB after that

## Alternative: Deploy Backend to Python-Friendly Platforms

If you prefer not to use Cloud Run, consider:

1. **Render** (Free tier available)
   - Easy Python deployment
   - Automatic HTTPS
   - Free tier: 750 hours/month

2. **Railway** (Free $5 credit/month)
   - Simple deployment
   - Good for Python apps

3. **Heroku** (Paid, but reliable)
   - Well-documented
   - Easy scaling

## Quick Deploy Script

Create `deploy.sh` in root:

```bash
#!/bin/bash

echo "🚀 Deploying Face Recognition Attendance System..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Deploy backend to Cloud Run
echo "🐍 Deploying backend to Cloud Run..."
cd backend
gcloud run deploy face-recognition-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory=2Gi
cd ..

# Deploy frontend to Firebase
echo "🔥 Deploying frontend to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Monitoring

### Cloud Run
- View logs: `gcloud run logs read face-recognition-backend`
- Monitor metrics: Google Cloud Console → Cloud Run

### Firebase Hosting
- Firebase Console → Hosting
- View traffic and performance

## Troubleshooting

### Issue: Cloud Run times out
**Solution**: Increase timeout to 300s (already set in deploy command)

### Issue: Memory errors
**Solution**: Increase memory to 2Gi or 4Gi

### Issue: CORS errors
**Solution**: Update CORS settings in `backend/main.py`

### Issue: Cold starts slow
**Solution**: Consider keeping 1 instance always warm (paid feature)

## Security Notes

1. **Service Account Key**: Store in Cloud Run environment, not in code
2. **API Authentication**: Consider adding API key authentication for production
3. **Rate Limiting**: Implement rate limiting on Cloud Run
4. **HTTPS Only**: Both Firebase Hosting and Cloud Run use HTTPS by default

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up CI/CD pipeline (GitHub Actions)
4. Implement backup strategy
5. Configure error tracking (Sentry)

## Support

For issues:
- Firebase: https://firebase.google.com/support
- Cloud Run: https://cloud.google.com/run/docs/support
- GitHub Issues: https://github.com/PranavOaR/FaceAttendance/issues
