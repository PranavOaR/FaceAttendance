# IDGuard Project Explanation

## 📖 Project Overview

**IDGuard** is an AI-powered face recognition attendance management system designed for educational institutions. The system automates student attendance tracking using facial recognition technology, eliminating manual roll calls and reducing human error.

### 🎯 Core Purpose
- **Automate Attendance**: Use webcam-based face recognition to automatically mark students present
- **Reduce Admin Work**: Eliminate manual roll calls and paper-based tracking
- **Improve Accuracy**: 99.2% recognition accuracy with deep learning algorithms
- **Monitor Trends**: Real-time analytics dashboards for attendance patterns

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                   │
│   React 19 + TypeScript + Tailwind CSS + Framer Motion     │
└─────────────────────────────────────────────────────────────┘
                              ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                       │
│   Python 3.8+ + face-recognition + dlib + OpenCV           │
└─────────────────────────────────────────────────────────────┘
                              ↓ Firebase SDK
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (Firebase)                     │
│   Firestore (NoSQL) + Cloud Storage + Authentication       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

### Root Directory
```
face-recognition-attendance/
├── frontend/          # Next.js application (React + TypeScript)
├── backend/           # FastAPI server (Python)
├── firebase.json      # Firebase configuration
├── README.md          # Project documentation
└── .gitignore         # Git ignore rules
```

### Frontend Structure (`/frontend`)
```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Landing page (redirects to login)
│   ├── layout.tsx           # Root layout with providers
│   ├── login/               # Authentication page
│   ├── dashboard/           # Main dashboard with stats
│   ├── class/[id]/          # Class detail page
│   ├── attendance/[classId]/ # Attendance marking page
│   └── reports/             # Attendance reports page
│
├── components/              # React components
│   ├── ui/                  # UI primitives (buttons, modals, etc.)
│   ├── StatsCardFlip.tsx    # Animated flip cards for stats
│   ├── AttendanceTrendsChart.tsx # Line chart for trends
│   ├── StudentRiskAlerts.tsx # At-risk students alerts
│   ├── ClassCard.tsx        # Class display card
│   ├── StudentCard.tsx      # Student display card
│   ├── AddStudentModal.tsx  # Modal for adding students
│   └── AddClassModal.tsx    # Modal for adding classes
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.tsx          # Firebase authentication hook
│   ├── useFirestore.ts      # Firestore CRUD operations hook
│   └── useStorage.ts        # Firebase Storage hook
│
├── lib/                     # Utility libraries
│   ├── firebase.ts          # Firebase initialization
│   ├── types.ts             # TypeScript type definitions
│   ├── firestoreHelpers.ts  # Firestore helper functions
│   ├── analytics.ts         # Analytics calculations
│   └── utils.ts             # General utilities
│
└── utils/                   # Utility functions
    └── storage.ts           # CSV export utilities
```

### Backend Structure (`/backend`)
```
backend/
├── main.py                  # FastAPI application & endpoints
├── requirements.txt         # Python dependencies
├── serviceAccountKey.json   # Firebase admin credentials
│
├── utils/                   # Utility modules
│   ├── recognition.py       # Face recognition logic
│   ├── embeddings.py        # Face embedding generation
│   ├── email_service.py     # Resend email notifications
│   └── firebase_utils.py    # Firebase admin operations
│
├── embeddings_cache.pkl     # Cached face embeddings
└── Dockerfile               # Container configuration
```

---

## 🔄 How the System Works

### 1. User Authentication Flow
```
User visits app → Login page → Google Sign-in (Firebase Auth)
    → Token generated → User profile stored in Firestore
    → Redirect to Dashboard
```

### 2. Class & Student Management
```
Teacher creates class → Adds students with photos
    → Photos uploaded to Firebase Storage
    → Student data stored in Firestore
```

### 3. Face Recognition Pipeline
```
Step 1: TRAIN MODEL
   └→ Fetch all student photos from Firebase Storage
   └→ Detect faces using CNN-based detector
   └→ Generate 128-dimensional embeddings using ResNet
   └→ Cache embeddings locally for fast matching

Step 2: LIVE RECOGNITION
   └→ Capture webcam frame (640×360 JPEG)
   └→ Detect face in frame
   └→ Generate embedding from detected face
   └→ Compare against all student embeddings
   └→ If match confidence > 60%, mark as PRESENT
```

### 4. Attendance Saving
```
Teacher clicks "Save Attendance"
    → Present/absent lists computed
    → Attendance record saved to Firestore
    → Email notifications sent to parents of absent students
```

---

## 🖥️ Key Frontend Pages

