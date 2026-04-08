#!/usr/bin/env python3
"""
OneSignal Push Notification Delivery Test

This script tests the OneSignal notification delivery by:
1. Navigating to the deployed app
2. Checking service worker registration
3. Checking OneSignal subscription status
4. Capturing browser console logs for errors
"""

from playwright.sync_api import sync_playwright
import json
import time

# Configuration
APP_URL = "https://gym-genie-one.vercel.app/"
ONESIGNAL_APP_ID = "35450185-5580-4875-a13e-ce7fa4b46523"

def test_onesignal_setup():
    """Test OneSignal notification setup and capture diagnostic info."""
    
    console_logs = []
    
    with sync_playwright() as p:
        # Launch browser with notifications permission
        browser = p.chromium.launch(
            headless=True,
            args=['--enable-features=Notifications']
        )
        
        context = browser.new_context(
            permissions=['notifications'],
            service_workers='allow'
        )
        
        page = context.new_page()
        
        # Capture console logs
        def handle_console(msg):
            log_entry = {
                'type': msg.type,
                'text': msg.text,
                'location': f"{msg.location.get('url', '')}:{msg.location.get('lineNumber', '')}"
            }
            console_logs.append(log_entry)
            print(f"[{msg.type.upper()}] {msg.text}")
        
        page.on('console', handle_console)
        
        # Capture page errors
        def handle_error(error):
            print(f"[PAGE ERROR] {error}")
            console_logs.append({
                'type': 'error',
                'text': str(error),
                'location': 'page-error'
            })
        
        page.on('pageerror', handle_error)
        
        print("=" * 60)
        print("OneSignal Push Notification Delivery Test")
        print("=" * 60)
        
        # Navigate to the app
        print(f"\n1. Navigating to {APP_URL}...")
        page.goto(APP_URL, wait_until='networkidle', timeout=60000)
        
        # Wait for OneSignal to initialize
        print("\n2. Waiting for OneSignal to initialize...")
        time.sleep(5)  # Give OneSignal time to initialize
        
        # Check service worker registrations
        print("\n3. Checking Service Worker registrations...")
        sw_info = page.evaluate("""() => {
            return navigator.serviceWorker.getRegistrations().then(registrations => {
                return registrations.map(reg => ({
                    scope: reg.scope,
                    active: !!reg.active,
                    waiting: !!reg.waiting,
                    installing: !!reg.installing,
                    activeState: reg.active ? reg.active.state : null
                }));
            });
        }""")
        print(f"   Service Workers found: {len(sw_info)}")
        for i, sw in enumerate(sw_info):
            print(f"   SW[{i}]: scope={sw['scope']}, active={sw['active']}, state={sw['activeState']}")
        
        # Check OneSignal state
        print("\n4. Checking OneSignal state...")
        onesignal_state = page.evaluate("""() => {
            return new Promise((resolve) => {
                if (window.OneSignal) {
                    resolve({
                        available: true,
                        playerId: window.OneSignal.User?.PushSubscription?.id || null,
                        optedIn: window.OneSignal.User?.PushSubscription?.optedIn || false,
                        permission: window.OneSignal.Notifications?.permission || null,
                        permissionNative: window.OneSignal.Notifications?.permissionNative || null
                    });
                } else if (window.OneSignalDeferred) {
                    // Wait for deferred to process
                    setTimeout(() => {
                        resolve({
                            available: !!window.OneSignal,
                            playerId: window.OneSignal?.User?.PushSubscription?.id || null,
                            optedIn: window.OneSignal?.User?.PushSubscription?.optedIn || false,
                            permission: window.OneSignal?.Notifications?.permission || null,
                            permissionNative: window.OneSignal?.Notifications?.permissionNative || null,
                            deferredExists: true
                        });
                    }, 3000);
                } else {
                    resolve({
                        available: false,
                        error: 'OneSignal not found'
                    });
                }
            });
        }""")
        print(f"   OneSignal available: {onesignal_state.get('available', False)}")
        print(f"   Player ID: {onesignal_state.get('playerId', 'N/A')}")
        print(f"   Opted In: {onesignal_state.get('optedIn', False)}")
        print(f"   Permission: {onesignal_state.get('permission', 'N/A')}")
        print(f"   Native Permission: {onesignal_state.get('permissionNative', 'N/A')}")
        
        # Check notification permission
        print("\n5. Checking Notification permission...")
        notification_permission = page.evaluate("""() => {
            return Notification.permission;
        }""")
        print(f"   Notification.permission: {notification_permission}")
        
        # Check if OneSignal SDK loaded
        print("\n6. Checking OneSignal SDK loading...")
        sdk_check = page.evaluate("""() => {
            return {
                oneSignalGlobal: typeof window.OneSignal !== 'undefined',
                oneSignalDeferred: typeof window.OneSignalDeferred !== 'undefined',
                deferredLength: window.OneSignalDeferred?.length || 0,
                scripts: Array.from(document.querySelectorAll('script[src*="onesignal"]')).map(s => s.src)
            };
        }""")
        print(f"   OneSignal global: {sdk_check['oneSignalGlobal']}")
        print(f"   OneSignalDeferred: {sdk_check['oneSignalDeferred']}")
        print(f"   Deferred queue length: {sdk_check['deferredLength']}")
        print(f"   OneSignal scripts: {sdk_check['scripts']}")
        
        # Check for push subscription in localStorage
        print("\n7. Checking localStorage for OneSignal data...")
        storage_data = page.evaluate("""() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.toLowerCase().includes('onesignal')) {
                    data[key] = localStorage.getItem(key)?.substring(0, 200);
                }
            }
            return data;
        }""")
        print(f"   OneSignal localStorage keys: {list(storage_data.keys())}")
        for key, value in storage_data.items():
            print(f"   {key}: {value[:100]}...")
        
        # Take a screenshot
        print("\n8. Taking screenshot...")
        page.screenshot(path='/tmp/onesignal_test_screenshot.png', full_page=True)
        print("   Screenshot saved to /tmp/onesignal_test_screenshot.png")
        
        # Filter and display OneSignal-related console logs
        print("\n" + "=" * 60)
        print("OneSignal-related Console Logs:")
        print("=" * 60)
        
        onesignal_logs = [log for log in console_logs 
                         if 'onesignal' in log['text'].lower() 
                         or 'push' in log['text'].lower()
                         or 'service worker' in log['text'].lower()
                         or 'subscription' in log['text'].lower()]
        
        for log in onesignal_logs:
            print(f"[{log['type'].upper()}] {log['text']}")
        
        # Display errors
        print("\n" + "=" * 60)
        print("Errors Found:")
        print("=" * 60)
        
        errors = [log for log in console_logs if log['type'] == 'error']
        if errors:
            for error in errors:
                print(f"[ERROR] {error['text']}")
        else:
            print("No errors found in console logs.")
        
        browser.close()
        
        return {
            'service_workers': sw_info,
            'onesignal_state': onesignal_state,
            'notification_permission': notification_permission,
            'sdk_check': sdk_check,
            'storage_data': storage_data,
            'console_logs': console_logs,
            'onesignal_logs': onesignal_logs,
            'errors': errors
        }


