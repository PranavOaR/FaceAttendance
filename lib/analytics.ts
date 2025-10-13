import { Class, AttendanceRecord, Attendance, Student } from './types';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';

export interface AttendanceStats {
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  attendancePercentage: number;
  date: string;
  classId: string;
  className?: string;
}

export interface DashboardSummary {
  totalClasses: number;
  totalStudents: number;
  averageAttendance: number;
  recentSessions: AttendanceStats[];
  classSummaries: ClassSummary[];
}

export interface ClassSummary {
  classId: string;
  className: string;
  subject: string;
  totalStudents: number;
  averageAttendance: number;
  totalSessions: number;
  lastSessionDate?: string;
}

export interface DetailedReport {
  classId: string;
  className: string;
  subject: string;
  dateRange: { start: string; end: string };
  students: StudentReport[];
  sessionSummaries: AttendanceStats[];
  overallStats: {
    totalSessions: number;
    averageAttendance: number;
    mostAttendedDate: string;
    leastAttendedDate: string;
  };
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  studentSrn: string;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendancePercentage: number;
  attendanceHistory: { date: string; status: 'present' | 'absent' }[];
}

/**
 * Calculate attendance statistics for a specific class and date
 */
export const calculateAttendanceStats = (
  classData: Class,
  attendance: Attendance
): AttendanceStats => {
  const totalStudents = classData.students?.length || 0;
  const presentStudents = attendance.presentStudents?.length || 0;
  const absentStudents = attendance.absentStudents?.length || 0;
  
  // Ensure absent students count includes all missing students
  const actualAbsentStudents = totalStudents - presentStudents;
  
  const attendancePercentage = totalStudents > 0 
    ? Math.round((presentStudents / totalStudents) * 100)
    : 0;

  return {
    totalStudents,
    presentStudents,
    absentStudents: actualAbsentStudents,
    attendancePercentage,
    date: attendance.date,
    classId: classData.id,
    className: classData.name
  };
};

/**
 * Get dashboard summary with attendance analytics
 */
export const getDashboardSummary = async (teacherEmail: string): Promise<DashboardSummary> => {
  try {
    // Get all classes for the teacher using teacherEmail
    const classesQuery = query(
      collection(db, 'classes'),
      where('teacherEmail', '==', teacherEmail)
    );
    
    const classesSnapshot = await getDocs(classesQuery);
    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Class[];

    let totalStudents = 0;
    let totalAttendancePercentage = 0;
    let sessionCount = 0;
    const recentSessions: AttendanceStats[] = [];
    const classSummaries: ClassSummary[] = [];

    // Process each class
    for (const classData of classes) {
      const classStudents = classData.students?.length || 0;
      totalStudents += classStudents;

      const attendanceRecords = classData.attendanceRecords || [];
      
      if (attendanceRecords.length > 0) {
        // Calculate class average attendance
        const classAttendanceSum = attendanceRecords.reduce((sum, record) => {
          const stats = calculateAttendanceStats(classData, record);
          return sum + stats.attendancePercentage;
        }, 0);
        
        const classAverage = Math.round(classAttendanceSum / attendanceRecords.length);
        totalAttendancePercentage += classAverage;
        sessionCount++;

        // Get recent sessions for this class (last 3)
        const recentClassSessions = attendanceRecords
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3)
          .map(record => calculateAttendanceStats(classData, record));
        
        recentSessions.push(...recentClassSessions);

        // Create class summary
        classSummaries.push({
          classId: classData.id,
          className: classData.name,
          subject: classData.subject,
          totalStudents: classStudents,
          averageAttendance: classAverage,
          totalSessions: attendanceRecords.length,
          lastSessionDate: attendanceRecords[0]?.date
        });
      } else {
        // Class with no attendance records
        classSummaries.push({
          classId: classData.id,
          className: classData.name,
          subject: classData.subject,
          totalStudents: classStudents,
          averageAttendance: 0,
          totalSessions: 0,
          lastSessionDate: undefined
        });
      }
    }

    // Sort recent sessions by date (most recent first)
    recentSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalClasses: classes.length,
      totalStudents,
      averageAttendance: sessionCount > 0 ? Math.round(totalAttendancePercentage / sessionCount) : 0,
      recentSessions: recentSessions.slice(0, 5), // Top 5 recent sessions
      classSummaries
    };
    
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    throw error;
  }
};

