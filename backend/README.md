# Face Recognition Attendance Backend

A FastAPI backend service for real-time face recognition and attendance marking.

## Features

- 🧠 **Face Recognition**: Uses face_recognition library for accurate face detection and matching
- 🔥 **Firebase Integration**: Connects to Firestore and Storage for data management
- ⚡ **Fast API**: High-performance REST API with automatic documentation
- 🎯 **Real-time Recognition**: Live webcam face recognition for attendance marking
- 📊 **Attendance Management**: Automatic attendance record updates

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `face-recognition-attendance-db`
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file and rename it to `serviceAccountKey.json`
6. Place it in the `/backend` directory

### 3. Run the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8000

# Or use Python directly
python main.py
```

The server will start at: http://localhost:8000

### 4. API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### POST /train
Train face recognition model for a class.

**Request:**
```json
{
  "classId": "your-class-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully trained embeddings for 5 students",
  "studentsProcessed": 5
}
```

### POST /recognize
Recognize a face from webcam capture.

**Request:**
```json
{
  "classId": "your-class-id",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "matched": true,
  "studentId": "student-123",
  "studentName": "John Doe",
  "confidence": 0.92
}
```

### POST /mark_attendance
Mark attendance for a recognized student.

**Request:**
```json
{
  "classId": "your-class-id",
  "studentId": "student-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance marked successfully for John Doe",
  "studentName": "John Doe"
}
```

### GET /health
Health check with service status.

### GET /classes/{class_id}/students
Get all students in a class (debugging).

## System Architecture

```
Frontend (Next.js) → Backend (FastAPI) → Firebase
                                      ↓
                               Face Recognition
                               (face_recognition)
```

## Workflow

1. **Training Phase**: 
   - Call `/train` with classId
   - Backend downloads student photos from Firebase Storage
   - Generates face embeddings using face_recognition library
   - Stores embeddings in Firestore and local cache

2. **Recognition Phase**:
   - Frontend captures webcam frame
   - Sends base64 image to `/recognize`
   - Backend extracts face encoding and matches against stored embeddings
   - Returns student ID if match found

3. **Attendance Marking**:
   - Call `/mark_attendance` with recognized studentId
   - Updates attendance record in Firestore for today's date

## Performance Features

- **Local Caching**: Embeddings cached locally for faster recognition
- **Batch Processing**: Efficient training for multiple students
- **Optimized Matching**: Uses face_recognition's optimized algorithms
- **Error Handling**: Comprehensive error handling and logging

## Dependencies

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `firebase-admin`: Firebase integration
- `face-recognition`: Face detection and recognition
- `opencv-python`: Image processing
- `numpy`: Numerical computations
- `Pillow`: Image handling
- `requests`: HTTP requests

## Development

### Adding New Features

1. Add endpoint to `main.py`
2. Implement logic in appropriate util file
3. Update this documentation
4. Test with sample data

### Debugging

- Check logs in terminal
- Use `/health` endpoint to verify service status
- Use `/classes/{id}/students` to verify data structure
- Test individual components in utils/

## Deployment

For production deployment:

1. Use environment variables for configuration
2. Deploy to cloud service (Railway, Render, etc.)
3. Update CORS origins for production frontend URL
4. Consider using Redis for caching instead of local files