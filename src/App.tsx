// App.tsx

import { useState, useEffect } from 'react'
import {
  fetchProfile,
  fetchRecentlyPlayed,
  groupTracksByMonth,
  groupTracksByGenre,
  createPlaylist,
  PlaylistGroup,
  GenreGroup,
  Track
} from './spotify'
import { login, logout, getStoredToken } from './auth'

function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<any>(null)
  const [playlists, setPlaylists] = useState<PlaylistGroup[]>([])
  const [genres, setGenres] = useState<GenreGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function summarizeArtists(tracks: Track[], limit = 3): string {
    const names = Array.from(new Set(tracks.flatMap(t => t.artists)))
    return names.slice(0, limit).join(', ')
  }

  useEffect(() => {
    getStoredToken().then(stored => {
      if (stored) setToken(stored)
    })
  }, [])

  async function analyze() {
    setError('')
    setLoading(true)
    try {
      const profile = await fetchProfile(token)
      setUser(profile)
      const now = new Date()
      const startYear = now.getFullYear()
      const startMonth = now.getMonth() - 11
      let after = new Date(startYear, startMonth, 1).getTime()
      const tracks = []
      while (true) {
        const batch = await fetchRecentlyPlayed(token, after)
        if (!batch.length) break
        tracks.push(...batch)
        const last = batch[batch.length - 1]
        after = last.playedAt.getTime() + 1000
        if (tracks.length > 1000) break
      }
      const groups = groupTracksByMonth(tracks)
      setPlaylists(groups)
      const genreGroups = groupTracksByGenre(tracks)
      setGenres(genreGroups)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create(name: string, uris: string[]) {
    if (!user) return
    try {
      await createPlaylist(token, user.id, name, uris)
      alert(`Playlist ${name} created!`)
    } catch (e: any) {
      alert(`Failed to create playlist: ${e.message}`)
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Spotify Monthly Playlist Creator</h1>
      {!token ? (
        <button onClick={login}>Login with Spotify</button>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
          <button onClick={analyze} disabled={loading}>
            Analyze Profile
          </button>
        </>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}
      {user && <p>Logged in as {user.display_name}</p>}
      {playlists.map(p => (
        <div key={p.month} style={{ marginTop: '1rem' }}>
          <h3>{p.month}</h3>
          <p>{p.tracks.length} tracks</p>
          <button
            onClick={() =>
              create(
                `Monthly ${p.month}`,
                p.tracks.map(t => `spotify:track:${t.id}`)
              )
            }
          >
            Create Playlist
          </button>
        </div>
      ))}

      {genres.length > 0 && <h2>Detected Genres</h2>}
      {genres.map(g => (
        <div key={g.genre} style={{ marginTop: '1rem' }}>
          <h3>
            {g.genre}
            {g.tracks.length > 0 && ' - ' + summarizeArtists(g.tracks)}
          </h3>
          <p>{g.tracks.length} tracks</p>
          <button
            onClick={() =>
              create(
                `Genre ${g.genre}`,
                g.tracks.map(t => `spotify:track:${t.id}`)
              )
            }
          >
            Create Playlist
          </button>
        </div>
      ))}
    </div>
  )
}

export default App
