from typing import Dict, Any, List
from datetime import datetime, timedelta
import asyncio
import aiohttp
import logging

from database import get_database
from config import settings

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self):
        self.db = get_database()
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """
        קבלת מטריקות מערכת - Get system performance metrics
        """
        try:
            # Run multiple metric collection tasks in parallel
            tasks = [
                self._get_service_metrics(),
                self._get_database_metrics(),
                self._get_application_metrics(),
                self._get_business_metrics()
            ]
            
            service_metrics, db_metrics, app_metrics, business_metrics = await asyncio.gather(
                *tasks, return_exceptions=True
            )
            
            # Handle exceptions from individual metric collections
            if isinstance(service_metrics, Exception):
                service_metrics = {"error": str(service_metrics)}
            if isinstance(db_metrics, Exception):
                db_metrics = {"error": str(db_metrics)}
            if isinstance(app_metrics, Exception):
                app_metrics = {"error": str(app_metrics)}
            if isinstance(business_metrics, Exception):
                business_metrics = {"error": str(business_metrics)}
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "services": service_metrics,
                "database": db_metrics,
                "application": app_metrics,
                "business": business_metrics,
                "system_health": await self._calculate_system_health()
            }
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": f"שגיאה בקבלת מטריקות: {str(e)}",
                "system_health": "unknown"
            }
    
    async def _get_service_metrics(self) -> Dict[str, Any]:
        """קבלת מטריקות שירותים - Get service metrics"""
        services = [
            ("auth-service", f"{settings.AUTH_SERVICE_URL}/health"),
            ("users-service", f"{settings.USERS_SERVICE_URL}/health"),
            ("leads-service", f"{settings.LEADS_SERVICE_URL}/health"),
            ("proposals-service", f"{settings.PROPOSALS_SERVICE_URL}/health"),
            ("referrals-service", f"{settings.REFERRALS_SERVICE_URL}/health"),
            ("payments-service", f"{settings.PAYMENTS_SERVICE_URL}/health"),
            ("notifications-service", f"{settings.NOTIFICATIONS_SERVICE_URL}/health")
        ]
        
        service_metrics = {}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            for service_name, health_url in services:
                try:
                    start_time = datetime.utcnow()
                    
                    async with session.get(health_url) as response:
                        end_time = datetime.utcnow()
                        response_time = (end_time - start_time).total_seconds() * 1000
                        
                        if response.status == 200:
                            health_data = await response.json()
                            service_metrics[service_name] = {
                                "status": "healthy",
                                "response_time_ms": response_time,
                                "last_check": end_time.isoformat(),
                                "details": health_data
                            }
                        else:
                            service_metrics[service_name] = {
                                "status": "unhealthy",
                                "response_time_ms": response_time,
                                "last_check": end_time.isoformat(),
                                "http_status": response.status
                            }
                            
                except asyncio.TimeoutError:
                    service_metrics[service_name] = {
                        "status": "timeout",
                        "response_time_ms": 5000,
                        "last_check": datetime.utcnow().isoformat(),
                        "error": "Service timeout"
                    }
                except Exception as e:
                    service_metrics[service_name] = {
                        "status": "error",
                        "last_check": datetime.utcnow().isoformat(),
                        "error": str(e)
                    }
        
        # Calculate overall service health
        healthy_services = len([s for s in service_metrics.values() if s["status"] == "healthy"])
        total_services = len(service_metrics)
        
        service_metrics["summary"] = {
            "total_services": total_services,
            "healthy_services": healthy_services,
            "health_percentage": (healthy_services / total_services * 100) if total_services > 0 else 0,
            "avg_response_time": sum(
                s.get("response_time_ms", 0) for s in service_metrics.values() 
                if isinstance(s, dict) and "response_time_ms" in s
            ) / max(1, len([s for s in service_metrics.values() if isinstance(s, dict) and "response_time_ms" in s]))
        }
        
        return service_metrics
    
    async def _get_database_metrics(self) -> Dict[str, Any]:
        """קבלת מטריקות מסד נתונים - Get database metrics"""
        try:
            # Basic database health
            await self.db.health_check()
            
            # Get database statistics
            db_stats = await self.db.get_database_stats()
            
            # Query performance metrics (mock data)
            return {
                "status": "healthy",
                "active_connections": db_stats.get("active_connections", 0),
                "avg_query_time_ms": db_stats.get("avg_query_time", 0),
                "connection_pool": {
                    "min_size": settings.DB_POOL_MIN_SIZE,
                    "max_size": settings.DB_POOL_MAX_SIZE,
                    "current_size": db_stats.get("active_connections", 0)
                },
                "performance": {
                    "slow_queries_count": 0,  # Would get from monitoring
                    "deadlocks_count": 0,
                    "cache_hit_ratio": 95.8,
                    "disk_usage_gb": 12.4
                },
                "last_backup": "2025-01-15T02:00:00Z",  # Would get from backup system
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    async def _get_application_metrics(self) -> Dict[str, Any]:
        """קבלת מטריקות אפליקציה - Get application metrics"""
        # These would normally come from monitoring tools like Prometheus
        # For now, return representative metrics
        
        return {
            "memory": {
                "usage_mb": 512,
                "limit_mb": 1024,
                "usage_percentage": 50.0
            },
            "cpu": {
                "usage_percentage": 15.2,
                "load_average": [0.8, 0.9, 0.7]
            },
            "requests": {
                "total_requests_24h": 45672,
                "avg_response_time_ms": 145,
                "error_rate_percentage": 0.8,
                "requests_per_minute": 31.7
            },
            "errors": {
                "total_errors_24h": 23,
                "error_rate_percentage": 0.05,
                "top_errors": [
                    {"message": "Connection timeout", "count": 8},
                    {"message": "Validation error", "count": 7},
                    {"message": "Rate limit exceeded", "count": 5}
                ]
            },
            "cache": {
                "hit_rate_percentage": 87.3,
                "memory_usage_mb": 256,
                "keys_count": 15420
            },
            "uptime_hours": 168.5,  # 7 days
            "last_check": datetime.utcnow().isoformat()
        }
    
    async def _get_business_metrics(self) -> Dict[str, Any]:
        """קבלת מטריקות עסקיות - Get business metrics"""
        try:
            # Get business KPIs from database
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=7)
            month_start = today_start.replace(day=1)
            
            # These would normally query the actual business data
            return {
                "users": {
                    "total_users": await self.db.get_total_users(),
                    "active_users_24h": 2450,
                    "new_registrations_24h": 45,
                    "churn_rate_percentage": 2.1
                },
                "leads": {
                    "total_leads": await self.db.get_total_leads(),
                    "new_leads_24h": 89,
                    "open_leads": await self.db.get_open_leads(),
                    "conversion_rate_percentage": await self.db.get_conversion_rate(week_start)
                },
                "proposals": {
                    "total_proposals": await self.db.get_total_proposals(),
                    "new_proposals_24h": 156,
                    "pending_proposals": await self.db.get_pending_proposals(),
                    "acceptance_rate_percentage": 34.2
                },
                "revenue": {
                    "total_revenue_ils": await self.db.get_total_revenue(),
                    "monthly_revenue_ils": await self.db.get_monthly_revenue(month_start),
                    "daily_revenue_ils": 1250.80,
                    "commission_revenue_ils": 890.60
                },
                "performance": {
                    "avg_response_time_hours": await self.db.get_avg_response_time(week_start),
                    "customer_satisfaction": 4.6,  # Out of 5
                    "platform_utilization_percentage": 78.9
                },
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get business metrics: {e}")
            return {
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat()
            }
    
    async def _calculate_system_health(self) -> str:
        """חישוב בריאות מערכת כללית - Calculate overall system health"""
        try:
            # Check critical indicators
            issues = []
            
            # Check database
            try:
                await self.db.health_check()
            except Exception:
                issues.append("database_unhealthy")
            
            # Check for critical alerts
            critical_alerts = await self.db.get_alerts_by_severity("critical")
            if critical_alerts:
                issues.append("critical_alerts")
            
            # Check error rate
            error_rate = await self.db.get_system_error_rate(60)
            if error_rate > 5.0:
                issues.append("high_error_rate")
            
            # Determine health status
            if not issues:
                return "healthy"
            elif len(issues) == 1:
                return "degraded"
            else:
                return "unhealthy"
                
        except Exception as e:
            logger.error(f"Failed to calculate system health: {e}")
            return "unknown"
    
    async def get_performance_trends(self, days: int = 7) -> Dict[str, Any]:
        """
        קבלת מגמות ביצועים - Get performance trends
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Generate daily performance data points
        daily_metrics = []
        current_date = start_date
        
        while current_date <= end_date:
            # Mock data - would normally query monitoring database
            daily_metrics.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "avg_response_time_ms": 120 + (hash(current_date.strftime("%Y-%m-%d")) % 50),
                "error_rate_percentage": 0.5 + (hash(current_date.strftime("%Y-%m-%d")) % 100) / 200,
                "requests_count": 40000 + (hash(current_date.strftime("%Y-%m-%d")) % 20000),
                "active_users": 8000 + (hash(current_date.strftime("%Y-%m-%d")) % 2000),
                "cpu_usage_percentage": 20 + (hash(current_date.strftime("%Y-%m-%d")) % 40),
                "memory_usage_percentage": 45 + (hash(current_date.strftime("%Y-%m-%d")) % 30)
            })
            current_date += timedelta(days=1)
        
        # Calculate trends
        if len(daily_metrics) >= 2:
            first_day = daily_metrics[0]
            last_day = daily_metrics[-1]
            
            response_time_trend = ((last_day["avg_response_time_ms"] - first_day["avg_response_time_ms"]) 
                                 / first_day["avg_response_time_ms"]) * 100
            error_rate_trend = ((last_day["error_rate_percentage"] - first_day["error_rate_percentage"]) 
                               / max(first_day["error_rate_percentage"], 0.01)) * 100
            traffic_trend = ((last_day["requests_count"] - first_day["requests_count"]) 
                            / first_day["requests_count"]) * 100
        else:
            response_time_trend = error_rate_trend = traffic_trend = 0
        
        return {
            "period_days": days,
            "daily_metrics": daily_metrics,
            "trends": {
                "response_time_change_percentage": round(response_time_trend, 2),
                "error_rate_change_percentage": round(error_rate_trend, 2),
                "traffic_change_percentage": round(traffic_trend, 2)
            },
            "averages": {
                "avg_response_time_ms": sum(d["avg_response_time_ms"] for d in daily_metrics) / len(daily_metrics),
                "avg_error_rate_percentage": sum(d["error_rate_percentage"] for d in daily_metrics) / len(daily_metrics),
                "avg_daily_requests": sum(d["requests_count"] for d in daily_metrics) / len(daily_metrics)
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """
        קבלת מטריקות זמן אמת - Get real-time metrics
        """
        try:
            # These would normally come from real-time monitoring
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "current_load": {
                    "cpu_percentage": 18.5,
                    "memory_percentage": 62.3,
                    "disk_io_ops_per_sec": 245,
                    "network_throughput_mbps": 12.8
                },
                "active_sessions": {
                    "total_sessions": 1456,
                    "admin_sessions": 8,
                    "user_sessions": 1448,
                    "anonymous_sessions": 234
                },
                "request_metrics": {
                    "requests_per_second": 45.2,
                    "avg_response_time_ms": 158,
                    "p95_response_time_ms": 420,
                    "error_rate_percentage": 0.8
                },
                "queue_metrics": {
                    "pending_notifications": 23,
                    "pending_payments": 5,
                    "background_jobs": 12
                },
                "alerts": {
                    "active_alerts": len(await self.db.get_active_alerts()),
                    "critical_alerts": len(await self.db.get_alerts_by_severity("critical")),
                    "warning_alerts": len(await self.db.get_alerts_by_severity("medium"))
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get real-time metrics: {e}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": f"שגיאה בקבלת מטריקות זמן אמת: {str(e)}"
            }
    
    async def generate_performance_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        יצירת דוח ביצועים - Generate performance report
        """
        try:
            period_days = (end_date - start_date).days
            
            # Get performance data for the period
            trends = await self.get_performance_trends(period_days)
            
            # Calculate summary statistics
            daily_data = trends["daily_metrics"]
            
            max_response_time = max(d["avg_response_time_ms"] for d in daily_data)
            min_response_time = min(d["avg_response_time_ms"] for d in daily_data)
            max_error_rate = max(d["error_rate_percentage"] for d in daily_data)
            min_error_rate = min(d["error_rate_percentage"] for d in daily_data)
            
            total_requests = sum(d["requests_count"] for d in daily_data)
            avg_daily_users = sum(d["active_users"] for d in daily_data) / len(daily_data)
            
            # Identify performance issues
            issues = []
            if trends["averages"]["avg_response_time_ms"] > 500:
                issues.append("תגובה איטית - זמן תגובה ממוצע מעל 500ms")
            if trends["averages"]["avg_error_rate_percentage"] > 2.0:
                issues.append("שיעור שגיאות גבוה - מעל 2%")
            if trends["trends"]["response_time_change_percentage"] > 20:
                issues.append("הידרדרות בזמן התגובה - עלייה של יותר מ-20%")
            
            # Generate recommendations
            recommendations = []
            if max_response_time > 1000:
                recommendations.append("כדאי לבדוק אופטימיזציה של שאילתות מסד נתונים")
            if max_error_rate > 5:
                recommendations.append("יש לחקור את הגורמים לשיעור השגיאות הגבוה")
            if trends["trends"]["traffic_change_percentage"] > 50:
                recommendations.append("עלייה משמעותית בתעבורה - כדאי לשקול הגדלת משאבים")
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": period_days
                },
                "summary": {
                    "avg_response_time_ms": round(trends["averages"]["avg_response_time_ms"], 2),
                    "avg_error_rate_percentage": round(trends["averages"]["avg_error_rate_percentage"], 3),
                    "total_requests": total_requests,
                    "avg_daily_users": round(avg_daily_users),
                    "best_response_time_ms": min_response_time,
                    "worst_response_time_ms": max_response_time,
                    "lowest_error_rate_percentage": round(min_error_rate, 3),
                    "highest_error_rate_percentage": round(max_error_rate, 3)
                },
                "trends": trends["trends"],
                "daily_data": daily_data,
                "issues_identified": issues,
                "recommendations": recommendations,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate performance report: {e}")
            return {
                "error": f"שגיאה ביצירת דוח ביצועים: {str(e)}",
                "generated_at": datetime.utcnow().isoformat()
            }
    
    async def get_resource_utilization(self) -> Dict[str, Any]:
        """
        קבלת ניצול משאבים - Get resource utilization
        """
        # Mock resource data - would normally come from monitoring
        return {
            "cpu": {
                "current_percentage": 23.4,
                "avg_24h_percentage": 28.7,
                "peak_24h_percentage": 67.2,
                "cores_count": 4,
                "load_average": [1.2, 1.4, 1.1]
            },
            "memory": {
                "total_gb": 16,
                "used_gb": 9.8,
                "available_gb": 6.2,
                "usage_percentage": 61.3,
                "swap_used_gb": 0.2
            },
            "disk": {
                "total_gb": 100,
                "used_gb": 34.7,
                "available_gb": 65.3,
                "usage_percentage": 34.7,
                "io_ops_per_sec": 156
            },
            "network": {
                "throughput_in_mbps": 8.4,
                "throughput_out_mbps": 12.1,
                "connections_active": 234,
                "connections_total_24h": 15670
            },
            "application": {
                "heap_memory_mb": 512,
                "heap_usage_percentage": 68.5,
                "gc_collections_24h": 145,
                "thread_pool_active": 12,
                "thread_pool_max": 50
            },
            "timestamp": datetime.utcnow().isoformat()
        }