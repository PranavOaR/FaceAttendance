import firebase_admin
from firebase_admin import credentials, firestore, storage
import asyncio
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import json

class FirebaseService:
    def __init__(self):
        """Initialize Firebase Admin SDK"""
        self.db = None
        self.bucket = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin with service account"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Look for service account key
                service_account_path = "serviceAccountKey.json"
                if not os.path.exists(service_account_path):
                    print("Warning: serviceAccountKey.json not found. Please add your Firebase service account key.")
                    print("For now, using default credentials...")
                    # Initialize with default credentials for development
                    firebase_admin.initialize_app()
                else:
                    # Initialize with service account
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred, {
                        "storageBucket": "attendance-marke-5ab29.firebasestorage.app"
                    })
                
                print("Firebase Admin initialized successfully")
            
            # Get Firestore and Storage clients
            self.db = firestore.client()
            self.bucket = storage.bucket()
            
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            # For development, create mock clients
            self.db = None
            self.bucket = None
    
    async def check_connection(self) -> bool:
        """Check if Firebase connection is working"""
        try:
            if self.db is None:
                return False
            
            # Try to read a collection to test connection
            collections = self.db.collections()
            return True
        except Exception as e:
            print(f"Firebase connection check failed: {e}")
            return False
    
    async def get_class_students(self, class_id: str) -> List[Dict[str, Any]]:
        """Get all students in a class"""
        try:
            if self.db is None:
                raise Exception("Firebase not initialized")
            
            # Get class document
            class_ref = self.db.collection('classes').document(class_id)
            class_doc = class_ref.get()
            
            if not class_doc.exists:
                raise Exception(f"Class {class_id} not found")
            
            class_data = class_doc.to_dict()
            students = class_data.get('students', [])
            
            # If no students in array, check subcollection (backward compatibility)
            if not students:
                print(f"No students in array for class {class_id}, checking subcollection...")
                students_ref = self.db.collection('classes').document(class_id).collection('students')
                students_docs = students_ref.stream()
                
                students = []
                for doc in students_docs:
                    student_data = doc.to_dict()
                    students.append({
                        'id': doc.id,
                        'name': student_data.get('name', ''),
                        'srn': student_data.get('student_id', student_data.get('srn', '')),
                        'photo': student_data.get('profilePicture', student_data.get('photo', '')),
                        'classId': class_id
                    })
            
            print(f"Found {len(students)} students in class {class_id}")
            return students
            
        except Exception as e:
            print(f"Error getting class students: {e}")
            raise
    
    async def get_student_photo_url(self, photo_path: str) -> Optional[str]:
        """Get download URL for student photo"""
        try:
            if self.bucket is None:
                print("Storage bucket not initialized")
                return None
            
            # If photo_path is already a URL, return it
            if photo_path.startswith('http'):
                return photo_path
            
            # If it's a Firebase Storage path, get download URL
            if photo_path.startswith('gs://') or '/' in photo_path:
                blob = self.bucket.blob(photo_path)
                if blob.exists():
                    return blob.generate_signed_url(expiration=3600)  # 1 hour expiry
            
            return None
            
        except Exception as e:
            print(f"Error getting photo URL for {photo_path}: {e}")
            return None
    
    async def download_image(self, url: str) -> Optional[bytes]:
        """Download image from URL"""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"Error downloading image from {url}: {e}")
            return None
    
    async def save_embeddings(self, class_id: str, embeddings: Dict[str, Any]):
        """Save face embeddings to Firestore"""
        try:
            if self.db is None:
                raise Exception("Firebase not initialized")
            
            # Save embeddings to Firestore
            embeddings_ref = self.db.collection('classes').document(class_id).collection('embeddings').document('face_data')
            
            # Convert numpy arrays to lists for JSON serialization
            serializable_embeddings = {}
            for student_id, embedding in embeddings.items():
                if hasattr(embedding, 'tolist'):
                    serializable_embeddings[student_id] = embedding.tolist()
                else:
                    serializable_embeddings[student_id] = embedding
            
            embeddings_ref.set({
                'embeddings': serializable_embeddings,
                'updated_at': datetime.now(),
                'class_id': class_id
            })
            
            print(f"Saved embeddings for {len(embeddings)} students in class {class_id}")
            
        except Exception as e:
            print(f"Error saving embeddings: {e}")
            raise
    
    async def load_embeddings(self, class_id: str) -> Dict[str, Any]:
        """Load face embeddings from Firestore"""
        try:
            if self.db is None:
                return {}
            
            embeddings_ref = self.db.collection('classes').document(class_id).collection('embeddings').document('face_data')
            doc = embeddings_ref.get()
            
            if not doc.exists:
                print(f"No embeddings found for class {class_id}")
                return {}
            
            data = doc.to_dict()
            embeddings = data.get('embeddings', {})
            
            print(f"Loaded embeddings for {len(embeddings)} students in class {class_id}")
            return embeddings
            
        except Exception as e:
            print(f"Error loading embeddings: {e}")
            return {}
    
    async def mark_student_attendance(self, class_id: str, student_id: str) -> Dict[str, Any]:
        """Mark attendance for a student"""
        try:
            if self.db is None:
                raise Exception("Firebase not initialized")
            
            # Get student info
            students = await self.get_class_students(class_id)
            student = next((s for s in students if s['id'] == student_id), None)
            
            if not student:
                raise Exception(f"Student {student_id} not found in class {class_id}")
            
            # Get today's date
            today = datetime.now().strftime('%Y-%m-%d')
            
            # Get class document
            class_ref = self.db.collection('classes').document(class_id)
            class_doc = class_ref.get()
            
            if not class_doc.exists:
                raise Exception(f"Class {class_id} not found")
            
            class_data = class_doc.to_dict()
            attendance_records = class_data.get('attendanceRecords', [])
            
            # Find today's attendance record
            today_record = None
            record_index = -1
            
            for i, record in enumerate(attendance_records):
                if record.get('date') == today:
                    today_record = record
                    record_index = i
                    break
            
            # Create or update today's record
            if today_record is None:
                # Create new record for today
                today_record = {
                    'id': f"{class_id}_{today}",
                    'classId': class_id,
                    'date': today,
                    'presentStudents': [student_id],
                    'absentStudents': []
                }
                attendance_records.append(today_record)
            else:
                # Update existing record
                present_students = today_record.get('presentStudents', [])
                absent_students = today_record.get('absentStudents', [])
                
                # Add to present if not already there
                if student_id not in present_students:
                    present_students.append(student_id)
                
                # Remove from absent if there
                if student_id in absent_students:
                    absent_students.remove(student_id)
                
                today_record['presentStudents'] = present_students
                today_record['absentStudents'] = absent_students
                attendance_records[record_index] = today_record
            
            # Update the class document
            class_ref.update({'attendanceRecords': attendance_records})
            
            print(f"Marked attendance for student {student['name']} ({student_id}) in class {class_id}")
            
            return {
                'studentName': student['name'],
                'date': today,
                'status': 'present'
            }
            
        except Exception as e:
            print(f"Error marking attendance: {e}")
            raise
    
    async def get_class_data(self, class_id: str) -> Dict[str, Any]:
        """Get complete class data including students and attendance records"""
        try:
            if self.db is None:
                raise Exception("Firebase not initialized")
            
            # Get class document
            class_ref = self.db.collection('classes').document(class_id)
            class_doc = class_ref.get()
            
            if not class_doc.exists:
                return None
            
            class_data = class_doc.to_dict()
            class_data['id'] = class_doc.id
            
            return class_data
            
        except Exception as e:
            print(f"Error getting class data: {e}")
            raise
    
    async def get_teacher_classes(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all classes for a teacher"""
        try:
            if self.db is None:
                raise Exception("Firebase not initialized")
            
            # Query classes by teacher ID
            classes_ref = self.db.collection('classes')
            # Try both possible teacher ID fields
            query1 = classes_ref.where('teacherId', '==', teacher_id)
            query2 = classes_ref.where('teacherEmail', '==', teacher_id)  # fallback to email
            
            classes = []
            
            # Execute first query
            try:
                docs1 = query1.stream()
                for doc in docs1:
                    class_data = doc.to_dict()
                    class_data['id'] = doc.id
                    classes.append(class_data)
            except:
                pass  # Field might not exist
            
            # If no results and teacher_id looks like email, try email query
            if not classes and '@' in teacher_id:
                try:
                    docs2 = query2.stream()
                    for doc in docs2:
                        class_data = doc.to_dict()
                        class_data['id'] = doc.id
                        classes.append(class_data)
                except:
                    pass
            
            return classes
            
        except Exception as e:
            print(f"Error getting teacher classes: {e}")
            return []