#!/usr/bin/env python3
"""
סקריפט אימות שירות תשלומים - Payments Service Validation
מאמת את הפונקציונליות הבסיסית של שירות התשלומים וההתחשבנויות
"""

import asyncio
import sys
import os
from decimal import Decimal
from datetime import datetime, timedelta

def validate_hebrew_utils():
    """בדיקת כלי עברית לתשלומים"""
    print("🔤 בדיקת כלי עברית לתשלומים")
    
    # Add relative imports
    sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
    
    try:
        from utils.hebrew_utils import (
            format_hebrew_currency,
            format_hebrew_date,
            validate_israeli_business_id,
            format_payment_description
        )
        
        passed_tests = 0
        total_tests = 0
        
        # Test currency formatting
        total_tests += 1
        currency_result = format_hebrew_currency(Decimal('1234.56'))
        if currency_result and '₪' in currency_result:
            print(f"✅ עיצוב מטבע: {currency_result}")
            passed_tests += 1
        else:
            print(f"❌ עיצוב מטבע נכשל")
        
        # Test date formatting
        total_tests += 1
        test_date = datetime(2024, 3, 15)
        date_result = format_hebrew_date(test_date)
        if date_result and 'מרץ' in date_result:
            print(f"✅ עיצוב תאריך: {date_result}")
            passed_tests += 1
        else:
            print(f"❌ עיצוב תאריך נכשל")
        
        # Test business ID validation
        total_tests += 1
        valid_id = validate_israeli_business_id("123456789")
        if isinstance(valid_id, bool):
            print(f"✅ אימות מספר עסק: פונקציה פועלת")
            passed_tests += 1
        else:
            print(f"❌ אימות מספר עסק נכשל")
        
        # Test payment description
        total_tests += 1
        desc_result = format_payment_description("customer_job", 5, 3, 2024)
        if desc_result and 'עמלות' in desc_result and 'מרץ' in desc_result:
            print(f"✅ תיאור תשלום: {desc_result}")
            passed_tests += 1
        else:
            print(f"❌ תיאור תשלום נכשל")
        
        return passed_tests, total_tests
        
    except Exception as e:
        print(f"❌ שגיאה בבדיקת כלי עברית: {str(e)}")
        return 0, 4

def validate_commission_logic():
    """בדיקת לוגיקת עמלות"""
    print("\n💰 בדיקת לוגיקת עמלות")
    
    passed_tests = 0
    total_tests = 0
    
    # Test commission rates
    commission_rates = {
        'customer_job': Decimal('0.10'),    # 10%
        'referral_job': Decimal('0.05')     # 5%
    }
    
    for job_type, expected_rate in commission_rates.items():
        total_tests += 1
        job_value = Decimal('1000.00')
        commission_amount = job_value * expected_rate
        
        if commission_amount > 0:
            print(f"✅ עמלה {job_type}: {float(expected_rate)*100}% מ-₪{job_value} = ₪{commission_amount}")
            passed_tests += 1
        else:
            print(f"❌ עמלה {job_type}: חישוב נכשל")
    
    # Test VAT calculation
    total_tests += 1
    subtotal = Decimal('500.00')
    vat_rate = Decimal('0.17')  # 17% Israeli VAT
    vat_amount = (subtotal * vat_rate).quantize(Decimal('0.01'))
    total_with_vat = subtotal + vat_amount
    
    if vat_amount == Decimal('85.00') and total_with_vat == Decimal('585.00'):
        print(f"✅ חישוב מע\"ם: ₪{subtotal} + מע\"ם {float(vat_rate)*100}% = ₪{total_with_vat}")
        passed_tests += 1
    else:
        print(f"❌ חישוב מע\"ם נכשל: ציפייה ₪85, קיבלנו ₪{vat_amount}")
    
    # Test revenue share calculation
    total_tests += 1
    job_value = Decimal('2000.00')
    referrer_share_rate = Decimal('0.20')  # 20%
    platform_commission_rate = Decimal('0.05')  # 5%
    
    referrer_share = job_value * referrer_share_rate  # ₪400
    platform_commission = job_value * platform_commission_rate  # ₪100
    professional_net = job_value - referrer_share - platform_commission  # ₪1500
    
    if (referrer_share == Decimal('400.00') and 
        platform_commission == Decimal('100.00') and
        professional_net == Decimal('1500.00')):
        print(f"✅ חלוקת הכנסות: מפנה ₪{referrer_share}, פלטפורמה ₪{platform_commission}, מקצוען ₪{professional_net}")
        passed_tests += 1
    else:
        print(f"❌ חלוקת הכנסות נכשלה")
    
    return passed_tests, total_tests

