"""
Email notification service using Resend API
"""
import resend
from typing import Optional, List
import os

class EmailService:
    def __init__(self, api_key: str):
        """Initialize the email service with Resend API key"""
        resend.api_key = api_key
        self.from_email = "IDGuard <onboarding@resend.dev>"  # Default Resend sender
    
    def send_absence_notification(
        self,
        parent_email: str,
        student_name: str,
        class_name: str,
        subject_name: str,
        date: str,
        teacher_name: str = "Your Teacher"
    ) -> dict:
        """Send absence notification email to parent"""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-flex; align-items: center; gap: 8px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M9 12l2 2 4-4" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span style="font-size: 20px; font-weight: 700; color: #0f172a;">IDGuard</span>
                        </div>
                    </div>
                    
                    <!-- Content -->
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Absence Notification
                    </h1>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        Dear Parent/Guardian,
                    </p>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        This is to inform you that your child was marked <strong style="color: #dc2626;">absent</strong> from class today.
                    </p>
                    
                    <!-- Details Box -->
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Student Name</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">{student_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Class</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">{class_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Subject</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">{subject_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">{date}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        If you believe this is an error or have any questions, please contact the class teacher.
                    </p>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
                        Best regards,<br>
                        <strong style="color: #0f172a;">{teacher_name}</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 24px;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        This is an automated message from IDGuard Attendance System.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            params = {
                "from": self.from_email,
                "to": [parent_email],
                "subject": f"Absence Alert: {student_name} - {class_name}",
                "html": html_content
            }
            
            response = resend.Emails.send(params)
            return {"success": True, "id": response.get("id"), "message": "Email sent successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def send_bulk_absence_notifications(
        self,
        notifications: List[dict],
        teacher_name: str = "Your Teacher"
    ) -> List[dict]:
        """Send multiple absence notifications"""
        results = []
        for notif in notifications:
            if notif.get("parent_email"):
                result = self.send_absence_notification(
                    parent_email=notif["parent_email"],
                    student_name=notif["student_name"],
                    class_name=notif["class_name"],
                    subject_name=notif["subject_name"],
                    date=notif["date"],
                    teacher_name=teacher_name
                )
                results.append({
                    "student_name": notif["student_name"],
                    **result
                })
        return results
