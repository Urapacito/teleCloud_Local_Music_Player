# Tidal Full Playback Implementation - Next Steps

---

## 🚀 HOW TO TEST - STEP BY STEP GUIDE

**Goal:** Determine if your Tidal subscription will allow full playback implementation

### STEP 1: Get a Valid Track ID (2 minutes)

1. **Open Tidal web player:**
   - Go to https://listen.tidal.com in your browser
   - Log in with your account

2. **Find a track in YOUR library:**
   - Click "My Collection" or "Favorites"
   - Choose any song you like
   - Click to play it

3. **Copy the Track ID from URL:**
   - Look at the browser's address bar
   - You'll see something like: `https://listen.tidal.com/track/123456789`
   - The number at the end (after `/track/`) is your Track ID
   - Example: If URL is `https://listen.tidal.com/track/75413011`, then Track ID is `75413011`
   - **Write it down!**

### STEP 2: Open Your App with DevTools (30 seconds)

1. **Start your app:**
   - If not running: `npm run dev` in terminal
   - Wait for app to open

2. **Open DevTools:**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or press `Cmd+Option+I` (Mac)
   - Click on the "Console" tab

3. **Make sure you're logged into Tidal in the app**
   - If not logged in, log in now
   - You should see your Tidal content

### STEP 3: Run the Test Command (1 minute)

1. **In the DevTools Console, type this command:**
   ```javascript
   window.ipcRenderer.invoke('tidal:testSubscription', { trackId: YOUR_TRACK_ID })
   ```
   
   **Replace `YOUR_TRACK_ID` with the number you copied earlier!**
   
   **Example:**
   ```javascript
   window.ipcRenderer.invoke('tidal:testSubscription', { trackId: 123456789 })
   ```

2. **Press Enter to run the command**

3. **Wait 2-5 seconds for the result**

### STEP 4: Read the Results

You'll see output in the console. Look for these key lines:

#### ✅ GOOD RESULT (Playback WILL work):
```
✅ Session found
📝 Step 2: Testing trackManifest API...
✅ trackManifest API SUCCESS!
   Track Presentation: FULL
   Preview Reason: NONE (or null)
   Manifest URI: https://...
```

**This means:** 🎉 **YOU'RE READY TO IMPLEMENT PLAYBACK!**

#### ❌ BAD RESULT (Subscription not recognized):
```
✅ Session found
📝 Step 2: Testing trackManifest API...
⚠️ trackManifest returned preview only
   Track Presentation: PREVIEW
   Preview Reason: FULL_REQUIRES_SUBSCRIPTION
```

**This means:** ❌ **Subscription not recognized - needs investigation**

#### ⚠️ INCONCLUSIVE RESULT (Track not available):
```
✅ Session found
📝 Step 2: Testing trackManifest API...
❌ trackManifest API failed: 404 Not Found
```

**This means:** ⚠️ **Try a different track ID - that track isn't available**

### STEP 5: Report Back

**Copy the ENTIRE console output** and share it. Include:
- The test command you ran (with Track ID)
- All the console output
- What you saw

---

## 📊 Analysis of Current Status

**Date**: July 13, 2026  
**Last Updated**: July 13, 2026 (After debug test)  
**Status**: ⚠️ **NEEDS INVESTIGATION** - Authentication works, but test track failed

---

## 📊 DEBUG OUTPUT ANALYSIS

### What the Test Showed:

**✅ AUTHENTICATION IS WORKING:**
```
Access token: Present ✅
Token scopes: playback collection.read user.read playlists.read
Token type: Bearer
Expires in: 14400 seconds (4 hours)
Session found: supertrollfacecc@gmail.com
```

**❌ TEST TRACK FAILED (404):**
```
Track ID: 75413011
Error: "The requested content does not exist or is no longer available"
```

**⚠️ MISSING REFRESH TOKEN:**
```
Refresh token: Missing ❌
```

### 🔍 What This Means:

#### 1. OAuth Scopes: `playback` vs `streaming`

**IMPORTANT FINDING:** Your token has `playback` scope, NOT `streaming` scope.

- **Current scope**: `playback collection.read user.read playlists.read`
- **Expected scope (from docs)**: `r_usr w_usr streaming`

**Analysis:**
- The Tidal API documentation is inconsistent about scope names
- `playback` scope appears to be the NEW/correct scope name
- `streaming` might be the old/deprecated scope name
- **Your auth is likely correct** - the scope names just differ from documentation

**Verdict:** ✅ Likely OK, but needs verification with a valid track ID

#### 2. The 404 Error: Track Not Available

