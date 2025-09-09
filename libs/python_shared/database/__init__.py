"""Database models and utilities for OFAIR platform."""

from .base import Base
from .models import (
    # Enums
    UserRole, LeadType, LeadStatus, ProfessionalStatus, ReferralStatus,
    ProposalStatus, PaymentStatus, WalletTransactionType, ProjectStatus,
    NotificationType, ContactAccessType,
    
    # Core Models
    User, Professional, UserProfile,
    
    # Lead System
    Lead, ConsumerLead, ProfessionalLead,
    
    # Referrals and Proposals
    Referral, Proposal,
    
    # Payments and Wallets
    LeadPayment, Wallet, WalletTransaction,
    
    # Support and Audit
    Notification, ContactAccessLog, PhoneRevelation,
    ProfessionalRating, Project, AdminAuditLog,
)

__all__ = [
    # Base
    "Base",
    
    # Enums
    "UserRole", "LeadType", "LeadStatus", "ProfessionalStatus", "ReferralStatus",
    "ProposalStatus", "PaymentStatus", "WalletTransactionType", "ProjectStatus",
    "NotificationType", "ContactAccessType",
    
    # Core Models
    "User", "Professional", "UserProfile",
    
    # Lead System
    "Lead", "ConsumerLead", "ProfessionalLead",
    
    # Referrals and Proposals
    "Referral", "Proposal",
    
    # Payments and Wallets
    "LeadPayment", "Wallet", "WalletTransaction",
    
    # Support and Audit
    "Notification", "ContactAccessLog", "PhoneRevelation",
    "ProfessionalRating", "Project", "AdminAuditLog",
]