/**
 * Generate detailed report for a specific class
 */
export const generateClassReport = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<DetailedReport> => {
  try {
    console.log('Generating report for class ID:', classId);
    
    // Get class data using document reference
    const classDoc = doc(db, 'classes', classId);
    const classSnapshot = await getDoc(classDoc);
    
    if (!classSnapshot.exists()) {
      console.error('Class not found with ID:', classId);
      throw new Error('Class not found');
    }

    const classData = classSnapshot.data() as Class;
    classData.id = classSnapshot.id;
    
    console.log('Found class data:', classData.name, 'with', classData.students?.length, 'students');

    // Filter attendance records by date range if provided
    let attendanceRecords = classData.attendanceRecords || [];
    
    if (startDate || endDate) {
      attendanceRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        if (startDate && recordDate < new Date(startDate)) return false;
        if (endDate && recordDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Generate session summaries
    const sessionSummaries = attendanceRecords
      .map(record => calculateAttendanceStats(classData, record))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate student reports
    const studentReports: StudentReport[] = (classData.students || []).map(student => {
      const attendanceHistory: { date: string; status: 'present' | 'absent' }[] = [];
      let presentCount = 0;
      
      attendanceRecords.forEach(record => {
        const isPresent = record.presentStudents?.includes(student.id) || false;
        attendanceHistory.push({
          date: record.date,
          status: isPresent ? 'present' : 'absent'
        });
        
        if (isPresent) presentCount++;
      });

      const totalSessions = attendanceRecords.length;
      const attendancePercentage = totalSessions > 0 
        ? Math.round((presentCount / totalSessions) * 100)
        : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        studentSrn: student.srn || '',
        totalSessions,
        presentSessions: presentCount,
        absentSessions: totalSessions - presentCount,
        attendancePercentage,
        attendanceHistory: attendanceHistory.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      };
    });

    // Calculate overall stats
    const totalSessions = attendanceRecords.length;
    const averageAttendance = sessionSummaries.length > 0
      ? Math.round(sessionSummaries.reduce((sum, s) => sum + s.attendancePercentage, 0) / sessionSummaries.length)
      : 0;
    
    const sortedByAttendance = sessionSummaries.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    const mostAttendedDate = sortedByAttendance[0]?.date || '';
    const leastAttendedDate = sortedByAttendance[sortedByAttendance.length - 1]?.date || '';

    const dateRange = {
      start: startDate || (attendanceRecords.length > 0 ? 
        attendanceRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date 
        : ''),
      end: endDate || (attendanceRecords.length > 0 ? 
        attendanceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
        : '')
    };

    return {
      classId: classData.id,
      className: classData.name,
      subject: classData.subject,
      dateRange,
      students: studentReports,
      sessionSummaries,
      overallStats: {
        totalSessions,
        averageAttendance,
        mostAttendedDate,
        leastAttendedDate
      }
    };

  } catch (error) {
    console.error('Error generating class report:', error);
    throw error;
  }
};

/**
 * Export report data as CSV
 */
export const exportReportAsCSV = (report: DetailedReport): string => {
  const lines: string[] = [];
  
  // Header information
  lines.push(`Class Report: ${report.className}`);
  lines.push(`Subject: ${report.subject}`);
  lines.push(`Date Range: ${report.dateRange.start} to ${report.dateRange.end}`);
  lines.push(`Total Sessions: ${report.overallStats.totalSessions}`);
  lines.push(`Average Attendance: ${report.overallStats.averageAttendance}%`);
  lines.push('');
  
  // Student attendance summary
  lines.push('Student Attendance Summary');
  lines.push('Student Name,SRN,Total Sessions,Present,Absent,Attendance %');
  
  report.students.forEach(student => {
    lines.push([
      student.studentName,
      student.studentSrn,
      student.totalSessions,
      student.presentSessions,
      student.absentSessions,
      student.attendancePercentage + '%'
    ].join(','));
  });
  
  lines.push('');
  
  // Session-wise attendance
  lines.push('Session-wise Attendance');
  lines.push('Date,Total Students,Present,Absent,Attendance %');
  
  report.sessionSummaries.forEach(session => {
    lines.push([
      session.date,
      session.totalStudents,
      session.presentStudents,
      session.absentStudents,
      session.attendancePercentage + '%'
    ].join(','));
  });
  
  return lines.join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};