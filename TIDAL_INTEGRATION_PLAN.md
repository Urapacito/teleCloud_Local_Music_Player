# Tidal Integration Plan

## Overview
Integrate Tidal streaming service into teleCloud, similar to Roon's approach, allowing users to access their Tidal content alongside local music files.

---

## Architecture & Strategy

### 1. **Authentication Flow**
```
User clicks "Tidal" in sidebar
  ↓
Show Tidal login view
  ↓
User enters credentials (email/password) OR OAuth flow
  ↓
Backend authenticates with Tidal API
  ↓
Store session token securely (encrypted in local storage)
  ↓
Fetch user data and show Tidal content
```

### 2. **Technology Stack**
- **Tidal API Library**: Use `tidal-api-wrapper` or `node-tidal-api` for Node.js
- **Backend**: Electron main process (`electron/tidal.js`)
- **Frontend**: React components for UI
- **Authentication**: Secure token storage using electron-store or encrypted storage
- **Streaming**: Fetch HLS/manifest URLs from Tidal API

---

## File Structure

### New Files to Create
```
electron/
  └── tidal.js                    # Tidal API integration, authentication, data fetching

src/
  └── components/
      ├── TidalView.jsx           # Main Tidal content view
      ├── TidalLogin.jsx          # Tidal login form
      ├── TidalForYou.jsx         # "For You" recommendations
      ├── TidalArtists.jsx        # User's Tidal artists
      ├── TidalRecentPlayed.jsx   # Tidal recent history
      ├── TidalPlaylists.jsx      # User's Tidal playlists
      └── TidalAlbums.jsx         # User's Tidal albums/favorites
```

### Files to Modify
```
src/components/Sidebar.jsx        # Add "Tidal" menu item
src/App.jsx                       # Add Tidal routes and state management
electron/main.js                  # Register Tidal IPC handlers
electron/player.js                # Add Tidal stream playback support
package.json                      # Add Tidal API dependency
```

---

## Implementation Phases

### **Phase 1: Backend Setup** ⚙️
**Files**: `electron/tidal.js`, `package.json`

#### Tasks:
1. Install Tidal API library
   ```bash
   npm install tidal-api-wrapper
   # OR
   npm install tidl
   ```

2. Create `electron/tidal.js` with:
   - Authentication functions (login, logout, session management)
   - API methods:
     - `getTidalUserInfo()` - Get user profile
     - `getTidalForYou()` - Get personalized recommendations
     - `getTidalArtists()` - Get user's followed artists
     - `getTidalRecentPlayed()` - Get listening history
     - `getTidalPlaylists()` - Get user playlists
     - `getTidalFavoriteAlbums()` - Get favorite albums
     - `getTidalFavoriteTracks()` - Get favorite tracks
     - `searchTidal(query)` - Search Tidal catalog
     - `getTidalStreamUrl(trackId)` - Get playback URL

3. Set up IPC handlers in `electron/main.js`:
   ```javascript
   ipcMain.handle('tidal:login', async (event, credentials) => {...})
   ipcMain.handle('tidal:logout', async () => {...})
   ipcMain.handle('tidal:getForYou', async () => {...})
   ipcMain.handle('tidal:getArtists', async () => {...})
   // ... etc
   ```

4. Secure credential storage using `electron-store` with encryption

---

### **Phase 2: Authentication UI** 🔐
**Files**: `src/components/TidalLogin.jsx`, `src/components/Sidebar.jsx`

#### Tasks:
1. Add "Tidal" item to Sidebar.jsx:
   ```jsx
   <div onClick={() => onNavClick('tidal')}>
     <svg>...</svg> Tidal
   </div>
   ```

2. Create `TidalLogin.jsx`:
   - Login form with email/password fieldsB
   - "Sign In" button
   - Loading state during authentication
   - Error handling for invalid credentials
   - Link to Tidal signup (external)
   - Modern UI matching app design

3. Handle authentication flow in `App.jsx`:
   - Add Tidal session state
   - Check for existing session on app load
   - Store/clear session on login/logout

---

### **Phase 3: Main Tidal View** 🎵
**Files**: `src/components/TidalView.jsx`, `src/App.jsx`

#### Tasks:
1. Create `TidalView.jsx` - Main container with tabs:
   ```
   [For You] [Artists] [Recent] [Playlists] [Albums] [Tracks]
   ```

2. Design similar to Homepage.jsx with sections:
   - Tab navigation at top
   - Content area with scrollable sections
   - Consistent styling with existing app

3. Add route in App.jsx:
   ```jsx
   {activeView === 'tidal' && !tidalSession && <TidalLogin onLogin={handleTidalLogin} />}
   {activeView === 'tidal' && tidalSession && <TidalView session={tidalSession} />}
   ```

---

### **Phase 4: Content Components** 📚

#### 4.1 **TidalForYou.jsx** - Personalized Recommendations
- Fetch from Tidal's "For You" API
- Display categories: "Mixes", "Suggested Tracks", "New Releases", etc.
- Horizontal scrollable cards like Homepage

