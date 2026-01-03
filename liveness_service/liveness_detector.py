"""
Liveness Detection Module
Implements multi-factor liveness detection for anti-spoofing.
"""

import cv2
import numpy as np
from PIL import Image
import io
from typing import Dict, Any, Optional, Tuple
import warnings

warnings.filterwarnings('ignore')

# Try to import dlib for facial landmarks
try:
    import dlib
    DLIB_AVAILABLE = True
    print("✓ dlib available for facial landmark detection")
except ImportError:
    DLIB_AVAILABLE = False
    print("⚠ dlib not available, using OpenCV fallback")

# Try to import face_recognition
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("✓ face_recognition available")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("⚠ face_recognition not available")


class LivenessDetector:
    """
    Multi-factor liveness detector for anti-spoofing.
    
    Detection methods:
    1. Texture Analysis - Detect printed photos (moiré patterns, lack of texture)
    2. Eye Blink Detection - Natural eye movement patterns
    3. Face Quality Scoring - Blur detection, lighting analysis
    4. Color Distribution - Real faces have natural skin tone distribution
    """
    
    def __init__(self):
        """Initialize the liveness detector"""
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        
        # Eye aspect ratio threshold for blink detection
        self.EAR_THRESHOLD = 0.25
        
        # Liveness thresholds
        self.TEXTURE_THRESHOLD = 15.0  # Laplacian variance
        self.QUALITY_THRESHOLD = 50.0   # Blur detection
        self.COLOR_SCORE_THRESHOLD = 0.3
        
        # Track eye states for blink detection
        self.eye_history = []
        self.max_history = 10
        
        print("✓ LivenessDetector initialized")
    
    def _load_image(self, image_data: bytes) -> Optional[np.ndarray]:
        """Load image from bytes to numpy array (BGR format for OpenCV)"""
        try:
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image_array = np.array(image)
            # Convert RGB to BGR for OpenCV
            return cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error loading image: {e}")
            return None
    
    def _detect_face(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect face in image, returns (x, y, w, h) or None"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(80, 80)
        )
        
        if len(faces) == 0:
            return None
        
        # Return the largest face
        largest = max(faces, key=lambda f: f[2] * f[3])
        return tuple(largest)
    
    def _calculate_texture_score(self, face_roi: np.ndarray) -> float:
        """
        Calculate texture score using Laplacian variance.
        Real faces have natural skin texture, photos appear smoother.
        Higher score = more texture = more likely real.
        """
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        return float(variance)
    
    def _calculate_blur_score(self, face_roi: np.ndarray) -> float:
        """
        Calculate blur/quality score.
        Blurry images may indicate screen display or movement.
        Higher score = sharper image.
        """
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    def _calculate_color_score(self, face_roi: np.ndarray) -> float:
        """
        Analyze color distribution for natural skin tones.
        Real faces have characteristic color patterns in YCrCb space.
        """
        try:
            # Convert to YCrCb color space (good for skin detection)
            ycrcb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YCrCb)
            
            # Skin color range in YCrCb
            lower_skin = np.array([0, 133, 77], dtype=np.uint8)
            upper_skin = np.array([255, 173, 127], dtype=np.uint8)
            
            # Create mask for skin pixels
            mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
            
            # Calculate ratio of skin pixels
            skin_ratio = np.sum(mask > 0) / mask.size
            
            return float(skin_ratio)
        except Exception as e:
            print(f"Color score error: {e}")
            return 0.5
    
    def _detect_moire_pattern(self, face_roi: np.ndarray) -> float:
        """
        Detect moiré patterns that appear when photographing screens.
        Returns score 0-1, higher = more likely to be a photo of screen.
        """
        try:
            gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
            
            # Apply FFT to detect periodic patterns
            f = np.fft.fft2(gray)
            fshift = np.fft.fftshift(f)
            magnitude = np.abs(fshift)
            
            # Analyze high-frequency components
            h, w = gray.shape
            center_h, center_w = h // 2, w // 2
            
            # Mask out low frequencies
            mask = np.ones((h, w), np.uint8)
            r = min(h, w) // 8
            cv2.circle(mask, (center_w, center_h), r, 0, -1)
            
            high_freq = magnitude * mask
            high_freq_ratio = np.sum(high_freq) / (np.sum(magnitude) + 1e-6)
            
            return float(high_freq_ratio)
        except Exception as e:
            print(f"Moiré detection error: {e}")
            return 0.0
    
    def _detect_eyes(self, face_roi: np.ndarray) -> int:
        """Detect number of eyes in face region"""
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        eyes = self.eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3)
        return len(eyes)
    
    def _calculate_eye_aspect_ratio(self, face_roi: np.ndarray) -> Optional[float]:
        """
        Calculate Eye Aspect Ratio (EAR) for blink detection.
        Uses face_recognition library if available.
        """
        if not FACE_RECOGNITION_AVAILABLE:
            return None
        
        try:
            # Convert BGR to RGB
            rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            
            # Get facial landmarks
            landmarks = face_recognition.face_landmarks(rgb)
            
            if not landmarks:
                return None
            
            # Get eye landmarks
            left_eye = landmarks[0].get('left_eye', [])
            right_eye = landmarks[0].get('right_eye', [])
            
            if not left_eye or not right_eye:
                return None
            
            def eye_aspect_ratio(eye_points):
                """Calculate EAR for one eye"""
                # Vertical distances
                A = np.linalg.norm(np.array(eye_points[1]) - np.array(eye_points[5]))
                B = np.linalg.norm(np.array(eye_points[2]) - np.array(eye_points[4]))
                # Horizontal distance
                C = np.linalg.norm(np.array(eye_points[0]) - np.array(eye_points[3]))
                
                if C == 0:
                    return 0.3
                
                return (A + B) / (2.0 * C)
            
            left_ear = eye_aspect_ratio(left_eye)
            right_ear = eye_aspect_ratio(right_eye)
            
            return (left_ear + right_ear) / 2.0
            
        except Exception as e:
            print(f"EAR calculation error: {e}")
            return None
    
    def detect_blink(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect eye blink in a single frame.
        Track EAR over multiple frames for blink detection.
        """
        image = self._load_image(image_data)
        if image is None:
            return {"blink_detected": False, "error": "Failed to load image"}
        
        face = self._detect_face(image)
        if face is None:
            return {"blink_detected": False, "error": "No face detected"}
        
        x, y, w, h = face
        face_roi = image[y:y+h, x:x+w]
        
        # Try facial landmark-based EAR
        ear = self._calculate_eye_aspect_ratio(face_roi)
        
        if ear is not None:
            # Track EAR history
            self.eye_history.append(ear)
            if len(self.eye_history) > self.max_history:
                self.eye_history.pop(0)
            
            # Detect blink: EAR drops below threshold
            blink_detected = ear < self.EAR_THRESHOLD
            
            return {
                "blink_detected": blink_detected,
                "eye_aspect_ratio": round(ear, 3),
                "threshold": self.EAR_THRESHOLD,
                "eyes_open": ear >= self.EAR_THRESHOLD
            }
        
        # Fallback: count visible eyes
        num_eyes = self._detect_eyes(face_roi)
        
        return {
            "blink_detected": num_eyes < 2,
            "eyes_visible": num_eyes,
            "method": "eye_cascade_fallback"
        }
    
    def analyze_frame(self, image_data: bytes) -> Dict[str, Any]:
        """
        Perform detailed frame analysis for debugging.
        Returns all liveness metrics.
        """
        image = self._load_image(image_data)
        if image is None:
            return {"error": "Failed to load image"}
        
        face = self._detect_face(image)
        if face is None:
            return {
                "face_detected": False,
                "error": "No face detected in image"
            }
        
        x, y, w, h = face
        face_roi = image[y:y+h, x:x+w]
        
        # Calculate all metrics
        texture_score = self._calculate_texture_score(face_roi)
        blur_score = self._calculate_blur_score(face_roi)
        color_score = self._calculate_color_score(face_roi)
        moire_score = self._detect_moire_pattern(face_roi)
        num_eyes = self._detect_eyes(face_roi)
        ear = self._calculate_eye_aspect_ratio(face_roi)
        
        return {
            "face_detected": True,
            "face_location": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
            "metrics": {
                "texture_score": round(texture_score, 2),
                "blur_score": round(blur_score, 2),
                "color_score": round(color_score, 3),
                "moire_score": round(moire_score, 4),
                "eyes_detected": num_eyes,
                "eye_aspect_ratio": round(ear, 3) if ear else None
            },
            "thresholds": {
                "texture_min": self.TEXTURE_THRESHOLD,
                "quality_min": self.QUALITY_THRESHOLD,
                "color_min": self.COLOR_SCORE_THRESHOLD
            }
        }
    
    def check_liveness(self, image_data: bytes) -> Dict[str, Any]:
        """
        Main liveness check method.
        Combines multiple detection methods for robust anti-spoofing.
        
        Returns:
            {
                "is_live": bool,
                "confidence": float (0-1),
                "checks": {
                    "texture_passed": bool,
                    "quality_passed": bool,
                    "color_passed": bool,
                    "eyes_detected": bool
                },
                "scores": {...}
            }
        """
        image = self._load_image(image_data)
        if image is None:
            return {
                "is_live": False,
                "confidence": 0.0,
                "error": "Failed to load image"
            }
        
        face = self._detect_face(image)
        if face is None:
            return {
                "is_live": False,
                "confidence": 0.0,
                "error": "No face detected"
            }
        
        x, y, w, h = face
        face_roi = image[y:y+h, x:x+w]
        
        # Calculate all metrics
        texture_score = self._calculate_texture_score(face_roi)
        blur_score = self._calculate_blur_score(face_roi)
        color_score = self._calculate_color_score(face_roi)
        moire_score = self._detect_moire_pattern(face_roi)
        num_eyes = self._detect_eyes(face_roi)
        
        # Evaluate each check
        texture_passed = texture_score >= self.TEXTURE_THRESHOLD
        quality_passed = blur_score >= self.QUALITY_THRESHOLD
        color_passed = color_score >= self.COLOR_SCORE_THRESHOLD
        eyes_detected = num_eyes >= 1
        moire_low = moire_score < 0.3  # Low moiré pattern
        
        # Calculate overall confidence
        checks_passed = sum([
            texture_passed,
            quality_passed,
            color_passed,
            eyes_detected,
            moire_low
        ])
        
        # Weight the checks
        confidence = 0.0
        confidence += 0.25 * (min(texture_score / 50.0, 1.0))  # Texture weight
        confidence += 0.20 * (min(blur_score / 100.0, 1.0))   # Quality weight
        confidence += 0.20 * color_score                      # Color weight
        confidence += 0.20 * (1.0 if eyes_detected else 0.0)  # Eyes weight
        confidence += 0.15 * (1.0 - min(moire_score * 2, 1.0)) # Anti-moiré weight
        
        # Determine if live
        # Must pass at least 3 checks and have confidence > 0.5
        is_live = checks_passed >= 3 and confidence >= 0.5
        
        return {
            "is_live": is_live,
            "confidence": round(confidence, 3),
            "checks": {
                "texture_passed": texture_passed,
                "quality_passed": quality_passed,
                "color_passed": color_passed,
                "eyes_detected": eyes_detected,
                "moire_low": moire_low
            },
            "scores": {
                "texture": round(texture_score, 2),
                "quality": round(blur_score, 2),
                "color": round(color_score, 3),
                "moire": round(moire_score, 4)
            },
            "checks_passed": checks_passed,
            "total_checks": 5
        }


if __name__ == "__main__":
    # Test the detector
    print("Testing LivenessDetector...")
    detector = LivenessDetector()
    print("Detector initialized successfully!")
