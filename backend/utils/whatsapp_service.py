"""
WhatsApp notification service using Twilio WhatsApp API.

Setup:
  1. Sign up at https://www.twilio.com (free)
  2. Go to Messaging > Try it out > Send a WhatsApp message
  3. Note your Account SID, Auth Token, and sandbox number
  4. Each recipient must opt-in by sending the sandbox join code once
  5. Set env vars in backend/.env:
       TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
  6. Optionally set TWILIO_CONTENT_SID for a pre-approved template
     (template variables: {"1": "<date>", "2": "<time>"})

For production (removing the sandbox):
  - Apply for a WhatsApp Business Account via Twilio
  - Replace TWILIO_WHATSAPP_FROM with your approved number
"""
from typing import List, Optional
import json
import os


class WhatsAppService:
    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
        content_sid: Optional[str] = None,
    ):
        """
        Initialize the WhatsApp service.

        Args:
            account_sid:  Twilio Account SID
            auth_token:   Twilio Auth Token
            from_number:  Twilio sandbox / approved sender
                          e.g. "whatsapp:+14155238886"
            content_sid:  Optional pre-approved Twilio Content template SID.
                          When set, messages are sent via the Content API
                          (required outside a 24-hour conversation window).
                          Template must accept {"1": date, "2": time} variables.
        """
        try:
            from twilio.rest import Client
            self.client = Client(account_sid, auth_token)
        except ImportError:
            raise RuntimeError(
                "twilio package is not installed. Run: pip install twilio"
            )

        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"
        self.from_number = from_number
        self.content_sid = content_sid or ""

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalise_phone(phone: str) -> str:
        """Ensure number has whatsapp: scheme and a leading +."""
        phone = phone.strip()
        if phone.startswith("whatsapp:"):
            return phone
        if not phone.startswith("+"):
            phone = f"+{phone}"
        return f"whatsapp:{phone}"

    @staticmethod
    def _build_freeform_body(
        student_name: str,
        class_name: str,
        subject_name: str,
        date: str,
        teacher_name: str,
    ) -> str:
        """Fallback plain-text message used when no ContentSid is configured."""
        return (
            f"*IDGuard Attendance Alert* 📋\n\n"
            f"Dear Parent/Guardian,\n\n"
            f"Your child *{student_name}* was marked *absent* today.\n\n"
            f"📚 *Class:* {class_name}\n"
            f"📖 *Subject:* {subject_name}\n"
            f"📅 *Date:* {date}\n"
            f"👨‍🏫 *Teacher:* {teacher_name}\n\n"
            f"If you believe this is an error, please contact the class teacher.\n\n"
            f"_– IDGuard Attendance System_"
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send_absence_notification(
        self,
        parent_phone: str,
        student_name: str,
        class_name: str,
        subject_name: str,
        date: str,
        teacher_name: str = "Your Teacher",
    ) -> dict:
        """Send a single WhatsApp absence notification."""
        try:
            to_number = self._normalise_phone(parent_phone)

            if self.content_sid:
                # Content API — use the pre-approved template.
                # Template variables: {"1": date, "2": time}
                from datetime import datetime
                time_str = datetime.now().strftime("%I:%M %p")
                message = self.client.messages.create(
                    from_=self.from_number,
                    to=to_number,
                    content_sid=self.content_sid,
                    content_variables=json.dumps({"1": date, "2": time_str}),
                )
            else:
                # Free-form text — works inside a 24-hour conversation window.
                body = self._build_freeform_body(
                    student_name, class_name, subject_name, date, teacher_name
                )
                message = self.client.messages.create(
                    body=body,
                    from_=self.from_number,
                    to=to_number,
                )

            return {
                "success": True,
                "sid": message.sid,
                "status": message.status,
                "message": "WhatsApp message sent successfully",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_bulk_absence_notifications(
        self,
        notifications: List[dict],
        teacher_name: str = "Your Teacher",
    ) -> List[dict]:
        """
        Send WhatsApp absence notifications to multiple parents.

        Each dict in `notifications` must have:
            parent_phone, student_name, class_name, subject_name, date
        """
        results = []
        for n in notifications:
            result = self.send_absence_notification(
                parent_phone=n["parent_phone"],
                student_name=n["student_name"],
                class_name=n["class_name"],
                subject_name=n["subject_name"],
                date=n["date"],
                teacher_name=teacher_name,
            )
            result["student_name"] = n["student_name"]
            results.append(result)
        return results
