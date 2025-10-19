# Face Recognition Attendance System

A modern, responsive web application for managing student attendance using face recognition technology. Built with Next.js 14, React, TailwindCSS, and Framer Motion.

## 🚀 Features

### Current Features (Frontend Demo)
- **Teacher Authentication**: Simple email-based login system
- **Class Management**: Create, edit, and delete classes
- **Student Registration**: Add students with photos, names, and SRNs
- **Attendance Tracking**: Simulated face recognition with manual adjustment
- **CSV Export**: Download attendance reports
- **Responsive Design**: Works on desktop and mobile devices
- **Smooth Animations**: Framer Motion animations throughout the app
- **Toast Notifications**: User feedback with react-hot-toast

### Upcoming Features (Backend Integration)
- Real-time face recognition using camera
- Firebase authentication and data storage
- Real-time updates and synchronization
- Advanced analytics and reporting

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **State Management**: React Hooks (useState, useEffect)
- **Data Storage**: LocalStorage (temporary, will be replaced by Firebase)
- **Notifications**: react-hot-toast
- **Webcam**: react-webcam (ready for integration)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd face-recognition-attendance
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Usage

1. **Login**: Use any valid email address (e.g., teacher@example.com)
2. **Create a Class**: Click "Create Class" and fill in the details
3. **Add Students**: Navigate to a class and add students with photos
4. **Mark Attendance**: Use the "Mark Attendance" button to simulate face recognition
5. **Download Reports**: Export attendance data as CSV

## 📁 Project Structure

```
face-recognition-attendance/
├── app/                          # Next.js 14 App Router
│   ├── login/page.tsx           # Login page
│   ├── dashboard/page.tsx       # Dashboard with class overview
│   ├── class/[id]/page.tsx      # Individual class management
│   ├── attendance/[classId]/page.tsx # Attendance marking
│   ├── layout.tsx               # Root layout
│   └── globals.css             # Global styles
├── components/                   # Reusable React components
│   ├── Navbar.tsx              # Navigation bar
│   ├── ClassCard.tsx           # Class display card
│   ├── StudentCard.tsx         # Student display card
│   ├── AddClassModal.tsx       # Class creation/edit modal
│   └── AddStudentModal.tsx     # Student creation/edit modal
├── lib/                         # Library files
│   ├── types.ts                # TypeScript interfaces
│   └── firebase.ts             # Firebase config (placeholder)
├── utils/                       # Utility functions
│   └── storage.ts              # LocalStorage helpers
└── README.md                   # Project documentation
```

## 🎯 Data Models

### Teacher
```typescript
interface Teacher {
  email: string;
  name?: string;
}
```

### Class
```typescript
interface Class {
  id: string;
  name: string;
  subject: string;
  teacherEmail: string;
  students: Student[];
  attendanceRecords: Attendance[];
  createdAt: string;
}
```

### Student
```typescript
interface Student {
  id: string;
  name: string;
  srn: string;
  photo: string; // base64 or URL
  classId: string;
}
```

## 📱 Pages Overview

### 1. Login Page (`/login`)
- Email validation and teacher authentication
- Redirect to dashboard on success

### 2. Dashboard (`/dashboard`)
- Overview statistics and class grid
- Create new class functionality

### 3. Class Management (`/class/[id]`)
- Student list with photos
- Add/edit/delete students

### 4. Attendance Marking (`/attendance/[classId]`)
- Webcam preview (simulated)
- Face recognition simulation
- CSV export functionality

## � Deployment

### Quick Deploy

The project includes automated deployment scripts for Firebase Hosting (frontend) and Google Cloud Run (backend).

```bash
# One-command deployment
./deploy.sh
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Deployment Architecture

- **Frontend**: Firebase Hosting (static Next.js export)
- **Backend**: Google Cloud Run (containerized Python FastAPI)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Authentication

### Prerequisites for Deployment

1. Firebase CLI: `npm install -g firebase-tools`
2. Google Cloud CLI: `brew install --cask google-cloud-sdk`
3. Firebase project configured
4. Google Cloud project linked

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Batch photo upload for students
- [ ] Email notifications for attendance reports
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

## 📄 License

This project is licensed under the MIT License.
