#!/usr/bin/env python3
"""
אימות פשוט לשירות הפניות - Simple Referrals Service Validation
"""

import re
from decimal import Decimal, ROUND_HALF_UP

def validate_hebrew_content(text: str, min_hebrew_ratio: float = 0.3) -> bool:
    """אימות תוכן עברית"""
    if not text or not text.strip():
        return False
    
    clean_text = re.sub(r'[^\w]', '', text)
    if not clean_text:
        return False
    
    hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', clean_text))
    total_chars = len(clean_text)
    
    if total_chars == 0:
        return False
    
    hebrew_ratio = hebrew_chars / total_chars
    return hebrew_ratio >= min_hebrew_ratio

def calculate_commission_breakdown(lead_value: Decimal, commission_rate: Decimal, category: str = 'general'):
    """חישוב פירוט עמלות פשוט"""
    
    # Category rates
    category_rates = {
        'renovation': {'base_commission': Decimal('0.10'), 'platform_rate': Decimal('0.10')},
        'plumbing': {'base_commission': Decimal('0.08'), 'platform_rate': Decimal('0.08')},
        'electrical': {'base_commission': Decimal('0.08'), 'platform_rate': Decimal('0.08')},
        'cleaning': {'base_commission': Decimal('0.06'), 'platform_rate': Decimal('0.05')},
        'tutoring': {'base_commission': Decimal('0.12'), 'platform_rate': Decimal('0.10')},
        'general': {'base_commission': Decimal('0.05'), 'platform_rate': Decimal('0.05')}
    }
    
    category_config = category_rates.get(category, category_rates['general'])
    
    # Calculate commissions
    referrer_commission = (lead_value * commission_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    platform_commission = (lead_value * category_config['platform_rate']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return {
        'referrer_commission': referrer_commission,
        'platform_commission': platform_commission,
        'total_commission': referrer_commission + platform_commission,
        'referrer_percentage': float(commission_rate * 100),
        'platform_percentage': float(category_config['platform_rate'] * 100)
    }

def calculate_seasonal_adjustments(base_commission: Decimal, category: str, month: int) -> Decimal:
    """התאמות עונתיות"""
    seasonal_multipliers = {
        'renovation': {3: Decimal('1.2'), 4: Decimal('1.3'), 5: Decimal('1.2'), 9: Decimal('1.1'), 10: Decimal('1.1')},
        'cleaning': {3: Decimal('1.4'), 9: Decimal('1.3'), 12: Decimal('1.2')},
        'tutoring': {8: Decimal('1.3'), 9: Decimal('1.2'), 1: Decimal('1.1'), 5: Decimal('1.1')}
    }
    
    category_adjustments = seasonal_multipliers.get(category, {})
    multiplier = category_adjustments.get(month, Decimal('1.0'))
    
    return (base_commission * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def main():
    """הרץ בדיקות אימות"""
    print("🏗️  מאמת שירות הפניות OFAIR")
    print("=" * 50)
    
    passed_tests = 0
    total_tests = 0
    
    # Test Hebrew validation
    print("\n🔤 בדיקת אימות עברית")
    
    total_tests += 1
    hebrew_text = "שיפוץ מטבח מלא עם התקנת ארונות חדשים וחיפוי קרמיקה איכותי"
    if validate_hebrew_content(hebrew_text):
        print(f"✅ אימות תוכן עברי תקין")
        passed_tests += 1
    else:
        print(f"❌ אימות תוכן עברי תקין")
    
    total_tests += 1
    mixed_text = "שיפוץ kitchen renovation מטבח חדש"
    if validate_hebrew_content(mixed_text, min_hebrew_ratio=0.3):
        print(f"✅ אימות תוכן מעורב")
        passed_tests += 1
    else:
        print(f"❌ אימות תוכן מעורב")
    
    total_tests += 1
    english_text = "Kitchen renovation with minimal עברית"
    if not validate_hebrew_content(english_text, min_hebrew_ratio=0.5):
        print(f"✅ זיהוי תוכן לא מספק בעברית")
        passed_tests += 1
    else:
        print(f"❌ זיהוי תוכן לא מספק בעברית")
    
    # Test commission calculations
    print("\n🧮 בדיקת חישוב עמלות")
    
    total_tests += 1
    breakdown = calculate_commission_breakdown(
        lead_value=Decimal('5000'),
        commission_rate=Decimal('0.08'),
        category='renovation'
    )
    
    if breakdown['referrer_commission'] > 0 and breakdown['platform_commission'] > 0:
        print(f"✅ חישוב עמלות בסיסי")
        print(f"   עמלת מפנה: ₪{breakdown['referrer_commission']} ({breakdown['referrer_percentage']}%)")
        print(f"   עמלת פלטפורמה: ₪{breakdown['platform_commission']} ({breakdown['platform_percentage']}%)")
        print(f"   סה\"כ: ₪{breakdown['total_commission']}")
        passed_tests += 1
    else:
        print(f"❌ חישוב עמלות בסיסי")
    
    # Test different categories
    categories_to_test = ['renovation', 'plumbing', 'cleaning', 'tutoring']
    for category in categories_to_test:
        total_tests += 1
        cat_breakdown = calculate_commission_breakdown(
            lead_value=Decimal('3000'),
            commission_rate=Decimal('0.06'),
            category=category
        )
        
        if cat_breakdown['total_commission'] > 0:
            print(f"✅ חישוב עמלות לקטגוריה: {category}")
            passed_tests += 1
        else:
            print(f"❌ חישוב עמלות לקטגוריה: {category}")
    
    # Test seasonal adjustments
    print("\n🌡️ בדיקת התאמות עונתיות")
    
    base_commission = Decimal('1000')
    
    total_tests += 1
    april_renovation = calculate_seasonal_adjustments(base_commission, 'renovation', 4)
    if april_renovation > base_commission:
        print(f"✅ התאמות עונתיות - שיפוצים באפריל")
        print(f"   בסיסי: ₪{base_commission}, מותאם: ₪{april_renovation}")
        passed_tests += 1
    else:
        print(f"❌ התאמות עונתיות - שיפוצים באפריל")
    
    total_tests += 1
    march_cleaning = calculate_seasonal_adjustments(base_commission, 'cleaning', 3)
    if march_cleaning > base_commission:
        print(f"✅ התאמות עונתיות - ניקיון לפני פסח")
        print(f"   בסיסי: ₪{base_commission}, מותאם: ₪{march_cleaning}")
        passed_tests += 1
    else:
        print(f"❌ התאמות עונתיות - ניקיון לפני פסח")
    
    # Advanced commission calculations
    print("\n🚀 בדיקות מתקדמות")
    
    total_tests += 1
    large_renovation = calculate_commission_breakdown(
        lead_value=Decimal('50000'),
        commission_rate=Decimal('0.12'),
        category='renovation'
    )
    
    if large_renovation['total_commission'] > Decimal('5000'):
        print(f"✅ חישוב עמלות לפרויקט גדול")
        print(f"   ערך פרויקט: ₪50,000")
        print(f"   סה\"כ עמלות: ₪{large_renovation['total_commission']}")
        passed_tests += 1
    else:
        print(f"❌ חישוב עמלות לפרויקט גדול")
    
    # Test edge cases
    total_tests += 1
    small_project = calculate_commission_breakdown(
        lead_value=Decimal('500'),
        commission_rate=Decimal('0.05'),
        category='general'
    )
    
    if small_project['total_commission'] > Decimal('0'):
        print(f"✅ חישוב עמלות לפרויקט קטן")
        print(f"   ערך פרויקט: ₪500")
        print(f"   סה\"כ עמלות: ₪{small_project['total_commission']}")
        passed_tests += 1
    else:
        print(f"❌ חישוב עמלות לפרויקט קטן")
    
    # Print summary
    print(f"\n📊 סיכום בדיקות:")
    print(f"✅ הצליחו: {passed_tests}")
    print(f"❌ נכשלו: {total_tests - passed_tests}")
    print(f"📈 אחוז הצלחה: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 כל הבדיקות עברו בהצלחה!")
        print("✨ שירות ההפניות מוכן לשימוש!")
        
        # Show comprehensive commission example
        print(f"\n📋 דוגמה מקיפה:")
        example = calculate_commission_breakdown(
            lead_value=Decimal('8000'),
            commission_rate=Decimal('0.10'),
            category='renovation'
        )
        seasonal_example = calculate_seasonal_adjustments(
            example['referrer_commission'], 'renovation', 4
        )
        
        print(f"   🏠 פרויקט שיפוץ בסך ₪8,000")
        print(f"   👤 עמלת מפנה: ₪{example['referrer_commission']} (10%)")
        print(f"   🏢 עמלת פלטפורמה: ₪{example['platform_commission']} (10%)")
        print(f"   🌸 עמלה מותאמת לאפריל: ₪{seasonal_example}")
        print(f"   💰 סה\"כ הכנסה לפלטפורמה: ₪{example['total_commission']}")
        
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} בדיקות נכשלו. נדרש תיקון.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)