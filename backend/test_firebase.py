#!/usr/bin/env python3
"""
Quick test to verify Firebase service account key is working
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.firebase_utils import FirebaseService

def test_firebase_connection():
    print("🔥 Testing Firebase Service Account Key...")
    
    # Check if service account key exists
    if not os.path.exists("serviceAccountKey.json"):
        print("❌ serviceAccountKey.json not found!")
        print("   Please add your Firebase service account key to this directory.")
        return False
    
    try:
        # Initialize Firebase service
        firebase = FirebaseService()
        
        # Test connection
        is_connected = firebase.db is not None
        
        if is_connected:
            print("✅ Firebase initialized successfully!")
            print("   Database client:", type(firebase.db).__name__)
            print("   Storage bucket:", type(firebase.bucket).__name__ if firebase.bucket else "Not available")
            return True
        else:
            print("❌ Firebase initialization failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Firebase: {e}")
        return False

if __name__ == "__main__":
    success = test_firebase_connection()
    
    if success:
        print("\n🎉 Firebase is ready! You can now:")
        print("   1. Train face recognition models")
        print("   2. Store and retrieve student data")
        print("   3. Mark attendance in Firestore")
        print("   4. Use the full face recognition system!")
    else:
        print("\n💡 Next steps:")
        print("   1. Download your Firebase service account key")
        print("   2. Rename it to 'serviceAccountKey.json'") 
        print("   3. Place it in the /backend directory")
        print("   4. Run this test again")