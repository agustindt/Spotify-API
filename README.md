# Spotify Analyzer

This project is a minimal React + Vite application written in TypeScript. It connects to the Spotify Web API to analyse a user's listening history and create monthly playlists.

## Setup

1. Install dependencies (requires internet access):

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. In a browser, open `http://127.0.0.1:5173/` to view the app. Using
   `localhost` may cause WebSocket connection errors.

4. Add your Spotify application client ID to `src/auth.ts`.

5. In the Spotify Developer Dashboard, enable **Authorization Code with PKCE** and add `http://127.0.0.1:5173` (or another loopback address) to your allowed redirect URIs. **Do not use `localhost` as it is rejected by Spotify.** The value must exactly match `REDIRECT_URI` in `src/auth.ts`. Use `https://` for any non-loopback address.

6. Click **Login with Spotify**. Authorize the requested scopes when prompted. The app now uses the PKCE flow so no client secret is required:


- `user-read-recently-played`
- `playlist-modify-public` or `playlist-modify-private`

After logging in, the app will fetch your recent listening history, group tracks by month, and allow you to create playlists for each month.
