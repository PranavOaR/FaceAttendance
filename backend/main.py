from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import os
import json
import base64
import numpy as np
from datetime import datetime
import sys
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

# Import our utility modules with error handling
try:
    from utils.firebase_utils import FirebaseService
except Exception as e:
    print(f"Warning: Could not import FirebaseService: {e}", file=sys.stderr)
    FirebaseService = None

try:
    from utils.embeddings import EmbeddingService
except Exception as e:
    print(f"Warning: Could not import EmbeddingService: {e}", file=sys.stderr)
    EmbeddingService = None

try:
    from utils.recognition import RecognitionService
except Exception as e:
    print(f"Warning: Could not import RecognitionService: {e}", file=sys.stderr)
    RecognitionService = None

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition Attendance API",
    description="Backend API for Face Recognition Attendance System",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3004"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services with error handling
firebase_service = None
embedding_service = None
recognition_service = None

if FirebaseService:
    try:
        firebase_service = FirebaseService()
        print("✓ Firebase service initialized")
    except Exception as e:
        print(f"✗ Failed to initialize Firebase service: {e}")
        firebase_service = None

if EmbeddingService:
    try:
        embedding_service = EmbeddingService()
        print("✓ Embedding service initialized")
    except Exception as e:
        print(f"✗ Failed to initialize Embedding service: {e}")
        embedding_service = None

if RecognitionService and firebase_service and embedding_service:
    try:
        recognition_service = RecognitionService(firebase_service, embedding_service)
        print("✓ Recognition service initialized")
    except Exception as e:
        print(f"✗ Failed to initialize Recognition service: {e}")
        recognition_service = None

# Pydantic models for request/response
class TrainRequest(BaseModel):
    classId: str

class TrainResponse(BaseModel):
    success: bool
    message: str
    studentsProcessed: int

class RecognizeRequest(BaseModel):
    classId: str
    image_base64: str

class RecognizeResponse(BaseModel):
    matched: bool
    studentId: Optional[str] = None
    studentName: Optional[str] = None
    confidence: float

class MarkAttendanceRequest(BaseModel):
    classId: str
    studentId: str

class MarkAttendanceResponse(BaseModel):
    success: bool
    message: str
    studentName: Optional[str] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Face Recognition Attendance API is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.post("/train", response_model=TrainResponse)
