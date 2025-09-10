#!/usr/bin/env python3
"""
סקריפט אימות שירות הפניות - Referrals Service Validation
מאמת את הפונקציונליות הבסיסית של שירות הפניות וחישוב עמלות
"""

import asyncio
import sys
import os
from decimal import Decimal
from datetime import datetime

# Add the app to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from models.referrals import (
    CreateReferralRequest, ReferralStatus, CommissionStatus
)
from services.referral_service import ReferralService
from services.commission_service import CommissionService
from utils.commission_calculator import CommissionCalculator
from utils.hebrew_utils import (
    validate_hebrew_content, 
    validate_referral_description,
    extract_hebrew_keywords
)

class ReferralsServiceValidator:
    """מאמת שירות הפניות"""
    
    def __init__(self):
        self.calculator = CommissionCalculator()
        self.passed_tests = 0
        self.total_tests = 0
    
    def test(self, test_name: str, condition: bool, details: str = ""):
        """Run a test and track results"""
        self.total_tests += 1
        if condition:
            self.passed_tests += 1
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {test_name}")
            if details:
                print(f"   {details}")
    
    async def validate_commission_calculator(self):
        """אימות מחשבון עמלות"""
        print("\n🧮 בדיקת מחשבון עמלות")
        
        # Test single level commission
        breakdown = await self.calculator.calculate_commission_breakdown(
            lead_value=Decimal('5000'),
            commission_rate=Decimal('0.08'),
            category='renovation',
            referrer_level='gold',
            chain_length=1
        )
        
        self.test(
            "חישוב עמלה רמה אחת",
            len(breakdown) == 2,  # Referrer + Platform
            f"נוצרו {len(breakdown)} רכיבי עמלה"
        )
        
        # Find referrer and platform commissions
        referrer_comm = next((b for b in breakdown if b.recipient_type == "referrer"), None)
        platform_comm = next((b for b in breakdown if b.recipient_type == "platform"), None)
        
        self.test(
            "עמלת מפנה חושבה",
            referrer_comm is not None and referrer_comm.amount > 0,
            f"סכום עמלת מפנה: ₪{referrer_comm.amount if referrer_comm else 0}"
        )
        
        self.test(
            "עמלת פלטפורמה חושבה",
            platform_comm is not None and platform_comm.amount > 0,
            f"סכום עמלת פלטפורמה: ₪{platform_comm.amount if platform_comm else 0}"
        )
        
        # Test multi-level commission
        multi_breakdown = await self.calculator.calculate_commission_breakdown(
            lead_value=Decimal('10000'),
            commission_rate=Decimal('0.10'),
            category='renovation',
            referrer_level='premium',
            chain_length=3
        )
        
        self.test(
            "חישוב עמלה רב-רמתי",
            len(multi_breakdown) >= 3,
            f"נוצרו {len(multi_breakdown)} רכיבי עמלה לשרשרת של 3 רמות"
        )
        
        # Test seasonal adjustments
        base_commission = Decimal('1000')
        april_renovation = self.calculator.calculate_seasonal_adjustments(
            base_commission, 'renovation', 4
        )
        
        self.test(
            "התאמות עונתיות - שיפוצים באפריל",
            april_renovation > base_commission,
            f"עמלה בסיסית: ₪{base_commission}, מותאמת: ₪{april_renovation}"
        )
        
        march_cleaning = self.calculator.calculate_seasonal_adjustments(
            base_commission, 'cleaning', 3
        )
        
        self.test(
            "התאמות עונתיות - ניקיון לפני פסח",
            march_cleaning > base_commission,
            f"עמלה בסיסית: ₪{base_commission}, מותאמת: ₪{march_cleaning}"
        )
    
    def validate_hebrew_utils(self):
        """אימות כלי עברית"""
        print("\n🔤 בדיקת כלי עברית")
        
        # Test valid Hebrew content
        hebrew_text = "שיפוץ מטבח מלא עם התקנת ארונות חדשים וחיפוי קרמיקה איכותי"
        
        self.test(
            "אימות תוכן עברי תקין",
            validate_hebrew_content(hebrew_text),
            f"טקסט: '{hebrew_text[:30]}...'"
        )
        
        # Test mixed content
        mixed_text = "שיפוץ kitchen renovation מטבח חדש"
        
        self.test(
            "אימות תוכן מעורב",
            validate_hebrew_content(mixed_text, min_hebrew_ratio=0.3),
            f"יחס עברית: ~40%"
        )
        
        # Test insufficient Hebrew
        english_text = "Kitchen renovation with minimal עברית"
        
        self.test(
            "זיהוי תוכן לא מספק בעברית",
            not validate_hebrew_content(english_text, min_hebrew_ratio=0.5),
            "יחס עברית נמוך מדי"
        )
        
        # Test keyword extraction
        keywords = extract_hebrew_keywords("שיפוץ מטבח עם ארונות חדשים והתקנת מכשירים")
        
        self.test(
            "חילוץ מילות מפתח בעברית",
            len(keywords) >= 4,
            f"מילות מפתח: {', '.join(keywords[:5])}"
        )
        
        # Test referral description validation
        valid_description = "הפניה למטבח מלא עם חומרים איכותיים ועבודה מקצועית ברמה גבוהה"
        validation_result = validate_referral_description(valid_description)
        
        self.test(
            "אימות תיאור הפניה תקין",
            validation_result["valid"],
            f"אחוז עברית: {validation_result.get('hebrew_ratio', 0)*100:.1f}%"
        )
        
        # Test invalid description (too short)
        invalid_description = "קצר מדי"
        validation_result = validate_referral_description(invalid_description)
        
        self.test(
            "זיהוי תיאור לא תקין",
            not validation_result["valid"],
            f"שגיאה: {validation_result.get('error', 'לא זוהתה שגיאה')}"
        )
    
    def validate_business_logic(self):
        """אימות לוגיקה עסקית"""
        print("\n💼 בדיקת לוגיקה עסקית")
        
        # Test commission rates by category
        category_rates = {
            'renovation': 0.10,
            'plumbing': 0.08,
            'electrical': 0.08,
            'cleaning': 0.06,
            'tutoring': 0.12,
            'general': 0.05
        }
        
        for category, expected_rate in category_rates.items():
            # This would typically come from the service
            actual_rate = self.calculator.category_rates[category]['base_commission']
            
            self.test(
                f"אחוז עמלה נכון עבור {category}",
                float(actual_rate) == expected_rate,
                f"ציפייה: {expected_rate*100}%, בפועל: {float(actual_rate)*100}%"
            )
        
        # Test tier multipliers
        tier_multipliers = {
            'bronze': 1.0,
            'silver': 1.1,
            'gold': 1.2,
            'premium': 1.3
        }
        
        for tier, expected_multiplier in tier_multipliers.items():
            actual_multiplier = float(self.calculator.tier_multipliers[tier])
            
            self.test(
                f"מכפיל עמלה נכון לרמת {tier}",
                actual_multiplier == expected_multiplier,
                f"מכפיל: {actual_multiplier}x"
            )
    
    def validate_data_models(self):
        """אימות מודלי נתונים"""
        print("\n📋 בדיקת מודלי נתונים")
        
        # Test CreateReferralRequest validation
        try:
            valid_request = CreateReferralRequest(
                lead_id="lead-123",
                proposal_id="prop-123",
                commission_rate=Decimal('0.08'),
                context={"description": "הפניה למטבח חדש"}
            )
            
            self.test(
                "יצירת בקשת הפניה תקינה",
                True,
                f"אחוז עמלה: {float(valid_request.commission_rate)*100}%"
            )
            
        except Exception as e:
            self.test(
                "יצירת בקשת הפניה תקינה",
                False,
                f"שגיאה: {str(e)}"
            )
        
        # Test invalid commission rate
        try:
            invalid_request = CreateReferralRequest(
                lead_id="lead-123",
                proposal_id="prop-123",
                commission_rate=Decimal('1.5'),  # Invalid: > 1
                context={}
            )
            
            self.test(
                "זיהוי אחוז עמלה לא תקין",
                False,
                "לא זוהה אחוז עמלה לא חוקי"
            )
            
        except ValueError:
            self.test(
                "זיהוי אחוז עמלה לא תקין",
                True,
                "אחוז עמלה > 100% נדחה כמצופה"
            )
        except Exception as e:
            self.test(
                "זיהוי אחוז עמלה לא תקין",
                False,
                f"שגיאה לא צפויה: {str(e)}"
            )
        
        # Test ReferralStatus enum
        statuses = [status.value for status in ReferralStatus]
        expected_statuses = ['pending', 'active', 'completed', 'cancelled', 'disputed']
        
        self.test(
            "סטטוסי הפניה נכונים",
            all(status in statuses for status in expected_statuses),
            f"סטטוסים זמינים: {', '.join(statuses)}"
        )
    
    async def validate_advanced_features(self):
        """אימות תכונות מתקדמות"""
        print("\n🚀 בדיקת תכונות מתקדמות")
        
        # Test performance bonus calculation
        monthly_volume = Decimal('60000')  # 60k NIS
        bonus = self.calculator.calculate_referrer_bonus(
            total_referrals=25,
            success_rate=0.85,
            monthly_volume=monthly_volume
        )
        
        self.test(
            "חישוב בונוס ביצועים",
            bonus > 0,
            f"בונוס לנפח ₪{monthly_volume}: ₪{bonus}"
        )
        
        # Test penalty calculation
        commission_amount = Decimal('1000')
        penalty = self.calculator.calculate_penalty_reduction(
            commission_amount=commission_amount,
            dispute_count=2,
            late_payment_count=1,
            quality_score=0.75
        )
        
        self.test(
            "חישוב קיצוץ עונשים",
            penalty >= 0,
            f"עונש על עמלה ₪{commission_amount}: ₪{penalty}"
        )
        
        # Test multi-level commission distribution
        multi_level_breakdown = await self.calculator.calculate_commission_breakdown(
            lead_value=Decimal('15000'),
            commission_rate=Decimal('0.12'),
            category='tutoring',
            referrer_level='premium',
            chain_length=4  # 4 levels
        )
        
        referrer_levels = [b.level for b in multi_level_breakdown if b.recipient_type == "referrer"]
        
        self.test(
            "פיזור עמלות רב-רמתי (4 רמות)",
            len(referrer_levels) >= 3,
            f"רמות מפנים: {sorted(referrer_levels)}"
        )
    
    def print_summary(self):
        """הדפסת סיכום"""
        print(f"\n📊 סיכום בדיקות:")
        print(f"✅ הצליחו: {self.passed_tests}")
        print(f"❌ נכשלו: {self.total_tests - self.passed_tests}")
        print(f"📈 אחוז הצלחה: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 כל הבדיקות עברו בהצלחה! השירות מוכן לשימוש.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} בדיקות נכשלו. נדרש תיקון.")
            return False

async def main():
    """הרץ את כל בדיקות האימות"""
    print("🏗️  מאמת שירות הפניות OFAIR")
    print("=" * 50)
    
    validator = ReferralsServiceValidator()
    
    try:
        # Run all validation tests
        await validator.validate_commission_calculator()
        validator.validate_hebrew_utils()
        validator.validate_business_logic()
        validator.validate_data_models()
        await validator.validate_advanced_features()
        
        # Print final summary
        success = validator.print_summary()
        
        if success:
            print("\n✨ שירות ההפניות מוכן לייצור!")
            return 0
        else:
            print("\n🔧 נדרשים תיקונים לפני העלאה לייצור.")
            return 1
            
    except Exception as e:
        print(f"\n💥 שגיאה קריטית במהלך האימות: {str(e)}")
        return 2

if __name__ == "__main__":
    exit_code = asyncio.run(main())