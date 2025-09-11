import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.notifications import (
    NotificationTemplate, NotificationChannel, NotificationCategory
)
from database import get_database

class TemplateService:
    def __init__(self):
        self.db = get_database()
    
    async def create_template(
        self,
        template: NotificationTemplate,
        created_by: str
    ) -> NotificationTemplate:
        """
        יצירת תבנית התראה - Create notification template
        """
        # Validate template variables exist in content
        content_vars = self._extract_variables_from_content(
            template.content_template
        )
        
        if template.subject_template:
            subject_vars = self._extract_variables_from_content(
                template.subject_template
            )
            content_vars.extend(subject_vars)
        
        # Merge with provided variables
        all_vars = list(set(template.variables + content_vars))
        
        template_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        template_data = {
            "id": template_id,
            "name": template.name,
            "category": template.category.value,
            "description": template.description,
            "subject_template": template.subject_template,
            "content_template": template.content_template,
            "html_template": template.html_template,
            "variables": all_vars,
            "supported_channels": [ch.value for ch in template.supported_channels],
            "is_active": template.is_active,
            "created_at": now,
            "created_by": created_by
        }
        
        await self.db.insert_template(template_data)
        
        return NotificationTemplate(**{
            **template_data,
            "category": NotificationCategory(template_data["category"]),
            "supported_channels": [
                NotificationChannel(ch) for ch in template_data["supported_channels"]
            ]
        })
    
    async def get_template(self, template_id: str) -> Optional[NotificationTemplate]:
        """
        קבלת תבנית התראה - Get notification template
        """
        template_data = await self.db.get_template(template_id)
        
        if not template_data:
            return None
        
        return NotificationTemplate(**{
            **template_data,
            "category": NotificationCategory(template_data["category"]),
            "supported_channels": [
                NotificationChannel(ch) for ch in template_data["supported_channels"]
            ]
        })
    
    async def get_templates(
        self,
        category: Optional[str] = None,
        active_only: bool = True
    ) -> List[NotificationTemplate]:
        """
        קבלת תבניות התראות - Get notification templates
        """
        templates_data = await self.db.get_templates(category, active_only)
        
        templates = []
        for template_data in templates_data:
            templates.append(NotificationTemplate(**{
                **template_data,
                "category": NotificationCategory(template_data["category"]),
                "supported_channels": [
                    NotificationChannel(ch) for ch in template_data["supported_channels"]
                ]
            }))
        
        return templates
    
    async def update_template(
        self,
        template_id: str,
        template: NotificationTemplate,
        updated_by: str
    ):
        """
        עדכון תבנית התראה - Update notification template
        """
        existing_template = await self.get_template(template_id)
        if not existing_template:
            raise ValueError("תבנית לא נמצאה")
        
        # Validate template variables
        content_vars = self._extract_variables_from_content(
            template.content_template
        )
        
        if template.subject_template:
            subject_vars = self._extract_variables_from_content(
                template.subject_template
            )
            content_vars.extend(subject_vars)
        
        all_vars = list(set(template.variables + content_vars))
        
        update_data = {
            "name": template.name,
            "category": template.category.value,
            "description": template.description,
            "subject_template": template.subject_template,
            "content_template": template.content_template,
            "html_template": template.html_template,
            "variables": all_vars,
            "supported_channels": [ch.value for ch in template.supported_channels],
            "is_active": template.is_active,
            "updated_at": datetime.utcnow(),
            "updated_by": updated_by
        }
        
        await self.db.update_template(template_id, update_data)
    
    async def delete_template(self, template_id: str):
        """
        מחיקת תבנית התראה (סימון כלא פעילה) - Delete template (mark as inactive)
        """
        await self.db.update_template(template_id, {
            "is_active": False,
            "updated_at": datetime.utcnow()
        })
    
    async def preview_template(
        self,
        template_id: str,
        variables: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        תצוגה מקדימה של תבנית - Preview template with variables
        """
        template = await self.get_template(template_id)
        if not template:
            raise ValueError("תבנית לא נמצאה")
        
        # Process content template
        content = template.content_template
        for var_name, var_value in variables.items():
            placeholder = f"{{{var_name}}}"
            content = content.replace(placeholder, str(var_value))
        
        result = {"content": content}
        
        # Process subject template if exists
        if template.subject_template:
            subject = template.subject_template
            for var_name, var_value in variables.items():
                placeholder = f"{{{var_name}}}"
                subject = subject.replace(placeholder, str(var_value))
            result["subject"] = subject
        
        # Process HTML template if exists
        if template.html_template:
            html = template.html_template
            for var_name, var_value in variables.items():
                placeholder = f"{{{var_name}}}"
                html = html.replace(placeholder, str(var_value))
            result["html"] = html
        
        return result
    
    async def get_template_usage_stats(
        self,
        template_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        סטטיסטיקות שימוש בתבנית - Get template usage statistics
        """
        stats = await self.db.get_template_usage_stats(template_id, days)
        
        return {
            "template_id": template_id,
            "period_days": days,
            "total_notifications": stats.get("total_notifications", 0),
            "successful_deliveries": stats.get("successful_deliveries", 0),
            "failed_deliveries": stats.get("failed_deliveries", 0),
            "delivery_rate": stats.get("delivery_rate", 0),
            "by_channel": stats.get("by_channel", {}),
            "by_status": stats.get("by_status", {}),
            "average_processing_time": stats.get("average_processing_time", 0)
        }
    
    async def validate_template_variables(
        self,
        template_id: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        אימות משתני תבנית - Validate template variables
        """
        template = await self.get_template(template_id)
        if not template:
            raise ValueError("תבנית לא נמצאה")
        
        # Check for missing variables
        missing_vars = []
        extra_vars = []
        
        for required_var in template.variables:
            if required_var not in variables:
                missing_vars.append(required_var)
        
        for provided_var in variables.keys():
            if provided_var not in template.variables:
                extra_vars.append(provided_var)
        
        # Validate Hebrew text in variables
        hebrew_issues = []
        for var_name, var_value in variables.items():
            if isinstance(var_value, str) and self._contains_hebrew(var_value):
                if not self._is_valid_hebrew_text(var_value):
                    hebrew_issues.append(f"משתנה {var_name} מכיל טקסט עברי לא תקין")
        
        return {
            "is_valid": len(missing_vars) == 0 and len(hebrew_issues) == 0,
            "missing_variables": missing_vars,
            "extra_variables": extra_vars,
            "hebrew_issues": hebrew_issues,
            "warnings": extra_vars if extra_vars else None
        }
    
    def _extract_variables_from_content(self, content: str) -> List[str]:
        """Extract variable names from template content"""
        import re
        
        # Find all {variable} patterns
        pattern = r'\{([^}]+)\}'
        variables = re.findall(pattern, content)
        
        # Filter out common formatting variables that aren't user data
        filtered_vars = []
        for var in variables:
            if not var.startswith('_') and var.isalnum():
                filtered_vars.append(var)
        
        return list(set(filtered_vars))
    
    def _contains_hebrew(self, text: str) -> bool:
        """Check if text contains Hebrew characters"""
        hebrew_range = range(0x0590, 0x05FF + 1)
        return any(ord(char) in hebrew_range for char in text)
    
    def _is_valid_hebrew_text(self, text: str) -> bool:
        """Validate Hebrew text formatting"""
        # Basic validation - can be extended
        if not text or not text.strip():
            return False
        
        # Check for mixed RTL/LTR issues (simplified)
        hebrew_chars = sum(1 for char in text if ord(char) in range(0x0590, 0x05FF + 1))
        total_chars = len([c for c in text if c.isalpha()])
        
        if total_chars == 0:
            return True
        
        # If more than 70% Hebrew, should be primarily RTL
        hebrew_ratio = hebrew_chars / total_chars if total_chars > 0 else 0
        
        return hebrew_ratio == 0 or hebrew_ratio > 0.3  # Allow mixed content
    
    async def get_template_categories_with_counts(self) -> Dict[str, int]:
        """
        קבלת קטגוריות תבניות עם מספר תבניות - Get template categories with counts
        """
        category_counts = await self.db.get_template_categories_with_counts()
        
        # Convert to enum names with Hebrew labels
        category_labels = {
            NotificationCategory.LEAD.value: "ליידים",
            NotificationCategory.PROPOSAL.value: "הצעות",
            NotificationCategory.REFERRAL.value: "הפניות",
            NotificationCategory.PAYMENT.value: "תשלומים",
            NotificationCategory.SYSTEM.value: "מערכת",
            NotificationCategory.MARKETING.value: "שיווק"
        }
        
        result = {}
        for category, count in category_counts.items():
            label = category_labels.get(category, category)
            result[f"{category} ({label})"] = count
        
        return result