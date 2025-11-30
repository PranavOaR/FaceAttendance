import asyncio
from typing import Dict, Any, List, Optional
import numpy as np
from .firebase_utils import FirebaseService
from .embeddings import EmbeddingService

class RecognitionService:
    def __init__(self, firebase_service: FirebaseService, embedding_service: EmbeddingService):
        """Initialize recognition service with Firebase and embedding services"""
        self.firebase = firebase_service
        self.embeddings = embedding_service
        # Recognition threshold for face distance (lower = more strict)
        # 0.6 is the recommended default for face_recognition library
        # 0.5 = strict (may miss some matches), 0.6 = balanced, 0.7 = lenient (more false positives)
        self.recognition_threshold = 0.6  # Balanced threshold matching face_recognition library defaults
    
    async def train_class_embeddings(self, class_id: str, students: List[Dict[str, Any]]) -> int:
        """
        Train face recognition model for a class
        Downloads photos and generates embeddings for all students
        Returns number of students successfully processed
        """
        try:
            print(f"Training embeddings for class {class_id} with {len(students)} students")
            
            # Create downloads for all students
            download_tasks = []
            for student in students:
                photo_path = student.get('photo', '')
                if photo_path:
                    if photo_path.startswith('http'):
                        download_tasks.append(self.firebase.download_image(photo_path))
                    else:
                        # Get download URL from Firebase Storage then download
                        async def get_and_download(path):
                            url = await self.firebase.get_student_photo_url(path)
                            if url:
                                return await self.firebase.download_image(url)
                            return None
                        download_tasks.append(get_and_download(photo_path))
                else:
                    # Create a coroutine that returns None
                    async def return_none():
                        return None
                    download_tasks.append(return_none())
            
            # Download all images concurrently
            image_data_list = await asyncio.gather(*download_tasks, return_exceptions=True)
            
            # Create a mapping of students to their image data
            students_with_images = []
            for i, student in enumerate(students):
                image_data = image_data_list[i] if i < len(image_data_list) and not isinstance(image_data_list[i], Exception) else None
                students_with_images.append((student, image_data))
            
            # Generate embeddings synchronously
            embeddings = self.embeddings.generate_class_embeddings_sync(students_with_images)
            
            if embeddings:
                # Save to local cache
                self.embeddings.save_class_embeddings(class_id, embeddings)
                
                # Save to Firebase
                await self.firebase.save_embeddings(class_id, embeddings)
                
                print(f"Successfully trained embeddings for {len(embeddings)} students")
                return len(embeddings)
            else:
                print("No embeddings were generated")
                return 0
                
        except Exception as e:
            print(f"Error training class embeddings: {e}")
            raise
    
    async def load_class_embeddings(self, class_id: str) -> Dict[str, np.ndarray]:
        """
        Load embeddings for a class
        First tries local cache, then Firebase, then returns empty dict
        """
        try:
            # Try local cache first
            embeddings = self.embeddings.load_class_embeddings(class_id)
            
            if embeddings:
                print(f"Loaded {len(embeddings)} embeddings from local cache for class {class_id}")
                return embeddings
            
            # Try Firebase
            firebase_embeddings = await self.firebase.load_embeddings(class_id)
            
            if firebase_embeddings:
                # Convert back to numpy arrays
                numpy_embeddings = {}
                for student_id, embedding_list in firebase_embeddings.items():
                    if isinstance(embedding_list, list):
                        numpy_embeddings[student_id] = np.array(embedding_list)
                    else:
                        numpy_embeddings[student_id] = embedding_list
                
                # Save to local cache
                self.embeddings.save_class_embeddings(class_id, numpy_embeddings)
                
                print(f"Loaded {len(numpy_embeddings)} embeddings from Firebase for class {class_id}")
                return numpy_embeddings
            
            print(f"No embeddings found for class {class_id}")
            return {}
            
        except Exception as e:
            print(f"Error loading class embeddings: {e}")
            return {}
    
    async def recognize_face(self, class_id: str, image_data: bytes) -> Dict[str, Any]:
        """
        Recognize a face from image data
        Returns recognition result with match info
        """
        try:
            print(f"Starting face recognition for class {class_id}")
            
            # Load class embeddings
            known_embeddings = await self.load_class_embeddings(class_id)
            
            if not known_embeddings:
                return {
                    "matched": False,
                    "error": f"No trained embeddings found for class {class_id}. Please train the model first."
                }
            
            print(f"Loaded {len(known_embeddings)} known embeddings for comparison")
            
            # Extract face encoding from input image
            unknown_encoding = self.embeddings.extract_face_encoding(image_data)
            
            if unknown_encoding is None:
                return {
                    "matched": False,
                    "error": "No face detected in the provided image"
                }
            
            print("Face detected and encoding extracted successfully")
            
            # Find best match
            match_result = self.embeddings.find_best_match(
                known_embeddings, 
                unknown_encoding, 
                tolerance=self.recognition_threshold
            )
            
            if match_result["matched"]:
                # Get student info
                student_id = match_result["student_id"]
                students = await self.firebase.get_class_students(class_id)
                student = next((s for s in students if s['id'] == student_id), None)
                
                student_name = student['name'] if student else "Unknown"
                
                print(f"Face recognized: {student_name} (confidence: {match_result['confidence']:.2f})")
                
                return {
                    "matched": True,
                    "studentId": student_id,
                    "studentName": student_name,
                    "confidence": match_result["confidence"]
                }
            else:
                print(f"No match found (best confidence: {match_result['confidence']:.2f})")
                return {
                    "matched": False,
                    "confidence": match_result["confidence"],
                    "message": "Face not recognized. Please ensure the person is registered in this class."
                }
                
        except Exception as e:
            print(f"Error in face recognition: {e}")
            return {
                "matched": False,
                "error": f"Recognition failed: {str(e)}"
            }
    
    async def get_recognition_stats(self, class_id: str) -> Dict[str, Any]:
        """Get statistics about the recognition model for a class"""
        try:
            embeddings = await self.load_class_embeddings(class_id)
            students = await self.firebase.get_class_students(class_id)
            
            stats = {
                "class_id": class_id,
                "total_students": len(students),
                "trained_students": len(embeddings),
                "training_coverage": len(embeddings) / len(students) if students else 0,
                "recognition_threshold": self.recognition_threshold,
                "ready_for_recognition": len(embeddings) > 0
            }
            
            # List untrained students
            if students and embeddings:
                trained_ids = set(embeddings.keys())
                all_ids = set(s['id'] for s in students)
                untrained_ids = all_ids - trained_ids
                
                stats["untrained_students"] = [
                    s['name'] for s in students if s['id'] in untrained_ids
                ]
            
            return stats
            
        except Exception as e:
            print(f"Error getting recognition stats: {e}")
            return {"error": str(e)}
    
    def set_recognition_threshold(self, threshold: float):
        """Set the recognition confidence threshold"""
        if 0.0 <= threshold <= 1.0:
            self.recognition_threshold = threshold
            print(f"Recognition threshold set to {threshold}")
        else:
            raise ValueError("Threshold must be between 0.0 and 1.0")