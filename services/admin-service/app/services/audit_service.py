from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
from enum import Enum

from ..database import get_database
from ..models.admin import AuditEventType, AuditSeverity

class AuditService:
    def __init__(self):
        self.db = get_database()
    
    async def log_admin_action(
        self,
        admin_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "info",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        רישום פעולת אדמין - Log admin action
        """
        audit_data = {
            "admin_id": admin_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "description": description,
            "metadata": metadata or {},
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "event_type": "admin_action"
        }
        
        await self.db.insert_audit_log(audit_data)
    
    async def log_user_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "info"
    ):
        """
        רישום פעולת משתמש - Log user action
        """
        audit_data = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "description": description,
            "metadata": metadata or {},
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "event_type": "user_action"
        }
        
        await self.db.insert_audit_log(audit_data)
    
    async def log_system_event(
        self,
        event_type: str,
        description: str,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        רישום אירוע מערכת - Log system event
        """
        audit_data = {
            "action": event_type,
            "resource_type": "system",
            "description": description,
            "metadata": metadata or {},
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "event_type": "system_event"
        }
        
        await self.db.insert_audit_log(audit_data)
    
    async def log_security_event(
        self,
        event_type: str,
        description: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        admin_id: Optional[str] = None,
        severity: str = "medium"
    ):
        """
        רישום אירוע אבטחה - Log security event
        """
        # Log to audit logs
        audit_data = {
            "admin_id": admin_id,
            "action": event_type,
            "resource_type": "security",
            "description": description,
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "event_type": "security_event"
        }
        
        await self.db.insert_audit_log(audit_data)
        
        # Also log to security logs
        security_data = {
            "event_type": event_type,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "admin_id": admin_id,
            "timestamp": datetime.utcnow(),
            "details": description,
            "severity": severity
        }
        
        await self.db.insert_security_log(security_data)
    
    async def search_audit_logs(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        חיפוש לוגי ביקורת - Search audit logs
        """
        try:
            results = await self.db.search_audit_logs(search_params)
            
            # Add Hebrew descriptions for better readability
            for result in results["results"]:
                result["action_description"] = self._get_action_description(
                    result["action"], result["resource_type"]
                )
                result["severity_description"] = self._get_severity_description(
                    result["severity"]
                )
            
            return results
            
        except Exception as e:
            await self.log_system_event(
                "audit_search_error",
                f"שגיאה בחיפוש לוגי ביקורת: {str(e)}",
                "error"
            )
            raise
    
    async def get_audit_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        סיכום ביקורת - Get audit summary for dashboard
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        search_params = {
            "start_date": start_date,
            "end_date": end_date,
            "page_size": 10000  # Get all for summary
        }
        
        results = await self.db.search_audit_logs(search_params)
        logs = results["results"]
        
        # Calculate summary statistics
        total_events = len(logs)
        
        # Group by event type
        by_event_type = {}
        by_severity = {}
        by_admin = {}
        by_day = {}
        
        for log in logs:
            # By event type
            event_type = log["event_type"]
            by_event_type[event_type] = by_event_type.get(event_type, 0) + 1
            
            # By severity
            severity = log["severity"]
            by_severity[severity] = by_severity.get(severity, 0) + 1
            
            # By admin
            admin_name = log.get("admin_name", "מערכת")
            by_admin[admin_name] = by_admin.get(admin_name, 0) + 1
            
            # By day
            day = log["timestamp"][:10]  # YYYY-MM-DD
            by_day[day] = by_day.get(day, 0) + 1
        
        # Get critical/high severity events
        critical_events = [log for log in logs if log["severity"] in ["critical", "high"]]
        
        return {
            "period_days": days,
            "total_events": total_events,
            "by_event_type": by_event_type,
            "by_severity": by_severity,
            "by_admin": dict(sorted(by_admin.items(), key=lambda x: x[1], reverse=True)[:10]),
            "by_day": by_day,
            "critical_events": len(critical_events),
            "recent_critical": critical_events[:5],  # Last 5 critical events
            "top_actions": self._get_top_actions(logs)
        }
    
    async def get_user_activity_report(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        דוח פעילות משתמש - Get user activity report
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        search_params = {
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date,
            "page_size": 1000
        }
        
        results = await self.db.search_audit_logs(search_params)
        logs = results["results"]
        
        # Analyze user activity patterns
        activity_by_day = {}
        activity_by_hour = {}
        actions_summary = {}
        
        for log in logs:
            timestamp = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
            
            # By day
            day = timestamp.strftime('%Y-%m-%d')
            activity_by_day[day] = activity_by_day.get(day, 0) + 1
            
            # By hour
            hour = timestamp.hour
            activity_by_hour[hour] = activity_by_hour.get(hour, 0) + 1
            
            # By action
            action = log["action"]
            actions_summary[action] = actions_summary.get(action, 0) + 1
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_actions": len(logs),
            "activity_by_day": activity_by_day,
            "activity_by_hour": activity_by_hour,
            "actions_summary": dict(sorted(actions_summary.items(), key=lambda x: x[1], reverse=True)),
            "most_active_day": max(activity_by_day.items(), key=lambda x: x[1])[0] if activity_by_day else None,
            "most_active_hour": max(activity_by_hour.items(), key=lambda x: x[1])[0] if activity_by_hour else None,
            "recent_activity": logs[:10]  # Last 10 actions
        }
    
    async def detect_suspicious_activity(self, hours: int = 24) -> List[Dict[str, Any]]:
        """
        זיהוי פעילות חשודה - Detect suspicious activity
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=hours)
        
        search_params = {
            "start_date": start_date,
            "end_date": end_date,
            "page_size": 5000
        }
        
        results = await self.db.search_audit_logs(search_params)
        logs = results["results"]
        
        suspicious_patterns = []
        
        # Pattern 1: Too many failed logins from same IP
        failed_logins = [log for log in logs if log["action"] == "login_failed"]
        ip_failures = {}
        
        for log in failed_logins:
            ip = log.get("ip_address", "unknown")
            ip_failures[ip] = ip_failures.get(ip, 0) + 1
        
        for ip, count in ip_failures.items():
            if count >= 10:  # 10+ failed logins from same IP
                suspicious_patterns.append({
                    "type": "multiple_failed_logins",
                    "description": f"10+ נסיונות כניסה כושלים מ-IP {ip}",
                    "severity": "high",
                    "count": count,
                    "ip_address": ip,
                    "detected_at": datetime.utcnow()
                })
        
        # Pattern 2: Unusual admin activity hours
        admin_actions = [log for log in logs if log.get("admin_id")]
        night_actions = []
        
        for log in admin_actions:
            timestamp = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
            hour = timestamp.hour
            
            # Consider 22:00-06:00 as unusual hours
            if hour >= 22 or hour <= 6:
                night_actions.append(log)
        
        if len(night_actions) >= 20:  # 20+ actions during night
            suspicious_patterns.append({
                "type": "unusual_hours_activity",
                "description": f"{len(night_actions)} פעולות אדמין בשעות לא רגילות",
                "severity": "medium",
                "count": len(night_actions),
                "detected_at": datetime.utcnow()
            })
        
        # Pattern 3: Rapid successive actions (potential automation)
        admin_by_time = {}
        for log in admin_actions:
            admin_id = log["admin_id"]
            timestamp = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
            
            if admin_id not in admin_by_time:
                admin_by_time[admin_id] = []
            admin_by_time[admin_id].append(timestamp)
        
        for admin_id, timestamps in admin_by_time.items():
            timestamps.sort()
            rapid_actions = 0
            
            for i in range(1, len(timestamps)):
                time_diff = (timestamps[i] - timestamps[i-1]).total_seconds()
                if time_diff < 2:  # Less than 2 seconds between actions
                    rapid_actions += 1
            
            if rapid_actions >= 10:
                suspicious_patterns.append({
                    "type": "rapid_successive_actions",
                    "description": f"אדמין {admin_id} ביצע פעולות מהירות ברצף",
                    "severity": "medium",
                    "admin_id": admin_id,
                    "count": rapid_actions,
                    "detected_at": datetime.utcnow()
                })
        
        # Pattern 4: Mass data export
        export_actions = [log for log in logs if "export" in log["action"].lower()]
        if len(export_actions) >= 5:  # 5+ exports
            suspicious_patterns.append({
                "type": "mass_data_export",
                "description": f"{len(export_actions)} פעולות יצוא נתונים",
                "severity": "high",
                "count": len(export_actions),
                "detected_at": datetime.utcnow()
            })
        
        # Log the suspicious activity detection
        if suspicious_patterns:
            await self.log_system_event(
                "suspicious_activity_detected",
                f"זוהו {len(suspicious_patterns)} דפוסי פעילות חשודה",
                "high",
                {"patterns": len(suspicious_patterns), "period_hours": hours}
            )
        
        return suspicious_patterns
    
    def _get_action_description(self, action: str, resource_type: str) -> str:
        """תיאור פעולה בעברית - Get Hebrew action description"""
        action_descriptions = {
            "login": "התחברות",
            "logout": "התנתקות",
            "login_failed": "כניסה כושלת",
            "user_create": "יצירת משתמש",
            "user_update": "עדכון משתמש",
            "user_delete": "מחיקת משתמש",
            "user_suspend": "השעיית משתמש",
            "lead_create": "יצירת ליד",
            "lead_update": "עדכון ליד",
            "lead_delete": "מחיקת ליד",
            "proposal_create": "יצירת הצעה",
            "proposal_update": "עדכון הצעה",
            "payment_create": "יצירת תשלום",
            "data_export": "יצוא נתונים",
            "system_config": "הגדרות מערכת",
            "dashboard_access": "גישה לדשבורד",
            "audit_search": "חיפוש בלוגים",
            "session_created": "יצירת סשן",
            "session_terminated": "סיום סשן"
        }
        
        return action_descriptions.get(action, action)
    
    def _get_severity_description(self, severity: str) -> str:
        """תיאור חומרה בעברית - Get Hebrew severity description"""
        severity_descriptions = {
            "low": "נמוכה",
            "info": "מידע",
            "medium": "בינונית", 
            "high": "גבוהה",
            "critical": "קריטית"
        }
        
        return severity_descriptions.get(severity, severity)
    
    def _get_top_actions(self, logs: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
        """קבלת הפעולות הנפוצות - Get top actions"""
        action_counts = {}
        
        for log in logs:
            action = log["action"]
            action_counts[action] = action_counts.get(action, 0) + 1
        
        # Sort by count and return top N
        sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                "action": action,
                "count": count,
                "description": self._get_action_description(action, "")
            }
            for action, count in sorted_actions[:limit]
        ]
    
    async def generate_compliance_report(
        self,
        start_date: datetime,
        end_date: datetime,
        report_type: str = "full"
    ) -> Dict[str, Any]:
        """
        יצירת דוח ציות - Generate compliance report
        """
        search_params = {
            "start_date": start_date,
            "end_date": end_date,
            "page_size": 10000
        }
        
        results = await self.db.search_audit_logs(search_params)
        logs = results["results"]
        
        # Filter by report type
        if report_type == "data_access":
            logs = [log for log in logs if "data" in log["resource_type"] or "export" in log["action"]]
        elif report_type == "user_management":
            logs = [log for log in logs if "user" in log["resource_type"]]
        elif report_type == "security":
            logs = [log for log in logs if log["event_type"] == "security_event"]
        
        # Generate statistics
        total_events = len(logs)
        by_admin = {}
        by_action = {}
        data_access_events = []
        security_events = []
        
        for log in logs:
            admin_name = log.get("admin_name", "מערכת")
            by_admin[admin_name] = by_admin.get(admin_name, 0) + 1
            
            action = log["action"]
            by_action[action] = by_action.get(action, 0) + 1
            
            if "data" in log.get("resource_type", "") or "export" in action:
                data_access_events.append(log)
            
            if log["severity"] in ["high", "critical"]:
                security_events.append(log)
        
        return {
            "report_type": report_type,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "summary": {
                "total_events": total_events,
                "data_access_events": len(data_access_events),
                "security_events": len(security_events),
                "unique_admins": len(by_admin)
            },
            "by_admin": dict(sorted(by_admin.items(), key=lambda x: x[1], reverse=True)),
            "by_action": dict(sorted(by_action.items(), key=lambda x: x[1], reverse=True)),
            "data_access_details": data_access_events,
            "security_events_details": security_events,
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def cleanup_old_logs(self, retention_days: int = None):
        """
        ניקוי לוגים ישנים - Cleanup old audit logs
        """
        if retention_days is None:
            retention_days = settings.AUDIT_LOG_RETENTION_DAYS
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # This would normally archive and then delete old logs
        # For now, just log the cleanup action
        await self.log_system_event(
            "audit_logs_cleanup",
            f"ניקוי לוגי ביקורת ישנים מ-{cutoff_date.strftime('%Y-%m-%d')}",
            "info",
            {"retention_days": retention_days, "cutoff_date": cutoff_date.isoformat()}
        )