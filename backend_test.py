import requests
import sys
import json
from datetime import datetime

class PMCSnagListAPITester:
    def __init__(self, base_url="https://app-assessment-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email="manager@pmc.com", password="manager123"):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Logged in as: {response.get('user', {}).get('name')} ({response.get('user', {}).get('role')})")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "/api/dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_snags', 'open_snags', 'in_progress_snags', 'resolved_snags', 'verified_snags', 'high_priority']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard stats: {field}")
                    return False
            print(f"   Dashboard stats: {response}")
        return success

    def test_get_snags(self):
        """Test getting snags list"""
        success, response = self.run_test(
            "Get Snags List",
            "GET",
            "/api/snags",
            200
        )
        if success:
            print(f"   Found {len(response)} snags")
            if len(response) > 0:
                snag = response[0]
                required_fields = ['id', 'query_no', 'description', 'location', 'project_name', 'status', 'priority']
                for field in required_fields:
                    if field not in snag:
                        print(f"❌ Missing field in snag: {field}")
                        return False
        return success

    def test_create_snag(self):
        """Test creating a new snag"""
        snag_data = {
            "description": "Test snag for pagination testing",
            "location": "Test Floor 1, Room 101",
            "project_name": "Test Building A",
            "possible_solution": "Test solution",
            "priority": "medium",
            "cost_estimate": 150.00,
            "photos": []
        }
        
        success, response = self.run_test(
            "Create Snag",
            "POST",
            "/api/snags",
            200,  # Backend returns 200, not 201
            data=snag_data
        )
        
        if success:
            snag_id = response.get('id')
            print(f"   Created snag with ID: {snag_id}, Query No: {response.get('query_no')}")
            return snag_id
        return None

    def test_get_projects(self):
        """Test getting project names"""
        success, response = self.run_test(
            "Get Project Names",
            "GET",
            "/api/projects/names",
            200
        )
        if success and 'projects' in response:
            print(f"   Found {len(response['projects'])} projects: {response['projects']}")
        return success

    def test_get_contractors(self):
        """Test getting contractors list"""
        success, response = self.run_test(
            "Get Contractors",
            "GET",
            "/api/users/contractors",
            200
        )
        if success:
            print(f"   Found {len(response)} contractors")
        return success

    def test_export_endpoints(self):
        """Test export functionality"""
        # Test Excel export
        excel_success, _ = self.run_test(
            "Export Excel",
            "GET",
            "/api/snags/export/excel",
            200
        )
        
        # Test PDF export  
        pdf_success, _ = self.run_test(
            "Export PDF",
            "GET",
            "/api/snags/export/pdf",
            200
        )
        
        return excel_success and pdf_success

    def test_notifications(self):
        """Test notifications endpoint"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "/api/notifications",
            200
        )
        if success:
            print(f"   Found {len(response)} notifications")
        return success

    def test_auth_me(self):
        """Test current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/api/auth/me",
            200
        )
        if success:
            required_fields = ['id', 'email', 'name', 'role']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in user data: {field}")
                    return False
        return success

    def test_suggested_authorities_for_building(self, building_name="Building A"):
        """Test getting suggested authorities for a building based on historical data"""
        success, response = self.run_test(
            f"Get Suggested Authorities for {building_name}",
            "GET",
            f"/api/buildings/{building_name}/suggested-authorities",
            200
        )
        if success:
            if 'suggested_authorities' not in response:
                print(f"❌ Missing 'suggested_authorities' field in response")
                return False
            
            authorities = response['suggested_authorities']
            print(f"   Found {len(authorities)} suggested authorities")
            
            # Check structure of each authority
            for auth in authorities:
                required_fields = ['id', 'name', 'snag_count']
                for field in required_fields:
                    if field not in auth:
                        print(f"❌ Missing field '{field}' in authority data")
                        return False
                print(f"   - {auth['name']} ({auth['snag_count']} snags)")
        return success

    def test_previous_authority_for_building(self, building_name="Building A"):
        """Test getting previous authority for a building"""
        success, response = self.run_test(
            f"Get Previous Authority for {building_name}",
            "GET",
            f"/api/buildings/{building_name}/previous-authority",
            200
        )
        if success:
            required_fields = ['authority_id', 'authority_name']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field '{field}' in response")
                    return False
            
            if response['authority_id']:
                print(f"   Previous authority: {response['authority_name']} (ID: {response['authority_id']})")
            else:
                print(f"   No previous authority found for {building_name}")
        return success

    def test_create_snag_with_due_date(self):
        """Test creating a snag with due date to test calendar functionality"""
        from datetime import datetime, timedelta
        
        # Create a due date 7 days from now
        due_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        snag_data = {
            "description": "Test snag with due date for calendar testing",
            "location": "Test Floor 2, Room 201",
            "project_name": "Building A",
            "possible_solution": "Test calendar solution",
            "priority": "high",
            "cost_estimate": 200.00,
            "due_date": due_date,
            "photos": []
        }
        
        success, response = self.run_test(
            "Create Snag with Due Date",
            "POST",
            "/api/snags",
            200,
            data=snag_data
        )
        
        if success:
            snag_id = response.get('id')
            returned_due_date = response.get('due_date')
            print(f"   Created snag with ID: {snag_id}, Due Date: {returned_due_date}")
            
            # Verify due date was saved correctly
            if returned_due_date:
                print(f"   ✅ Due date saved successfully")
                return snag_id
            else:
                print(f"   ❌ Due date not saved properly")
                return None
        return None

def main():
    print("🚀 Starting PMC Snag List API Testing...")
    print("=" * 60)
    
    # Setup
    tester = PMCSnagListAPITester()
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1

    # Test core endpoints
    tests = [
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Current User", tester.test_auth_me),
        ("Get Snags", tester.test_get_snags),
        ("Get Projects", tester.test_get_projects),
        ("Get Contractors", tester.test_get_contractors),
        ("Notifications", tester.test_notifications),
        ("Create Snag", lambda: tester.test_create_snag() is not None),
        ("Export Functions", tester.test_export_endpoints),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())