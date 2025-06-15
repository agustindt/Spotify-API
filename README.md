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

3. Open the app in your browser and provide a Spotify access token with the following scopes:

- `user-read-recently-played`
- `playlist-modify-public` or `playlist-modify-private`

The app will fetch your recent listening history, group tracks by month, and allow you to create playlists for each month.
