"""OTP Service for sending and verifying OTPs."""

import sys
import json
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import redis.asyncio as redis
import httpx
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioException

# Import shared libraries
from python_shared.config.settings import get_settings, Settings

# Import local models
from ..models.auth import ContactType, OTPRecord
from ..deps import get_redis_client

logger = logging.getLogger(__name__)


class OTPService:
    """Service for handling OTP operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self.otp_length = 6
        self.otp_expiry_minutes = 10
        self.max_attempts = 3
    
    def generate_otp(self) -> str:
        """Generate a secure OTP."""
        return ''.join([str(secrets.randbelow(10)) for _ in range(self.otp_length)])
    
    async def send_otp(
        self,
        contact: str,
        contact_type: ContactType,
        language: str = "he"
    ) -> Tuple[bool, str, str]:
        """
        Send OTP to contact.
        
        Returns:
            (success, message_en, message_he)
        """
        try:
            # Generate OTP
            otp = self.generate_otp()
            
            # Create OTP record
            expires_at = datetime.utcnow() + timedelta(minutes=self.otp_expiry_minutes)
            otp_record = OTPRecord(
                contact=contact,
                contact_type=contact_type,
                otp=otp,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                language=language
            )
            
            # Store OTP in Redis
            redis_client = await get_redis_client()
            key = f"otp:{contact}"
            
            await redis_client.setex(
                key,
                self.otp_expiry_minutes * 60,
                json.dumps(otp_record.dict(), default=str)
            )
            
            # Send OTP based on contact type
            if contact_type == ContactType.EMAIL:
                success = await self._send_email_otp(contact, otp, language)
            else:
                success = await self._send_sms_otp(contact, otp, language)
            
            if success:
                return True, "OTP sent successfully", "קוד אימות נשלח בהצלחה"
            else:
                return False, "Failed to send OTP", "שליחת קוד האימות נכשלה"
                
        except Exception as e:
            logger.error(f"Error sending OTP to {contact}: {e}")
            return False, "Failed to send OTP", "שליחת קוד האימות נכשלה"
    
    async def verify_otp(self, contact: str, otp: str) -> Tuple[bool, str, str, Optional[bool]]:
        """
        Verify OTP for contact.
        
        Returns:
            (success, message_en, message_he, is_new_user)
        """
        try:
            redis_client = await get_redis_client()
            key = f"otp:{contact}"
            
            # Get OTP record
            otp_data = await redis_client.get(key)
            if not otp_data:
                return False, "OTP expired or not found", "קוד האימות פג תוקף או לא נמצא", None
            
            otp_record_dict = json.loads(otp_data)
            otp_record = OTPRecord(**otp_record_dict)
            
            # Check if OTP is expired
            if datetime.utcnow() > otp_record.expires_at:
                await redis_client.delete(key)
                return False, "OTP expired", "קוד האימות פג תוקף", None
            
            # Check attempts
            if otp_record.attempts >= otp_record.max_attempts:
                await redis_client.delete(key)
                return False, "Maximum attempts exceeded", "חריגה ממספר הניסיונות המותר", None
            
            # Verify OTP
            if otp_record.otp != otp:
                # Increment attempts
                otp_record.attempts += 1
                await redis_client.setex(
                    key,
                    int((otp_record.expires_at - datetime.utcnow()).total_seconds()),
                    json.dumps(otp_record.dict(), default=str)
                )
                
                remaining_attempts = otp_record.max_attempts - otp_record.attempts
                if remaining_attempts > 0:
                    return (
                        False,
                        f"Invalid OTP. {remaining_attempts} attempts remaining",
                        f"קוד אימות שגוי. נותרו {remaining_attempts} ניסיונות",
                        None
                    )
                else:
                    await redis_client.delete(key)
                    return False, "Maximum attempts exceeded", "חריגה ממספר הניסיונות המותר", None
            
            # OTP is valid - delete it
            await redis_client.delete(key)
            
            # Check if user exists (simplified - in real implementation, check database)
            is_new_user = await self._is_new_user(contact)
            
            return True, "OTP verified successfully", "קוד האימות אומת בהצלחה", is_new_user
            
        except Exception as e:
            logger.error(f"Error verifying OTP for {contact}: {e}")
            return False, "OTP verification failed", "אימות הקוד נכשל", None
    
    async def _send_sms_otp(self, phone: str, otp: str, language: str) -> bool:
        """Send OTP via SMS."""
        try:
            # Try different SMS providers in order of preference
            
            # 1. Try GreenAPI (WhatsApp Business API)
            if await self._send_whatsapp_otp(phone, otp, language):
                return True
            
            # 2. Try Twilio
            if await self._send_twilio_sms(phone, otp, language):
                return True
            
            # 3. Fallback - log the OTP (development only)
            if self.settings.environment == "development":
                logger.info(f"SMS OTP for {phone}: {otp}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending SMS OTP: {e}")
            return False
    
    async def _send_whatsapp_otp(self, phone: str, otp: str, language: str) -> bool:
        """Send OTP via WhatsApp using GreenAPI."""
        if not self.settings.greenapi_id_instance or not self.settings.greenapi_api_token:
            return False
        
        try:
            # Format phone number for WhatsApp (remove + and add @c.us)
            whatsapp_number = phone.replace('+', '') + '@c.us'
            
            # Message templates
            messages = {
                'he': f"קוד האימות שלך באופייר: {otp}\n\nהקוד תקף ל-{self.otp_expiry_minutes} דקות.",
                'en': f"Your OFAIR verification code: {otp}\n\nThis code expires in {self.otp_expiry_minutes} minutes.",
                'ar': f"رمز التحقق الخاص بك في أوفير: {otp}\n\nهذا الرمز صالح لمدة {self.otp_expiry_minutes} دقائق."
            }
            
            message = messages.get(language, messages['he'])
            
            url = f"https://api.green-api.com/waInstance{self.settings.greenapi_id_instance}/sendMessage/{self.settings.greenapi_api_token}"
            
            payload = {
                "chatId": whatsapp_number,
                "message": message
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('idMessage'):
                        logger.info(f"WhatsApp OTP sent successfully to {phone}")
                        return True
                    else:
                        logger.error(f"WhatsApp API error: {result}")
                        return False
                else:
                    logger.error(f"WhatsApp API request failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"WhatsApp OTP sending failed: {e}")
            return False
    
    async def _send_twilio_sms(self, phone: str, otp: str, language: str) -> bool:
        """Send OTP via Twilio SMS."""
        if not all([
            self.settings.twilio_account_sid,
            self.settings.twilio_auth_token,
            self.settings.twilio_from_number
        ]):
            return False
        
        try:
            # Message templates
            messages = {
                'he': f"קוד האימות שלך באופייר: {otp}",
                'en': f"Your OFAIR verification code: {otp}",
                'ar': f"رمز التحقق الخاص بك في أوفير: {otp}"
            }
            
            message = messages.get(language, messages['he'])
            
            # Run Twilio client in thread pool to avoid blocking
            def send_sms():
                client = TwilioClient(
                    self.settings.twilio_account_sid,
                    self.settings.twilio_auth_token
                )
                
                return client.messages.create(
                    body=message,
                    from_=self.settings.twilio_from_number,
                    to=phone
                )
            
            loop = asyncio.get_event_loop()
            message_result = await loop.run_in_executor(None, send_sms)
            
            if message_result.sid:
                logger.info(f"Twilio SMS OTP sent successfully to {phone}")
                return True
            else:
                logger.error("Twilio SMS sending failed - no SID returned")
                return False
                
        except TwilioException as e:
            logger.error(f"Twilio SMS error: {e}")
            return False
        except Exception as e:
            logger.error(f"SMS OTP sending failed: {e}")
            return False
    
    async def _send_email_otp(self, email: str, otp: str, language: str) -> bool:
        """Send OTP via email."""
        if not all([
            self.settings.smtp_host,
            self.settings.smtp_user,
            self.settings.smtp_password
        ]):
            # Development fallback
            if self.settings.environment == "development":
                logger.info(f"Email OTP for {email}: {otp}")
                return True
            return False
        
        try:
            # Email templates
            subjects = {
                'he': "קוד האימות שלך באופייר",
                'en': "Your OFAIR Verification Code",
                'ar': "رمز التحقق الخاص بك في أوفير"
            }
            
            html_templates = {
                'he': f"""
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2E86AB;">קוד האימות שלך באופייר</h2>
                    <p>שלום,</p>
                    <p>קוד האימות שלך הוא:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #2E86AB; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
                        {otp}
                    </div>
                    <p>קוד זה תקף ל-{self.otp_expiry_minutes} דקות בלבד.</p>
                    <p>אם לא ביקשת קוד זה, אנא התעלם ממייל זה.</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        מייל זה נשלח אוטומטית, אנא אל תשיב עליו.
                    </p>
                </div>
                """,
                'en': f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2E86AB;">Your OFAIR Verification Code</h2>
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #2E86AB; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
                        {otp}
                    </div>
                    <p>This code is valid for {self.otp_expiry_minutes} minutes only.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This email was sent automatically, please do not reply.
                    </p>
                </div>
                """
            }
            
            subject = subjects.get(language, subjects['he'])
            html_content = html_templates.get(language, html_templates['he'])
            
            # Run email sending in thread pool
            def send_email():
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = self.settings.smtp_user
                msg['To'] = email
                
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)
                
                with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
                    server.starttls()
                    server.login(self.settings.smtp_user, self.settings.smtp_password)
                    server.send_message(msg)
                
                return True
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, send_email)
            
            logger.info(f"Email OTP sent successfully to {email}")
            return result
            
        except Exception as e:
            logger.error(f"Email OTP sending failed: {e}")
            return False
    
    async def _is_new_user(self, contact: str) -> bool:
        """Check if this is a new user (simplified implementation)."""
        # In a real implementation, this would check the database
        # For now, we'll use Redis to track seen contacts
        redis_client = await get_redis_client()
        key = f"user_exists:{contact}"
        
        exists = await redis_client.get(key)
        if exists:
            return False
        
        # Mark as seen (this would normally be done after successful user creation)
        await redis_client.setex(key, 86400 * 30, "1")  # 30 days
        return True
    
    async def cleanup_expired_otps(self):
        """Cleanup expired OTP records (called periodically)."""
        try:
            redis_client = await get_redis_client()
            pattern = "otp:*"
            
            async for key in redis_client.scan_iter(match=pattern):
                try:
                    otp_data = await redis_client.get(key)
                    if otp_data:
                        otp_record_dict = json.loads(otp_data)
                        expires_at = datetime.fromisoformat(otp_record_dict['expires_at'])
                        
                        if datetime.utcnow() > expires_at:
                            await redis_client.delete(key)
                            logger.debug(f"Cleaned up expired OTP: {key}")
                            
                except Exception as e:
                    logger.error(f"Error cleaning up OTP {key}: {e}")
                    
        except Exception as e:
            logger.error(f"Error during OTP cleanup: {e}")


# Global OTP service instance
otp_service = OTPService()