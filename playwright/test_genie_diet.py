#!/usr/bin/env python3
"""
Test script for GenieDietSheet multi-meal generation.
Tests the prompt: "give me a weekend meal plan for breakfast and dinner, for my cardio workouts."
"""

from playwright.sync_api import sync_playwright
import time

def test_genie_diet_multi_meal():
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 900},
            locale='en-US'
        )
        page = context.new_page()
        
        # Track console messages
        console_messages = []
        page.on('console', lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        
        try:
            # Step 1: Navigate to the app
            print("Step 1: Navigating to the app...")
            page.goto('http://localhost:3000', wait_until='networkidle')
            page.wait_for_timeout(2000)
            
            # Take a screenshot to see the initial state
            page.screenshot(path='/tmp/genie_diet_step1_initial.png')
            print("  Screenshot saved: /tmp/genie_diet_step1_initial.png")
            
            # Step 2: Check if we need to login
            print("\nStep 2: Checking authentication state...")
            current_url = page.url
            print(f"  Current URL: {current_url}")
            
            # If on login page, we need to handle authentication
            if '/login' in current_url or '/auth' in current_url:
                print("  Login page detected. Please ensure you're logged in.")
                # For now, let's try to navigate directly to member profile
                # In a real test, you'd handle login here
            
            # Step 3: Navigate to a member's profile
            member_id = "3bbd8ba0-465c-4a17-b118-cd91d2174a69"  # Kayal P
            member_profile_url = f"http://localhost:3000/members/{member_id}"
            print(f"\nStep 3: Navigating to member profile: {member_profile_url}")
            page.goto(member_profile_url, wait_until='networkidle')
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/genie_diet_step3_member_profile.png')
            print("  Screenshot saved: /tmp/genie_diet_step3_member_profile.png")
            
            # Step 4: Click on the "Diet" tab
            print("\nStep 4: Clicking on the 'Diet' tab...")
            diet_tab = page.locator('[data-state="inactive"][value="diet"], button:has-text("Diet"), [role="tab"]:has-text("Diet")')
            if diet_tab.count() > 0:
                diet_tab.first.click()
                page.wait_for_timeout(2000)
                print("  Diet tab clicked")
            else:
                print("  Diet tab not found, trying alternative selectors...")
                # Try clicking directly on the tab text
                page.click('text=Diet')
                page.wait_for_timeout(2000)
            
            page.screenshot(path='/tmp/genie_diet_step4_diet_tab.png')
            print("  Screenshot saved: /tmp/genie_diet_step4_diet_tab.png")
            
            # Step 5: Click on "Genie Diet" button
            print("\nStep 5: Clicking on 'Genie Diet' button...")
            genie_diet_button = page.locator('button:has-text("Genie Diet")')
            if genie_diet_button.count() > 0:
                genie_diet_button.click()
                page.wait_for_timeout(2000)
                print("  Genie Diet button clicked")
            else:
                print("  ERROR: Genie Diet button not found!")
                page.screenshot(path='/tmp/genie_diet_error_no_button.png')
                return
            
            page.screenshot(path='/tmp/genie_diet_step5_sheet_open.png')
            print("  Screenshot saved: /tmp/genie_diet_step5_sheet_open.png")
            
            # Step 6: Enter the test prompt
            test_prompt = "give me a weekend meal plan for breakfast and dinner, for my cardio workouts."
            print(f"\nStep 6: Entering prompt: '{test_prompt}'")
            
            # Find the textarea in the sheet
            textarea = page.locator('textarea[placeholder*="diet"], textarea.min-h-\\[120px\\]')
            if textarea.count() > 0:
                textarea.fill(test_prompt)
                page.wait_for_timeout(1000)
                print("  Prompt entered")
            else:
                print("  ERROR: Textarea not found!")
                page.screenshot(path='/tmp/genie_diet_error_no_textarea.png')
                return
            
            page.screenshot(path='/tmp/genie_diet_step6_prompt_entered.png')
            print("  Screenshot saved: /tmp/genie_diet_step6_prompt_entered.png")
            
            # Step 7: Click "Generate Diet Plan" button
            print("\nStep 7: Clicking 'Generate Diet Plan' button...")
            generate_button = page.locator('button:has-text("Generate Diet Plan")')
            if generate_button.count() > 0:
                generate_button.click()
                print("  Generate button clicked, waiting for AI response...")
            else:
                print("  ERROR: Generate button not found!")
                page.screenshot(path='/tmp/genie_diet_error_no_generate_button.png')
                return
            
            # Step 8: Wait for generation to complete (up to 60 seconds)
            print("\nStep 8: Waiting for AI generation to complete...")
            max_wait = 60  # seconds
            start_time = time.time()
            
            while time.time() - start_time < max_wait:
                page.wait_for_timeout(3000)  # Check every 3 seconds
                
                # Check for generated meal cards
                meal_cards = page.locator('[class*="border-primary"][class*="border-2"], [class*="Generated Meal Plans"]')
                loading_spinner = page.locator('.animate-spin')
                
                elapsed = int(time.time() - start_time)
                print(f"  Elapsed: {elapsed}s - Checking for results...")
                
                # Take periodic screenshots
                if elapsed % 10 == 0:
                    page.screenshot(path=f'/tmp/genie_diet_step8_generating_{elapsed}s.png')
                    print(f"    Screenshot saved: /tmp/genie_diet_step8_generating_{elapsed}s.png")
                
                # Check if generation is complete (loading spinner gone and meal cards visible)
                if loading_spinner.count() == 0 and meal_cards.count() > 0:
                    print(f"  Generation complete after {elapsed}s!")
                    break
                    
                # Also check for error messages
                error_message = page.locator('text=/failed|error/i')
                if error_message.count() > 0:
                    print(f"  ERROR detected in UI!")
                    break
            
            page.screenshot(path='/tmp/genie_diet_step8_generation_complete.png')
            print("  Screenshot saved: /tmp/genie_diet_step8_generation_complete.png")
            
            # Step 9: Verify multiple meals were generated
            print("\nStep 9: Verifying generated meals...")
            
            # Check for the meal count in the header
            meal_count_text = page.locator('text=/Generated Meal Plans \\(\\d+\\)/')
            if meal_count_text.count() > 0:
                count_text = meal_count_text.first.text_content()
                print(f"  Found: {count_text}")
            else:
                print("  Could not find meal count text")
            
            # Count the meal cards
            meal_card_selectors = [
                'div:has(> div > h4.font-bold.text-primary)',  # Meal card with title
                '[class*="border-primary"][class*="border-2"]',  # Selected meal card
                'div:has(> input[type="checkbox"])'  # Cards with checkboxes
            ]
            
            for selector in meal_card_selectors:
                cards = page.locator(selector)
                if cards.count() > 0:
                    print(f"  Found {cards.count()} elements matching: {selector}")
            
            # Step 10: Check if "Save X Selected Meal(s)" button is visible
            print("\nStep 10: Checking save button...")
            save_button = page.locator('button:has-text("Save")')
            if save_button.count() > 0:
                save_text = save_button.first.text_content()
                print(f"  Save button text: {save_text}")
            else:
                print("  Save button not found")
            
            # Final screenshot
            page.screenshot(path='/tmp/genie_diet_final.png', full_page=True)
            print("\nFinal screenshot saved: /tmp/genie_diet_final.png")
            
            # Print console messages for debugging
            print("\n--- Console Messages ---")
            for msg in console_messages[-20:]:  # Last 20 messages
                print(f"  {msg}")
            
        except Exception as e:
            print(f"\nERROR: {e}")
            page.screenshot(path='/tmp/genie_diet_error.png')
            print("Error screenshot saved: /tmp/genie_diet_error.png")
            raise
        
        finally:
            browser.close()
            print("\nBrowser closed.")

if __name__ == "__main__":
    test_genie_diet_multi_meal()
