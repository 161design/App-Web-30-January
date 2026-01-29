#!/usr/bin/env python3
"""
PMC Snag List Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://buildtrack-app-3.preview.emergentagent.com/api"
DEFAULT_MANAGER = {
    "email": "manager@pmc.com",
    "password": "manager123"
}

# Test data
TEST_USERS = [
    {
        "email": "inspector@test.com",
        "password": "test123",
        "name": "Test Inspector",
        "role": "inspector",
        "phone": "+1234567890"
    },
    {
        "email": "contractor@test.com", 
        "password": "test123",
        "name": "Test Contractor",
        "role": "contractor",
        "phone": "+1234567891"
    },
    {
        "email": "authority@test.com",
        "password": "test123", 
        "name": "Test Authority",
        "role": "authority",
        "phone": "+1234567892"
    }
]

# Small base64 test image (1x1 pixel PNG)
TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.manager_token = None
        self.test_tokens = {}
        self.test_user_ids = {}
        self.test_snag_ids = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: {message}")
    
    def make_request(self, method, endpoint, token=None, **kwargs):
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        headers = kwargs.get('headers', {})
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None
    
    def test_auth_login(self):
        """Test 1: Authentication - Manager Login"""
        print("\n=== Testing Authentication ===")
        
        response = self.make_request('POST', '/auth/login', json=DEFAULT_MANAGER)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.manager_token = data['access_token']
                self.log_result("Manager Login", True)
                return True
            else:
                self.log_result("Manager Login", False, "Missing token or user in response")
        else:
            self.log_result("Manager Login", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_auth_me(self):
        """Test 2: Get current user info"""
        response = self.make_request('GET', '/auth/me', token=self.manager_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('role') == 'manager' and data.get('email') == DEFAULT_MANAGER['email']:
                self.log_result("Get Current User", True)
                return True
            else:
                self.log_result("Get Current User", False, "Invalid user data")
        else:
            self.log_result("Get Current User", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_user_creation(self):
        """Test 3: User Management - Create users with different roles"""
        print("\n=== Testing User Management ===")
        
        success_count = 0
        for user_data in TEST_USERS:
            response = self.make_request('POST', '/auth/register', token=self.manager_token, json=user_data)
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get('role') == user_data['role']:
                    self.test_user_ids[user_data['role']] = data['id']
                    self.log_result(f"Create {user_data['role'].title()}", True)
                    success_count += 1
                else:
                    self.log_result(f"Create {user_data['role'].title()}", False, "Invalid role in response")
            else:
                self.log_result(f"Create {user_data['role'].title()}", False, f"Status: {response.status_code if response else 'No response'}")
        
        return success_count == len(TEST_USERS)
    
    def test_user_login(self):
        """Test 4: Login with created users"""
        for user_data in TEST_USERS:
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            response = self.make_request('POST', '/auth/login', json=login_data)
            
            if response and response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.test_tokens[user_data['role']] = data['access_token']
                    self.log_result(f"Login {user_data['role'].title()}", True)
                else:
                    self.log_result(f"Login {user_data['role'].title()}", False, "No access token")
            else:
                self.log_result(f"Login {user_data['role'].title()}", False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_get_users(self):
        """Test 5: Get all users"""
        response = self.make_request('GET', '/users', token=self.manager_token)
        
        if response and response.status_code == 200:
            users = response.json()
            if len(users) >= 4:  # Manager + 3 test users
                self.log_result("Get All Users", True)
                return True
            else:
                self.log_result("Get All Users", False, f"Expected at least 4 users, got {len(users)}")
        else:
            self.log_result("Get All Users", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_get_contractors(self):
        """Test 6: Get contractors only"""
        response = self.make_request('GET', '/users/contractors', token=self.manager_token)
        
        if response and response.status_code == 200:
            contractors = response.json()
            if len(contractors) >= 1:
                self.log_result("Get Contractors", True)
                return True
            else:
                self.log_result("Get Contractors", False, "No contractors found")
        else:
            self.log_result("Get Contractors", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_snag_creation(self):
        """Test 7: Snag CRUD - Create snags"""
        print("\n=== Testing Snag Management ===")
        
        test_snags = [
            {
                "description": "Broken window in office building",
                "location": "Building A, Floor 2, Room 201",
                "photos": [TEST_IMAGE_BASE64],
                "priority": "high",
                "cost_estimate": 500.0,
                "assigned_contractor_id": self.test_user_ids.get('contractor'),
                "due_date": (datetime.now() + timedelta(days=7)).isoformat()
            },
            {
                "description": "Leaking pipe in bathroom",
                "location": "Building B, Floor 1, Bathroom",
                "photos": [TEST_IMAGE_BASE64],
                "priority": "medium",
                "cost_estimate": 200.0,
                "assigned_contractor_id": self.test_user_ids.get('contractor'),
                "due_date": (datetime.now() + timedelta(days=3)).isoformat()
            },
            {
                "description": "Paint peeling on exterior wall",
                "location": "Building C, South Wall",
                "photos": [],
                "priority": "low",
                "cost_estimate": 100.0,
                "due_date": (datetime.now() + timedelta(days=14)).isoformat()
            }
        ]
        
        success_count = 0
        for i, snag_data in enumerate(test_snags):
            response = self.make_request('POST', '/snags', token=self.manager_token, json=snag_data)
            
            if response and response.status_code == 200:
                data = response.json()
                if 'id' in data and 'query_no' in data:
                    self.test_snag_ids.append(data['id'])
                    self.log_result(f"Create Snag {i+1}", True)
                    success_count += 1
                else:
                    self.log_result(f"Create Snag {i+1}", False, "Missing id or query_no")
            else:
                self.log_result(f"Create Snag {i+1}", False, f"Status: {response.status_code if response else 'No response'}")
        
        return success_count == len(test_snags)
    
    def test_snag_list(self):
        """Test 8: Get all snags"""
        response = self.make_request('GET', '/snags', token=self.manager_token)
        
        if response and response.status_code == 200:
            snags = response.json()
            if len(snags) >= 3:
                self.log_result("Get All Snags", True)
                return True
            else:
                self.log_result("Get All Snags", False, f"Expected at least 3 snags, got {len(snags)}")
        else:
            self.log_result("Get All Snags", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_snag_detail(self):
        """Test 9: Get single snag details"""
        if not self.test_snag_ids:
            self.log_result("Get Snag Detail", False, "No snag IDs available")
            return False
        
        snag_id = self.test_snag_ids[0]
        response = self.make_request('GET', f'/snags/{snag_id}', token=self.manager_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('id') == snag_id:
                self.log_result("Get Snag Detail", True)
                return True
            else:
                self.log_result("Get Snag Detail", False, "Snag ID mismatch")
        else:
            self.log_result("Get Snag Detail", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_contractor_snag_access(self):
        """Test 10: Contractor can only see assigned snags"""
        contractor_token = self.test_tokens.get('contractor')
        if not contractor_token:
            self.log_result("Contractor Snag Access", False, "No contractor token")
            return False
        
        response = self.make_request('GET', '/snags', token=contractor_token)
        
        if response and response.status_code == 200:
            snags = response.json()
            # Contractor should only see assigned snags (2 out of 3 created)
            if len(snags) == 2:
                self.log_result("Contractor Snag Access", True)
                return True
            else:
                self.log_result("Contractor Snag Access", False, f"Expected 2 snags, got {len(snags)}")
        else:
            self.log_result("Contractor Snag Access", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_status_workflow(self):
        """Test 11: Status workflow management"""
        print("\n=== Testing Status Workflow ===")
        
        if not self.test_snag_ids:
            self.log_result("Status Workflow", False, "No snag IDs available")
            return False
        
        snag_id = self.test_snag_ids[0]
        contractor_token = self.test_tokens.get('contractor')
        authority_token = self.test_tokens.get('authority')
        
        # Test 1: Contractor starts work (open -> in_progress)
        update_data = {
            "status": "in_progress",
            "work_started_date": datetime.now().isoformat()
        }
        response = self.make_request('PUT', f'/snags/{snag_id}', token=contractor_token, json=update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('status') == 'in_progress':
                self.log_result("Status: Open -> In Progress", True)
            else:
                self.log_result("Status: Open -> In Progress", False, "Status not updated")
        else:
            self.log_result("Status: Open -> In Progress", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: Contractor marks resolved (in_progress -> resolved)
        update_data = {
            "status": "resolved",
            "work_completed_date": datetime.now().isoformat()
        }
        response = self.make_request('PUT', f'/snags/{snag_id}', token=contractor_token, json=update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('status') == 'resolved':
                self.log_result("Status: In Progress -> Resolved", True)
            else:
                self.log_result("Status: In Progress -> Resolved", False, "Status not updated")
        else:
            self.log_result("Status: In Progress -> Resolved", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Authority verifies (resolved -> verified)
        update_data = {
            "status": "verified",
            "authority_feedback": "Work completed satisfactorily"
        }
        response = self.make_request('PUT', f'/snags/{snag_id}', token=authority_token, json=update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('status') == 'verified' and data.get('authority_feedback'):
                self.log_result("Status: Resolved -> Verified", True)
                return True
            else:
                self.log_result("Status: Resolved -> Verified", False, "Status or feedback not updated")
        else:
            self.log_result("Status: Resolved -> Verified", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_notifications(self):
        """Test 12: Notification system"""
        print("\n=== Testing Notifications ===")
        
        # Get notifications for contractor (should have notifications from status changes)
        contractor_token = self.test_tokens.get('contractor')
        if not contractor_token:
            self.log_result("Get Notifications", False, "No contractor token")
            return False
        
        response = self.make_request('GET', '/notifications', token=contractor_token)
        
        if response and response.status_code == 200:
            notifications = response.json()
            if len(notifications) > 0:
                self.log_result("Get Notifications", True)
                
                # Test mark notification as read
                notif_id = notifications[0]['id']
                response = self.make_request('PUT', f'/notifications/{notif_id}/read', token=contractor_token)
                
                if response and response.status_code == 200:
                    self.log_result("Mark Notification Read", True)
                else:
                    self.log_result("Mark Notification Read", False, f"Status: {response.status_code if response else 'No response'}")
                
                # Test mark all as read
                response = self.make_request('PUT', '/notifications/read-all', token=contractor_token)
                
                if response and response.status_code == 200:
                    self.log_result("Mark All Notifications Read", True)
                    return True
                else:
                    self.log_result("Mark All Notifications Read", False, f"Status: {response.status_code if response else 'No response'}")
            else:
                self.log_result("Get Notifications", False, "No notifications found")
        else:
            self.log_result("Get Notifications", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_filtering_search(self):
        """Test 13: Filter and search functionality"""
        print("\n=== Testing Filtering & Search ===")
        
        # Test filter by status
        response = self.make_request('GET', '/snags?status=verified', token=self.manager_token)
        
        if response and response.status_code == 200:
            snags = response.json()
            if len(snags) >= 1:
                self.log_result("Filter by Status", True)
            else:
                self.log_result("Filter by Status", False, "No verified snags found")
        else:
            self.log_result("Filter by Status", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test filter by priority
        response = self.make_request('GET', '/snags?priority=high', token=self.manager_token)
        
        if response and response.status_code == 200:
            snags = response.json()
            if len(snags) >= 1:
                self.log_result("Filter by Priority", True)
            else:
                self.log_result("Filter by Priority", False, "No high priority snags found")
        else:
            self.log_result("Filter by Priority", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test filter by location
        response = self.make_request('GET', '/snags?location=Building', token=self.manager_token)
        
        if response and response.status_code == 200:
            snags = response.json()
            if len(snags) >= 1:
                self.log_result("Filter by Location", True)
                return True
            else:
                self.log_result("Filter by Location", False, "No snags found with 'Building' in location")
        else:
            self.log_result("Filter by Location", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_dashboard_stats(self):
        """Test 14: Dashboard statistics"""
        print("\n=== Testing Dashboard Stats ===")
        
        response = self.make_request('GET', '/dashboard/stats', token=self.manager_token)
        
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['total_snags', 'open_snags', 'in_progress_snags', 'resolved_snags', 'verified_snags', 'high_priority']
            
            if all(field in stats for field in required_fields):
                if stats['total_snags'] >= 3:
                    self.log_result("Dashboard Stats", True)
                    return True
                else:
                    self.log_result("Dashboard Stats", False, f"Expected at least 3 total snags, got {stats['total_snags']}")
            else:
                self.log_result("Dashboard Stats", False, "Missing required fields")
        else:
            self.log_result("Dashboard Stats", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_excel_export(self):
        """Test 15: Excel export functionality"""
        print("\n=== Testing Excel Export ===")
        
        response = self.make_request('GET', '/snags/export/excel', token=self.manager_token)
        
        if response and response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'spreadsheet' in content_type or 'excel' in content_type:
                self.log_result("Excel Export", True)
                return True
            else:
                self.log_result("Excel Export", False, f"Invalid content type: {content_type}")
        else:
            self.log_result("Excel Export", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def test_role_permissions(self):
        """Test 16: Role-based permissions"""
        print("\n=== Testing Role Permissions ===")
        
        inspector_token = self.test_tokens.get('inspector')
        contractor_token = self.test_tokens.get('contractor')
        
        # Test: Inspector cannot create users (should fail)
        user_data = {
            "email": "test@fail.com",
            "password": "test123",
            "name": "Should Fail",
            "role": "contractor"
        }
        response = self.make_request('POST', '/auth/register', token=inspector_token, json=user_data)
        
        if response and response.status_code == 403:
            self.log_result("Inspector Cannot Create Users", True)
        else:
            self.log_result("Inspector Cannot Create Users", False, f"Expected 403, got {response.status_code if response else 'No response'}")
        
        # Test: Contractor cannot delete snags (should fail)
        if self.test_snag_ids:
            snag_id = self.test_snag_ids[-1]  # Use last snag
            response = self.make_request('DELETE', f'/snags/{snag_id}', token=contractor_token)
            
            if response and response.status_code == 403:
                self.log_result("Contractor Cannot Delete Snags", True)
                return True
            else:
                self.log_result("Contractor Cannot Delete Snags", False, f"Expected 403, got {response.status_code if response else 'No response'}")
        
        return False
    
    def test_snag_deletion(self):
        """Test 17: Snag deletion (Manager only)"""
        if not self.test_snag_ids:
            self.log_result("Delete Snag", False, "No snag IDs available")
            return False
        
        snag_id = self.test_snag_ids[-1]  # Delete last snag
        response = self.make_request('DELETE', f'/snags/{snag_id}', token=self.manager_token)
        
        if response and response.status_code == 200:
            self.log_result("Delete Snag (Manager)", True)
            return True
        else:
            self.log_result("Delete Snag (Manager)", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting PMC Snag List Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        
        # Authentication Tests
        if not self.test_auth_login():
            print("❌ Cannot proceed without manager authentication")
            return
        
        self.test_auth_me()
        
        # User Management Tests
        self.test_user_creation()
        self.test_user_login()
        self.test_get_users()
        self.test_get_contractors()
        
        # Snag Management Tests
        self.test_snag_creation()
        self.test_snag_list()
        self.test_snag_detail()
        self.test_contractor_snag_access()
        
        # Status Workflow Tests
        self.test_status_workflow()
        
        # Notification Tests
        self.test_notifications()
        
        # Filtering & Search Tests
        self.test_filtering_search()
        
        # Dashboard & Export Tests
        self.test_dashboard_stats()
        self.test_excel_export()
        
        # Permission Tests
        self.test_role_permissions()
        self.test_snag_deletion()
        
        # Print Summary
        print(f"\n📊 Test Results Summary:")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print(f"\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as overall success

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Backend API testing completed successfully!")
    else:
        print("\n⚠️  Backend API testing completed with issues.")