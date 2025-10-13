# Face Recognition Attendance System

A modern, real-time attendance management system built with AI-powered face recognition technology. This full-stack application enables educational institutions and organizations to efficiently track attendance using facial recognition.

## 🚀 Features

- **AI-Powered Face Recognition**: Advanced facial recognition using computer vision
- **Real-time Attendance Tracking**: Instant attendance marking with live camera feed
- **Class Management**: Create, edit, and manage multiple classes
- **Student Management**: Add students with photo uploads and profile management
- **Analytics Dashboard**: Comprehensive attendance statistics and insights
- **Export Functionality**: Export attendance reports in various formats
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Secure Authentication**: Firebase-based user authentication and authorization
- **Cloud Storage**: Secure photo storage and data management

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **React 19** - User interface library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Hot Toast** - Toast notifications

### Backend
- **Python 3.8+** - Backend programming language
- **FastAPI** - Modern, fast web framework for building APIs
- **OpenCV** - Computer vision library for face recognition
- **face_recognition** - Face recognition library
- **NumPy** - Numerical computing
- **Pillow (PIL)** - Image processing
- **Uvicorn** - ASGI server

### Database & Storage
- **Firebase Firestore** - NoSQL cloud database
- **Firebase Storage** - Cloud file storage
- **Firebase Authentication** - User authentication service

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

## � Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (v3.8 or higher)
- **pip** (Python package installer)
- **Git**

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/PranavOaR/FaceAttendance.git
cd FaceAttendance
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment variables file
cp .env.example .env.local
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create service account key file
cp serviceAccountKey.json.template serviceAccountKey.json
```

### 4. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication, Firestore Database, and Storage
3. Generate service account credentials
4. Update `serviceAccountKey.json` with your credentials
5. Update `.env.local` with your Firebase configuration

### 5. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Usage

### 1. Start the Backend Server

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend Development Server

```bash
# In the root directory
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📱 Application Workflow

1. **Authentication**: Teachers sign up/login using Firebase Authentication
2. **Class Creation**: Create new classes with subject details
3. **Student Management**: Add students to classes with profile photos
4. **Face Training**: System trains AI model with student photos
5. **Attendance Marking**: Use camera to mark attendance via face recognition
6. **Analytics**: View attendance statistics and generate reports

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
│   ├── attendance/         # Attendance marking pages
│   ├── class/             # Class management pages
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Authentication page
│   ├── reports/           # Reports and analytics
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── backend/               # Python FastAPI backend
│   ├── utils/             # Utility modules
│   ├── main.py           # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── serviceAccountKey.json # Firebase credentials
├── components/           # Reusable React components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and types
├── public/              # Static assets
└── utils/               # Additional utilities
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Face Recognition
- `POST /train` - Train face recognition model
- `POST /recognize` - Recognize faces from image
- `GET /health` - Health check

### Classes & Students
- Managed through Firebase Firestore with real-time updates

## 🎨 Features in Detail

### Face Recognition System
- Uses advanced computer vision algorithms
- Supports multiple face detection per image
- Real-time recognition with confidence scoring
- Automatic model training and updates

### Dashboard Analytics
- Class-wise attendance statistics
- Student performance tracking
- Attendance trends and patterns
- Export functionality for reports

### Responsive Design
- Mobile-first design approach
- Cross-device compatibility
- Optimized for tablets and desktops
- Touch-friendly interface

## 🔒 Security Features

- Secure Firebase Authentication
- Protected API routes
- Data encryption in transit
- Role-based access control
- Secure file upload and storage

## � Performance Optimizations

- Next.js App Router for optimal performance
- Image optimization and lazy loading
- Efficient state management
- Optimized database queries
- Client-side caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Pranav Rao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 Author

**Pranav Rao**
- GitHub: [@PranavOaR](https://github.com/PranavOaR)
- Project Link: [https://github.com/PranavOaR/FaceAttendance](https://github.com/PranavOaR/FaceAttendance)

## � Acknowledgments

- [OpenCV](https://opencv.org/) for computer vision capabilities
- [Firebase](https://firebase.google.com/) for backend services
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [FastAPI](https://fastapi.tiangolo.com/) for the Python web framework

## 📞 Support

If you have any questions or need help with setup, please:
1. Check the [Issues](https://github.com/PranavOaR/FaceAttendance/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about your setup and the issue

---

⭐ **Star this repository if you find it helpful!**
