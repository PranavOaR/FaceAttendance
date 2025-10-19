#!/bin/bash

echo "🚀 Deploying Face Recognition Attendance System..."

# Check if required CLIs are installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
read -p "Enter your Firebase/GCP Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

# Set GCP project
echo "🔧 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Build frontend
echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Deploy backend to Cloud Run
echo "🐍 Deploying backend to Cloud Run..."
cd backend

gcloud run deploy face-recognition-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_PROJECT_ID=$PROJECT_ID" \
  --memory=2Gi \
  --timeout=300

if [ $? -ne 0 ]; then
    echo "❌ Backend deployment failed"
    exit 1
fi

# Get the backend URL
BACKEND_URL=$(gcloud run services describe face-recognition-backend --region=us-central1 --format='value(status.url)')
echo "✅ Backend deployed to: $BACKEND_URL"

cd ..

# Update frontend environment
echo "🔧 Updating frontend API URL..."
echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" > .env.local

# Deploy frontend to Firebase
echo "🔥 Deploying frontend to Firebase..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Frontend deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Frontend URL: Check Firebase Console"
echo "🔌 Backend URL: $BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Visit your Firebase Hosting URL"
echo "2. Test the application"
echo "3. Monitor logs in Cloud Console"
