import requests
import sys
import json
import asyncio
import websockets
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class SnagAppAPITester:
    def __init__(self, base_url="https://buildtrack-app-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.ws_url = base_url.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws'
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            "users": [],
            "snags": [],
            "notifications": []
        }
        self.websocket_messages = []
        self.websocket_connected = False

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    # ==================== Authentication Tests ====================

    def test_login_manager(self):
        """Test manager login"""
        success, response = self.make_request(
            "POST", 
            "auth/login",
            {"email": "manager@pmc.com", "password": "manager123"}
        )
        
        if success and "access_token" in response:
            self.token = response["access_token"]
            self.log_test("Manager Login", True, f"Token received, user: {response.get('user', {}).get('name')}")
            return True
        else:
            self.log_test("Manager Login", False, "Failed to get access token", response)
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.make_request("GET", "auth/me")
        
        if success and "email" in response:
            self.log_test("Get Current User", True, f"User: {response.get('name')} ({response.get('role')})")
            return True
        else:
            self.log_test("Get Current User", False, "Failed to get user info", response)
            return False

    def test_register_user(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_contractor_{datetime.now().strftime('%H%M%S')}@pmc.com",
            "password": "testpass123",
            "name": "Test Contractor",
            "role": "contractor",
            "phone": "+1234567890"
        }
        
        success, response = self.make_request("POST", "auth/register", test_user_data, 200)
        
        if success and "id" in response:
            self.created_resources["users"].append(response["id"])
            self.log_test("Register User", True, f"Created user: {response.get('name')} (ID: {response.get('id')})")
            return response["id"]
        else:
            self.log_test("Register User", False, "Failed to create user", response)
            return None

    # ==================== User Management Tests ====================

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.make_request("GET", "users")
        
        if success and isinstance(response, list):
            self.log_test("Get All Users", True, f"Retrieved {len(response)} users")
            return True
        else:
            self.log_test("Get All Users", False, "Failed to get users list", response)
            return False

    def test_get_contractors(self):
        """Test getting contractors only"""
        success, response = self.make_request("GET", "users/contractors")
        
        if success and isinstance(response, list):
            contractor_count = len([u for u in response if u.get("role") == "contractor"])
            self.log_test("Get Contractors", True, f"Retrieved {contractor_count} contractors")
            return True
        else:
            self.log_test("Get Contractors", False, "Failed to get contractors", response)
            return False

    # ==================== Snag Management Tests ====================

    def test_create_snag(self, contractor_id: Optional[str] = None):
        """Test creating a new snag"""
        snag_data = {
            "description": "Test snag - Water leakage in bathroom",
            "location": "Building A - Floor 2 - Room 201",
            "project_name": "Test Project Alpha",
            "possible_solution": "Replace damaged pipe and seal joints",
            "utm_coordinates": "32N 0123456 1234567",
            "photos": [],
            "priority": "high",
            "cost_estimate": 1500.0,
            "assigned_contractor_id": contractor_id,
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        success, response = self.make_request("POST", "snags", snag_data, 200)
        
        if success and "id" in response:
            self.created_resources["snags"].append(response["id"])
            self.log_test("Create Snag", True, f"Created snag #{response.get('query_no')} (ID: {response.get('id')})")
            return response["id"]
        else:
            self.log_test("Create Snag", False, "Failed to create snag", response)
            return None

    def test_get_snags(self):
        """Test getting all snags"""
        success, response = self.make_request("GET", "snags")
        
        if success and isinstance(response, list):
            self.log_test("Get All Snags", True, f"Retrieved {len(response)} snags")
            return True
        else:
            self.log_test("Get All Snags", False, "Failed to get snags", response)
            return False

    def test_get_snag_by_id(self, snag_id: str):
        """Test getting specific snag by ID"""
        success, response = self.make_request("GET", f"snags/{snag_id}")
        
        if success and "id" in response:
            self.log_test("Get Snag by ID", True, f"Retrieved snag #{response.get('query_no')}")
            return True
        else:
            self.log_test("Get Snag by ID", False, f"Failed to get snag {snag_id}", response)
            return False

    def test_update_snag(self, snag_id: str):
        """Test updating a snag"""
        update_data = {
            "status": "in_progress",
            "authority_feedback": "Approved for repair work to begin"
        }
        
        success, response = self.make_request("PUT", f"snags/{snag_id}", update_data)
        
        if success and "id" in response:
            self.log_test("Update Snag", True, f"Updated snag status to: {response.get('status')}")
            return True
        else:
            self.log_test("Update Snag", False, f"Failed to update snag {snag_id}", response)
            return False

    # ==================== Dashboard & Stats Tests ====================

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.make_request("GET", "dashboard/stats")
        
        if success and "total_snags" in response:
            stats = f"Total: {response.get('total_snags')}, Open: {response.get('open_snags')}, Resolved: {response.get('resolved_snags')}"
            self.log_test("Dashboard Stats", True, stats)
            return True
        else:
            self.log_test("Dashboard Stats", False, "Failed to get dashboard stats", response)
            return False

    def test_get_project_names(self):
        """Test getting project names"""
        success, response = self.make_request("GET", "projects/names")
        
        if success and "projects" in response:
            project_count = len(response.get("projects", []))
            self.log_test("Get Project Names", True, f"Retrieved {project_count} project names")
            return True
        else:
            self.log_test("Get Project Names", False, "Failed to get project names", response)
            return False

    # ==================== Notification Tests ====================

    def test_get_notifications(self):
        """Test getting user notifications"""
        success, response = self.make_request("GET", "notifications")
        
        if success and isinstance(response, list):
            self.log_test("Get Notifications", True, f"Retrieved {len(response)} notifications")
            return True
        else:
            self.log_test("Get Notifications", False, "Failed to get notifications", response)
            return False

    # ==================== WebSocket Tests ====================

    async def test_websocket_connection(self):
        """Test WebSocket connection and authentication"""
        try:
            async with websockets.connect(self.ws_url) as websocket:
                # Test authentication
                auth_message = {
                    "type": "auth",
                    "token": self.token
                }
                await websocket.send(json.dumps(auth_message))
                
                # Wait for auth response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                auth_response = json.loads(response)
                
                if auth_response.get("type") == "auth_success":
                    self.log_test("WebSocket Connection & Auth", True, f"Connected and authenticated user: {auth_response.get('user_id')}")
                    self.websocket_connected = True
                    return True
                else:
                    self.log_test("WebSocket Connection & Auth", False, "Authentication failed", auth_response)
                    return False
                    
        except Exception as e:
            self.log_test("WebSocket Connection & Auth", False, f"Connection failed: {str(e)}")
            return False

    async def test_websocket_real_time_updates(self):
        """Test real-time updates via WebSocket"""
        if not self.token:
            self.log_test("WebSocket Real-time Updates", False, "No authentication token available")
            return False
            
        try:
            # Connect to WebSocket
            async with websockets.connect(self.ws_url) as websocket:
                # Authenticate
                auth_message = {"type": "auth", "token": self.token}
                await websocket.send(json.dumps(auth_message))
                
                # Wait for auth confirmation
                auth_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                auth_data = json.loads(auth_response)
                
                if auth_data.get("type") != "auth_success":
                    self.log_test("WebSocket Real-time Updates", False, "Authentication failed")
                    return False
                
                # Create a snag via REST API to trigger WebSocket broadcast
                snag_data = {
                    "description": "WebSocket test snag - Real-time update test",
                    "location": "WebSocket Test Building - Floor 1",
                    "project_name": "WebSocket Test Project",
                    "priority": "medium"
                }
                
                # Start listening for WebSocket messages
                websocket_task = asyncio.create_task(websocket.recv())
                
                # Create snag via REST API
                success, response = self.make_request("POST", "snags", snag_data, 200)
                
                if not success:
                    self.log_test("WebSocket Real-time Updates", False, "Failed to create test snag", response)
                    return False
                
                snag_id = response.get("id")
                if snag_id:
                    self.created_resources["snags"].append(snag_id)
                
                # Wait for WebSocket message
                try:
                    ws_message = await asyncio.wait_for(websocket_task, timeout=10.0)
                    message_data = json.loads(ws_message)
                    
                    if (message_data.get("type") == "snag_update" and 
                        message_data.get("event") == "created" and
                        message_data.get("data", {}).get("id") == snag_id):
                        self.log_test("WebSocket Real-time Updates", True, f"Received real-time update for snag creation: {snag_id}")
                        return True
                    else:
                        self.log_test("WebSocket Real-time Updates", False, f"Unexpected message format: {message_data}")
                        return False
                        
                except asyncio.TimeoutError:
                    self.log_test("WebSocket Real-time Updates", False, "Timeout waiting for WebSocket message")
                    return False
                    
        except Exception as e:
            self.log_test("WebSocket Real-time Updates", False, f"WebSocket test failed: {str(e)}")
            return False

    def run_websocket_tests(self):
        """Run WebSocket tests using asyncio"""
        print("\n🔌 WebSocket Tests")
        
        # Test WebSocket connection
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Test connection and authentication
            connection_success = loop.run_until_complete(self.test_websocket_connection())
            
            # Test real-time updates if connection successful
            if connection_success:
                update_success = loop.run_until_complete(self.test_websocket_real_time_updates())
            else:
                self.log_test("WebSocket Real-time Updates", False, "Skipped due to connection failure")
                
            loop.close()
            
        except Exception as e:
            self.log_test("WebSocket Tests", False, f"WebSocket test execution failed: {str(e)}")

    # ==================== Error Handling Tests ====================

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        old_token = self.token
        self.token = None
        
        success, response = self.make_request("GET", "users", expected_status=403)
        
        self.token = old_token  # Restore token
        
        if success:
            self.log_test("Unauthorized Access Test", True, "Correctly rejected unauthorized request")
            return True
        else:
            self.log_test("Unauthorized Access Test", False, "Should have returned 403", response)
            return False

    def test_invalid_snag_id(self):
        """Test accessing non-existent snag"""
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
        success, response = self.make_request("GET", f"snags/{fake_id}", expected_status=404)
        
        if success:
            self.log_test("Invalid Snag ID Test", True, "Correctly returned 404 for non-existent snag")
            return True
        else:
            self.log_test("Invalid Snag ID Test", False, "Should have returned 404", response)
            return False

    # ==================== Main Test Runner ====================

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Snag-App Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        print("\n🔐 Authentication Tests")
        if not self.test_login_manager():
            print("❌ Cannot proceed without authentication")
            return False
        
        self.test_get_current_user()
        contractor_id = self.test_register_user()

        # User Management Tests
        print("\n👥 User Management Tests")
        self.test_get_users()
        self.test_get_contractors()

        # Snag Management Tests
        print("\n📋 Snag Management Tests")
        snag_id = self.test_create_snag(contractor_id)
        self.test_get_snags()
        
        if snag_id:
            self.test_get_snag_by_id(snag_id)
            self.test_update_snag(snag_id)

        # Dashboard & Stats Tests
        print("\n📊 Dashboard & Stats Tests")
        self.test_dashboard_stats()
        self.test_get_project_names()

        # Notification Tests
        print("\n🔔 Notification Tests")
        self.test_get_notifications()

        # WebSocket Tests
        self.run_websocket_tests()

        # Error Handling Tests
        print("\n⚠️ Error Handling Tests")
        self.test_unauthorized_access()
        self.test_invalid_snag_id()

        # Final Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! All critical functionality working")
        elif success_rate >= 75:
            print("✅ Good! Most functionality working with minor issues")
        elif success_rate >= 50:
            print("⚠️ Moderate issues detected - needs attention")
        else:
            print("❌ Major issues detected - requires immediate fixes")

        return success_rate >= 75

def main():
    """Main test execution"""
    tester = SnagAppAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results_file = "/app/test_reports/backend_api_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "detailed_results": tester.test_results,
                "created_resources": tester.created_resources
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())