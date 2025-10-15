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
        """Initialize the embedding service with improved settings"""
        self.embeddings_cache = {}
        self.cache_file = "embeddings_cache.pkl"
        # Use CNN model for better accuracy (slower but more accurate than HOG)
        self.face_detection_model = "cnn"  # Can be "hog" or "cnn"
        # Number of times to upsample the image for better face detection
        self.num_jitters = 10  # Increased from default 1 for better accuracy
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
    
    def preprocess_image(self, image_data: bytes, enhance: bool = True) -> Optional[np.ndarray]:
        """
        Preprocess image data for face recognition with enhancements
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
            
            # Apply image enhancements for better face detection
            if enhance:
                # Resize if image is too large (for faster processing)
                max_dimension = 1600
                height, width = image_array.shape[:2]
                if max(height, width) > max_dimension:
                    scale = max_dimension / max(height, width)
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    image_array = cv2.resize(image_array, (new_width, new_height), interpolation=cv2.INTER_AREA)
                    print(f"Resized image from {width}x{height} to {new_width}x{new_height}")
                
                # Improve contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
                lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l = clahe.apply(l)
                lab = cv2.merge([l, a, b])
                image_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
                print("Applied contrast enhancement")
            
            return image_array
            
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            return None
    
    def extract_face_encoding(self, image_data: bytes, num_jitters: Optional[int] = None) -> Optional[np.ndarray]:
        """
        Extract face encoding from image data with improved accuracy
        Returns 128-dimensional face encoding or None if no face found
        """
        try:
            if num_jitters is None:
                num_jitters = self.num_jitters
            
            # Preprocess image with enhancements
            image_array = self.preprocess_image(image_data, enhance=True)
            if image_array is None:
                return None
            
            # Find face locations using the configured model
            face_locations = face_recognition.face_locations(
                image_array, 
                model=self.face_detection_model
            )
            
            if not face_locations:
                print("No faces found in image")
                return None
            
            if len(face_locations) > 1:
                print(f"Multiple faces found ({len(face_locations)}), using the largest one")
                # Select the largest face (most prominent in the image)
                face_locations = [max(face_locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))]
            
            # Extract face encodings with jittering for better accuracy
            # num_jitters: How many times to re-sample the face when calculating encoding
            # Higher is more accurate, but slower
            face_encodings = face_recognition.face_encodings(
                image_array, 
                face_locations,
                num_jitters=num_jitters
            )
            
            if not face_encodings:
                print("Could not generate face encoding")
                return None
            
            print(f"Successfully extracted face encoding with {num_jitters} jitters")
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
        Find the best match for an unknown face encoding with improved matching logic
        Returns dict with match info: {matched: bool, student_id: str, confidence: float}
        """
        try:
            if not known_encodings:
                return {"matched": False, "student_id": None, "confidence": 0.0}
            
            # Prepare data
            student_ids = list(known_encodings.keys())
            encodings = list(known_encodings.values())
            
            # Calculate distances (lower is better)
            distances = self.face_distance(encodings, unknown_encoding)
            
            # Find the best match (lowest distance)
            best_index = np.argmin(distances)
            best_distance = distances[best_index]
            best_student_id = student_ids[best_index]
            
            # Convert distance to confidence (0-1 scale, higher is better)
            confidence = 1.0 - best_distance
            
            # Apply stricter tolerance check
            # Lower tolerance = more strict matching (better accuracy, fewer false positives)
            is_match = best_distance <= tolerance
            
            print(f"Best match: {best_student_id}, distance: {best_distance:.3f}, confidence: {confidence:.3f}, threshold: {tolerance}")
            
            if is_match:
                # Additional confidence check - ensure confidence is reasonably high
                min_confidence_threshold = 0.5  # Require at least 50% confidence
                if confidence >= min_confidence_threshold:
                    return {
                        "matched": True,
                        "student_id": best_student_id,
                        "confidence": float(confidence),
                        "distance": float(best_distance)
                    }
                else:
                    print(f"Match rejected: confidence {confidence:.3f} below threshold {min_confidence_threshold}")
                    return {
                        "matched": False,
                        "student_id": best_student_id,
                        "confidence": float(confidence),
                        "distance": float(best_distance),
                        "reason": "Low confidence"
                    }
            else:
                print(f"No match: best distance {best_distance:.3f} exceeds tolerance {tolerance}")
                return {
                    "matched": False,
                    "student_id": best_student_id,
                    "confidence": float(confidence),
                    "distance": float(best_distance),
                    "reason": "Distance exceeds tolerance"
                }
            
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