### 1. Dashboard (`/dashboard`)
**Purpose**: Main overview of teacher's classes and analytics
- **Stats Cards**: Total classes, students, attendance rate, sessions
- **Attendance Trends Chart**: 7-day line chart of attendance
- **At-Risk Students**: Students below 75% attendance
- **Class Grid**: All classes with quick actions

### 2. Class Detail (`/class/[id]`)
**Purpose**: Manage individual class and students
- View all students in the class
- Add/edit/delete students with photos
- View attendance history
- Navigate to mark attendance

### 3. Attendance Page (`/attendance/[classId]`)
**Purpose**: Mark attendance using face recognition
- Live webcam feed
- "Train Model" button to prepare face recognition
- "Start Face Scan" to begin automatic recognition
- Manual toggle for students
- Save attendance to Firebase

### 4. Reports (`/reports`)
**Purpose**: View and export attendance data
- Date range filtering
- Class filtering
- CSV export functionality
- Attendance summaries

---

## 🔧 Key Backend Endpoints

### `POST /train`
**Purpose**: Train face recognition model for a class
- Fetches student photos from Firebase Storage
- Generates 128-D face embeddings
- Caches embeddings for fast recognition

### `POST /recognize`
**Purpose**: Recognize face in webcam frame
- Accepts base64 encoded image
- Detects face and generates embedding
- Compares against trained embeddings
- Returns matched student ID and confidence

### `POST /mark_attendance`
**Purpose**: Mark a student as present
- Accepts class ID and student ID
- Updates attendance record in Firestore

### `POST /notify/absence`
**Purpose**: Send email notifications to parents
- Accepts list of absent students with parent emails
- Sends professional HTML email via Resend API

### `GET /health`
**Purpose**: Health check endpoint
- Returns server status for connectivity checks

---

## 🗄️ Database Schema (Firestore)

### Collections

#### `teachers`
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### `classes`
```json
{
  "id": "auto-generated",
  "name": "string",
  "subject": "string",
  "teacherEmail": "string",
  "createdAt": "timestamp",
  "students": [
    {
      "id": "string",
      "name": "string",
      "srn": "string",
      "photo": "storage-url",
      "parentEmail": "string"
    }
  ],
  "attendanceRecords": [
    {
      "date": "YYYY-MM-DD",
      "presentStudents": ["studentId1", "studentId2"],
      "absentStudents": ["studentId3"]
    }
  ]
}
```

---

## 🎨 UI/UX Features

### Design System
- **Colors**: Slate-based palette with accent colors (green=present, red=absent)
- **Typography**: Clean, readable fonts with clear hierarchy
- **Animations**: Framer Motion for smooth transitions
- **Components**: Radix UI primitives for accessibility

### Special UI Components
1. **StatsCardFlip**: 3D flip animation cards showing stats
2. **FileUpload**: Drag-and-drop with animated illustration
3. **TrainingLoader**: Animated rings during model training
4. **AttendanceTrendsChart**: Recharts-powered line graph
5. **StudentRiskAlerts**: Highlighted at-risk students

---

## 📧 Email Notification System

### How It Works
1. When attendance is saved, absent students are identified
2. For students with parent emails, notification is triggered
3. Resend API sends professional HTML email
4. Parents receive alert with student name, class, date, and teacher

### Email Template Features
- Professional IDGuard branding
- Clear absent notification
- Class and date information
- Teacher contact details

---

## 🔐 Security Measures

1. **Firebase Authentication**: Secure Google OAuth sign-in
2. **Environment Variables**: Sensitive keys in `.env.local`
3. **CORS Protection**: Backend only accepts localhost origins
4. **Firestore Rules**: Role-based access control
5. **HTTPS**: Encrypted data transmission in production

---

## 🚀 Running the Project

### Prerequisites
- Node.js 18+
- Python 3.8+
- Firebase project with Firestore enabled

### Start Backend
```bash
cd backend
source ../.venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

---

## 📊 Analytics Features

### Dashboard Metrics
- **Total Classes**: Count of teacher's classes
- **Total Students**: Sum of students across all classes
- **Average Attendance**: Mean attendance rate percentage
- **Total Sessions**: Count of attendance sessions

### Trend Analysis
- 7-day rolling attendance chart
- Per-class performance breakdown
- At-risk student identification (< 75% attendance)

---

## 🔮 Future Roadmap

### Planned Features
- [ ] Bulk CSV import for students
- [ ] PDF report generation
- [ ] Mobile app (React Native)
- [ ] Liveness detection (anti-spoofing)
- [ ] Multi-language support
- [ ] School ERP integration

---

## 👥 Credits

**Author**: Pranav Rao
**License**: MIT
**Repository**: [github.com/PranavOaR/FaceAttendance](https://github.com/PranavOaR/FaceAttendance)

---

*Last Updated: December 11, 2024*
