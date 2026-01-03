"""
Flask Liveness Detection Microservice
Provides anti-spoofing liveness detection for face recognition.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from liveness_detector import LivenessDetector
import base64
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:8000", "http://localhost:3001"])

# Initialize liveness detector
detector = LivenessDetector()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Liveness Detection API",
        "version": "1.0.0"
    })


@app.route('/liveness/check', methods=['POST'])
def check_liveness():
    """
    Main liveness check endpoint.
    Accepts base64 encoded image and returns liveness analysis.
    """
    try:
        data = request.get_json()
        
        if not data or 'image_base64' not in data:
            return jsonify({
                "error": "Missing image_base64 in request body"
            }), 400
        
        # Decode base64 image
        image_base64 = data['image_base64']
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',', 1)[1]
        
        image_data = base64.b64decode(image_base64)
        
        # Perform liveness check
        result = detector.check_liveness(image_data)
        
        return jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "is_live": False,
            "confidence": 0.0
        }), 500


@app.route('/liveness/blink', methods=['POST'])
def detect_blink():
    """
    Eye blink detection endpoint.
    Useful for multi-frame liveness verification.
    """
    try:
        data = request.get_json()
        
        if not data or 'image_base64' not in data:
            return jsonify({
                "error": "Missing image_base64 in request body"
            }), 400
        
        image_base64 = data['image_base64']
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',', 1)[1]
        
        image_data = base64.b64decode(image_base64)
        
        result = detector.detect_blink(image_data)
        
        return jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "blink_detected": False
        }), 500


@app.route('/liveness/analyze', methods=['POST'])
def analyze_frame():
    """
    Detailed frame analysis for debugging.
    Returns all detection metrics.
    """
    try:
        data = request.get_json()
        
        if not data or 'image_base64' not in data:
            return jsonify({
                "error": "Missing image_base64 in request body"
            }), 400
        
        image_base64 = data['image_base64']
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',', 1)[1]
        
        image_data = base64.b64decode(image_base64)
        
        result = detector.analyze_frame(image_data)
        
        return jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("🛡️  Liveness Detection Service Starting...")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True)
