# IDGuard — Demo Video Script

> Face Recognition Attendance System
> Technical walkthrough for project demonstration

---

## Scene 1 — Authentication

**[SCREEN: Login page — split-screen layout]**

The application opens with a split-screen authentication interface. On the left, the IDGuard branding panel — on the right, the login form.

We support two authentication flows — **Google OAuth 2.0** and traditional **email/password** via Firebase Authentication. The auth state is managed client-side with a React context provider that wraps the entire application, persisting sessions across page reloads.

**[ACTION: Sign in with Google]**

Clicking "Continue with Google" triggers the Firebase `signInWithPopup` flow using the Google Auth Provider. On successful authentication, the user object — containing UID, display name, and email — is stored in context and we redirect to the dashboard.

For new users, the "Create Account" toggle reveals a registration form with name, email, and password fields. Firebase handles password hashing and token management — we never store credentials locally.

---

## Scene 2 — Dashboard

**[SCREEN: Dashboard — full overview]**

This is the teacher's command centre. At the top, four animated statistic cards — **Total Classes**, **Total Students**, **Average Attendance**, and **Total Sessions** — each with a flip animation on mount. These are computed in real-time from Firestore documents.

**[SCREEN: Attendance Trends chart]**

Below that, the **Attendance Trends** line chart — built with Recharts — plots attendance percentage over time across all classes. Each data point represents a session date, and hovering reveals the exact percentage via a tooltip. The data is aggregated from the `attendanceRecords` array embedded in each class document.

**[SCREEN: Students at Risk panel]**

Next to the chart, the **Students at Risk** panel flags any student with attendance below 75%. Each card shows the student's name, class, SRN, and a colour-coded badge — red if below 50%, amber if between 50% and 75%. The count badge at the top gives an immediate sense of how many students need attention.

**[SCREEN: Recent Sessions + Class Performance tables]**

Below that, two side-by-side tables. **Recent Sessions** shows the last five attendance sessions with date, class name, present count, and percentage. **Class Performance** ranks each class by overall attendance — green for 80%+, amber for 60%+, red below 60%.

**[SCREEN: Class cards grid]**

At the bottom, the classes grid. Each card displays the class name, subject, student count, and session count. Two primary actions per card — **View Students** navigates to the class detail page, and **Mark Attendance** jumps directly to the scanning interface. Edit and delete controls sit in the top-right corner of each card.

---

## Scene 3 — Class Page (View Students)

**[SCREEN: Class detail page — calendar + student grid]**

Navigating into a class, we see a two-column layout. On the left, an **Attendance Calendar** with month navigation. Each day cell is colour-coded by attendance percentage — green for high attendance, red for low. Clicking a date reveals the session details for that day.

On the right, the **student grid** — searchable by name or SRN. Each student card shows a circular profile photo, name, SRN, and action buttons for editing, deleting, or viewing analytics.

---

### Scene 3a — Student Profile & Analytics

**[ACTION: Click the analytics icon on a student card]**

This opens the **per-student analytics page** — a dedicated profile view. At the top, the student hero section with their photo, name, SRN, parent email, and a large attendance percentage badge.

Four stat cards follow — **Total Sessions** with present/absent breakdown, **Classes Attended**, **Current Streak** (consecutive present days), and **Longest Streak**.

**[SCREEN: Monthly attendance chart]**

Below that, a **stacked bar chart** showing present vs absent counts per month — giving a visual trend of the student's attendance pattern over time.

**[SCREEN: Day-of-week breakdown]**

Next, a **day-of-week breakdown chart** — this shows which days the student tends to miss. For example, if Mondays consistently show lower attendance, it's immediately visible here.

**[SCREEN: Attendance history table]**

Finally, the **full attendance history** — a chronological table listing every session with date, day of week, and present/absent status. Each row is colour-coded for quick scanning.

---

### Scene 3b — Bulk Enrollment

**[ACTION: Click "Bulk Enroll" button on the class page]**

This opens the **Bulk Enrollment Modal** — a three-step workflow designed for onboarding entire classrooms at once.

**Step 1 — Upload:**
Two drag-and-drop zones. The first accepts a **CSV or XLSX file** containing student data — columns for Name, SRN, and optionally Parent Email. The parser handles case-insensitive headers and flexible column matching. The second zone accepts **student photos**, where each file must be named by SRN — for example, `R25CS001.jpg`.

**Step 2 — Preview:**
The system parses the spreadsheet and cross-references photo filenames against SRNs. A preview table shows each student with their matched photo, name, SRN, and parent email. Green "Matched" badges confirm photo associations. Orange "Missing" badges highlight students without a photo match.