#### 4.2 **TidalArtists.jsx** - Followed Artists
- Grid of artist cards
- Artist name, image, follower count
- Click to view artist details

#### 4.3 **TidalRecentPlayed.jsx** - Listening History
- List/grid of recently played tracks from Tidal
- Track info: title, artist, album, play time
- Play button on hover

#### 4.4 **TidalPlaylists.jsx** - User Playlists
- Grid of playlist cards
- Playlist name, cover, track count
- Click to view playlist details

#### 4.5 **TidalAlbums.jsx** - Favorite Albums
- Similar to local AlbumsView.jsx
- Grid of album covers
- Click to view album tracks

#### 4.6 **TidalTracks.jsx** - Favorite Tracks
- List view like SongList.jsx
- Track details, duration, album
- Play button, add to queue

---

### **Phase 5: Playback Integration** ▶️
**Files**: `electron/player.js`, `src/components/PlayerBar.jsx`

#### Tasks:
1. Modify `player.js` to handle Tidal streams:
   ```javascript
   if (file.source === 'tidal') {
     const streamUrl = await getTidalStreamUrl(file.tidalId);
     mpvInstance.load(streamUrl);
   }
   ```

2. Differentiate Tidal tracks from local files:
   - Add `source: 'tidal'` property
   - Store Tidal track ID for streaming

3. Handle Tidal-specific features:
   - Quality selection (HiFi, Master, etc.)
   - Track reporting (scrobbling)
   - Offline mode handling

---

### **Phase 6: Additional Features** ✨

#### Optional Enhancements:
1. **Search Tidal Catalog**
   - Search bar in Tidal view
   - Search results for tracks, albums, artists, playlists

2. **Quality Settings**
   - Dropdown to select audio quality (Normal, High, HiFi, Master)
   - Store preference in settings

3. **Offline Mode**
   - Cache Tidal tracks for offline playback (if API supports)

4. **Integration with Local Library**
   - Show both local and Tidal content in unified views
   - Filter toggle: "All / Local / Tidal"

5. **Tidal Connect**
   - Control other Tidal-enabled devices (if API supports)

---

## UI/UX Design Considerations

### Visual Design
- **Tidal branding**: Use Tidal's blue/white color scheme for Tidal views
- **Sidebar icon**: Use Tidal logo or custom icon
- **Consistency**: Match existing app design patterns
- **Loading states**: Show skeletons while fetching data
- **Error handling**: Clear messages for API errors

### User Flow
```
1. User clicks "Tidal" in sidebar
2. If not logged in → Show login view
3. After login → Show "For You" tab by default
4. User can switch between tabs
5. Click on track/album → Play or show details
6. Logout option in Settings or Tidal view
```

---

## Security Considerations

1. **Credential Storage**
   - Use `electron-store` with encryption
   - Never store plain-text passwords
   - Use secure token storage

2. **API Keys**
   - Keep Tidal API credentials in `.env` file
   - Never commit API keys to git
   - Use environment variables

3. **Session Management**
   - Implement token refresh if needed
   - Handle expired sessions gracefully
   - Secure IPC communication

---

## Testing Strategy

### Manual Testing
1. Authentication flow (login, logout, session persistence)
2. Data fetching for each content type
3. Playback of Tidal tracks
4. Error scenarios (network issues, invalid credentials, API limits)
5. UI responsiveness and loading states

### Edge Cases
- No internet connection
- Expired session
- API rate limiting
- Empty content (new user with no favorites)
- Very large playlists/libraries

---

## Implementation Timeline

### Estimated Effort
- **Phase 1** (Backend): 4-6 hours
- **Phase 2** (Auth UI): 2-3 hours
- **Phase 3** (Main View): 2-3 hours
- **Phase 4** (Content Components): 6-8 hours
- **Phase 5** (Playback): 3-4 hours
- **Phase 6** (Additional Features): Optional, 4-6 hours per feature

**Total Core Implementation**: ~17-24 hours

---

## Dependencies to Install

```bash
# Tidal API wrapper
npm install tidal-api-wrapper
# OR alternative
npm install tidl

# Secure storage
npm install electron-store

# (Optional) For OAuth flow
npm install electron-oauth-helper
```

---

## Questions Before Implementation

1. **Tidal API Access**: Do you have Tidal API credentials (client ID, secret)? Or should we use an unofficial library?

2. **Authentication Method**: 
   - Prefer simple email/password login?
   - Or OAuth2 flow with browser redirect?

3. **Audio Quality**: Should we support all quality tiers (Normal/High/HiFi/Master)?

4. **Priority Features**: Which sections are most important?
   - For You (recommendations)
   - Recent Played
   - Playlists
   - Artists
   - Albums
   - Tracks

5. **Integration Level**: Should Tidal content be:
   - Separate (only in Tidal view)
   - Mixed with local content (unified library)
   - Both options?

---

## Approval Needed

Please review this plan and confirm:
- ✅ Overall approach acceptable?
- ✅ File structure makes sense?
- ✅ Implementation phases in correct order?
- ✅ Any changes or additions needed?
- ✅ Answers to questions above?

Once approved, I'll proceed with implementation! 🚀