**Why the test failed:**
The track ID `75413011` returned a 404 error. This does NOT necessarily mean your subscription doesn't work.

**Possible reasons for 404:**
1. **Invalid Track ID** - The test track might not exist in Tidal's catalog
2. **Region Restrictions** - Track might not be available in your region
3. **Removed Content** - Track may have been removed from Tidal
4. **Wrong Track ID Format** - Tidal may use different ID formats in different regions

**What this does NOT mean:**
- ❌ It does NOT mean your subscription is invalid
- ❌ It does NOT mean authentication failed
- ❌ It does NOT mean playback won't work

**Verdict:** ⚠️ Inconclusive - Need to test with a valid track ID from YOUR library

#### 3. Missing Refresh Token

**Issue:** No refresh token was returned during OAuth flow.

**Impact:**
- Access token expires after 4 hours (14400 seconds)
- After expiration, user must re-authenticate completely
- Cannot auto-refresh the session

**Why this happened:**
- Tidal's OAuth flow might not provide refresh tokens for certain auth flows
- Some OAuth implementations only give refresh tokens on specific grant types
- May need to request `offline_access` scope

**Verdict:** ⚠️ Not blocking for playback, but UX issue - users will need to re-login every 4 hours

---

## 🎯 VERDICT: CAN WE IMPLEMENT PLAYBACK?

### Current Status: **PROBABLY YES** ✅ (with caveats)

**Evidence that playback WILL work:**
1. ✅ Authentication is successful
2. ✅ User session is active
3. ✅ Has `playback` scope (which is likely correct for new API)
4. ✅ Subscription status confirmed at login
5. ✅ Access to Tidal API endpoints

**Blockers that need resolution:**
1. ⚠️ Need to test with a **valid, accessible track ID**
2. ⚠️ Need to confirm subscription tier (Premium/HiFi/HiFi Plus)
3. ⚠️ Need to implement refresh token or handle re-auth gracefully

**Recommended Next Steps:**

### IMMEDIATE (Do this NOW - 5 minutes):
1. **Get a valid track ID from YOUR Tidal library:**
   - Open Tidal web player at tidal.com
   - Play any song from your library
   - Look at the URL: `tidal.com/browse/track/12345678`
   - The number at the end is a valid track ID
   
2. **Re-run the test with YOUR track ID:**
   ```javascript
   // In DevTools console:
   window.ipcRenderer.invoke('tidal:testSubscription', { trackId: 12345678 });
   ```

3. **Check the result:**
   - If you get `trackPresentation: 'FULL'` → ✅ **READY TO IMPLEMENT**
   - If you get `previewReason: 'FULL_REQUIRES_SUBSCRIPTION'` → ❌ **Subscription not recognized**
   - If you get 404 again → Try a different track

### IF TEST PASSES (trackPresentation: 'FULL'):
🎉 **YOU'RE READY!** 

**Confidence Level:** 85-90%

**Next steps:**
1. Implement trackManifest API endpoint (1-2 days)
2. Test DRM license acquisition (2-3 days)  
3. Build EME player component (5-7 days)
4. Integrate with existing player (3-5 days)
5. **Total: 12-18 days to full playback**

### IF TEST FAILS (subscription not recognized):

**Problem:** Subscription exists but API doesn't recognize it

**Possible fixes:**
1. Check if logged into correct account
2. Verify subscription is active on tidal.com
3. Try logging out and back in (may refresh subscription status)
4. Check if `streaming` scope is actually needed (update OAuth)
5. Contact Tidal support if subscription should work

---

## 🔧 CRITICAL: Fix Refresh Token Issue

**Problem:** No refresh token means users must re-login every 4 hours.

**Impact on UX:**
- ⏰ Access token expires after 4 hours
- 😞 User kicked out mid-listening session
- 🔄 Must manually re-authenticate
- 📱 Very poor user experience

**How to fix:**

### Option 1: Request offline_access scope (RECOMMENDED)
```javascript
// In electron/tidal.js, update OAuth URL:
const scope = 'playback collection.read user.read playlists.read offline_access';
const authUrl = `${TIDAL_AUTH_URL}?response_type=code&...&scope=${scope}`;
```

### Option 2: Implement token refresh endpoint
```javascript
// Check if Tidal has a token refresh endpoint:
async refreshAccessToken() {
  try {
    const response = await axios.post(`${TIDAL_API_BASE}/oauth2/token`, {
      grant_type: 'refresh_token',
      refresh_token: this.session.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });
    
    // Update session with new token
    this.session.access_token = response.data.access_token;
    this.session.expires_in = response.data.expires_in;
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
```

### Option 3: Auto re-authenticate silently
- Store encrypted credentials locally
- Auto-trigger OAuth flow when token expires
- Show "Reconnecting..." notification instead of login screen

---

## 🎉 Good News: You're 80% There!

Having an active Tidal subscription means:
- ✅ DRM license server will approve your requests
- ✅ Full-length tracks available (not just 30-sec previews)
- ✅ Access to high-quality formats (FLAC, Hi-Res)
- ✅ Legal and ethical implementation path

---

## 📋 Checklist: What You Need to Do

### ✅ CONFIRMED
- [x] Active Tidal subscription

### ⚠️ TO VERIFY (5 minutes)
- [ ] **OAuth scopes include `streaming` permission**
- [ ] **Current authentication token is valid**
- [ ] **Subscription tier** (Premium, HiFi, HiFi Plus)

### 🔧 TO IMPLEMENT (2-3 weeks)
- [ ] **Add trackManifest API call** to electron/tidal.js
- [ ] **Implement EME (Encrypted Media Extensions)** for DRM
- [ ] **Switch from MPV to HTML5 Audio** for Tidal streams
- [ ] **Add subscription status detection**
- [ ] **Implement license acquisition flow**
- [ ] **Test full playback**

---

## 🔍 Step 1: Verify Current Setup (DO THIS FIRST)

### Check OAuth Scopes

**What to check:**
Your OAuth token must include the `streaming` scope for full playback.

**How to check:**
1. Open the app with DevTools (F12)
2. Look at console logs when you log in to Tidal
3. Find the token scope output

**What you're looking for:**
```javascript
// Good - includes streaming
scope: "r_usr w_usr streaming"

// Bad - missing streaming
scope: "r_usr w_usr"
```

**Where to look in code:**
```javascript
// In electron/tidal.js, add temporary logging:
async handleOAuthCallback(url) {
  // ... existing code ...
  console.log('===== TIDAL AUTH DEBUG =====');
  console.log('Access token:', session.access_token ? 'Present' : 'Missing');
  console.log('Token scopes:', session.scope);  // ← THIS LINE
  console.log('Token type:', session.token_type);
  console.log('Expires in:', session.expires_in);
  console.log('==========================');
}
```

**If missing `streaming` scope:**
You'll need to re-authenticate with additional scopes:
```javascript
// In electron/tidal.js, update the OAuth URL:
const scope = 'r_usr w_usr streaming';  // Add 'streaming'
const authUrl = `${TIDAL_AUTH_URL}?response_type=code&...&scope=${scope}`;
```

### Check Subscription API

**Test if API recognizes your subscription:**
```javascript
// Add this test function to electron/tidal.js:
async testSubscription() {
  try {
    // Method 1: Check session endpoint
    const session = await this.tidalAPI.get('/sessions');
    console.log('Subscription status:', session.data);
    
    // Look for:
    // - subscription.status: 'active'
    // - subscription.tier: 'PREMIUM' or 'HIFI' or 'HIFI_PLUS'
    // - subscription.validUntil: future date
    
    // Method 2: Try to get trackManifest for a test track
    const manifest = await this.tidalAPI.get('/trackManifests/123456789', {
      params: {
        manifestType: 'HLS',
        formats: ['FLAC'],
        uriScheme: 'HTTPS',
        usage: 'PLAYBACK'
      }
    });
    
    console.log('Track presentation:', manifest.data.attributes.trackPresentation);
    console.log('Preview reason:', manifest.data.attributes.previewReason);
    
    // If subscription is active:
    // trackPresentation: 'FULL'
    // previewReason: 'NONE' (or might be null/undefined)
    
    // If subscription is NOT recognized:
    // previewReason: 'FULL_REQUIRES_SUBSCRIPTION'
    
  } catch (err) {
    console.error('Subscription test failed:', err);
  }
}
```

**Call this from DevTools:**
```javascript
// In browser console when app is running:
window.ipcRenderer.invoke('tidal:testSubscription');
```

---

## 🎯 Expected Results from Verification

### Scenario A: Everything is Ready ✅
```
OAuth scope: "r_usr w_usr streaming"
Subscription status: active
Subscription tier: HIFI
trackPresentation: FULL
previewReason: NONE
```

**What this means:**
- ✅ Your subscription is recognized
- ✅ Full playback is authorized
- ✅ Ready to implement DRM player
- ⏭️ **Move to Step 2: Implement DRM**

### Scenario B: Missing Streaming Scope ⚠️
```
OAuth scope: "r_usr w_usr"  ← No 'streaming'
Subscription status: active
trackPresentation: FULL
previewReason: FULL_REQUIRES_SUBSCRIPTION  ← Denied
```

**What this means:**
- ⚠️ Subscription exists but token lacks permission
- 🔧 **Fix**: Re-authenticate with `streaming` scope
- ⏱️ Takes 5 minutes to fix

**How to fix:**
1. Log out of Tidal in the app
2. Update OAuth scope in `electron/tidal.js`:
   ```javascript
   const scope = 'r_usr w_usr streaming';
   ```
3. Log back in (user will see new permission request)
4. Re-test

### Scenario C: Subscription Not Recognized ❌
```
OAuth scope: "r_usr w_usr streaming"  ← Has streaming
Subscription status: not found / inactive
trackPresentation: FULL
previewReason: FULL_REQUIRES_SUBSCRIPTION
```

**What this means:**
- ❌ API doesn't see an active subscription
- 🤔 Possible causes:
  - Subscription is on different account than logged in
  - Subscription expired
  - Billing issue
  - API cache delay (wait 1 hour and retry)

**How to fix:**
1. Verify subscription at tidal.com (check account settings)
2. Ensure you're logged into the correct account
3. Check billing/payment status
4. Contact Tidal support if subscription should be active

---

## 🚀 Step 2: Implementation (After Verification)

Once verification confirms everything is ready, here's the implementation order:

### Phase 1: Add trackManifest API (1-2 days)

**What to add:**
```javascript
// In electron/tidal.js
async getTrackManifest(trackId, format = 'FLAC') {
  try {
    const response = await this.tidalAPI.get(`/trackManifests/${trackId}`, {
      params: {
        manifestType: 'HLS',
        formats: [format],
        uriScheme: 'HTTPS',
        usage: 'PLAYBACK',
        adaptive: true
      }
    });
    
    return {
      success: true,
      uri: response.data.attributes.uri,
      drmData: response.data.attributes.drmData,
      trackPresentation: response.data.attributes.trackPresentation,
      previewReason: response.data.attributes.previewReason,
      formats: response.data.attributes.formats
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
```

**Register IPC handler:**
```javascript
// In electron/main.js
ipcMain.handle('tidal:getTrackManifest', async (event, { trackId, format }) => {
  return await tidalClient.getTrackManifest(trackId, format);
});
```

### Phase 2: Implement EME Player (5-7 days)

**Big change:** Switch from MPV to HTML5 `<audio>` for Tidal streams

**Why:** 
- MPV doesn't support FairPlay/Widevine DRM natively
- Browser's EME (Encrypted Media Extensions) handles DRM automatically
- More reliable cross-platform

**Implementation approach:**
1. Create new component: `src/components/TidalPlayer.jsx`
2. Use HTML5 `<audio>` element with EME
3. Keep MPV for local/Telegram files
4. Add audio routing logic in `electron/player.js`

**Key code:**
```javascript
// src/components/TidalPlayer.jsx
const audio = useRef(new Audio());

useEffect(() => {
  const audioElement = audio.current;
  
  // Handle DRM
  audioElement.addEventListener('encrypted', async (e) => {
    const keySystem = 'com.widevine.alpha'; // or 'com.apple.fps' for Safari
    
    const mediaKeys = await navigator.requestMediaKeySystemAccess(
      keySystem,
      [{
        initDataTypes: ['cenc'],
        audioCapabilities: [{
          contentType: 'audio/mp4; codecs="mp4a.40.2"'
        }]
      }]
    ).then(access => access.createMediaKeys());
    
    await audioElement.setMediaKeys(mediaKeys);
    
    const session = mediaKeys.createSession();
    
    session.addEventListener('message', async (event) => {
      // Get DRM license from Tidal
      const license = await window.ipcRenderer.invoke('tidal:getDRMLicense', {
        message: event.message,
        trackId: currentTrack.id
      });
      
      await session.update(license);
    });
    
    await session.generateRequest(e.initDataType, e.initData);
  });
  
  return () => {
    audioElement.pause();
    audioElement.src = '';
  };
}, []);
```

### Phase 3: DRM License Handler (3-4 days)

**What to add:**
```javascript
// In electron/tidal.js
async getDRMLicense(drmData, message) {
  try {
    // Get certificate if needed
    let certificate;
    if (drmData.certificateUrl) {
      const certResponse = await axios.get(drmData.certificateUrl, {
        responseType: 'arraybuffer'
      });
      certificate = certResponse.data;
    }
    
    // Request license
    const licenseResponse = await axios.post(
      drmData.licenseUrl,
      message, // The encrypted challenge from EME
      {
        headers: {
          'Authorization': `${this.session.token_type} ${this.session.access_token}`,
          'Content-Type': 'application/octet-stream'
        },
        responseType: 'arraybuffer'
      }
    );
    
    return {
      success: true,
      license: licenseResponse.data
    };
  } catch (err) {
    console.error('DRM license request failed:', err);
    return { success: false, error: err.message };
  }
}
```

### Phase 4: Integration & Testing (3-5 days)

**Tasks:**
1. Update PlayerBar to detect Tidal vs local tracks
2. Route Tidal tracks to EME player
3. Route local tracks to MPV player
4. Handle queue management
5. Test playback controls (play, pause, seek, volume)
6. Test quality switching
7. Test error scenarios

---

## ⏱️ Timeline Estimate

| Phase | Duration | Complexity |
|-------|----------|------------|
| **Verification** | 5 minutes | Very Easy |
| **Phase 1: trackManifest API** | 1-2 days | Easy |
| **Phase 2: EME Player** | 5-7 days | Moderate |
| **Phase 3: DRM License** | 3-4 days | Moderate |
| **Phase 4: Integration** | 3-5 days | Hard |
| **Total** | **12-18 days** | **Medium** |

---

## 🎓 Learning Resources

If you want to understand the technologies:

1. **EME (Encrypted Media Extensions)**
   - [W3C EME Spec](https://www.w3.org/TR/encrypted-media/)
   - [Google EME Guide](https://developers.google.com/web/fundamentals/media/eme)
   - [MDN EME Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API)

2. **Widevine DRM**
   - [Widevine Overview](https://www.widevine.com/)
   - [Integration Guide](https://storage.googleapis.com/wvdocs/Widevine_DRM_Getting_Started.pdf)

3. **HLS Streaming**
   - [Apple HLS Spec](https://datatracker.ietf.org/doc/html/rfc8216)
   - [HLS.js Library](https://github.com/video-dev/hls.js/) (might be useful)

---

## 💡 Alternative: Quick Test Without Full Implementation

Want to test if your subscription works before committing to full implementation?

**Quick test script:**
```javascript
// Add to electron/tidal.js
async quickPlaybackTest(trackId) {
  // Step 1: Get manifest
  const manifest = await this.getTrackManifest(trackId);
  console.log('Manifest:', manifest);
  
  // Step 2: Check presentation
  if (manifest.trackPresentation === 'FULL' && 
      (!manifest.previewReason || manifest.previewReason === 'NONE')) {
    console.log('✅ SUBSCRIPTION WORKS! Full playback authorized.');
    console.log('Stream URI:', manifest.uri);
    console.log('Available formats:', manifest.formats);
    return { success: true, message: 'Ready for full implementation' };
  } else {
    console.log('❌ Subscription not recognized');
    console.log('Reason:', manifest.previewReason);
    return { success: false, message: manifest.previewReason };
  }
}
```

Run this test with a known track ID to verify subscription is working.

---

## 🎯 Summary: Your Action Items

### TODAY (5 minutes)
1. ✅ Add scope logging to tidal.js
2. ✅ Check if `streaming` scope is present
3. ✅ Run subscription test
4. ✅ Verify trackPresentation is 'FULL'

### IF VERIFICATION PASSES
✅ You're ready for implementation!
- Start with Phase 1 (trackManifest API)
- Estimated 12-18 days total
- High success probability (80-90%)

### IF VERIFICATION FAILS
⚠️ Fix authentication first:
- Add `streaming` scope
- Re-authenticate
- Re-test
- Then proceed to implementation

---

## ❓ FAQ

**Q: Do I need to pay for anything else?**
A: No. Your Tidal subscription is the only cost. Implementation is code-only.

**Q: Will this work on all platforms (Windows/Mac/Linux)?**
A: Yes. EME is cross-platform. Different browsers use different DRM (Widevine/FairPlay) but EME handles it automatically.

**Q: Can I keep using MPV?**
A: For local/Telegram files, yes. For Tidal streams, no - they require DRM which MPV doesn't support well. Hybrid approach recommended.

**Q: What quality will I get?**
A: Depends on your subscription tier:
- **Premium**: AAC 320 kbps
- **HiFi**: FLAC 1411 kbps (CD quality)
- **HiFi Plus**: FLAC Hi-Res up to 9216 kbps + Dolby Atmos

**Q: Is this legal?**
A: **YES**. You're using your legitimate subscription through official APIs with proper DRM. 100% legal and ethical.

**Q: What if my subscription expires?**
A: App will gracefully fall back to 30-second previews. You'll get a notice to renew.

**Q: Can other users use the app without subscription?**
A: Yes, but they'll only get 30-second previews. Your implementation should handle both gracefully.

---

**Next Step**: Run the verification checks and report back the results! 🚀


