#!/usr/bin/env python3
"""Debug script to capture console logs from MemberWorkouts component."""

from playwright.sync_api import sync_playwright
import json
import time

def main():
    console_logs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Capture console logs
        def handle_console(msg):
            log_entry = {
                'type': msg.type,
                'text': msg.text,
                'location': f"{msg.location.get('url', '')}:{msg.location.get('lineNumber', '')}"
            }
            console_logs.append(log_entry)
            # Print in real-time
            print(f"[{msg.type}] {msg.text}")
        
        page.on('console', handle_console)
        
        # Also capture network requests
        def handle_response(response):
            if 'workout' in response.url or 'member' in response.url:
                print(f"[NETWORK] {response.status} {response.url}")
                try:
                    if response.ok and 'json' in response.headers.get('content-type', ''):
                        body = response.json()
                        print(f"[NETWORK] Response body (first 500 chars): {json.dumps(body, indent=2)[:500]}")
                except Exception as e:
                    print(f"[NETWORK] Could not parse response: {e}")
        
        page.on('response', handle_response)
        
        # Navigate to the app (frontend is on port 3000)
        print("Navigating to http://localhost:3000 ...")
        page.goto('http://localhost:3000', wait_until='networkidle')
        page.wait_for_timeout(2000)
        
        print(f"\nCurrent URL: {page.url}")
        print(f"Page title: {page.title()}")
        
        # Take a screenshot to see current state
        page.screenshot(path='/tmp/debug_workouts_initial.png')
        print("Screenshot saved to /tmp/debug_workouts_initial.png")
        
        # Check for login form
        print("\nChecking for login form...")
        page.wait_for_timeout(1000)
        
        # Look for a Login button/link to click
        login_button = page.locator('button:has-text("Login"), a:has-text("Login"), [href*="login"]')
        if login_button.count() > 0:
            print("Found Login button, clicking...")
            login_button.first.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)
            print(f"After clicking Login URL: {page.url}")
            page.screenshot(path='/tmp/debug_workouts_login_page.png')
        
        # Check if this is member login (phone + OTP)
        phone_input = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone"], input[placeholder*="Phone"], input[id="phone"]')
        
        if phone_input.count() > 0:
            print("Member login page detected (phone + OTP)...")
            # Fill phone number
            phone_input.first.fill('9962017899')
            page.wait_for_timeout(500)
            
            # Click send OTP button
            send_otp_btn = page.locator('button:has-text("Send"), button:has-text("OTP"), button:has-text("Get")')
            if send_otp_btn.count() > 0:
                send_otp_btn.first.click()
                page.wait_for_timeout(3000)  # Wait for OTP to be sent
                print("OTP sent, checking console for OTP code...")
                
                # Look for OTP in console logs or on page
                otp_code = None
                for log in console_logs:
                    if 'demoOtp' in log['text'] or 'OTP' in log['text']:
                        print(f"Found OTP log: {log['text']}")
                        # Try to extract OTP
                        import re
                        match = re.search(r'"demoOtp":"(\d+)"', log['text'])
                        if match:
                            otp_code = match.group(1)
                            print(f"Extracted OTP: {otp_code}")
                
                # If no OTP found, use the one we know: 659582
                if not otp_code:
                    # First request a new OTP via API
                    print("Requesting new OTP via API...")
                    import urllib.request
                    req = urllib.request.Request(
                        'http://localhost:5000/api/auth/member/send-otp',
                        data=json.dumps({"phone":"9962017899"}).encode(),
                        headers={'Content-Type': 'application/json'},
                        method='POST'
                    )
                    with urllib.request.urlopen(req) as response:
                        result = json.loads(response.read().decode())
                        otp_code = result.get('demoOtp')
                        print(f"Got OTP from API: {otp_code}")
                
                if otp_code:
                    # Fill OTP
                    otp_input = page.locator('input[name="otp"], input[placeholder*="OTP"], input[placeholder*="otp"], input[type="text"]')
                    if otp_input.count() > 0:
                        otp_input.first.fill(otp_code)
                        page.wait_for_timeout(500)
                        
                        # Click verify button
                        verify_btn = page.locator('button:has-text("Verify"), button:has-text("Login"), button:has-text("Submit")')
                        if verify_btn.count() > 0:
                            verify_btn.first.click()
                            page.wait_for_load_state('networkidle')
                            page.wait_for_timeout(3000)
                            print(f"After login URL: {page.url}")
                            page.screenshot(path='/tmp/debug_workouts_after_login.png')
        
        # Now navigate to member profile workouts tab
        # The member ID is cd372530-bedc-4388-b40a-fc8494d1c91d
        print("\nNavigating to member profile workouts tab...")
        page.goto('http://localhost:3000/members/cd372530-bedc-4388-b40a-fc8494d1c91d', wait_until='networkidle')
        page.wait_for_timeout(2000)
        print(f"Current URL: {page.url}")
        page.screenshot(path='/tmp/debug_workouts_member_profile.png')
        
        # Click on Workouts tab
        workouts_tab = page.locator('[role="tab"]:has-text("Workouts"), button:has-text("Workouts")')
        if workouts_tab.count() > 0:
            print("Clicking Workouts tab...")
            workouts_tab.first.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(5000)  # Wait for data to load
            print("Workouts tab clicked, waiting for data...")
            page.screenshot(path='/tmp/debug_workouts_tab.png')
        
        # Wait for any pending console logs
        page.wait_for_timeout(3000)
        
        browser.close()
    
    # Print summary of MemberWorkouts logs
    print("\n" + "="*60)
    print("SUMMARY OF [MemberWorkouts] LOGS:")
    print("="*60)
    for log in console_logs:
        if 'MemberWorkouts' in log['text']:
            print(f"{log['text']}")
    
    print("\n" + "="*60)
    print("ALL CONSOLE LOGS:")
    print("="*60)
    for log in console_logs:
        print(f"[{log['type']}] {log['text']}")

if __name__ == '__main__':
    main()
