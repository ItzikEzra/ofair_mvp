from typing import Dict, Any, List
from datetime import datetime, timedelta
import asyncio

from ..database import get_database
from ..models.admin import DashboardStats, SystemStatus, SystemHealth

class DashboardService:
    def __init__(self):
        self.db = get_database()
    
    async def get_dashboard_overview(self) -> Dict[str, Any]:
        """
        קבלת נתוני דשבורד כוללים - Get comprehensive dashboard data
        """
        try:
            # Run multiple queries in parallel for better performance
            stats_task = self._get_basic_stats()
            health_task = self._get_system_health()
            alerts_task = self._get_active_alerts()
            activity_task = self._get_recent_activity()
            
            basic_stats, system_health, active_alerts, recent_activity = await asyncio.gather(
                stats_task, health_task, alerts_task, activity_task
            )
            
            return {
                "stats": basic_stats,
                "system_health": system_health,
                "active_alerts": active_alerts,
                "recent_activity": recent_activity,
                "generated_at": datetime.utcnow().isoformat(),
                "summary": await self._generate_dashboard_summary(basic_stats, active_alerts)
            }
            
        except Exception as e:
            return {
                "error": f"שגיאה בטעינת נתוני דשבורד: {str(e)}",
                "stats": await self._get_fallback_stats(),
                "generated_at": datetime.utcnow().isoformat()
            }
    
    async def _get_basic_stats(self) -> DashboardStats:
        """קבלת סטטיסטיקות בסיסיות - Get basic statistics"""
        # Get current date range
        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)
        
        # User statistics
        total_users = await self.db.get_total_users()
        active_users = await self.db.get_active_users(days=30)
        
        # Lead statistics
        total_leads = await self.db.get_total_leads()
        open_leads = await self.db.get_open_leads()
        
        # Proposal statistics
        total_proposals = await self.db.get_total_proposals()
        pending_proposals = await self.db.get_pending_proposals()
        
        # Revenue statistics
        total_revenue = await self.db.get_total_revenue()
        monthly_revenue = await self.db.get_monthly_revenue(start_of_month)
        
        # Performance metrics
        conversion_rate = await self.db.get_conversion_rate(thirty_days_ago)
        avg_response_time = await self.db.get_avg_response_time(thirty_days_ago)
        
        # System status
        system_status = await self._determine_system_status()
        
        return DashboardStats(
            total_users=total_users,
            active_users=active_users,
            total_leads=total_leads,
            open_leads=open_leads,
            total_proposals=total_proposals,
            pending_proposals=pending_proposals,
            total_revenue=total_revenue,
            monthly_revenue=monthly_revenue,
            conversion_rate=conversion_rate,
            avg_response_time=avg_response_time,
            system_status=system_status,
            last_updated=now
        )
    
    async def _get_system_health(self) -> SystemHealth:
        """קבלת נתוני בריאות מערכת - Get system health data"""
        try:
            # Check all microservices
            services_health = {}
            services = [
                ("auth-service", "http://auth-service:8001/health"),
                ("users-service", "http://users-service:8002/health"), 
                ("leads-service", "http://leads-service:8003/health"),
                ("proposals-service", "http://proposals-service:8004/health"),
                ("referrals-service", "http://referrals-service:8005/health"),
                ("payments-service", "http://payments-service:8006/health"),
                ("notifications-service", "http://notifications-service:8007/health")
            ]
            
            # Check each service (with timeout)
            for service_name, health_url in services:
                try:
                    health_data = await self._check_service_health(service_name, health_url)
                    services_health[service_name] = health_data
                except Exception as e:
                    services_health[service_name] = {
                        "status": "unhealthy",
                        "response_time": None,
                        "error": str(e),
                        "last_check": datetime.utcnow().isoformat()
                    }
            
            # Get database health
            db_health = await self._get_database_health()
            
            # Get system resources (mock data for now)
            system_resources = await self._get_system_resources()
            
            # Calculate overall status
            all_services_healthy = all(
                service["status"] == "healthy" 
                for service in services_health.values()
            )
            
            overall_status = SystemStatus.ACTIVE if (
                all_services_healthy and db_health["status"] == "healthy"
            ) else SystemStatus.WARNING
            
            return SystemHealth(
                status=overall_status,
                services=services_health,
                database=db_health,
                memory_usage=system_resources["memory_usage"],
                cpu_usage=system_resources["cpu_usage"],
                disk_usage=system_resources["disk_usage"],
                active_connections=system_resources["active_connections"],
                error_rate=system_resources["error_rate"],
                uptime=system_resources["uptime"]
            )
            
        except Exception as e:
            return SystemHealth(
                status=SystemStatus.DOWN,
                services={},
                database={"status": "unknown", "error": str(e)},
                memory_usage=0,
                cpu_usage=0,
                disk_usage=0,
                active_connections=0,
                error_rate=100,
                uptime=0
            )
    
    async def _check_service_health(self, service_name: str, health_url: str) -> Dict[str, Any]:
        """בדיקת בריאות שירות יחיד - Check individual service health"""
        import aiohttp
        import time
        
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(health_url) as response:
                    response_time = int((time.time() - start_time) * 1000)  # ms
                    
                    if response.status == 200:
                        return {
                            "status": "healthy",
                            "response_time": response_time,
                            "last_check": datetime.utcnow().isoformat()
                        }
                    else:
                        return {
                            "status": "unhealthy",
                            "response_time": response_time,
                            "http_status": response.status,
                            "last_check": datetime.utcnow().isoformat()
                        }
                        
        except asyncio.TimeoutError:
            return {
                "status": "timeout",
                "response_time": 5000,  # timeout threshold
                "error": "Service timeout",
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "response_time": None,
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    async def _get_database_health(self) -> Dict[str, Any]:
        """בדיקת בריאות בסיס נתונים - Check database health"""
        try:
            # Simple connectivity test
            await self.db.health_check()
            
            # Get database stats
            db_stats = await self.db.get_database_stats()
            
            return {
                "status": "healthy",
                "connections": db_stats.get("active_connections", 0),
                "query_time": db_stats.get("avg_query_time", 0),
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    async def _get_system_resources(self) -> Dict[str, Any]:
        """קבלת נתוני משאבי מערכת - Get system resource data"""
        # This would normally integrate with system monitoring tools
        # For now, return mock data
        return {
            "memory_usage": 65.2,  # percentage
            "cpu_usage": 23.1,     # percentage
            "disk_usage": 78.4,    # percentage
            "active_connections": 145,
            "error_rate": 0.02,    # percentage
            "uptime": 3600 * 24 * 7  # 7 days in seconds
        }
    
    async def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """קבלת התראות פעילות - Get active system alerts"""
        try:
            alerts = await self.db.get_active_alerts()
            
            # Format alerts for dashboard
            formatted_alerts = []
            for alert in alerts:
                formatted_alerts.append({
                    "id": alert["id"],
                    "type": alert["type"],
                    "title": alert["title"],
                    "description": alert["description"],
                    "severity": alert["severity"],
                    "component": alert["component"],
                    "created_at": alert["created_at"].isoformat(),
                    "age_minutes": int((datetime.utcnow() - alert["created_at"]).total_seconds() / 60)
                })
            
            return formatted_alerts
            
        except Exception as e:
            return [{
                "id": "error_alert",
                "type": "error", 
                "title": "שגיאה בטעינת התראות",
                "description": f"לא ניתן לטעון התראות מערכת: {str(e)}",
                "severity": "medium",
                "component": "dashboard",
                "created_at": datetime.utcnow().isoformat(),
                "age_minutes": 0
            }]
    
    async def _get_recent_activity(self) -> List[Dict[str, Any]]:
        """קבלת פעילות אחרונה - Get recent system activity"""
        try:
            # Get recent audit logs
            recent_logs = await self.db.get_recent_audit_logs(limit=20)
            
            formatted_activity = []
            for log in recent_logs:
                formatted_activity.append({
                    "id": log["id"],
                    "event_type": log["event_type"],
                    "description": log["description"],
                    "user_name": log.get("user_name", "מערכת"),
                    "timestamp": log["timestamp"].isoformat(),
                    "severity": log["severity"],
                    "resource_type": log["resource_type"]
                })
            
            return formatted_activity
            
        except Exception as e:
            return [{
                "id": "error_activity",
                "event_type": "error",
                "description": f"שגיאה בטעינת פעילות אחרונה: {str(e)}",
                "user_name": "מערכת",
                "timestamp": datetime.utcnow().isoformat(),
                "severity": "medium",
                "resource_type": "dashboard"
            }]
    
    async def _determine_system_status(self) -> SystemStatus:
        """קביעת סטטוס מערכת כללי - Determine overall system status"""
        try:
            # Check for critical alerts
            critical_alerts = await self.db.get_alerts_by_severity("critical")
            if critical_alerts:
                return SystemStatus.DOWN
            
            # Check for high severity alerts
            high_alerts = await self.db.get_alerts_by_severity("high")
            if high_alerts:
                return SystemStatus.WARNING
            
            # Check system health indicators
            error_rate = await self.db.get_system_error_rate(minutes=60)
            if error_rate > 5.0:  # More than 5% error rate
                return SystemStatus.WARNING
            
            # Check for maintenance mode
            maintenance_mode = await self.db.get_system_config("maintenance_mode")
            if maintenance_mode and maintenance_mode.get("value") is True:
                return SystemStatus.MAINTENANCE
            
            return SystemStatus.ACTIVE
            
        except Exception:
            return SystemStatus.WARNING
    
    async def _generate_dashboard_summary(
        self, 
        stats: DashboardStats, 
        alerts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """יצירת סיכום דשבורד - Generate dashboard summary"""
        
        critical_alerts = len([a for a in alerts if a["severity"] == "critical"])
        high_alerts = len([a for a in alerts if a["severity"] == "high"])
        
        # Calculate health score (0-100)
        health_score = 100
        
        if critical_alerts > 0:
            health_score -= critical_alerts * 20
        if high_alerts > 0:
            health_score -= high_alerts * 10
        if stats.system_status != SystemStatus.ACTIVE:
            health_score -= 15
        
        health_score = max(0, health_score)
        
        # Growth indicators
        user_growth = "positive" if stats.active_users > stats.total_users * 0.3 else "negative"
        revenue_trend = "positive" if stats.monthly_revenue > stats.total_revenue * 0.1 else "stable"
        
        return {
            "health_score": health_score,
            "status_summary": self._get_status_message(stats.system_status, critical_alerts, high_alerts),
            "key_metrics": {
                "user_growth": user_growth,
                "revenue_trend": revenue_trend,
                "conversion_rate": f"{stats.conversion_rate:.1f}%",
                "response_time": f"{stats.avg_response_time:.1f}s"
            },
            "recommendations": await self._get_recommendations(stats, alerts)
        }
    
    def _get_status_message(
        self, 
        status: SystemStatus, 
        critical_alerts: int, 
        high_alerts: int
    ) -> str:
        """הודעת סטטוס - Status message"""
        if status == SystemStatus.DOWN:
            return "המערכת אינה פעילה - נדרש טיפול מיידי"
        elif status == SystemStatus.MAINTENANCE:
            return "המערכת במצב תחזוקה"
        elif critical_alerts > 0:
            return f"נמצאו {critical_alerts} התראות קריטיות"
        elif high_alerts > 0:
            return f"נמצאו {high_alerts} התראות בעדיפות גבוהה"
        elif status == SystemStatus.WARNING:
            return "המערכת פועלת עם אזהרות"
        else:
            return "המערכת פועלת תקין"
    
    async def _get_recommendations(
        self, 
        stats: DashboardStats, 
        alerts: List[Dict[str, Any]]
    ) -> List[str]:
        """קבלת המלצות - Get recommendations"""
        recommendations = []
        
        # Performance recommendations
        if stats.avg_response_time > 2.0:
            recommendations.append("זמן תגובה גבוה - כדאי לבדוק ביצועי מערכת")
        
        if stats.conversion_rate < 10.0:
            recommendations.append("שיעור המרה נמוך - כדאי לשפר תהליך ההצעות")
        
        # Alert-based recommendations
        critical_alerts = [a for a in alerts if a["severity"] == "critical"]
        if critical_alerts:
            recommendations.append("יש התראות קריטיות הדורשות טיפול מיידי")
        
        # User activity recommendations
        if stats.active_users < stats.total_users * 0.2:
            recommendations.append("פעילות משתמשים נמוכה - כדאי לשפר מעורבות")
        
        # Lead recommendations
        if stats.open_leads > stats.total_leads * 0.5:
            recommendations.append("ליידים פתוחים רבים - כדאי לעודד יותר הצעות")
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    async def _get_fallback_stats(self) -> DashboardStats:
        """נתוני חירום במקרה של שגיאה - Fallback stats in case of error"""
        return DashboardStats(
            total_users=0,
            active_users=0,
            total_leads=0,
            open_leads=0,
            total_proposals=0,
            pending_proposals=0,
            total_revenue=0.0,
            monthly_revenue=0.0,
            conversion_rate=0.0,
            avg_response_time=0.0,
            system_status=SystemStatus.WARNING,
            last_updated=datetime.utcnow()
        )
    
    async def get_detailed_analytics(self, period: str = "30d") -> Dict[str, Any]:
        """
        קבלת אנליטיקה מפורטת - Get detailed analytics
        """
        try:
            end_date = datetime.utcnow()
            
            if period == "7d":
                start_date = end_date - timedelta(days=7)
            elif period == "30d":
                start_date = end_date - timedelta(days=30)
            elif period == "90d":
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Get detailed analytics
            user_analytics = await self.db.get_user_analytics(start_date, end_date)
            lead_analytics = await self.db.get_lead_analytics(start_date, end_date)
            revenue_analytics = await self.db.get_revenue_analytics(start_date, end_date)
            
            return {
                "period": period,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "user_analytics": user_analytics,
                "lead_analytics": lead_analytics,
                "revenue_analytics": revenue_analytics,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "error": f"שגיאה בקבלת אנליטיקה: {str(e)}",
                "period": period,
                "generated_at": datetime.utcnow().isoformat()
            }