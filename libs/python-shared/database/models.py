"""SQLAlchemy database models for OFAIR platform."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text,
    CheckConstraint, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


# Enums
class UserRole(PyEnum):
    """User role enumeration."""
    CONSUMER = "consumer"
    PROFESSIONAL = "professional"
    ADMIN = "admin"


class LeadType(PyEnum):
    """Lead type enumeration."""
    CONSUMER = "consumer"
    PROFESSIONAL_REFERRAL = "professional_referral"


class LeadStatus(PyEnum):
    """Lead status enumeration."""
    ACTIVE = "active"
    PENDING = "pending"
    CLOSED = "closed"


class ProfessionalStatus(PyEnum):
    """Professional status enumeration."""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class ReferralStatus(PyEnum):
    """Referral status enumeration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"


class ProposalStatus(PyEnum):
    """Proposal status enumeration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class PaymentStatus(PyEnum):
    """Payment status enumeration."""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class WalletTransactionType(PyEnum):
    """Wallet transaction type enumeration."""
    CREDIT = "credit"
    DEBIT = "debit"
    COMMISSION = "commission"


class ProjectStatus(PyEnum):
    """Project status enumeration."""
    ACTIVE = "active"
    COMPLETED = "completed"
    DISPUTED = "disputed"


class NotificationType(PyEnum):
    """Notification type enumeration."""
    NEW_LEAD = "new_lead"
    NEW_PROPOSAL = "new_proposal"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PAYMENT_RECEIVED = "payment_received"
    REFERRAL_RECEIVED = "referral_received"
    RATING_RECEIVED = "rating_received"


class ContactAccessType(PyEnum):
    """Contact access type enumeration."""
    PHONE_REVEAL = "phone_reveal"
    ADDRESS_REVEAL = "address_reveal"
    FULL_CONTACT = "full_contact"


# Core Models
class User(Base):
    """Master user account table."""
    
    __tablename__ = "users"
    
    # Contact information (PII - sensitive)
    phone: Mapped[Optional[str]] = mapped_column(
        String(20), unique=True, nullable=True,
        comment="Phone number - PII sensitive"
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True,
        comment="Email address - PII sensitive"
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Full name - PII sensitive"
    )
    
    # User role and status
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.CONSUMER
    )
    
    # Relationships
    professional_profile: Mapped[Optional["Professional"]] = relationship(
        "Professional", back_populates="user", uselist=False
    )
    user_profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile", back_populates="user", uselist=False
    )
    created_leads: Mapped[List["Lead"]] = relationship(
        "Lead", foreign_keys="[Lead.created_by_user_id]", back_populates="creator_user"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user"
    )
    payments: Mapped[List["LeadPayment"]] = relationship(
        "LeadPayment", back_populates="payer_user"
    )
    contact_accesses: Mapped[List["ContactAccessLog"]] = relationship(
        "ContactAccessLog", back_populates="accessor_user"
    )
    ratings_given: Mapped[List["ProfessionalRating"]] = relationship(
        "ProfessionalRating", back_populates="rater_user"
    )
    consumer_projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="consumer"
    )
    admin_actions: Mapped[List["AdminAuditLog"]] = relationship(
        "AdminAuditLog", back_populates="admin_user"
    )

    # Indexes
    __table_args__ = (
        Index("idx_users_phone", "phone"),
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_created_at", "created_at"),
    )


class Professional(Base):
    """Professional profile and business information."""
    
    __tablename__ = "professionals"
    
    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True
    )
    
    # Professional details
    profession: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(255))
    specialties: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Rating and verification
    rating: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(3, 2), default=Decimal("0.00"),
        comment="Average rating from 0.00 to 5.00"
    )
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ProfessionalStatus] = mapped_column(
        Enum(ProfessionalStatus), default=ProfessionalStatus.PENDING
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="professional_profile")
    created_leads: Mapped[List["Lead"]] = relationship(
        "Lead", foreign_keys="[Lead.created_by_professional_id]", 
        back_populates="creator_professional"
    )
    referrals_given: Mapped[List["Referral"]] = relationship(
        "Referral", foreign_keys="[Referral.referrer_professional_id]",
        back_populates="referrer_professional"
    )
    referrals_received: Mapped[List["Referral"]] = relationship(
        "Referral", foreign_keys="[Referral.receiver_professional_id]",
        back_populates="receiver_professional"
    )
    proposals: Mapped[List["Proposal"]] = relationship(
        "Proposal", back_populates="professional"
    )
    wallet: Mapped[Optional["Wallet"]] = relationship(
        "Wallet", back_populates="professional", uselist=False
    )
    phone_revelations: Mapped[List["PhoneRevelation"]] = relationship(
        "PhoneRevelation", back_populates="professional"
    )
    ratings_received: Mapped[List["ProfessionalRating"]] = relationship(
        "ProfessionalRating", back_populates="professional"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="professional"
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_professionals_location", "location"),
        Index("idx_professionals_profession", "profession"),
        Index("idx_professionals_rating", "rating"),
        Index("idx_professionals_status", "status"),
        Index("idx_professionals_is_verified", "is_verified"),
        CheckConstraint("rating >= 0.00 AND rating <= 5.00", name="check_rating_range"),
        CheckConstraint("review_count >= 0", name="check_review_count_positive"),
    )


class UserProfile(Base):
    """Consumer user profile and preferences."""
    
    __tablename__ = "user_profiles"
    
    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True
    )
    
    # Profile data
    address: Mapped[Optional[str]] = mapped_column(
        Text, comment="User address - PII sensitive"
    )
    preferences: Mapped[Optional[dict]] = mapped_column(JSONB)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_profile")

    # Indexes
    __table_args__ = (
        Index("idx_user_profiles_user_id", "user_id"),
    )


# Lead System Models
class Lead(Base):
    """Abstract lead table for all lead types."""
    
    __tablename__ = "leads"
    
    # Lead classification
    type: Mapped[LeadType] = mapped_column(Enum(LeadType), nullable=False)
    
    # Basic lead information
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Lead status and lifecycle
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus), nullable=False, default=LeadStatus.ACTIVE
    )
    
    # Creator references
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_by_professional_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=True
    )
    
    # Financial information (set after proposal acceptance)
    final_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), comment="Final agreed amount after proposal acceptance"
    )
    
    # Relationships
    creator_user: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by_user_id], back_populates="created_leads"
    )
    creator_professional: Mapped[Optional["Professional"]] = relationship(
        "Professional", foreign_keys=[created_by_professional_id], 
        back_populates="created_leads"
    )
    consumer_details: Mapped[Optional["ConsumerLead"]] = relationship(
        "ConsumerLead", back_populates="lead", uselist=False
    )
    professional_details: Mapped[Optional["ProfessionalLead"]] = relationship(
        "ProfessionalLead", back_populates="lead", uselist=False
    )
    referrals: Mapped[List["Referral"]] = relationship(
        "Referral", back_populates="lead"
    )
    proposals: Mapped[List["Proposal"]] = relationship(
        "Proposal", back_populates="lead"
    )
    payments: Mapped[List["LeadPayment"]] = relationship(
        "LeadPayment", back_populates="lead"
    )
    contact_accesses: Mapped[List["ContactAccessLog"]] = relationship(
        "ContactAccessLog", back_populates="target_lead"
    )
    phone_revelations: Mapped[List["PhoneRevelation"]] = relationship(
        "PhoneRevelation", back_populates="lead"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="lead"
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_leads_type", "type"),
        Index("idx_leads_category", "category"),
        Index("idx_leads_location", "location"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_created_by_user_id", "created_by_user_id"),
        Index("idx_leads_created_by_professional_id", "created_by_professional_id"),
        Index("idx_leads_created_at", "created_at"),
        Index("idx_leads_category_status", "category", "status"),
        Index("idx_leads_location_status", "location", "status"),
        CheckConstraint("final_amount IS NULL OR final_amount > 0", 
                       name="check_final_amount_positive"),
    )


class ConsumerLead(Base):
    """Consumer-specific lead details (PII sensitive)."""
    
    __tablename__ = "consumer_leads"
    
    # Primary key is also foreign key to leads table
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), primary_key=True
    )
    
    # Client information (PII - sensitive)
    client_name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Client name - PII sensitive"
    )
    client_phone: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="Client phone - PII sensitive"
    )
    client_address: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Client address - PII sensitive"
    )
    
    # Detailed description
    full_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Override base class columns since lead_id is the primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4
    )
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="consumer_details")

    # Indexes
    __table_args__ = (
        Index("idx_consumer_leads_lead_id", "lead_id"),
    )


class ProfessionalLead(Base):
    """Professional-specific lead details (rich referral leads)."""
    
    __tablename__ = "professional_leads"
    
    # Primary key is also foreign key to leads table
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), primary_key=True
    )
    
    # Client information (PII - sensitive)
    client_name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Client name - PII sensitive"
    )
    client_phone: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="Client phone - PII sensitive"
    )
    
    # Professional lead specific fields
    estimated_budget: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), comment="Estimated budget for the project"
    )
    attachments: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), comment="S3 paths to attachment files"
    )
    preferred_schedule: Mapped[Optional[str]] = mapped_column(Text)
    
    # Referral commission configuration
    referrer_share_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00"),
        comment="Percentage (0-90) that referrer gets from final amount"
    )
    
    # Override base class columns since lead_id is the primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4
    )
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="professional_details")

    # Constraints and indexes
    __table_args__ = (
        Index("idx_professional_leads_lead_id", "lead_id"),
        Index("idx_professional_leads_estimated_budget", "estimated_budget"),
        CheckConstraint(
            "referrer_share_percentage >= 0 AND referrer_share_percentage <= 90",
            name="check_referrer_share_percentage_range"
        ),
        CheckConstraint(
            "estimated_budget IS NULL OR estimated_budget > 0",
            name="check_estimated_budget_positive"
        ),
    )


# Referral and Proposal Models
class Referral(Base):
    """Lead referral and transfer tracking."""
    
    __tablename__ = "referrals"
    
    # Foreign keys
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    referrer_professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    receiver_professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    
    # Referral terms
    commission_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False,
        comment="Commission percentage at time of referral creation"
    )
    
    # Referral status and lifecycle
    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus), nullable=False, default=ReferralStatus.PENDING
    )
    
    # Lifecycle timestamps
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="referrals")
    referrer_professional: Mapped["Professional"] = relationship(
        "Professional", foreign_keys=[referrer_professional_id],
        back_populates="referrals_given"
    )
    receiver_professional: Mapped["Professional"] = relationship(
        "Professional", foreign_keys=[receiver_professional_id],
        back_populates="referrals_received"
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_referrals_lead_id", "lead_id"),
        Index("idx_referrals_referrer_professional_id", "referrer_professional_id"),
        Index("idx_referrals_receiver_professional_id", "receiver_professional_id"),
        Index("idx_referrals_status", "status"),
        Index("idx_referrals_created_at", "created_at"),
        CheckConstraint(
            "commission_percentage >= 0 AND commission_percentage <= 90",
            name="check_commission_percentage_range"
        ),
        CheckConstraint(
            "referrer_professional_id != receiver_professional_id",
            name="check_different_referrer_receiver"
        ),
        UniqueConstraint(
            "lead_id", "referrer_professional_id", "receiver_professional_id",
            name="uq_referral_combination"
        ),
    )


class Proposal(Base):
    """Proposals submitted by professionals for leads."""
    
    __tablename__ = "proposals"
    
    # Foreign keys
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    
    # Proposal details
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False,
        comment="Proposed price for the work"
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    media_urls: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), comment="URLs to proposal media files"
    )
    scheduled_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Proposal status
    status: Mapped[ProposalStatus] = mapped_column(
        Enum(ProposalStatus), nullable=False, default=ProposalStatus.PENDING
    )
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="proposals")
    professional: Mapped["Professional"] = relationship(
        "Professional", back_populates="proposals"
    )
    payments: Mapped[List["LeadPayment"]] = relationship(
        "LeadPayment", back_populates="proposal"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="proposal"
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_proposals_lead_id", "lead_id"),
        Index("idx_proposals_professional_id", "professional_id"),
        Index("idx_proposals_status", "status"),
        Index("idx_proposals_created_at", "created_at"),
        Index("idx_proposals_price", "price"),
        CheckConstraint("price > 0", name="check_price_positive"),
        UniqueConstraint(
            "lead_id", "professional_id",
            name="uq_proposal_per_lead_professional"
        ),
    )


# Payment and Wallet Models
class LeadPayment(Base):
    """Payment records and commission splits."""
    
    __tablename__ = "lead_payments"
    
    # Foreign keys
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id"), nullable=False
    )
    payer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Payment amounts and splits
    final_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False,
        comment="Total payment amount from consumer"
    )
    platform_commission: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False,
        comment="Platform commission (5% or 10%)"
    )
    referrer_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"),
        comment="Fee paid to referrer (if any)"
    )
    professional_net_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False,
        comment="Net amount for performing professional"
    )
    
    # Payment status and provider info
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING
    )
    psp_provider: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Payment service provider name (e.g., stripe, paypal)"
    )
    psp_reference: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="PSP transaction reference/ID"
    )
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="payments")
    proposal: Mapped["Proposal"] = relationship("Proposal", back_populates="payments")
    payer_user: Mapped["User"] = relationship("User", back_populates="payments")

    # Constraints and indexes
    __table_args__ = (
        Index("idx_lead_payments_lead_id", "lead_id"),
        Index("idx_lead_payments_proposal_id", "proposal_id"),
        Index("idx_lead_payments_payer_user_id", "payer_user_id"),
        Index("idx_lead_payments_status", "status"),
        Index("idx_lead_payments_psp_reference", "psp_reference"),
        Index("idx_lead_payments_created_at", "created_at"),
        CheckConstraint("final_amount > 0", name="check_final_amount_positive"),
        CheckConstraint("platform_commission >= 0", name="check_platform_commission_positive"),
        CheckConstraint("referrer_fee >= 0", name="check_referrer_fee_positive"),
        CheckConstraint("professional_net_amount >= 0", name="check_professional_net_positive"),
        CheckConstraint(
            "final_amount = platform_commission + referrer_fee + professional_net_amount",
            name="check_payment_amounts_balance"
        ),
    )


class Wallet(Base):
    """Professional wallet for balance tracking."""
    
    __tablename__ = "wallets"
    
    # Foreign key to professional
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), 
        nullable=False, unique=True
    )
    
    # Balance fields
    available_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"),
        comment="Available balance for withdrawal"
    )
    pending_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"),
        comment="Pending balance in hold period"
    )
    
    # Relationships
    professional: Mapped["Professional"] = relationship(
        "Professional", back_populates="wallet"
    )
    transactions: Mapped[List["WalletTransaction"]] = relationship(
        "WalletTransaction", back_populates="wallet"
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_wallets_professional_id", "professional_id"),
        CheckConstraint("available_balance >= 0", name="check_available_balance_positive"),
        CheckConstraint("pending_balance >= 0", name="check_pending_balance_positive"),
    )


class WalletTransaction(Base):
    """Individual wallet transaction records."""
    
    __tablename__ = "wallet_transactions"
    
    # Foreign key to wallet
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False
    )
    
    # Transaction details
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False,
        comment="Transaction amount (positive for credit, negative for debit)"
    )
    type: Mapped[WalletTransactionType] = mapped_column(
        Enum(WalletTransactionType), nullable=False
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
        comment="Reference to related entity (payment, withdrawal, etc.)"
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Relationships
    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="transactions")

    # Indexes
    __table_args__ = (
        Index("idx_wallet_transactions_wallet_id", "wallet_id"),
        Index("idx_wallet_transactions_type", "type"),
        Index("idx_wallet_transactions_reference_id", "reference_id"),
        Index("idx_wallet_transactions_created_at", "created_at"),
    )


# Support and Audit Models
class Notification(Base):
    """User notifications."""
    
    __tablename__ = "notifications"
    
    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Notification details
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(
        JSONB, comment="Additional structured data"
    )
    
    # Read status
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

    # Indexes
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_type", "type"),
        Index("idx_notifications_is_read", "is_read"),
        Index("idx_notifications_created_at", "created_at"),
        Index("idx_notifications_user_id_is_read", "user_id", "is_read"),
    )


class ContactAccessLog(Base):
    """Audit log for PII access events."""
    
    __tablename__ = "contact_access_logs"
    
    # Foreign keys
    accessor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    target_lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    
    # Access details
    access_type: Mapped[ContactAccessType] = mapped_column(
        Enum(ContactAccessType), nullable=False
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Relationships
    accessor_user: Mapped["User"] = relationship("User", back_populates="contact_accesses")
    target_lead: Mapped["Lead"] = relationship("Lead", back_populates="contact_accesses")

    # Indexes
    __table_args__ = (
        Index("idx_contact_access_logs_accessor_user_id", "accessor_user_id"),
        Index("idx_contact_access_logs_target_lead_id", "target_lead_id"),
        Index("idx_contact_access_logs_access_type", "access_type"),
        Index("idx_contact_access_logs_created_at", "created_at"),
        Index("idx_contact_access_logs_ip_address", "ip_address"),
    )


class PhoneRevelation(Base):
    """Specific audit log for phone number revelations."""
    
    __tablename__ = "phone_revelations"
    
    # Foreign keys
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    
    # Revelation details
    revealed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="phone_revelations")
    professional: Mapped["Professional"] = relationship(
        "Professional", back_populates="phone_revelations"
    )

    # Indexes
    __table_args__ = (
        Index("idx_phone_revelations_lead_id", "lead_id"),
        Index("idx_phone_revelations_professional_id", "professional_id"),
        Index("idx_phone_revelations_revealed_at", "revealed_at"),
        Index("idx_phone_revelations_ip_address", "ip_address"),
        UniqueConstraint(
            "lead_id", "professional_id",
            name="uq_phone_revelation_per_lead_professional"
        ),
    )


class ProfessionalRating(Base):
    """Professional ratings and reviews."""
    
    __tablename__ = "professional_ratings"
    
    # Foreign keys
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    rater_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    
    # Rating details
    rating: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Rating from 1 to 5"
    )
    review_text: Mapped[Optional[str]] = mapped_column(Text)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Relationships
    professional: Mapped["Professional"] = relationship(
        "Professional", back_populates="ratings_received"
    )
    rater_user: Mapped["User"] = relationship("User", back_populates="ratings_given")
    project: Mapped["Project"] = relationship("Project", back_populates="rating")

    # Constraints and indexes
    __table_args__ = (
        Index("idx_professional_ratings_professional_id", "professional_id"),
        Index("idx_professional_ratings_rater_user_id", "rater_user_id"),
        Index("idx_professional_ratings_project_id", "project_id"),
        Index("idx_professional_ratings_rating", "rating"),
        Index("idx_professional_ratings_created_at", "created_at"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
        UniqueConstraint(
            "project_id", "rater_user_id",
            name="uq_rating_per_project_user"
        ),
    )


class Project(Base):
    """Project lifecycle tracking."""
    
    __tablename__ = "projects"
    
    # Foreign keys
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id"), nullable=False
    )
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    consumer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Project status and dates
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVE
    )
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completion_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="projects")
    proposal: Mapped["Proposal"] = relationship("Proposal", back_populates="projects")
    professional: Mapped["Professional"] = relationship(
        "Professional", back_populates="projects"
    )
    consumer: Mapped["User"] = relationship("User", back_populates="consumer_projects")
    rating: Mapped[Optional["ProfessionalRating"]] = relationship(
        "ProfessionalRating", back_populates="project", uselist=False
    )

    # Constraints and indexes
    __table_args__ = (
        Index("idx_projects_lead_id", "lead_id"),
        Index("idx_projects_proposal_id", "proposal_id"),
        Index("idx_projects_professional_id", "professional_id"),
        Index("idx_projects_consumer_id", "consumer_id"),
        Index("idx_projects_status", "status"),
        Index("idx_projects_start_date", "start_date"),
        Index("idx_projects_completion_date", "completion_date"),
        Index("idx_projects_created_at", "created_at"),
        UniqueConstraint("proposal_id", name="uq_project_per_proposal"),
    )


class AdminAuditLog(Base):
    """Admin action audit log."""
    
    __tablename__ = "admin_audit_log"
    
    # Foreign key to admin user
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Action details
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    changes: Mapped[Optional[dict]] = mapped_column(
        JSONB, comment="JSON representation of changes made"
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    
    # Relationships
    admin_user: Mapped["User"] = relationship("User", back_populates="admin_actions")

    # Indexes
    __table_args__ = (
        Index("idx_admin_audit_log_admin_user_id", "admin_user_id"),
        Index("idx_admin_audit_log_action", "action"),
        Index("idx_admin_audit_log_entity_type", "entity_type"),
        Index("idx_admin_audit_log_entity_id", "entity_id"),
        Index("idx_admin_audit_log_created_at", "created_at"),
        Index("idx_admin_audit_log_ip_address", "ip_address"),
    )