import * as XLSX from 'xlsx';
import { DetailedReport, AttendanceStats } from './analytics';

/**
 * Enhanced export functions with proper Excel support
 */

/**
 * Export report data as Excel workbook with multiple sheets
 */
export const exportReportAsExcel = (report: DetailedReport): void => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Report Summary
    const summaryData = [
      ['Class Report Summary'],
      ['Class Name:', report.className],
      ['Subject:', report.subject],
      ['Date Range:', `${report.dateRange.start} to ${report.dateRange.end}`],
      ['Total Sessions:', report.overallStats.totalSessions],
      ['Average Attendance:', `${report.overallStats.averageAttendance}%`],
      ['Best Attended Date:', report.overallStats.mostAttendedDate],
      ['Lowest Attended Date:', report.overallStats.leastAttendedDate],
      [],
      ['Generated on:', new Date().toISOString()]
    ];

    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Sheet 2: Student Performance
    const studentHeaders = [
      'Student Name',
      'SRN',
      'Total Sessions',
      'Present Sessions',
      'Absent Sessions',
      'Attendance Percentage'
    ];

    const studentData = [
      studentHeaders,
      ...report.students.map(student => [
        student.studentName,
        student.studentSrn,
        student.totalSessions,
        student.presentSessions,
        student.absentSessions,
        `${student.attendancePercentage}%`
      ])
    ];

    const studentWS = XLSX.utils.aoa_to_sheet(studentData);
    
    // Auto-width for student sheet
    const studentCols = [
      { wch: 20 }, // Student Name
      { wch: 15 }, // SRN
      { wch: 15 }, // Total Sessions
      { wch: 15 }, // Present Sessions
      { wch: 15 }, // Absent Sessions
      { wch: 20 }  // Attendance Percentage
    ];
    studentWS['!cols'] = studentCols;

    XLSX.utils.book_append_sheet(wb, studentWS, 'Student Performance');

    // Sheet 3: Session Details
    if (report.sessionSummaries.length > 0) {
      const sessionHeaders = [
        'Date',
        'Total Students',
        'Present',
        'Absent',
        'Attendance Percentage'
      ];

      const sessionData = [
        sessionHeaders,
        ...report.sessionSummaries.map(session => [
          session.date,
          session.totalStudents,
          session.presentStudents,
          session.absentStudents,
          `${session.attendancePercentage}%`
        ])
      ];

      const sessionWS = XLSX.utils.aoa_to_sheet(sessionData);
      
      // Auto-width for session sheet
      const sessionCols = [
        { wch: 12 }, // Date
        { wch: 15 }, // Total Students
        { wch: 10 }, // Present
        { wch: 10 }, // Absent
        { wch: 20 }  // Attendance Percentage
      ];
      sessionWS['!cols'] = sessionCols;

      XLSX.utils.book_append_sheet(wb, sessionWS, 'Session Details');
    }

    // Sheet 4: Individual Student History (if detailed data exists)
    if (report.students.length > 0 && report.students[0].attendanceHistory.length > 0) {
      // Create a pivot-style attendance history
      const dates = Array.from(new Set(
        report.students.flatMap(s => s.attendanceHistory.map(h => h.date))
      )).sort();

      const historyHeaders = ['Student Name', 'SRN', ...dates];
      const historyData = [
        historyHeaders,
        ...report.students.map(student => {
          const row = [student.studentName, student.studentSrn];
          dates.forEach(date => {
            const attendance = student.attendanceHistory.find(h => h.date === date);
            row.push(attendance ? (attendance.status === 'present' ? 'P' : 'A') : '-');
          });
          return row;
        })
      ];

      const historyWS = XLSX.utils.aoa_to_sheet(historyData);
      
      // Set column widths
      const historyCols = [
        { wch: 20 }, // Student Name
        { wch: 15 }, // SRN
        ...dates.map(() => ({ wch: 8 })) // Date columns
      ];
      historyWS['!cols'] = historyCols;

      XLSX.utils.book_append_sheet(wb, historyWS, 'Attendance History');
    }

    // Generate filename
    const fileName = `${report.className}_${report.dateRange.start}_to_${report.dateRange.end}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    throw new Error('Failed to export Excel file');
  }
};

/**
 * Export simplified CSV for quick sharing
 */
export const exportSimpleCSV = (report: DetailedReport): string => {
  const lines: string[] = [];
  
  // Header
  lines.push(`"${report.className} - ${report.subject}"`);
  lines.push(`"Period: ${report.dateRange.start} to ${report.dateRange.end}"`);
  lines.push(`"Average Attendance: ${report.overallStats.averageAttendance}%"`);
  lines.push('');
  
  // Student summary
  lines.push('"Student Name","SRN","Attendance %","Present/Total"');
  report.students.forEach(student => {
    lines.push(`"${student.studentName}","${student.studentSrn}","${student.attendancePercentage}%","${student.presentSessions}/${student.totalSessions}"`);
  });
  
  return lines.join('\n');
};

/**
 * Export attendance summary for multiple classes
 */
export interface ClassSummaryExport {
  className: string;
  subject: string;
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
  lastSessionDate: string;
}

export const exportClassSummariesAsExcel = (summaries: ClassSummaryExport[]): void => {
  try {
    const wb = XLSX.utils.book_new();

    // Summary data
    const headers = [
      'Class Name',
      'Subject', 
      'Total Students',
      'Total Sessions',
      'Average Attendance (%)',
      'Last Session Date'
    ];

    const data = [
      headers,
      ...summaries.map(summary => [
        summary.className,
        summary.subject,
        summary.totalStudents,
        summary.totalSessions,
        summary.averageAttendance,
        summary.lastSessionDate
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const cols = [
      { wch: 25 }, // Class Name
      { wch: 20 }, // Subject
      { wch: 15 }, // Total Students
      { wch: 15 }, // Total Sessions
      { wch: 20 }, // Average Attendance
      { wch: 18 }  // Last Session Date
    ];
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'Class Summaries');

    // Generate filename
    const fileName = `Class_Summaries_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
    console.error('Error exporting class summaries:', error);
    throw new Error('Failed to export class summaries');
  }
};

/**
 * Download any data as CSV with proper formatting
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  try {
    // Add BOM for proper Excel UTF-8 handling
    const BOM = '\uFEFF';
    const csvContentWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvContentWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw new Error('Failed to download CSV file');
  }
};

/**
 * Generate attendance certificate data
 */
export interface AttendanceCertificate {
  studentName: string;
  studentSrn: string;
  className: string;
  subject: string;
  attendancePercentage: number;
  totalSessions: number;
  presentSessions: number;
  period: string;
  generatedDate: string;
}

export const generateAttendanceCertificate = (
  student: any,
  report: DetailedReport
): AttendanceCertificate => {
  return {
    studentName: student.studentName,
    studentSrn: student.studentSrn,
    className: report.className,
    subject: report.subject,
    attendancePercentage: student.attendancePercentage,
    totalSessions: student.totalSessions,
    presentSessions: student.presentSessions,
    period: `${report.dateRange.start} to ${report.dateRange.end}`,
    generatedDate: new Date().toISOString().split('T')[0]
  };
};