**Step 3 — Enroll:**
Clicking "Enroll" triggers sequential processing. Each student's photo is uploaded to **Firebase Storage** via the backend's Admin SDK — this bypasses client-side security rules entirely. The backend generates a Firebase-compatible download URL with a UUID token, then the student record is written to the Firestore class document. A real-time progress indicator shows the status of each student — uploading, enrolled, or failed.

---

## Scene 4 — Mark Attendance (Face Recognition)

**[SCREEN: Attendance page — webcam + student list]**

This is the core feature. The page is split — webcam feed on the left, student attendance list on the right.

**[ACTION: Click "Train Model"]**

Before scanning, the system must train. Clicking **Train Model** sends a request to the FastAPI backend. The backend:
1. Fetches all student records from Firestore
2. Downloads each student's photo concurrently using `asyncio.gather()`
3. Preprocesses images — RGB conversion, downscaling if over 1600px, and **CLAHE** (Contrast Limited Adaptive Histogram Equalisation) for lighting normalisation
4. Extracts **128-dimensional face encodings** using the `face_recognition` library backed by **dlib's CNN-based face detector**
5. Stores the embeddings in a Firestore subcollection at `classes/{classId}/embeddings/face_data`

The training status indicator turns green: "Model Ready".

**[ACTION: Click "Batch Scan (All Faces at Once)"]**

This is the **batch processing** feature. A single webcam frame is captured and sent to the `/recognize_batch` endpoint. The backend:
1. Decodes the base64 image
2. Detects **all faces** in the frame using dlib's CNN detector
3. Extracts encodings for each detected face
4. Compares each encoding against stored embeddings using **Euclidean distance** — confidence = 1 minus distance
5. Matches faces to students using a threshold of 0.55, with duplicate prevention — no student can match twice in one frame
6. Returns per-face results with bounding box coordinates

**[SCREEN: Batch scan results panel]**

A results panel appears — showing total faces detected, matched count, and unmatched count. Matched students are listed with green badges and checkmarks. The student cards on the right automatically update — green for present, red for absent.

**[ACTION: Manually toggle a student's status]**

Any student can be manually toggled between present and absent by clicking their status badge. This is useful for correcting edge cases the model missed.

**[ACTION: Click "Save Attendance"]**

Saving triggers a **Firestore transaction** via the `/mark_attendance_batch` endpoint. The backend atomically updates the attendance record for today's date — preventing race conditions if multiple saves happen concurrently. If parent emails or phone numbers are on file, the system sends **absence notifications** via Resend (email) and Twilio (WhatsApp).

---

## Scene 5 — Reports

**[SCREEN: Reports page — filters panel]**

The reports page provides a filter panel — class selector dropdown, start date, end date, and a generate button.

**[ACTION: Select a class and click "Generate Report"]**

The system fetches the class data from Firestore and computes statistics within the selected date range.

**[SCREEN: Report results]**

Four summary cards appear — **Total Sessions**, **Average Attendance**, **Best Attended** date, and **Lowest Attended** date.

Below that, a **Session Summary Table** — each row is one attendance session showing date, total students, present count, absent count, and attendance rate with a colour-coded badge.

Further down, the **Student Performance Table** — each row shows a student's total sessions, present/absent breakdown, and overall attendance percentage. This table helps identify individual patterns.

**[ACTION: Click "Export Excel"]**

The system generates a formatted `.xlsx` file using the SheetJS library — complete with headers, data rows, and proper column formatting. A CSV export option is also available. Files are named using the pattern `ClassName_StartDate_to_EndDate.xlsx`.

---

## Scene 6 — Tech Stack Summary

**[SCREEN: Closing slide or dashboard]**

To summarise the technical architecture:

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | FastAPI (Python), Uvicorn with hot-reload |
| Face Recognition | dlib CNN face detector, 128-dim face encodings, Euclidean distance matching |
| Database | Cloud Firestore (document-embedded arrays, transactional batch writes) |
| Storage | Firebase Storage (Admin SDK uploads, token-based download URLs) |
| Auth | Firebase Authentication (Google OAuth 2.0, email/password) |
| Notifications | Resend (email), Twilio (WhatsApp) |
| Charts | Recharts (line, bar, stacked bar) |
| Export | SheetJS/xlsx (CSV + Excel) |
| PWA | next-pwa with CacheFirst strategy for storage assets |

The system is designed as a **monorepo** with separate frontend and backend services, deployable to Firebase Hosting and Google Cloud Run respectively.

---

*End of demo.*
