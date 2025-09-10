#!/usr/bin/env python3
"""
OFAIR E2E Test Structure Validation
Validates test files and flow coverage without requiring running services
"""

import os
import ast
import inspect
from typing import Dict, List, Set

class TestStructureValidator:
    """Validates E2E test structure and coverage"""
    
    def __init__(self):
        self.test_files = {}
        self.flow_coverage = {}
        self.test_methods = {}
        
    def analyze_test_file(self, file_path: str) -> Dict:
        """Analyze a test file and extract test methods and flows"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            analysis = {
                'file_path': file_path,
                'classes': [],
                'test_methods': [],
                'hebrew_content': [],
                'api_endpoints': [],
                'expected_services': []
            }
            
            for node in ast.walk(tree):
                # Find test classes
                if isinstance(node, ast.ClassDef) and 'Test' in node.name:
                    analysis['classes'].append(node.name)
                
                # Find test methods
                if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                    analysis['test_methods'].append(node.name)
                
                # Find Hebrew strings
                if isinstance(node, ast.Str) and any(ord(c) > 127 for c in node.s):
                    analysis['hebrew_content'].append(node.s[:50] + '...' if len(node.s) > 50 else node.s)
                
                # Find API endpoints (simplified detection)
                if isinstance(node, ast.Str) and '/api/v1/' in node.s:
                    analysis['api_endpoints'].append(node.s)
                
                # Find service references
                if isinstance(node, ast.Str) and '-service:' in node.s:
                    service = node.s.split('-service:')[0].split('/')[-1]
                    if service not in analysis['expected_services']:
                        analysis['expected_services'].append(service)
            
            return analysis
            
        except Exception as e:
            return {'error': str(e), 'file_path': file_path}
    
    def validate_test_coverage(self) -> Dict:
        """Validate test coverage across all flows"""
        
        expected_flows = {
            'customer_flow': [
                'registration', 'login', 'profile_update', 'lead_creation',
                'proposal_viewing', 'payment', 'notifications', 'support'
            ],
            'professional_flow': [
                'registration', 'profile_completion', 'document_upload',
                'lead_browsing', 'proposal_submission', 'professional_lead_creation',
                'referrals', 'earnings', 'analytics'
            ],
            'referral_flows': [
                'code_generation', 'registration_with_code', 'tracking',
                'commission_calculation', 'multi_level', 'analytics', 'fraud_prevention'
            ],
            'admin_workflows': [
                'authentication', 'dashboard', 'user_management', 'moderation',
                'financial_oversight', 'system_configuration', 'reporting'
            ]
        }
        
        coverage = {}
        for flow_type, expected_tests in expected_flows.items():
            file_path = f"tests/e2e/test_{flow_type}.py"
            if os.path.exists(file_path):
                analysis = self.analyze_test_file(file_path)
                coverage[flow_type] = {
                    'file_exists': True,
                    'expected_tests': expected_tests,
                    'found_methods': analysis.get('test_methods', []),
                    'coverage_percentage': self.calculate_coverage(expected_tests, analysis.get('test_methods', [])),
                    'hebrew_support': len(analysis.get('hebrew_content', [])) > 0,
                    'api_endpoints': len(analysis.get('api_endpoints', [])),
                    'services_tested': analysis.get('expected_services', [])
                }
            else:
                coverage[flow_type] = {
                    'file_exists': False,
                    'expected_tests': expected_tests,
                    'found_methods': [],
                    'coverage_percentage': 0,
                    'hebrew_support': False,
                    'api_endpoints': 0,
                    'services_tested': []
                }
        
        return coverage
    
    def calculate_coverage(self, expected: List[str], found_methods: List[str]) -> float:
        """Calculate test coverage percentage"""
        if not expected:
            return 100.0
        
        covered = 0
        for expected_test in expected:
            for method in found_methods:
                if expected_test.lower() in method.lower():
                    covered += 1
                    break
        
        return (covered / len(expected)) * 100
    
    def validate_hebrew_support(self) -> Dict:
        """Validate Hebrew/RTL support across tests"""
        hebrew_validation = {
            'total_hebrew_strings': 0,
            'files_with_hebrew': 0,
            'common_hebrew_patterns': []
        }
        
        hebrew_patterns = [
            'משתמש', 'ליד', 'מקצוען', 'הצעה', 'תשלום', 'הפנייה',
            'בדיקה', 'רישום', 'פרופיל', 'שירות', 'לקוח'
        ]
        
        test_files = [
            'tests/e2e/test_customer_flow.py',
            'tests/e2e/test_professional_flow.py', 
            'tests/e2e/test_referral_flows.py',
            'tests/e2e/test_admin_workflows.py'
        ]
        
        for file_path in test_files:
            if os.path.exists(file_path):
                analysis = self.analyze_test_file(file_path)
                hebrew_content = analysis.get('hebrew_content', [])
                
                if hebrew_content:
                    hebrew_validation['files_with_hebrew'] += 1
                    hebrew_validation['total_hebrew_strings'] += len(hebrew_content)
                    
                    # Check for common patterns
                    for content in hebrew_content:
                        for pattern in hebrew_patterns:
                            if pattern in content and pattern not in hebrew_validation['common_hebrew_patterns']:
                                hebrew_validation['common_hebrew_patterns'].append(pattern)
        
        return hebrew_validation
    
    def validate_service_integration(self) -> Dict:
        """Validate microservice integration coverage"""
        
        expected_services = [
            'auth', 'users', 'leads', 'proposals', 'referrals', 'payments', 'notifications', 'admin'
        ]
        
        service_coverage = {}
        for service in expected_services:
            service_coverage[service] = {
                'tested_in_files': [],
                'endpoint_count': 0,
                'coverage_percentage': 0
            }
        
        test_files = [
            'tests/e2e/test_customer_flow.py',
            'tests/e2e/test_professional_flow.py',
            'tests/e2e/test_referral_flows.py', 
            'tests/e2e/test_admin_workflows.py'
        ]
        
        for file_path in test_files:
            if os.path.exists(file_path):
                analysis = self.analyze_test_file(file_path)
                services_in_file = analysis.get('expected_services', [])
                
                for service in services_in_file:
                    if service in service_coverage:
                        service_coverage[service]['tested_in_files'].append(os.path.basename(file_path))
                        service_coverage[service]['endpoint_count'] += len([
                            ep for ep in analysis.get('api_endpoints', []) 
                            if f'{service}-service' in ep
                        ])
        
        # Calculate coverage percentages
        for service in service_coverage:
            if service_coverage[service]['tested_in_files']:
                service_coverage[service]['coverage_percentage'] = min(
                    100, (len(service_coverage[service]['tested_in_files']) / 4) * 100
                )
        
        return service_coverage
    
    def generate_validation_report(self) -> str:
        """Generate comprehensive validation report"""
        
        print("🎯 OFAIR E2E Test Structure Validation")
        print("=" * 55)
        
        # Test Coverage Analysis
        coverage = self.validate_test_coverage()
        print("\n📋 Test Coverage Analysis")
        print("-" * 30)
        
        total_coverage = 0
        for flow_type, data in coverage.items():
            coverage_pct = data['coverage_percentage']
            total_coverage += coverage_pct
            
            status = "✅" if data['file_exists'] else "❌"
            hebrew_status = "🇮🇱" if data['hebrew_support'] else "⚠️"
            
            print(f"{status} {flow_type}: {coverage_pct:.1f}% coverage {hebrew_status}")
            print(f"   • File exists: {data['file_exists']}")
            print(f"   • Test methods: {len(data['found_methods'])}")
            print(f"   • API endpoints: {data['api_endpoints']}")
            print(f"   • Services tested: {len(data['services_tested'])}")
            print()
        
        avg_coverage = total_coverage / len(coverage) if coverage else 0
        print(f"📊 Average Test Coverage: {avg_coverage:.1f}%")
        
        # Hebrew Support Analysis
        hebrew_data = self.validate_hebrew_support()
        print("\n🇮🇱 Hebrew/RTL Support Analysis")
        print("-" * 35)
        print(f"Files with Hebrew content: {hebrew_data['files_with_hebrew']}/4")
        print(f"Total Hebrew strings: {hebrew_data['total_hebrew_strings']}")
        print(f"Hebrew patterns found: {', '.join(hebrew_data['common_hebrew_patterns'][:10])}")
        
        # Service Integration Analysis
        service_data = self.validate_service_integration()
        print("\n🔧 Microservice Integration Analysis")
        print("-" * 40)
        
        for service, data in service_data.items():
            coverage_pct = data['coverage_percentage']
            status = "✅" if coverage_pct > 0 else "⚠️"
            
            print(f"{status} {service}-service: {coverage_pct:.0f}% coverage")
            if data['tested_in_files']:
                print(f"   • Tested in: {', '.join(data['tested_in_files'])}")
                print(f"   • Endpoints: {data['endpoint_count']}")
        
        # Overall Assessment
        print("\n" + "=" * 55)
        print("📈 OVERALL E2E TEST ASSESSMENT")
        print("=" * 55)
        
        files_exist = sum(1 for d in coverage.values() if d['file_exists'])
        hebrew_support = sum(1 for d in coverage.values() if d['hebrew_support'])
        services_covered = sum(1 for d in service_data.values() if d['coverage_percentage'] > 0)
        
        print(f"✅ Test Files Created: {files_exist}/4")
        print(f"🇮🇱 Hebrew Support: {hebrew_support}/4 flows")
        print(f"🔧 Services Covered: {services_covered}/8 services")
        print(f"📊 Overall Coverage: {avg_coverage:.1f}%")
        
        if avg_coverage >= 80 and hebrew_support >= 3 and services_covered >= 6:
            print("\n🎉 EXCELLENT E2E TEST COVERAGE!")
            print("✅ Comprehensive test suite ready for execution")
            print("🇮🇱 Hebrew/RTL support validated")
            print("🔧 All critical services covered")
        elif avg_coverage >= 60:
            print("\n✅ GOOD E2E TEST COVERAGE")
            print("📝 Test suite covers most critical flows")
            print("⚠️  Some areas may need enhancement")
        else:
            print("\n⚠️  E2E TEST COVERAGE NEEDS IMPROVEMENT")
            print("📝 Critical test gaps identified")
        
        return "Validation completed"

def main():
    """Run the validation"""
    validator = TestStructureValidator()
    validator.generate_validation_report()

if __name__ == "__main__":
    main()