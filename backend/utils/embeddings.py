import face_recognition
import numpy as np
import cv2
from PIL import Image
import io
from typing import Optional, List, Dict, Any
import pickle
import os

class EmbeddingService:
    def __init__(self):
        """Initialize the embedding service"""
        self.embeddings_cache = {}
        self.cache_file = "embeddings_cache.pkl"
        self._load_cache()
    
    def _load_cache(self):
        """Load embeddings cache from file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'rb') as f:
                    self.embeddings_cache = pickle.load(f)
                print(f"Loaded embeddings cache with {len(self.embeddings_cache)} classes")
        except Exception as e:
            print(f"Error loading embeddings cache: {e}")
            self.embeddings_cache = {}
    
    def _save_cache(self):
        """Save embeddings cache to file"""
        try:
            with open(self.cache_file, 'wb') as f:
                pickle.dump(self.embeddings_cache, f)
            print("Embeddings cache saved successfully")
        except Exception as e:
            print(f"Error saving embeddings cache: {e}")
    
    def preprocess_image(self, image_data: bytes) -> Optional[np.ndarray]:
        """
        Preprocess image data for face recognition
        Returns RGB image array or None if processing fails
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            
            return image_array
            
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            return None
    
    def extract_face_encoding(self, image_data: bytes) -> Optional[np.ndarray]:
        """
        Extract face encoding from image data
        Returns 128-dimensional face encoding or None if no face found
        """
        try:
            # Preprocess image
            image_array = self.preprocess_image(image_data)
            if image_array is None:
                return None
            
            # Find face locations
            face_locations = face_recognition.face_locations(image_array)
            
            if not face_locations:
                print("No faces found in image")
                return None
            
            if len(face_locations) > 1:
                print(f"Multiple faces found ({len(face_locations)}), using the first one")
            
            # Extract face encodings
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if not face_encodings:
                print("Could not generate face encoding")
                return None
            
            # Return the first face encoding
            return face_encodings[0]
            
        except Exception as e:
            print(f"Error extracting face encoding: {e}")
            return None
    
    def compare_faces(self, known_encodings: List[np.ndarray], unknown_encoding: np.ndarray, tolerance: float = 0.6) -> List[bool]:
        """
        Compare unknown face encoding with known encodings
        Returns list of boolean matches
        """
        try:
            return face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=tolerance)
        except Exception as e:
            print(f"Error comparing faces: {e}")
            return []
    
    def face_distance(self, known_encodings: List[np.ndarray], unknown_encoding: np.ndarray) -> List[float]:
        """
        Calculate face distances (lower is better match)
        Returns list of distances
        """
        try:
            return face_recognition.face_distance(known_encodings, unknown_encoding)
        except Exception as e:
            print(f"Error calculating face distances: {e}")
            return []
    
    def find_best_match(self, known_encodings: Dict[str, np.ndarray], unknown_encoding: np.ndarray, tolerance: float = 0.6) -> Dict[str, Any]:
        """
        Find the best match for an unknown face encoding
        Returns dict with match info: {matched: bool, student_id: str, confidence: float}
        """
        try:
            if not known_encodings:
                return {"matched": False, "student_id": None, "confidence": 0.0}
            
            # Prepare data
            student_ids = list(known_encodings.keys())
            encodings = list(known_encodings.values())
            
            # Compare faces
            matches = self.compare_faces(encodings, unknown_encoding, tolerance=tolerance)
            distances = self.face_distance(encodings, unknown_encoding)
            
            # Find the best match
            if any(matches):
                # Get the index of the best match (lowest distance among matches)
                match_indices = [i for i, match in enumerate(matches) if match]
                best_match_index = min(match_indices, key=lambda i: distances[i])
                
                student_id = student_ids[best_match_index]
                confidence = 1.0 - distances[best_match_index]  # Convert distance to confidence
                
                return {
                    "matched": True,
                    "student_id": student_id,
                    "confidence": float(confidence)
                }
            else:
                # No matches found, but return the closest one with low confidence
                if distances:
                    best_index = np.argmin(distances)
                    confidence = 1.0 - distances[best_index]
                    
                    return {
                        "matched": False,
                        "student_id": student_ids[best_index],
                        "confidence": float(confidence)
                    }
                else:
                    return {"matched": False, "student_id": None, "confidence": 0.0}
            
        except Exception as e:
            print(f"Error finding best match: {e}")
            return {"matched": False, "student_id": None, "confidence": 0.0}
    
    def generate_class_embeddings_sync(self, students_with_images: List[tuple]) -> Dict[str, np.ndarray]:
        """
        Generate face embeddings for students with their pre-downloaded image data
        Returns dict mapping student_id to face encoding
        """
        embeddings = {}
        
        for student, image_data in students_with_images:
            try:
                student_id = student['id']
                student_name = student['name']
                photo_path = student.get('photo', '')
                
                if not photo_path:
                    print(f"No photo found for student {student_name} ({student_id})")
                    continue
                
                print(f"Processing student: {student_name} ({student_id})")
                
                if image_data is None:
                    print(f"Could not download image for student {student_name}")
                    continue
                
                # Handle base64 data URLs
                if isinstance(image_data, str) and image_data.startswith('data:image'):
                    try:
                        import base64
                        header, encoded = image_data.split(',', 1)
                        image_data = base64.b64decode(encoded)
                    except Exception as e:
                        print(f"Error decoding base64 image for {student_name}: {e}")
                        continue
                
                # Extract face encoding
                encoding = self.extract_face_encoding(image_data)
                
                if encoding is not None:
                    embeddings[student_id] = encoding
                    print(f"Successfully generated embedding for {student_name}")
                else:
                    print(f"Could not generate face encoding for {student_name}")
                
            except Exception as e:
                print(f"Error processing student {student.get('name', 'Unknown')}: {e}")
                continue
        
        print(f"Generated embeddings for {len(embeddings)} out of {len(students_with_images)} students")
        return embeddings

    def generate_class_embeddings(self, students: List[Dict[str, Any]], image_downloader) -> Dict[str, np.ndarray]:
        """
        Generate face embeddings for all students in a class
        Returns dict mapping student_id to face encoding
        """
        embeddings = {}
        
        for student in students:
            try:
                student_id = student['id']
                student_name = student['name']
                photo_path = student.get('photo', '')
                
                if not photo_path:
                    print(f"No photo found for student {student_name} ({student_id})")
                    continue
                
                print(f"Processing student: {student_name} ({student_id})")
                
                # Download image
                image_data = None
                if photo_path.startswith('data:image'):
                    # Handle base64 data URLs
                    try:
                        import base64
                        header, encoded = photo_path.split(',', 1)
                        image_data = base64.b64decode(encoded)
                    except Exception as e:
                        print(f"Error decoding base64 image for {student_name}: {e}")
                        continue
                else:
                    # Handle URLs
                    image_data = image_downloader(photo_path)
                
                if image_data is None:
                    print(f"Could not download image for student {student_name}")
                    continue
                
                # Extract face encoding
                encoding = self.extract_face_encoding(image_data)
                
                if encoding is not None:
                    embeddings[student_id] = encoding
                    print(f"Successfully generated embedding for {student_name}")
                else:
                    print(f"Could not generate face encoding for {student_name}")
                
            except Exception as e:
                print(f"Error processing student {student.get('name', 'Unknown')}: {e}")
                continue
        
        print(f"Generated embeddings for {len(embeddings)} out of {len(students)} students")
        return embeddings
    
    def save_class_embeddings(self, class_id: str, embeddings: Dict[str, np.ndarray]):
        """Save embeddings for a class to cache"""
        self.embeddings_cache[class_id] = embeddings
        self._save_cache()
    
    def load_class_embeddings(self, class_id: str) -> Dict[str, np.ndarray]:
        """Load embeddings for a class from cache"""
        return self.embeddings_cache.get(class_id, {})