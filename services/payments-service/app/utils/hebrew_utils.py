import re
from typing import Optional
from decimal import Decimal

def validate_hebrew_content(text: str, min_hebrew_ratio: float = 0.3) -> bool:
    """
    אימות תוכן עברית - Validate Hebrew content
    """
    if not text or not text.strip():
        return False
    
    # Remove whitespace and punctuation for analysis
    clean_text = re.sub(r'[^\w]', '', text)
    
    if not clean_text:
        return False
    
    # Count Hebrew characters (Unicode range for Hebrew)
    hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', clean_text))
    total_chars = len(clean_text)
    
    if total_chars == 0:
        return False
    
    hebrew_ratio = hebrew_chars / total_chars
    return hebrew_ratio >= min_hebrew_ratio

def format_hebrew_currency(amount: Decimal, currency: str = "₪") -> str:
    """
    עיצוב מטבע בעברית - Format currency in Hebrew
    """
    # Format with thousands separators
    formatted = f"{amount:,.2f}"
    
    # Replace dots and commas with Hebrew-friendly formatting
    formatted = formatted.replace(",", " ")  # Space for thousands separator
    formatted = formatted.replace(".", ".")   # Keep decimal point
    
    return f"{currency}{formatted}"

def format_hebrew_date(date_obj, format_type: str = "full") -> str:
    """
    עיצוב תאריך בעברית - Format date in Hebrew
    """
    hebrew_months = {
        1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל",
        5: "מאי", 6: "יוני", 7: "יולי", 8: "אוגוסט",
        9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר"
    }
    
    if format_type == "full":
        return f"{date_obj.day} ב{hebrew_months[date_obj.month]} {date_obj.year}"
    elif format_type == "short":
        return f"{date_obj.day:02d}/{date_obj.month:02d}/{date_obj.year}"
    else:
        return date_obj.strftime("%d/%m/%Y")

def format_hebrew_invoice_number(invoice_number: str) -> str:
    """
    עיצוב מספר חשבונית בעברית - Format invoice number in Hebrew
    """
    # Add RTL direction markers if needed
    return f"חשבונית מס' {invoice_number}"

def validate_israeli_business_id(business_id: str) -> bool:
    """
    אימות מספר עסק ישראלי - Validate Israeli business ID
    """
    # Remove any non-digit characters
    clean_id = re.sub(r'\D', '', business_id)
    
    # Must be 9 digits
    if len(clean_id) != 9:
        return False
    
    # Israeli ID/Business number checksum validation
    def calculate_checksum(id_number):
        total = 0
        for i, digit in enumerate(id_number):
            digit = int(digit)
            if i % 2 == 1:  # Odd positions (2nd, 4th, 6th, 8th)
                digit *= 2
                if digit > 9:
                    digit = digit // 10 + digit % 10
            total += digit
        return total % 10 == 0
    
    return calculate_checksum(clean_id)

def format_payment_description(
    commission_type: str,
    job_count: int,
    month: int,
    year: int
) -> str:
    """
    עיצוב תיאור תשלום בעברית - Format payment description in Hebrew
    """
    hebrew_months = {
        1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל",
        5: "מאי", 6: "יוני", 7: "יולי", 8: "אוגוסט",
        9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר"
    }
    
    commission_names = {
        "customer_job": "עמלות פלטפורמה",
        "referral_job": "עמלות הפניות"
    }
    
    commission_name = commission_names.get(commission_type, "עמלות")
    month_name = hebrew_months.get(month, str(month))
    
    return f"{commission_name} - {job_count} עבודות, {month_name} {year}"

def normalize_hebrew_bank_name(bank_name: str) -> str:
    """
    נרמול שם בנק בעברית - Normalize Hebrew bank name
    """
    # Common Hebrew bank name mappings
    bank_mappings = {
        "הבנק הבינלאומי": "הבינלאומי",
        "בנק לאומי": "לאומי",
        "בנק דיסקונט": "דיסקונט",
        "בנק מזרחי טפחות": "מזרחי טפחות",
        "בנק יהב": "יהב",
        "בנק אוצר החייל": "אוצר החייל",
        "בנק מרכנתיל": "מרכנתיל"
    }
    
    normalized = bank_name.strip()
    
    # Check for exact matches first
    if normalized in bank_mappings:
        return bank_mappings[normalized]
    
    # Check for partial matches
    for full_name, short_name in bank_mappings.items():
        if full_name in normalized or short_name in normalized:
            return short_name
    
    return normalized

def format_israeli_account_number(account_number: str) -> str:
    """
    עיצוב מספר חשבון בנק ישראלי - Format Israeli bank account number
    """
    # Remove non-digits
    clean_number = re.sub(r'\D', '', account_number)
    
    # Israeli bank account numbers are typically 6-10 digits
    if len(clean_number) < 6:
        clean_number = clean_number.zfill(6)
    elif len(clean_number) > 10:
        clean_number = clean_number[-10:]  # Take last 10 digits
    
    # Format with dashes for readability (Israeli standard)
    if len(clean_number) <= 6:
        return clean_number
    elif len(clean_number) <= 8:
        return f"{clean_number[:-3]}-{clean_number[-3:]}"
    else:
        return f"{clean_number[:-6]}-{clean_number[-6:-3]}-{clean_number[-3:]}"

def validate_israeli_vat_number(vat_number: str) -> bool:
    """
    אימות מספר עוסק מורשה - Validate Israeli VAT number
    """
    # Remove non-digits
    clean_vat = re.sub(r'\D', '', vat_number)
    
    # Must be 9 digits
    if len(clean_vat) != 9:
        return False
    
    # Use same checksum as business ID
    return validate_israeli_business_id(clean_vat)

def format_commission_summary(
    total_jobs: int,
    total_amount: Decimal,
    commission_type: str
) -> str:
    """
    עיצוב סיכום עמלות - Format commission summary
    """
    type_names = {
        "customer_job": "עבודות לקוחות",
        "referral_job": "הפניות מקצועיות"
    }
    
    type_name = type_names.get(commission_type, "עבודות")
    formatted_amount = format_hebrew_currency(total_amount)
    
    return f"{total_jobs} {type_name} - סה\"כ {formatted_amount}"