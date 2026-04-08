# OneSignal Integration Fix Plan

## Executive Summary

The OneSignal push notification integration is failing due to multiple issues:
1. **Double SDK initialization** - OneSignal is initialized in both `index.html` and `onesignal.ts`
2. **No player ID format validation** - Legacy FCM tokens are accepted and stored
3. **No valid member subscriptions** - Database contains only legacy FCM tokens
4. **Missing external user ID linking** - Members not properly linked to OneSignal players

## Implementation Plan

### Phase 1: Code Fixes

#### Task 1.1: Remove Duplicate SDK Initialization
**File:** `client/index.html`

**Current State:**
```html
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "35450185-5580-4875-a13e-ce7fa4b46523",
      ...
    });
  });
</script>
```

**Fix:** Remove the init() call from index.html. Keep only the SDK loader:
```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
</script>
```

**Rationale:** The `OneSignalManager` class in `onesignal.ts` already handles initialization. Having two init() calls causes SDK conflicts.

---

#### Task 1.2: Add Player ID Format Validation
**File:** `server/routes/push.ts`

**Add validation function:**
```typescript
// Validate OneSignal player ID format (UUID)
function isValidOneSignalPlayerId(playerId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(playerId);
}
```

**Update subscription handler:**
```typescript
if (!playerId) {
  return res.status(400).json({ error: "Player ID required" });
}

if (!isValidOneSignalPlayerId(playerId)) {
  console.warn('Push: Invalid OneSignal player ID format:', playerId.substring(0, 20));
  return res.status(400).json({ 
    error: "Invalid OneSignal player ID format. Expected UUID format." 
  });
}
```

**Rationale:** Prevents legacy FCM tokens from being stored in the database.

---

#### Task 1.3: Add Debug Logging to Server
**File:** `server/pushNotifications.ts`

**Add to makeOneSignalRequest():**
```typescript
async function makeOneSignalRequest(endpoint: string, body: any): Promise<any> {
  console.log('OneSignal: Making request to', endpoint);
  console.log('OneSignal: Request body:', JSON.stringify(body, null, 2));
  
  const response = await fetch(`https://api.onesignal.com/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OneSignal: API error response:', errorText);
    throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
```

---

### Phase 2: Database Cleanup

#### Task 2.1: Clear Legacy FCM Tokens
**Execute SQL:**
```sql
-- Mark legacy FCM tokens as inactive
UPDATE push_subscriptions 
SET is_active = false 
WHERE endpoint LIKE '%APA91b%' 
   OR endpoint LIKE '%fcm%'
   OR endpoint LIKE '%firebase%';

-- Or completely clear for fresh start
-- TRUNCATE push_subscriptions;
```

---

### Phase 3: OneSignal Dashboard Configuration

#### Task 3.1: Verify App Configuration
**Dashboard URL:** https://dashboard.onesignal.com/apps/35450185-5580-4875-a13e-ce7fa4b46523

**Checklist:**
- [ ] Verify App ID matches: `35450185-5580-4875-a13e-ce7fa4b46523`
- [ ] Copy REST API Key from Settings → Keys & IDs
- [ ] Ensure `ONESIGNAL_REST_API_KEY` env var is set
- [ ] Check Platform settings for Web Push
- [ ] Verify allowed domains include production URL

#### Task 3.2: Configure Web Push Settings
1. Go to Settings → Platform
2. Enable Web Push
3. Configure:
   - Site URL: Production domain
   - Default Notification Icon URL
   - Service Worker path: `/OneSignalSDKWorker.js`

#### Task 3.3: Check Audience
1. Go to Audience
2. Verify if any players exist
3. Check if external user IDs are linked

---

### Phase 4: Client-Side Subscription Flow

#### Task 4.1: Ensure External User ID is Set
**File:** `client/src/lib/onesignal.ts`

The current implementation has `setExternalUserId()` but it needs to be called after login.

**Verify this is called in auth flow:**
- After member login: `setOneSignalExternalUserId(member.id)`
- After admin login: `setOneSignalExternalUserId(user.id)`

#### Task 4.2: Register Player ID with Server
After OneSignal subscription, send player ID to server:

```typescript
// In onesignal.ts or NotificationInitializer.tsx
const playerId = await oneSignalManager.getPlayerId();
if (playerId) {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      externalId: userId,
      memberId: memberId,
      userId: userId
    })
  });
}
```

---

### Phase 5: Testing

#### Task 5.1: Test Subscription Flow
1. Open app in browser
2. Open DevTools Console
3. Log in as member
4. Check for OneSignal initialization logs
5. Accept notification permission prompt
6. Verify player ID in database (UUID format)
7. Verify player appears in OneSignal Dashboard

#### Task 5.2: Test Notification Sending
1. Use `/api/push/test` endpoint
2. Check server logs for OneSignal API response
3. Verify notification appears on device

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/index.html` | Remove duplicate `OneSignal.init()` call |
| `server/routes/push.ts` | Add player ID validation |
| `server/pushNotifications.ts` | Add debug logging |
| Database | Clear legacy FCM tokens |

---

## Environment Variables Required

```env
ONESIGNAL_APP_ID=35450185-5580-4875-a13e-ce7fa4b46523
ONESIGNAL_REST_API_KEY=<get-from-onesignal-dashboard>
```

---

## Verification Checklist

- [ ] Duplicate initialization removed from index.html
- [ ] Player ID validation added to push.ts
- [ ] Debug logging added to pushNotifications.ts
- [ ] Legacy FCM tokens cleared from database
- [ ] ONESIGNAL_REST_API_KEY set in environment
- [ ] Test subscription creates valid player ID
- [ ] Player appears in OneSignal Dashboard
- [ ] Test notification delivered successfully
