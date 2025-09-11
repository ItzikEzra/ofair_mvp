"""
Notification service integration for proposal-related events.

This module handles sending notifications for proposal lifecycle events
including creation, acceptance, rejection, and updates with full Hebrew/RTL
support and multi-channel delivery (email, SMS, WhatsApp, push).
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
from sqlalchemy.orm import Session

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.models import (
    User, Professional, Lead, Proposal, ProposalStatus,
    Notification, NotificationType
)
from python_shared.config.settings import get_settings

from models.proposals import (
    NotificationPayload, NotificationRequest, NotificationTypeEnum
)

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    """Notification delivery channels."""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class NotificationService:
    """Service for handling proposal-related notifications."""
    
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def notify_new_proposal(
        self,
        proposal: Proposal,
        lead: Lead,
        professional: Professional,
        lead_owner: User
    ) -> None:
        """
        Send notification for new proposal submission.
        
        Args:
            proposal: The submitted proposal
            lead: The lead the proposal is for
            professional: Professional who submitted the proposal
            lead_owner: User who owns the lead
        """
        try:
            # Get professional user info
            prof_user = self.db.query(User).filter(
                User.id == professional.user_id
            ).first()
            
            if not prof_user:
                logger.error(f"Professional user not found for professional {professional.id}")
                return
            
            # Create notification payload
            payload = NotificationPayload(
                proposal_id=proposal.id,
                lead_id=lead.id,
                lead_title=lead.title,
                professional_name=prof_user.name,
                price=proposal.price,
                status=proposal.status,
                message_hebrew=f"הוגשה הצעה חדשה עבור '{lead.title}' ממקצוען {prof_user.name} בסכום {proposal.price:,.0f} ש\"ח",
                message_english=f"New proposal submitted for '{lead.title}' by {prof_user.name} for ₪{proposal.price:,.0f}",
                action_url=f"/proposals/{proposal.id}"
            )
            
            # Send notification to lead owner
            await self._send_notification(
                user=lead_owner,
                notification_type=NotificationTypeEnum.NEW_PROPOSAL,
                payload=payload,
                channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH]
            )
            
            # Create database notification record
            await self._create_notification_record(
                user_id=lead_owner.id,
                notification_type=NotificationType.NEW_PROPOSAL,
                title="הצעה חדשה התקבלה",
                message=payload.message_hebrew,
                data={
                    "proposal_id": str(proposal.id),
                    "lead_id": str(lead.id),
                    "professional_name": prof_user.name,
                    "price": float(proposal.price)
                }
            )
            
            logger.info(f"Sent new proposal notification for proposal {proposal.id}")
            
        except Exception as e:
            logger.error(f"Failed to send new proposal notification: {e}")
    
    async def notify_proposal_accepted(
        self,
        proposal: Proposal,
        lead: Lead,
        professional: Professional,
        accepting_user: User
    ) -> None:
        """
        Send notification for proposal acceptance.
        
        Args:
            proposal: The accepted proposal
            lead: The lead the proposal is for
            professional: Professional whose proposal was accepted
            accepting_user: User who accepted the proposal
        """
        try:
            # Get professional user info
            prof_user = self.db.query(User).filter(
                User.id == professional.user_id
            ).first()
            
            if not prof_user:
                logger.error(f"Professional user not found for professional {professional.id}")
                return
            
            # Create notification payload
            payload = NotificationPayload(
                proposal_id=proposal.id,
                lead_id=lead.id,
                lead_title=lead.title,
                professional_name=prof_user.name,
                price=proposal.price,
                status=proposal.status,
                message_hebrew=f"ברכות! ההצעה שלך עבור '{lead.title}' נתקבלה! פרטי הלקוח נחשפו עבורך.",
                message_english=f"Congratulations! Your proposal for '{lead.title}' has been accepted! Client details are now available.",
                action_url=f"/proposals/{proposal.id}/pii"
            )
            
            # Send notification to professional
            await self._send_notification(
                user=prof_user,
                notification_type=NotificationTypeEnum.PROPOSAL_ACCEPTED,
                payload=payload,
                channels=[
                    NotificationChannel.EMAIL, 
                    NotificationChannel.SMS, 
                    NotificationChannel.PUSH,
                    NotificationChannel.WHATSAPP
                ]
            )
            
            # Create database notification record
            await self._create_notification_record(
                user_id=prof_user.id,
                notification_type=NotificationType.PROPOSAL_ACCEPTED,
                title="ההצעה שלך התקבלה!",
                message=payload.message_hebrew,
                data={
                    "proposal_id": str(proposal.id),
                    "lead_id": str(lead.id),
                    "lead_title": lead.title,
                    "price": float(proposal.price),
                    "pii_available": True
                }
            )
            
            logger.info(f"Sent proposal accepted notification for proposal {proposal.id}")
            
        except Exception as e:
            logger.error(f"Failed to send proposal accepted notification: {e}")
    
    async def notify_proposal_rejected(
        self,
        proposal: Proposal,
        lead: Lead,
        professional: Professional,
        rejecting_user: User,
        reason: Optional[str] = None
    ) -> None:
        """
        Send notification for proposal rejection.
        
        Args:
            proposal: The rejected proposal
            lead: The lead the proposal is for
            professional: Professional whose proposal was rejected
            rejecting_user: User who rejected the proposal
            reason: Optional rejection reason
        """
        try:
            # Get professional user info
            prof_user = self.db.query(User).filter(
                User.id == professional.user_id
            ).first()
            
            if not prof_user:
                logger.error(f"Professional user not found for professional {professional.id}")
                return
            
            # Build message with reason if provided
            reason_text = f" סיבה: {reason}" if reason else ""
            reason_text_en = f" Reason: {reason}" if reason else ""
            
            # Create notification payload
            payload = NotificationPayload(
                proposal_id=proposal.id,
                lead_id=lead.id,
                lead_title=lead.title,
                professional_name=prof_user.name,
                price=proposal.price,
                status=proposal.status,
                message_hebrew=f"ההצעה שלך עבור '{lead.title}' לא התקבלה.{reason_text}",
                message_english=f"Your proposal for '{lead.title}' was not accepted.{reason_text_en}",
                action_url=f"/proposals/{proposal.id}"
            )
            
            # Send notification to professional
            await self._send_notification(
                user=prof_user,
                notification_type=NotificationTypeEnum.PROPOSAL_REJECTED,
                payload=payload,
                channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH]
            )
            
            # Create database notification record
            await self._create_notification_record(
                user_id=prof_user.id,
                notification_type=NotificationType.PROPOSAL_ACCEPTED,  # Using closest available enum
                title="ההצעה שלך לא התקבלה",
                message=payload.message_hebrew,
                data={
                    "proposal_id": str(proposal.id),
                    "lead_id": str(lead.id),
                    "lead_title": lead.title,
                    "price": float(proposal.price),
                    "rejection_reason": reason
                }
            )
            
            logger.info(f"Sent proposal rejected notification for proposal {proposal.id}")
            
        except Exception as e:
            logger.error(f"Failed to send proposal rejected notification: {e}")
    
    async def notify_proposal_updated(
        self,
        proposal: Proposal,
        lead: Lead,
        professional: Professional,
        lead_owner: User,
        changes: Dict[str, Any]
    ) -> None:
        """
        Send notification for proposal updates.
        
        Args:
            proposal: The updated proposal
            lead: The lead the proposal is for
            professional: Professional who updated the proposal
            lead_owner: User who owns the lead
            changes: Dictionary of changes made
        """
        try:
            # Get professional user info
            prof_user = self.db.query(User).filter(
                User.id == professional.user_id
            ).first()
            
            if not prof_user:
                logger.error(f"Professional user not found for professional {professional.id}")
                return
            
            # Build change summary
            change_parts = []
            if "price" in changes:
                change_parts.append(f"מחיר: {changes['price']:,.0f} ש\"ח")
            if "description" in changes:
                change_parts.append("תיאור עודכן")
            if "scheduled_date" in changes:
                change_parts.append("תאריך מוצע עודכן")
            
            change_summary = ", ".join(change_parts) if change_parts else "פרטים עודכנו"
            
            # Create notification payload
            payload = NotificationPayload(
                proposal_id=proposal.id,
                lead_id=lead.id,
                lead_title=lead.title,
                professional_name=prof_user.name,
                price=proposal.price,
                status=proposal.status,
                message_hebrew=f"הצעה עבור '{lead.title}' עודכנה על ידי {prof_user.name}. {change_summary}",
                message_english=f"Proposal for '{lead.title}' was updated by {prof_user.name}",
                action_url=f"/proposals/{proposal.id}"
            )
            
            # Send notification to lead owner
            await self._send_notification(
                user=lead_owner,
                notification_type=NotificationTypeEnum.PROPOSAL_UPDATED,
                payload=payload,
                channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH]
            )
            
            # Create database notification record
            await self._create_notification_record(
                user_id=lead_owner.id,
                notification_type=NotificationType.NEW_PROPOSAL,  # Using closest available enum
                title="הצעה עודכנה",
                message=payload.message_hebrew,
                data={
                    "proposal_id": str(proposal.id),
                    "lead_id": str(lead.id),
                    "professional_name": prof_user.name,
                    "changes": changes
                }
            )
            
            logger.info(f"Sent proposal updated notification for proposal {proposal.id}")
            
        except Exception as e:
            logger.error(f"Failed to send proposal updated notification: {e}")
    
    async def _send_notification(
        self,
        user: User,
        notification_type: NotificationTypeEnum,
        payload: NotificationPayload,
        channels: List[NotificationChannel]
    ) -> None:
        """
        Send notification through specified channels.
        
        Args:
            user: Target user
            notification_type: Type of notification
            payload: Notification payload
            channels: List of channels to send through
        """
        try:
            # Email notification
            if NotificationChannel.EMAIL in channels and user.email:
                await self._send_email_notification(user, notification_type, payload)
            
            # SMS notification
            if NotificationChannel.SMS in channels and user.phone:
                await self._send_sms_notification(user, notification_type, payload)
            
            # WhatsApp notification
            if NotificationChannel.WHATSAPP in channels and user.phone:
                await self._send_whatsapp_notification(user, notification_type, payload)
            
            # Push notification
            if NotificationChannel.PUSH in channels:
                await self._send_push_notification(user, notification_type, payload)
                
        except Exception as e:
            logger.error(f"Failed to send notification through channels: {e}")
    
    async def _send_email_notification(
        self,
        user: User,
        notification_type: NotificationTypeEnum,
        payload: NotificationPayload
    ) -> None:
        """Send email notification."""
        try:
            # Email template data
            email_data = {
                "to": user.email,
                "subject": self._get_email_subject(notification_type),
                "template": self._get_email_template(notification_type),
                "variables": {
                    "user_name": user.name,
                    "lead_title": payload.lead_title,
                    "professional_name": payload.professional_name,
                    "price": f"{payload.price:,.0f}",
                    "message_hebrew": payload.message_hebrew,
                    "message_english": payload.message_english,
                    "action_url": f"{self.settings.frontend_url}{payload.action_url}" if payload.action_url else None,
                    "unsubscribe_url": f"{self.settings.frontend_url}/settings/notifications"
                }
            }
            
            # Send email through communication service
            async with self.http_client as client:
                response = await client.post(
                    f"{self.settings.communication_service_url}/emails/send",
                    json=email_data,
                    headers={"Authorization": f"Bearer {self.settings.internal_api_key}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to send email notification: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    async def _send_sms_notification(
        self,
        user: User,
        notification_type: NotificationTypeEnum,
        payload: NotificationPayload
    ) -> None:
        """Send SMS notification."""
        try:
            # SMS data
            sms_data = {
                "to": user.phone,
                "message": payload.message_hebrew,
                "type": "transactional"
            }
            
            # Send SMS through communication service
            async with self.http_client as client:
                response = await client.post(
                    f"{self.settings.communication_service_url}/sms/send",
                    json=sms_data,
                    headers={"Authorization": f"Bearer {self.settings.internal_api_key}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to send SMS notification: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {e}")
    
    async def _send_whatsapp_notification(
        self,
        user: User,
        notification_type: NotificationTypeEnum,
        payload: NotificationPayload
    ) -> None:
        """Send WhatsApp notification."""
        try:
            # WhatsApp message data
            whatsapp_data = {
                "chatId": f"{user.phone}@c.us",
                "message": payload.message_hebrew,
                "quotedMessageId": None
            }
            
            # Send through GreenAPI or similar service
            if self.settings.greenapi_id_instance and self.settings.greenapi_api_token:
                greenapi_url = f"https://api.green-api.com/waInstance{self.settings.greenapi_id_instance}/sendMessage/{self.settings.greenapi_api_token}"
                
                async with self.http_client as client:
                    response = await client.post(greenapi_url, json=whatsapp_data)
                    
                    if response.status_code != 200:
                        logger.error(f"Failed to send WhatsApp notification: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send WhatsApp notification: {e}")
    
    async def _send_push_notification(
        self,
        user: User,
        notification_type: NotificationTypeEnum,
        payload: NotificationPayload
    ) -> None:
        """Send push notification."""
        try:
            # Push notification data
            push_data = {
                "user_id": str(user.id),
                "title": self._get_push_title(notification_type),
                "body": payload.message_hebrew,
                "data": {
                    "proposal_id": str(payload.proposal_id),
                    "lead_id": str(payload.lead_id),
                    "action_url": payload.action_url
                },
                "channels": ["web", "mobile"]
            }
            
            # Send push notification through communication service
            async with self.http_client as client:
                response = await client.post(
                    f"{self.settings.communication_service_url}/push/send",
                    json=push_data,
                    headers={"Authorization": f"Bearer {self.settings.internal_api_key}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to send push notification: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
    
    async def _create_notification_record(
        self,
        user_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Create notification record in database."""
        try:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                data=data or {},
                is_read=False
            )
            
            self.db.add(notification)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create notification record: {e}")
            self.db.rollback()
    
    def _get_email_subject(self, notification_type: NotificationTypeEnum) -> str:
        """Get email subject based on notification type."""
        subjects = {
            NotificationTypeEnum.NEW_PROPOSAL: "הצעה חדשה התקבלה - OFAIR",
            NotificationTypeEnum.PROPOSAL_ACCEPTED: "ההצעה שלך התקבלה! - OFAIR", 
            NotificationTypeEnum.PROPOSAL_REJECTED: "עדכון על ההצעה שלך - OFAIR",
            NotificationTypeEnum.PROPOSAL_UPDATED: "הצעה עודכנה - OFAIR"
        }
        return subjects.get(notification_type, "עדכון - OFAIR")
    
    def _get_email_template(self, notification_type: NotificationTypeEnum) -> str:
        """Get email template based on notification type."""
        templates = {
            NotificationTypeEnum.NEW_PROPOSAL: "proposal_new",
            NotificationTypeEnum.PROPOSAL_ACCEPTED: "proposal_accepted",
            NotificationTypeEnum.PROPOSAL_REJECTED: "proposal_rejected", 
            NotificationTypeEnum.PROPOSAL_UPDATED: "proposal_updated"
        }
        return templates.get(notification_type, "proposal_generic")
    
    def _get_push_title(self, notification_type: NotificationTypeEnum) -> str:
        """Get push notification title based on notification type."""
        titles = {
            NotificationTypeEnum.NEW_PROPOSAL: "הצעה חדשה",
            NotificationTypeEnum.PROPOSAL_ACCEPTED: "ההצעה שלך התקבלה!",
            NotificationTypeEnum.PROPOSAL_REJECTED: "עדכון על ההצעה",
            NotificationTypeEnum.PROPOSAL_UPDATED: "הצעה עודכנה"
        }
        return titles.get(notification_type, "עדכון OFAIR")
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        try:
            await self.http_client.aclose()
        except Exception as e:
            logger.error(f"Failed to cleanup notification service: {e}")