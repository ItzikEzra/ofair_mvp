import re
from typing import Optional, Dict, Any

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

def extract_hebrew_keywords(text: str) -> list:
    """
    חילוץ מילות מפתח בעברית - Extract Hebrew keywords
    """
    if not text:
        return []
    
    # Common Hebrew words to ignore
    stop_words = {
        'של', 'על', 'את', 'עם', 'אל', 'מן', 'בין', 'לפני', 'אחרי', 'תחת', 'מעל',
        'זה', 'זו', 'אלה', 'אלו', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'את',
        'אנחנו', 'אתם', 'אתן', 'ו', 'ה', 'ל', 'ב', 'כ', 'מ'
    }
    
    # Extract Hebrew words
    hebrew_words = re.findall(r'[\u0590-\u05FF]+', text)
    
    # Filter out stop words and short words
    keywords = [
        word for word in hebrew_words 
        if len(word) >= 2 and word not in stop_words
    ]
    
    return keywords

def normalize_hebrew_text(text: str) -> str:
    """
    נרמול טקסט עברי - Normalize Hebrew text
    """
    if not text:
        return ""
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', text.strip())
    
    # Normalize Hebrew punctuation
    normalized = normalized.replace('״', '"').replace('׳', "'")
    
    # Remove non-Hebrew, non-Latin characters except basic punctuation
    normalized = re.sub(r'[^\u0590-\u05FF\u0020-\u007E\s]', '', normalized)
    
    return normalized.strip()

def validate_referral_description(description: str) -> Dict[str, Any]:
    """
    אימות תיאור הפניה - Validate referral description
    """
    if not description:
        return {
            "valid": False,
            "error": "תיאור ההפניה חובה"
        }
    
    if len(description) < 10:
        return {
            "valid": False,
            "error": "תיאור ההפניה חייב להכיל לפחות 10 תווים"
        }
    
    if len(description) > 500:
        return {
            "valid": False,
            "error": "תיאור ההפניה לא יכול להכיל יותר מ-500 תווים"
        }
    
    if not validate_hebrew_content(description):
        return {
            "valid": False,
            "error": "תיאור ההפניה חייב להכיל תוכן בעברית"
        }
    
    # Check for inappropriate content (basic filtering)
    inappropriate_patterns = [
        r'(טלפון|פלאפון|נייד).*?\d{3}[-\s]?\d{3}[-\s]?\d{4}',  # Phone numbers
        r'email|מייל.*?@',  # Email addresses
        r'(בנק|חשבון|כרטיס אשראי)',  # Financial info
    ]
    
    for pattern in inappropriate_patterns:
        if re.search(pattern, description, re.IGNORECASE):
            return {
                "valid": False,
                "error": "תיאור ההפניה מכיל מידע לא מתאים (טלפון, מייל, פרטים פיננסיים)"
            }
    
    return {
        "valid": True,
        "normalized_text": normalize_hebrew_text(description),
        "keywords": extract_hebrew_keywords(description),
        "hebrew_ratio": _calculate_hebrew_ratio(description)
    }

def _calculate_hebrew_ratio(text: str) -> float:
    """Calculate ratio of Hebrew characters in text"""
    if not text:
        return 0.0
    
    clean_text = re.sub(r'[^\w]', '', text)
    if not clean_text:
        return 0.0
    
    hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', clean_text))
    return hebrew_chars / len(clean_text) if clean_text else 0.0