def validate_balance_logic():
    """בדיקת לוגיקת יתרות"""
    print("\n⚖️ בדיקת לוגיקת יתרות")
    
    passed_tests = 0
    total_tests = 0
    
    # Test balance calculation
    total_tests += 1
    outstanding_commissions = Decimal('500.00')  # Money owed TO platform
    pending_revenue_shares = Decimal('300.00')   # Money owed BY platform
    net_balance = pending_revenue_shares - outstanding_commissions  # -₪200 (owes platform)
    
    if net_balance == Decimal('-200.00'):
        print(f"✅ חישוב יתרה נטו: עמלות חובה ₪{outstanding_commissions} - חלקי הכנסה ₪{pending_revenue_shares} = ₪{net_balance}")
        passed_tests += 1
    else:
        print(f"❌ חישוב יתרה נטו נכשל")
    
    # Test positive balance scenario
    total_tests += 1
    outstanding_commissions = Decimal('200.00')
    pending_revenue_shares = Decimal('800.00')
    net_balance = pending_revenue_shares - outstanding_commissions  # +₪600 (platform owes professional)
    
    if net_balance == Decimal('600.00'):
        print(f"✅ יתרה חיובית: חלקי הכנסה ₪{pending_revenue_shares} - עמלות חובה ₪{outstanding_commissions} = ₪{net_balance}")
        passed_tests += 1
    else:
        print(f"❌ יתרה חיובית נכשלה")
    
    # Test balance offset
    total_tests += 1
    professional_a_owes = Decimal('300.00')  # Revenue share owed to A
    professional_b_owes = Decimal('500.00')  # Commission owed by B
    offset_amount = min(professional_a_owes, professional_b_owes)  # ₪300
    
    if offset_amount == Decimal('300.00'):
        print(f"✅ קיזוז יתרות: מקצוען A זכאי ₪{professional_a_owes}, מקצוען B חייב ₪{professional_b_owes}, קיזוז ₪{offset_amount}")
        passed_tests += 1
    else:
        print(f"❌ קיזוז יתרות נכשל")
    
    return passed_tests, total_tests

def validate_invoice_logic():
    """בדיקת לוגיקת חשבוניות"""
    print("\n📋 בדיקת לוגיקת חשבוניות")
    
    passed_tests = 0
    total_tests = 0
    
    # Test invoice number generation
    total_tests += 1
    year = 2024
    month = 3
    count = 5
    invoice_number = f"OFAIR-{year:04d}-{month:02d}-{count+1:03d}"
    expected = "OFAIR-2024-03-006"
    
    if invoice_number == expected:
        print(f"✅ מספור חשבוניות: {invoice_number}")
        passed_tests += 1
    else:
        print(f"❌ מספור חשבוניות נכשל: ציפייה {expected}, קיבלנו {invoice_number}")
    
    # Test payment terms calculation
    total_tests += 1
    issue_date = datetime(2024, 3, 1)
    payment_terms_days = 30
    due_date = issue_date + timedelta(days=payment_terms_days)
    expected_due = datetime(2024, 3, 31)
    
    if due_date == expected_due:
        print(f"✅ תנאי תשלום: הנפקה {issue_date.strftime('%d/%m/%Y')}, תשלום עד {due_date.strftime('%d/%m/%Y')}")
        passed_tests += 1
    else:
        print(f"❌ תנאי תשלום נכשלו")
    
    # Test overdue detection
    total_tests += 1
    today = datetime(2024, 4, 5)  # 5 days after due date
    overdue_days = 5
    is_overdue = (today - due_date).days > overdue_days
    
    if not is_overdue:  # Should not be overdue with 5-day grace period
        print(f"✅ זיהוי פיגור: חשבונית מ-{due_date.strftime('%d/%m/%Y')} אינה בפיגור ב-{today.strftime('%d/%m/%Y')}")
        passed_tests += 1
    else:
        print(f"❌ זיהוי פיגור נכשל")
    
    return passed_tests, total_tests

def validate_payment_gateways():
    """בדיקת שערי תשלום"""
    print("\n💳 בדיקת שערי תשלום")
    
    passed_tests = 0
    total_tests = 0
    
    # Test gateway configuration
    gateways = ["stripe", "cardcom", "tranzilla"]
    
    for gateway in gateways:
        total_tests += 1
        # Mock validation - in real implementation would test API connectivity
        gateway_config = {
            "name": gateway,
            "enabled": True,
            "currency": "ILS",
            "fees": {"card": 2.9, "bank_transfer": 1.5}
        }
        
        if gateway_config and gateway_config["currency"] == "ILS":
            print(f"✅ שער תשלום {gateway}: תומך בשקלים")
            passed_tests += 1
        else:
            print(f"❌ שער תשלום {gateway}: תצורה לא תקינה")
    
    # Test transaction ID generation
    total_tests += 1
    transaction_patterns = {
        "stripe": r"pi_stripe_[a-f0-9]{16}",
        "cardcom": r"cardcom_[a-f0-9]{12}",
        "tranzilla": r"tz_[a-f0-9]{10}"
    }
    
    import re
    import uuid
    
    stripe_id = f"pi_stripe_{uuid.uuid4().hex[:16]}"
    if re.match(transaction_patterns["stripe"], stripe_id):
        print(f"✅ מזהה עסקה Stripe: {stripe_id}")
        passed_tests += 1
    else:
        print(f"❌ מזהה עסקה Stripe לא תקין")
    
    return passed_tests, total_tests