async def train_class(request: TrainRequest):
    """
    Train face recognition model for a specific class.
    Downloads student photos and generates face embeddings.
    """
    try:
        print(f"Starting training for class: {request.classId}")
        
        # Get students from the class
        students = await firebase_service.get_class_students(request.classId)
        if not students:
            raise HTTPException(status_code=404, detail="No students found in class")
        
        print(f"Found {len(students)} students to process")
        
        # Generate embeddings for all students
        processed_count = await recognition_service.train_class_embeddings(request.classId, students)
        
        return TrainResponse(
            success=True,
            message=f"Successfully trained embeddings for {processed_count} students",
            studentsProcessed=processed_count
        )
        
    except Exception as e:
        print(f"Error in train endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(request: RecognizeRequest):
    """
    Recognize a face from webcam capture.
    Compares against stored embeddings for the given class.
    """
    try:
        print(f"Processing recognition request for class: {request.classId}")
        
        # Decode base64 image
        try:
            # Handle data URLs (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
            base64_string = request.image_base64
            if base64_string.startswith('data:image'):
                # Extract just the base64 part after the comma
                base64_string = base64_string.split(',', 1)[1]
            
            image_data = base64.b64decode(base64_string)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")
        
        # Perform recognition
        result = await recognition_service.recognize_face(request.classId, image_data)
        
        return RecognizeResponse(
            matched=result["matched"],
            studentId=result.get("studentId"),
            studentName=result.get("studentName"),
            confidence=result.get("confidence", 0.0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in recognize endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")

@app.post("/mark_attendance", response_model=MarkAttendanceResponse)
async def mark_attendance(request: MarkAttendanceRequest):
    """
    Mark attendance for a student in a class.
    Updates the attendance record for today's date.
    """
    try:
        print(f"Marking attendance for student {request.studentId} in class {request.classId}")
        
        # Mark attendance in Firebase
        result = await firebase_service.mark_student_attendance(request.classId, request.studentId)
        
        return MarkAttendanceResponse(
            success=True,
            message=f"Attendance marked successfully for {result.get('studentName', 'student')}",
            studentName=result.get('studentName')
        )
        
    except Exception as e:
        print(f"Error in mark_attendance endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark attendance: {str(e)}")

@app.get("/health")
async def health_check():
    """Extended health check with service status"""
    try:
        # Check Firebase connection
        firebase_status = await firebase_service.check_connection()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "firebase": firebase_status,
                "embedding_service": True,
                "recognition_service": True
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/classes/{class_id}/students")
async def get_class_students(class_id: str):
    """Get all students in a class (for debugging)"""
    try:
        students = await firebase_service.get_class_students(class_id)
        return {
            "classId": class_id,
            "students": students,
            "count": len(students)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/classes/{class_id}")
async def get_class_report(
    class_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Generate detailed attendance report for a class"""
    try:
        # Get class data from Firebase
        class_data = await firebase_service.get_class_data(class_id)
        if not class_data:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Filter attendance records by date range if provided
        attendance_records = class_data.get('attendanceRecords', [])
        
        if start_date or end_date:
            filtered_records = []
            for record in attendance_records:
                record_date = record.get('date')
                if record_date:
                    if start_date and record_date < start_date:
                        continue
                    if end_date and record_date > end_date:
                        continue
                    filtered_records.append(record)
            attendance_records = filtered_records
        
        # Calculate statistics
        students = class_data.get('students', [])
        total_students = len(students)
        total_sessions = len(attendance_records)
        
        if total_sessions == 0:
            return {
                "classId": class_id,
                "className": class_data.get('name', 'Unknown'),
                "subject": class_data.get('subject', 'Unknown'),
                "totalStudents": total_students,
                "totalSessions": 0,
                "averageAttendance": 0,
                "sessions": [],
                "studentStats": []
            }
        
        # Calculate session-wise attendance
        session_stats = []
        total_attendance_percentage = 0
        
        for record in attendance_records:
            present_count = len(record.get('presentStudents', []))
            absent_count = total_students - present_count
            attendance_percentage = (present_count / total_students * 100) if total_students > 0 else 0
            
            session_stats.append({
                "date": record.get('date'),
                "totalStudents": total_students,
                "presentStudents": present_count,
                "absentStudents": absent_count,
                "attendancePercentage": round(attendance_percentage, 2)
            })
            
            total_attendance_percentage += attendance_percentage
        
        average_attendance = round(total_attendance_percentage / total_sessions, 2)
        
        # Calculate student-wise statistics
        student_stats = []
        for student in students:
            student_id = student.get('id')
            present_sessions = 0
            
            for record in attendance_records:
                if student_id in record.get('presentStudents', []):
                    present_sessions += 1
            
            absent_sessions = total_sessions - present_sessions
            student_attendance_percentage = (present_sessions / total_sessions * 100) if total_sessions > 0 else 0
            
            student_stats.append({
                "studentId": student_id,
                "studentName": student.get('name', 'Unknown'),
                "studentSrn": student.get('srn', ''),
                "totalSessions": total_sessions,
                "presentSessions": present_sessions,
                "absentSessions": absent_sessions,
                "attendancePercentage": round(student_attendance_percentage, 2)
            })
        
        return {
            "classId": class_id,
            "className": class_data.get('name', 'Unknown'),
            "subject": class_data.get('subject', 'Unknown'),
            "dateRange": {
                "start": start_date or (attendance_records[0].get('date') if attendance_records else ''),
                "end": end_date or (attendance_records[-1].get('date') if attendance_records else '')
            },
            "totalStudents": total_students,
            "totalSessions": total_sessions,
            "averageAttendance": average_attendance,
            "sessions": session_stats,
            "studentStats": student_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating class report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@app.get("/reports/summary/{teacher_id}")
async def get_teacher_summary(teacher_id: str):
    """Get summary statistics for all classes of a teacher"""
    try:
        # Get all classes for the teacher
        classes = await firebase_service.get_teacher_classes(teacher_id)
        
        total_classes = len(classes)
        total_students = 0
        total_sessions = 0
        total_attendance_percentage = 0
        class_summaries = []
        
        for class_data in classes:
            class_students = len(class_data.get('students', []))
            class_sessions = len(class_data.get('attendanceRecords', []))
            total_students += class_students
            total_sessions += class_sessions
            
            # Calculate class average attendance
            if class_sessions > 0:
                class_attendance_sum = 0
                for record in class_data.get('attendanceRecords', []):
                    present_count = len(record.get('presentStudents', []))
                    if class_students > 0:
                        class_attendance_sum += (present_count / class_students * 100)
                
                class_average = class_attendance_sum / class_sessions
                total_attendance_percentage += class_average
            else:
                class_average = 0
            
            # Get last session date
            last_session_date = None
            if class_data.get('attendanceRecords'):
                sorted_records = sorted(
                    class_data.get('attendanceRecords', []), 
                    key=lambda x: x.get('date', ''), 
                    reverse=True
                )
                last_session_date = sorted_records[0].get('date') if sorted_records else None
            
            class_summaries.append({
                "classId": class_data.get('id'),
                "className": class_data.get('name', 'Unknown'),
                "subject": class_data.get('subject', 'Unknown'),
                "totalStudents": class_students,
                "totalSessions": class_sessions,
                "averageAttendance": round(class_average, 2),
                "lastSessionDate": last_session_date
            })
        
        overall_average = (total_attendance_percentage / total_classes) if total_classes > 0 else 0
        
        return {
            "teacherId": teacher_id,
            "totalClasses": total_classes,
            "totalStudents": total_students,
            "totalSessions": total_sessions,
            "averageAttendance": round(overall_average, 2),
            "classSummaries": class_summaries
        }
        
    except Exception as e:
        print(f"Error getting teacher summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@app.get("/config")
async def get_config():
    """Get current recognition configuration"""
    try:
        return {
            "recognition_threshold": recognition_service.recognition_threshold,
            "face_detection_model": embedding_service.face_detection_model,
            "num_jitters": embedding_service.num_jitters,
            "description": {
                "recognition_threshold": "Lower value = stricter matching (0.4=very strict, 0.5=strict, 0.6=standard)",
                "face_detection_model": "cnn=more accurate but slower, hog=faster but less accurate",
                "num_jitters": "Higher value = better accuracy but slower (1=fast, 5=balanced, 10=accurate)"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config/threshold")
async def update_threshold(threshold: float):
    """Update recognition threshold (0.0-1.0, lower = stricter)"""
    try:
        if not 0.0 <= threshold <= 1.0:
            raise HTTPException(status_code=400, detail="Threshold must be between 0.0 and 1.0")
        
        recognition_service.set_recognition_threshold(threshold)
        return {
            "success": True,
            "message": f"Recognition threshold updated to {threshold}",
            "threshold": threshold
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config/model")
async def update_model(model: str):
    """Update face detection model (cnn or hog)"""
    try:
        if model not in ["cnn", "hog"]:
            raise HTTPException(status_code=400, detail="Model must be 'cnn' or 'hog'")
        
        embedding_service.face_detection_model = model
        return {
            "success": True,
            "message": f"Face detection model updated to {model}",
            "model": model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config/jitters")
async def update_jitters(jitters: int):
    """Update number of jitters for encoding (1-20, higher = more accurate but slower)"""
    try:
        if not 1 <= jitters <= 20:
            raise HTTPException(status_code=400, detail="Jitters must be between 1 and 20")
        
        embedding_service.num_jitters = jitters
        return {
            "success": True,
            "message": f"Number of jitters updated to {jitters}",
            "jitters": jitters
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )