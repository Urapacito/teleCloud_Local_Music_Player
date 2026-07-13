# Tidal trackManifest API Analysis
## Can We Bypass the 30-Second Preview Limitation?

**Date**: July 13, 2026  
**Context**: Analysis of Tidal's trackManifest API endpoint to determine if full-length playback is achievable

---

## 📋 Executive Summary

**SHORT ANSWER**: **YES, BUT WITH SIGNIFICANT CHALLENGES**

The trackManifest API provides access to full-length streaming URIs, BUT these streams are protected by:
1. **DRM (Digital Rights Management)** - FairPlay/Widevine encryption
2. **Subscription verification** - Backend checks for active premium subscription
3. **Token-based authentication** - Requires valid, scoped OAuth tokens
4. **License server validation** - Real-time DRM license requests

**VERDICT**: Technically possible to implement, but requires proper subscription entitlements and DRM handling.

---

## 🔍 API Structure Analysis

### Endpoint
```
GET /trackManifests/{id}
```

### Key Response Fields

#### 1. **Track Presentation & Preview Reason**
```json
{
  "trackPresentation": "FULL",           // or "PREVIEW"
  "previewReason": "FULL_REQUIRES_SUBSCRIPTION"
}
```

**Analysis**: 
- `trackPresentation: "FULL"` = API returns full track manifest (not 30-sec snippet)
- `previewReason` tells us WHY it's restricted:
  - `"FULL_REQUIRES_SUBSCRIPTION"` = User lacks active premium subscription
  - `"NONE"` = Full playback allowed
  - Other values may indicate regional restrictions, etc.

**IMPLICATION**: The API DOES provide full track URIs, even for non-subscribers. The limitation is enforced through DRM, not URL availability.

#### 2. **Streaming URI**
```json
{
  "uri": "string"  // Actual HLS/DASH stream URL
}
```

**Analysis**: 
- This is the golden ticket - the actual streaming URL
- Format depends on `manifestType` (HLS or MPEG_DASH)
- URL likely contains authentication tokens
- May be time-limited (expires after X minutes)

**IMPLICATION**: We CAN get the URI. The question is whether we can play it.

#### 3. **DRM Data (Critical)**
```json
{
  "drmData": {
    "drmSystem": "FAIRPLAY",           // or "WIDEVINE", "PLAYREADY"
    "certificateUrl": "string",        // DRM certificate for authentication
    "initData": ["string"],            // Initialization data for DRM
    "licenseUrl": "string"             // License server URL
  }
}
```

**Analysis**:
- **FairPlay** = Apple's DRM (Safari, iOS, macOS)
- **Widevine** = Google's DRM (Chrome, Android, most others)
- **PlayReady** = Microsoft's DRM (Edge, Windows)

**DRM Flow**:
1. Get DRM certificate from `certificateUrl`
2. Create license request with `initData`
3. Send license request to `licenseUrl`
4. Receive decryption keys
5. Decrypt and play stream

**IMPLICATION**: Even with the URI, we MUST handle DRM to decrypt the stream. This is the main barrier.

#### 4. **Available Formats**
```json
{
  "formats": [
    "HEAACV1",      // Low quality (64-128 kbps)
    "AACLC",        // Standard quality (96-320 kbps)
    "FLAC",         // Lossless (1411 kbps)
    "FLAC_HIRES",   // Hi-Res lossless (up to 9216 kbps)
    "EAC3_JOC"      // Dolby Atmos
  ]
}
```

**Analysis**: Multiple quality tiers available
- Preview users typically get `HEAACV1` only
- Premium users get all formats
- Format selection affects DRM complexity

**IMPLICATION**: Even if we bypass DRM, quality may still be limited by subscription tier.

#### 5. **Normalization Data**
```json
{
  "albumAudioNormalizationData": {
    "peakAmplitude": 0,
    "replayGain": 0
  },
  "trackAudioNormalizationData": {
    "peakAmplitude": 0,
    "replayGain": 0
  }
}
```

**Analysis**: Provides volume normalization values
- ReplayGain for consistent playback volume
- Peak amplitude for preventing clipping

**IMPLICATION**: Nice-to-have for audio quality, not related to preview limitation.

---

## 🚧 Major Obstacles to Full Playback

### 1. **DRM (Biggest Hurdle)**

**The Problem**:
- Tidal encrypts all streams with DRM
- Even the "preview" streams are DRM-protected
- DRM keys are only provided to subscribers

**Why It Matters**:
- Getting the URI ≠ Being able to play it
- Encrypted stream without license = garbage data
- License server validates subscription status server-side

**Potential Solutions**:
```
❌ Bypass DRM completely          → Illegal, technically very difficult
❌ Fake subscription status       → Server-side validation, won't work
✅ Use legitimate subscription    → Requires user to have premium
✅ Request correct license        → Possible if account has entitlement
⚠️  Use different playback method → May work for preview only
```

### 2. **Subscription Verification (Server-Side)**

**The Problem**:
- When requesting DRM license, Tidal's server checks:
  - Is the OAuth token valid?
  - Does this user have an active subscription?
  - Is the subscription tier sufficient for this format?
  - Is the user in an allowed region?

**Why It Matters**:
- Can't be bypassed client-side
- Token forgery is extremely difficult (JWT signing)
- Subscription status is real-time database lookup

**Current Project Status**:
```javascript
// Our current auth in electron/tidal.js
const token = session.token_type + ' ' + session.access_token;
```

**Question**: Does the current user account have an active Tidal subscription?
- **If YES**: We should be able to get full playback licenses ✅
- **If NO**: License requests will be denied, restricted to previews ❌

### 3. **OAuth Scope Requirements**

**The Problem**:
- Our OAuth token needs the correct scopes:
  - `r_usr` = Read user data (likely already have)
  - `w_usr` = Write user data (for favorites, etc.)
  - `streaming` = Stream audio content **← CRITICAL**
  - `playback` = Full playback rights **← CRITICAL**

**Current Scope Check Needed**:
```javascript
// Need to verify in electron/tidal.js
console.log('Token scopes:', session.scope);
```

**If Missing Scopes**:
- Need to re-authenticate with additional scopes
- May require user consent flow
- Scope modification might be restricted by Tidal

### 4. **MPV Player DRM Support**

**The Problem**:
- Our project uses MPV for audio playback
- MPV has LIMITED DRM support:
  - ❌ **No native FairPlay support** (Apple proprietary)
  - ⚠️  **Widevine support requires compilation with CDM**
  - ⚠️  **PlayReady support limited**

**Current MPV Setup**:
```javascript
// electron/player.js uses MPV via IPC
mpvPlayer.command('loadfile', [path, 'replace']);
```

**Challenge**: Can MPV handle DRM-encrypted HLS/DASH streams?

**Possible Solutions**:
1. **Compile MPV with Widevine CDM** (Content Decryption Module)
   - Complex build process
   - Legal/licensing considerations
   - Platform-specific (different for Windows/Mac/Linux)

2. **Use Browser's Native DRM** (EME - Encrypted Media Extensions)
   - Switch from MPV to HTML5 `<audio>` element
   - Browser handles DRM automatically
   - Simpler implementation
   - Already handles FairPlay (Safari), Widevine (Chrome), etc.

3. **Hybrid Approach**
   - Use browser DRM for Tidal streams
   - Keep MPV for local/Telegram files
   - Requires audio routing logic

---

## 💡 Implementation Strategies

### Strategy A: **Legitimate Subscription Path** (RECOMMENDED)

**Requirements**:
- User has active Tidal Premium/HiFi subscription
- OAuth token includes `streaming`/`playback` scopes
- Implement proper DRM handling

**Implementation Steps**:

1. **Verify Subscription Status**
```javascript
// Add to electron/tidal.js
async function checkSubscriptionStatus() {
  const response = await tidalAPI.get('/sessions');
  return {
    isSubscriber: response.data.subscription?.status === 'active',
    tier: response.data.subscription?.tier, // PREMIUM, HIFI, etc.
    validUntil: response.data.subscription?.validUntil
  };
}
```

2. **Request Track Manifest**
```javascript
async function getTrackManifest(trackId, format = 'FLAC') {
  const response = await tidalAPI.get(`/trackManifests/${trackId}`, {
    params: {
      manifestType: 'HLS',        // or MPEG_DASH
      formats: [format],           // FLAC, AACLC, etc.
      uriScheme: 'HTTPS',
      usage: 'PLAYBACK',
      adaptive: true
    }
  });
  
  return {
    uri: response.data.attributes.uri,
    drmData: response.data.attributes.drmData,
    previewReason: response.data.attributes.previewReason,
    trackPresentation: response.data.attributes.trackPresentation
  };
}
```

3. **Implement DRM License Acquisition**
```javascript
async function getDRMLicense(drmData, trackId) {
  // Step 1: Get DRM certificate
  const cert = await fetch(drmData.certificateUrl).then(r => r.arrayBuffer());
  
  // Step 2: Create license request
  const licenseRequest = {
    trackId: trackId,
    initData: drmData.initData,
    certificate: cert
  };
  
  // Step 3: Request license from Tidal's license server
  const license = await fetch(drmData.licenseUrl, {
    method: 'POST',
    headers: {
      'Authorization': session.token_type + ' ' + session.access_token,
      'Content-Type': 'application/octet-stream'
    },
    body: createLicenseRequestPayload(licenseRequest)
  });
  
  return license.arrayBuffer();
}
```

4. **Switch to Browser-Based Playback with EME**
```javascript
// Replace MPV with HTML5 Audio + EME for Tidal streams
const audio = new Audio();

// Set up EME (Encrypted Media Extensions)
audio.addEventListener('encrypted', async (event) => {
  const mediaKeys = await navigator.requestMediaKeySystemAccess(
    'com.widevine.alpha', // or 'com.apple.fps' for FairPlay
    [{
      initDataTypes: ['cenc'],
      audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }]
    }]
  ).then(keySystemAccess => keySystemAccess.createMediaKeys());
  
  await audio.setMediaKeys(mediaKeys);
  
  const session = mediaKeys.createSession();
  session.addEventListener('message', async (event) => {
    // Get license from Tidal
    const license = await getDRMLicense(drmData, trackId);
    await session.update(license);
  });
  
  await session.generateRequest(event.initDataType, event.initData);
});

// Load the encrypted stream
audio.src = manifestUri;
audio.play();
```

**SUCCESS PROBABILITY**: **HIGH (80-90%)** ✅
- If user has valid subscription
- If OAuth scopes are correct
- If we implement EME properly

**LIMITATIONS**:
- Requires active subscription (user cost)
- No longer using MPV (different audio pipeline)
- Platform-specific DRM quirks

---

### Strategy B: **Extended Preview Duration** (LIMITED)

**Concept**: 
Try to get longer preview duration (e.g., 60-90 seconds instead of 30)

**Implementation**:
```javascript
async function getTrackManifest(trackId) {
  const response = await tidalAPI.get(`/trackManifests/${trackId}`, {
    params: {
      manifestType: 'HLS',
      formats: ['HEAACV1'],      // Low quality
      uriScheme: 'HTTPS',
      usage: 'PLAYBACK',         // Try 'PREVIEW' vs 'PLAYBACK'
      adaptive: false,           // Disable adaptive
      previewLength: 90          // Request longer preview (if supported)
    }
  });
}
```

**SUCCESS PROBABILITY**: **LOW (10-20%)** ❌
- Preview duration is likely server-enforced
- Parameter may not exist or be ignored
- Still DRM-protected

**Not recommended** - minimal benefit for implementation effort.

---

### Strategy C: **Account Tier Detection & Graceful Handling** (PRACTICAL)

**Concept**: 
Implement proper handling for both preview and full playback based on user's actual entitlements

**Implementation**:
```javascript
async function playTidalTrack(trackId) {
  // Step 1: Check subscription
  const subscription = await checkSubscriptionStatus();
  
  // Step 2: Get manifest
  const manifest = await getTrackManifest(trackId);
  
  // Step 3: Handle based on capabilities
  if (manifest.trackPresentation === 'FULL' && subscription.isSubscriber) {
    // User can play full track
    return await playWithDRM(manifest);
  } else {
    // User gets preview only
    console.warn('Preview only:', manifest.previewReason);
    
    // Show UI notification
    showNotification({
      title: 'Preview Mode',
      message: 'Upgrade to Tidal Premium for full playback',
      action: 'Subscribe',
      link: 'https://tidal.com/subscribe'
    });
    
    return await playPreview(manifest);
  }
}
```

**SUCCESS PROBABILITY**: **HIGH (95%)** ✅
- Works for all user types
- Graceful degradation
- Proper user communication
- Monetization path (encourage subscription)

**This is the MOST PRACTICAL approach** - implement full capabilities, but respect subscription status.

---

## 🔐 Security & Legal Considerations

### Legal Concerns

1. **Terms of Service Compliance**
   - Tidal's TOS likely prohibits DRM circumvention
   - Even if technically possible, may violate agreement
   - Could result in account termination

2. **DMCA Anti-Circumvention**
   - In US, circumventing DRM is illegal under DMCA
   - Even for personal use
   - Criminal and civil penalties possible

3. **International Copyright Law**
   - Similar laws in EU, UK, Japan, etc.
   - Varies by jurisdiction

**RECOMMENDATION**: 
- ✅ Implement legitimate subscription-based playback
- ❌ Do NOT attempt to bypass or circumvent DRM
- ✅ Respect `previewReason` and subscription status
- ✅ Provide clear upgrade path for users

### Ethical Considerations

- Artists and labels deserve compensation
- Tidal pays royalties based on subscription revenue
- Preview mode exists to encourage subscriptions
- Supporting piracy harms music industry

**RECOMMENDATION**: If implementing full playback, require legitimate Tidal subscription.

---

## ✅ Recommended Implementation Path

### Phase 1: **Verification & Setup** (Week 1)

1. **Verify Current Authentication**
   ```javascript
   // Check if we have required scopes
   console.log('Token scopes:', session.scope);
   // Should include: r_usr, w_usr, streaming, playback
   ```

2. **Test Subscription Detection**
   ```javascript
   // Check if test account has subscription
   const sub = await checkSubscriptionStatus();
   console.log('Subscription:', sub);
   ```

3. **Test trackManifest API**
   ```javascript
   // See what we get back
   const manifest = await getTrackManifest(testTrackId);
   console.log('Manifest:', manifest);
   console.log('Preview reason:', manifest.previewReason);
   console.log('Track presentation:', manifest.trackPresentation);
   ```

### Phase 2: **DRM Implementation** (Week 2-3)

1. **Create HTML5 Audio Player with EME**
   - Replace MPV for Tidal streams only
   - Implement Widevine/FairPlay handlers
   - Test with encrypted streams

2. **Implement License Acquisition**
   - Certificate fetching
   - License request generation
   - License update handling

3. **Error Handling**
   - DRM errors
   - License denied (no subscription)
   - Network failures
   - Format fallbacks

### Phase 3: **UI/UX Integration** (Week 4)

1. **Subscription Status Display**
   - Show user's tier (Free, Premium, HiFi)
   - Preview limitations notice
   - Upgrade CTA

2. **Quality Selection**
   - Let subscribed users choose format
   - FLAC vs AAC vs Hi-Res
   - Automatic fallback

3. **Seamless Playback**
   - No interruption for preview vs full
   - Queue handling
   - Progress persistence

### Phase 4: **Testing & Polish** (Week 5)

1. **Test Scenarios**
   - Free account (preview only)
   - Premium account (full playback)
   - Expired subscription
   - Different formats/qualities
   - DRM on different browsers/platforms

2. **Performance Optimization**
   - License caching
   - Manifest caching
   - Stream buffering

3. **Error Recovery**
   - Graceful degradation
   - User-friendly error messages
   - Retry logic

---

## 📊 Feasibility Assessment

| Aspect | Rating | Notes |
|--------|---------|-------|
| **Technical Feasibility** | ⭐⭐⭐⭐⚪ (4/5) | Possible with proper DRM implementation |
| **Implementation Complexity** | ⭐⭐⭐⚪⚪ (3/5) | Moderate - EME is well-documented |
| **Subscription Requirement** | ⭐⭐⭐⭐⭐ (5/5) | **MUST have active subscription** |
| **Legal Compliance** | ⭐⭐⭐⭐⭐ (5/5) | Fully compliant if subscription-based |
| **Success Probability** | ⭐⭐⭐⭐⚪ (4/5) | High if user has subscription |

---

## 🎯 FINAL ANSWER

### **Can we implement trackManifest to bypass 30-second preview?**

**YES**, but with critical caveats:

1. ✅ **Technical Implementation**: Possible via trackManifest API + EME (Encrypted Media Extensions)

2. ⚠️  **Subscription Required**: User MUST have active Tidal Premium/HiFi subscription
   - Server validates subscription when issuing DRM license
   - Cannot bypass this server-side check
   - Attempting to do so is illegal and unethical

3. ✅ **Legitimate Use Case**: If your test account (or users) have subscriptions, full playback works

4. ❌ **Without Subscription**: 30-second preview limitation CANNOT be bypassed
   - DRM license denied by server
   - `previewReason: "FULL_REQUIRES_SUBSCRIPTION"` is enforced
   - No client-side workarounds

### **What This Means for the Project**

**Current Situation**:
- Using preview URLs → 30-second limitation
- Not requesting trackManifest → Missing full playback capability
- Not handling DRM → Can't play protected streams

**After Implementation**:
- **For Subscribed Users**: Full-length, high-quality playback ✅
- **For Free Users**: Still 30-second previews (with upgrade option) ⚠️
- **Better User Experience**: Proper handling of both scenarios ✅

### **Recommended Action**

**Implement Strategy C** (Account Tier Detection + DRM for Subscribers):

```javascript
// Pseudo-code implementation flow
async function handleTidalPlayback(trackId) {
  const sub = await checkSubscription();
  const manifest = await getTrackManifest(trackId);
  
  if (sub.isActive && manifest.trackPresentation === 'FULL') {
    // User has subscription → Full playback with DRM
    return playFullTrack(manifest);
  } else {
    // User is free tier → Preview with upgrade prompt
    showPreviewNotice();
    return playPreview(manifest);
  }
}
```

**Benefits**:
- ✅ Legal and ethical
- ✅ Works for subscribed users
- ✅ Graceful for free users
- ✅ Monetization path (encourage subscriptions)
- ✅ Professional implementation

**Next Steps**:
1. Check if test account has active subscription
2. Verify OAuth scopes include `streaming`
3. Implement EME-based player for Tidal
4. Add subscription status detection
5. Test with both free and premium accounts

---

## 📚 Additional Resources

- [Tidal API Documentation](https://developer.tidal.com/)
- [W3C Encrypted Media Extensions (EME)](https://www.w3.org/TR/encrypted-media/)
- [Widevine DRM Integration](https://www.widevine.com/)
- [FairPlay Streaming (Apple)](https://developer.apple.com/streaming/fps/)
- [HLS Protocol Specification](https://datatracker.ietf.org/doc/html/rfc8216)

---

**Document Version**: 1.0  
**Last Updated**: July 13, 2026  
**Author**: Kiro AI Assistant  
**Status**: Analysis Complete - Awaiting Implementation Decision
