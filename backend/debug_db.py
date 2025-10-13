#!/usr/bin/env python3

import firebase_admin
from firebase_admin import credentials, firestore
import json

# Initialize Firebase
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# Get Firestore client
db = firestore.client()

print("=== Debugging Firebase Database ===")

# List all collections
print("\n1. Available collections:")
collections = db.collections()
for collection in collections:
    print(f"  - {collection.id}")

# Check classes collection
print("\n2. Classes in database:")
classes_ref = db.collection('classes')
classes = classes_ref.stream()

class_count = 0
for class_doc in classes:
    class_count += 1
    class_data = class_doc.to_dict()
    print(f"\n  Class ID: {class_doc.id}")
    print(f"  Class Name: {class_data.get('name', 'N/A')}")
    print(f"  Subject: {class_data.get('subject', 'N/A')}")
    
    # Check students in array format
    students_array = class_data.get('students', [])
    print(f"  Students in array: {len(students_array)}")
    
    if students_array:
        print("  Student details:")
        for i, student in enumerate(students_array[:3]):  # Show first 3 students
            print(f"    {i+1}. {student.get('name', 'N/A')} (ID: {student.get('id', 'N/A')})")
            photo = student.get('photo', '')
            if photo:
                if photo.startswith('data:'):
                    print(f"       Photo: base64 data ({len(photo)} chars)")
                else:
                    print(f"       Photo: {photo}")
            else:
                print("       Photo: None")
        
        if len(students_array) > 3:
            print(f"    ... and {len(students_array) - 3} more students")
    
    # Check students subcollection (legacy)
    students_subcol_ref = db.collection('classes').document(class_doc.id).collection('students')
    students_subcol = list(students_subcol_ref.stream())
    print(f"  Students in subcollection: {len(students_subcol)}")

print(f"\nTotal classes found: {class_count}")