if __name__ == "__main__":
    results = test_onesignal_setup()
    
    print("\n" + "=" * 60)
    print("DIAGNOSIS SUMMARY")
    print("=" * 60)
    
    # Analyze results
    issues = []
    
    # Check service worker
    sw_info = results.get('service_workers', [])
    onesignal_sw_found = any('onesignal' in sw.get('scope', '').lower() for sw in sw_info)
    if not onesignal_sw_found and len(sw_info) > 0:
        issues.append("⚠️  OneSignal service worker may not be registered correctly")
        issues.append(f"   Found {len(sw_info)} service workers, but none appear to be OneSignal's")
    
    # Check OneSignal state
    onesignal_state = results.get('onesignal_state', {})
    if not onesignal_state.get('available'):
        issues.append("❌ OneSignal SDK not available")
    elif not onesignal_state.get('playerId'):
        issues.append("⚠️  No Player ID - user may not be subscribed to push")
    elif not onesignal_state.get('optedIn'):
        issues.append("⚠️  User is not opted in to push notifications")
    
    # Check permission
    if results.get('notification_permission') != 'granted':
        issues.append(f"⚠️  Notification permission: {results.get('notification_permission')}")
    
    # Check for errors
    if results.get('errors'):
        issues.append(f"❌ {len(results['errors'])} console errors found")
    
    if issues:
        print("\nPotential Issues Found:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ No obvious issues found in the client-side setup.")
    
    print("\n" + "=" * 60)
    print("RECOMMENDATIONS")
    print("=" * 60)
    print("""
1. Check OneSignal Dashboard:
   - Go to: https://dashboard.onesignal.com/apps/35450185-5580-4875-a13e-ce7fa4b46523/audience
   - Verify the player ID exists: 1d00dee7-0795-47aa-898b-ffa70cfe8991
   - Check if external_user_id is linked: 5b986fb4-eb09-4f9b-a394-19400cc49b3a

2. Check Web Push Configuration:
   - Go to: https://dashboard.onesignal.com/apps/35450185-5580-4875-a13e-ce7fa4b46523/settings
   - Verify the domain is allowed
   - Check if FCM is configured (for Chrome)

3. Test from Dashboard:
   - Go to: https://dashboard.onesignal.com/apps/35450185-5580-4875-a13e-ce7fa4b46523/push
   - Send a test notification to the specific player ID
   - Check delivery status

4. Common Issues:
   - Service worker not handling 'push' event
   - FCM sender ID not configured in OneSignal
   - Domain not in allowed list
   - Player not subscribed (no push subscription)
""")
