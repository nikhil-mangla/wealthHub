#!/usr/bin/env python3
"""
Backend API Testing for Financial Advisory Platform
Tests all backend APIs including public and protected endpoints
"""

import requests
import json
import time
import subprocess
import sys
from datetime import datetime, timezone, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://growth-wealth-hub.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.session_token = None
        self.test_goal_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_public_apis(self):
        """Test public APIs that don't require authentication"""
        self.log("=== Testing Public APIs ===")
        
        # Test 1: Investment Calculator
        self.log("Testing Investment Calculator API...")
        calc_data = {
            "age": 30,
            "monthly_investment": 5000,
            "goal_amount": 1000000,
            "risk_profile": "moderate"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/calculate", json=calc_data)
            self.log(f"Calculator API Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Calculator API working")
                self.log(f"   - Projection entries: {len(result.get('projection', []))}")
                self.log(f"   - Total invested: {result.get('total_invested')}")
                self.log(f"   - Projected value: {result.get('projected_value')}")
                self.log(f"   - Years to goal: {result.get('years_to_goal')}")
                
                # Validate calculation logic
                if result.get('total_invested') and result.get('projected_value'):
                    self.log("   - Calculation values look reasonable")
                else:
                    self.log("❌ Calculator returned invalid values", "ERROR")
                    return False
            else:
                self.log(f"❌ Calculator API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Calculator API error: {str(e)}", "ERROR")
            return False
            
        # Test 2: Contact Form
        self.log("Testing Contact Form API...")
        contact_data = {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "message": "I'm interested in your financial advisory services. Please contact me."
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/contact", json=contact_data)
            self.log(f"Contact API Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Contact Form API working")
                self.log(f"   - Response: {result.get('message')}")
            else:
                self.log(f"❌ Contact API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Contact API error: {str(e)}", "ERROR")
            return False
            
        return True
        
    def setup_test_user(self):
        """Create test user and session in MongoDB for protected endpoint testing"""
        self.log("=== Setting up test user for protected APIs ===")
        
        # Generate unique IDs
        timestamp = int(time.time())
        self.test_user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
use('test_database');
db.users.insertOne({{
  id: '{self.test_user_id}',
  email: 'test.user.{timestamp}@example.com',
  name: 'Test User {timestamp}',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  id: '{self.test_user_id}-session',
  user_id: '{self.test_user_id}',
  session_token: '{self.session_token}',
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print('Test user created successfully');
"""
        
        try:
            # Execute MongoDB commands
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.log("✅ Test user and session created in MongoDB")
                self.log(f"   - User ID: {self.test_user_id}")
                self.log(f"   - Session Token: {self.session_token}")
                return True
            else:
                self.log(f"❌ MongoDB setup failed: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ MongoDB setup error: {str(e)}", "ERROR")
            return False
            
    def test_protected_apis(self):
        """Test protected APIs that require authentication"""
        self.log("=== Testing Protected APIs ===")
        
        # Set session cookie for authentication
        self.session.cookies.set('session_token', self.session_token)
        
        # Test 1: Get current user (/api/auth/me)
        self.log("Testing Auth Me API...")
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            self.log(f"Auth Me API Status: {response.status_code}")
            
            if response.status_code == 200:
                user_data = response.json()
                self.log("✅ Auth Me API working")
                self.log(f"   - User ID: {user_data.get('id')}")
                self.log(f"   - Email: {user_data.get('email')}")
                self.log(f"   - Name: {user_data.get('name')}")
            else:
                self.log(f"❌ Auth Me API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Auth Me API error: {str(e)}", "ERROR")
            return False
            
        # Test 2: Create Goal
        self.log("Testing Create Goal API...")
        goal_data = {
            "goal_type": "Retirement",
            "target_amount": 500000,
            "current_amount": 25000,
            "monthly_investment": 2000,
            "risk_profile": "moderate"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/goals", json=goal_data)
            self.log(f"Create Goal API Status: {response.status_code}")
            
            if response.status_code == 200:
                goal = response.json()
                self.test_goal_id = goal.get('id')
                self.log("✅ Create Goal API working")
                self.log(f"   - Goal ID: {self.test_goal_id}")
                self.log(f"   - Goal Type: {goal.get('goal_type')}")
                self.log(f"   - Target Amount: {goal.get('target_amount')}")
            else:
                self.log(f"❌ Create Goal API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create Goal API error: {str(e)}", "ERROR")
            return False
            
        # Test 3: Get Goals
        self.log("Testing Get Goals API...")
        try:
            response = self.session.get(f"{BACKEND_URL}/goals")
            self.log(f"Get Goals API Status: {response.status_code}")
            
            if response.status_code == 200:
                goals = response.json()
                self.log("✅ Get Goals API working")
                self.log(f"   - Number of goals: {len(goals)}")
                if goals:
                    self.log(f"   - First goal type: {goals[0].get('goal_type')}")
            else:
                self.log(f"❌ Get Goals API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get Goals API error: {str(e)}", "ERROR")
            return False
            
        # Test 4: Delete Goal
        if self.test_goal_id:
            self.log("Testing Delete Goal API...")
            try:
                response = self.session.delete(f"{BACKEND_URL}/goals/{self.test_goal_id}")
                self.log(f"Delete Goal API Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    self.log("✅ Delete Goal API working")
                    self.log(f"   - Response: {result.get('message')}")
                else:
                    self.log(f"❌ Delete Goal API failed: {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Delete Goal API error: {str(e)}", "ERROR")
                return False
                
        # Test 5: Logout
        self.log("Testing Logout API...")
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/logout")
            self.log(f"Logout API Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Logout API working")
                self.log(f"   - Response: {result.get('message')}")
            else:
                self.log(f"❌ Logout API failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Logout API error: {str(e)}", "ERROR")
            return False
            
        return True
        
    def test_auth_protection(self):
        """Test that protected endpoints return 401 without authentication"""
        self.log("=== Testing Authentication Protection ===")
        
        # Clear any existing cookies
        self.session.cookies.clear()
        
        protected_endpoints = [
            ("GET", "/auth/me"),
            ("GET", "/goals"),
            ("POST", "/goals"),
        ]
        
        for method, endpoint in protected_endpoints:
            self.log(f"Testing {method} {endpoint} without auth...")
            try:
                if method == "GET":
                    response = self.session.get(f"{BACKEND_URL}{endpoint}")
                elif method == "POST":
                    # Send valid data to test auth, not validation
                    valid_goal_data = {
                        "goal_type": "Test",
                        "target_amount": 1000,
                        "current_amount": 0,
                        "monthly_investment": 100,
                        "risk_profile": "moderate"
                    }
                    response = self.session.post(f"{BACKEND_URL}{endpoint}", json=valid_goal_data)
                    
                if response.status_code == 401:
                    self.log(f"✅ {endpoint} properly protected (401)")
                else:
                    self.log(f"❌ {endpoint} not properly protected (got {response.status_code})", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Error testing {endpoint}: {str(e)}", "ERROR")
                return False
                
        return True
        
    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        self.log("=== Cleaning up test data ===")
        
        if not self.test_user_id:
            return
            
        cleanup_commands = f"""
use('test_database');
db.users.deleteMany({{id: '{self.test_user_id}'}});
db.user_sessions.deleteMany({{user_id: '{self.test_user_id}'}});
db.goals.deleteMany({{user_id: '{self.test_user_id}'}});
print('Test data cleaned up');
"""
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', cleanup_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.log("✅ Test data cleaned up successfully")
            else:
                self.log(f"⚠️ Cleanup warning: {result.stderr}", "WARN")
                
        except Exception as e:
            self.log(f"⚠️ Cleanup error: {str(e)}", "WARN")
            
    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("Starting Financial Advisory Platform Backend API Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        all_passed = True
        
        try:
            # Test public APIs first
            if not self.test_public_apis():
                all_passed = False
                
            # Test authentication protection
            if not self.test_auth_protection():
                all_passed = False
                
            # Setup test user for protected API testing
            if not self.setup_test_user():
                all_passed = False
                return all_passed
                
            # Test protected APIs
            if not self.test_protected_apis():
                all_passed = False
                
        finally:
            # Always cleanup test data
            self.cleanup_test_data()
            
        self.log("=== Test Summary ===")
        if all_passed:
            self.log("✅ All backend API tests PASSED")
        else:
            self.log("❌ Some backend API tests FAILED")
            
        return all_passed

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)