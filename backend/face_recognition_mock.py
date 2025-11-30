"""
Mock face_recognition module for development when models are not available.
This provides dummy implementations of the face_recognition API.
"""

import numpy as np
import hashlib

def face_locations(image, model="hog"):
    """
    Mock function that returns dummy face locations.
    In real implementation, this would detect faces in the image.
    For demo, we return a default face location.
    """
    # Simulate finding a face in the center of the image
    height, width = image.shape[:2]
    # Return a dummy face location (top, right, bottom, left)
    return [(int(height*0.2), int(width*0.8), int(height*0.8), int(width*0.2))]


def face_encodings(image, face_locations, num_jitters=1):
    """
    Mock function that returns dummy face encodings.
    In real implementation, this would generate 128-d face encoding.
    For demo, we generate a stable but unique encoding based on the image.
    """
    if not face_locations:
        return []
    
    # Generate a deterministic but unique encoding based on image content
    # Use proper float32 like the real library
    image_bytes = image.astype(np.uint8).tobytes()
    
    # Create a hash-based encoding
    hash_digest = hashlib.sha256(image_bytes).digest()
    
    # Convert to 128-dimensional float32 array (same as real face_recognition)
    encoding = np.frombuffer(hash_digest + b'\x00' * (512 - len(hash_digest)), dtype=np.float64)[:128]
    
    # Normalize to a reasonable range [-1, 1] like real face encodings
    encoding = np.tanh(encoding / 256.0).astype(np.float32)
    
    # Ensure no NaN or inf values
    encoding = np.nan_to_num(encoding, nan=0.0, posinf=1.0, neginf=-1.0)
    
    return [encoding]


def compare_faces(known_face_encodings, face_encoding_to_check, tolerance=0.6):
    """
    Mock function to compare faces.
    Returns a list of booleans indicating if faces match.
    """
    if not known_face_encodings:
        return []
    
    # For mock, we'll do simple euclidean distance comparison
    matches = []
    for known_encoding in known_face_encodings:
        try:
            # Calculate Euclidean distance
            distance = float(np.linalg.norm(known_encoding - face_encoding_to_check))
            
            # Ensure no inf or nan values
            if np.isnan(distance) or np.isinf(distance):
                distance = 1.0  # Treat as no match
            
            # If distance is below tolerance, it's a match
            matches.append(distance < tolerance)
        except Exception as e:
            print(f"Error comparing faces: {e}")
            matches.append(False)
    
    return matches


def face_distance(known_face_encodings, face_encoding_to_check):
    """
    Mock function to calculate face distances.
    Returns a list of floats representing distance between faces.
    Lower distance means more similar.
    """
    if not known_face_encodings:
        return []
    
    distances = []
    for known_encoding in known_face_encodings:
        try:
            # Calculate Euclidean distance
            distance = float(np.linalg.norm(known_encoding - face_encoding_to_check))
            
            # Ensure no inf or nan values - cap at 1.0
            if np.isnan(distance) or np.isinf(distance):
                distance = 1.0
            elif distance > 1.0:
                # Clamp to reasonable range
                distance = min(distance, 1.0)
            
            distances.append(distance)
        except Exception as e:
            print(f"Error calculating distance: {e}")
            distances.append(1.0)  # Worst case distance
    
    return distances


# Export all public functions
__all__ = [
    'face_locations',
    'face_encodings',
    'compare_faces',
    'face_distance',
]