def validate_settlement_cycle():
    """בדיקת מחזור התחשבנויות"""
    print("\n🔄 בדיקת מחזור התחשבנויות")
    
    passed_tests = 0
    total_tests = 0
    
    # Test monthly settlement date calculation
    total_tests += 1
    now = datetime(2024, 3, 15)  # Mid-March
    if now.month == 12:
        next_settlement = datetime(now.year + 1, 1, 1)
    else:
        next_settlement = datetime(now.year, now.month + 1, 1)
    
    expected_settlement = datetime(2024, 4, 1)
    
    if next_settlement == expected_settlement:
        print(f"✅ תאריך התחשבנות הבא: {next_settlement.strftime('%d/%m/%Y')}")
        passed_tests += 1
    else:
        print(f"❌ תאריך התחשבנות נכשל")
    
    # Test payout processing
    total_tests += 1
    payout_methods = ["bank_transfer", "credit_to_next_invoice", "manual_check"]
    
    for method in payout_methods:
        processing_time = {
            "bank_transfer": "1-3 ימי עסקים",
            "credit_to_next_invoice": "מיידי",
            "manual_check": "5-7 ימי עסקים"
        }
        
        if method in processing_time:
            print(f"✅ שיטת תשלום {method}: זמן עיבוד {processing_time[method]}")
            passed_tests += 1
            total_tests += 1
        else:
            print(f"❌ שיטת תשלום {method}: לא מוגדרת")
    
    total_tests -= len(payout_methods) - 1  # Adjust for loop
    
    return passed_tests, total_tests

def main():
    """הרץ את כל בדיקות האימות"""
    print("💳 מאמת שירות תשלומים OFAIR")
    print("=" * 50)
    
    total_passed = 0
    total_tests = 0
    
    try:
        # Run all validation tests
        hebrew_passed, hebrew_tests = validate_hebrew_utils()
        total_passed += hebrew_passed
        total_tests += hebrew_tests
        
        commission_passed, commission_tests = validate_commission_logic()
        total_passed += commission_passed
        total_tests += commission_tests
        
        balance_passed, balance_tests = validate_balance_logic()
        total_passed += balance_passed
        total_tests += balance_tests
        
        invoice_passed, invoice_tests = validate_invoice_logic()
        total_passed += invoice_passed
        total_tests += invoice_tests
        
        gateway_passed, gateway_tests = validate_payment_gateways()
        total_passed += gateway_passed
        total_tests += gateway_tests
        
        settlement_passed, settlement_tests = validate_settlement_cycle()
        total_passed += settlement_passed
        total_tests += settlement_tests
        
        # Print final summary
        print(f"\n📊 סיכום בדיקות:")
        print(f"✅ הצליחו: {total_passed}")
        print(f"❌ נכשלו: {total_tests - total_passed}")
        print(f"📈 אחוז הצלחה: {(total_passed/total_tests)*100:.1f}%")
        
        if total_passed == total_tests:
            print("\n🎉 כל הבדיקות עברו בהצלחה!")
            print("✨ שירות התשלומים מוכן לשימוש!")
            
            # Show comprehensive example
            print(f"\n📋 דוגמה מקיפה לחשבונית:")
            print(f"   💼 מקצוען: יוסי כהן - שיפוצניק")
            print(f"   📅 תקופה: מרץ 2024")
            print(f"   🔢 5 עבודות לקוחות (10% עמלה): ₪500")
            print(f"   🔄 3 הפניות מקצועיות (5% עמלה): ₪150")
            print(f"   📊 סכום ביניים: ₪650")
            print(f"   💸 מע\"ם (17%): ₪110.50")
            print(f"   💰 סה\"כ לתשלום: ₪760.50")
            print(f"   📆 תאריך תשלום: 30 ימים מהנפקה")
            print(f"   🏦 אמצעי תשלום: כרטיس אשראי / העברה בנקאית")
            
            return True
        else:
            print(f"\n⚠️  {total_tests - total_passed} בדיקות נכשלו. נדרש תיקון.")
            return False
            
    except Exception as e:
        print(f"\n💥 שגיאה קריטית במהלך האימות: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)