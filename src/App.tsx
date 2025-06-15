import { useState } from 'react'
import {
  fetchProfile,
  fetchRecentlyPlayed,
  groupTracksByMonth,
  createPlaylist
} from './spotify'

function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<any>(null)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create(month: string, uris: string[]) {
    if (!user) return
    try {
      await createPlaylist(token, user.id, `Monthly ${month}`, uris)
      alert(`Playlist for ${month} created!`)
    } catch (e: any) {
      alert(`Failed to create playlist: ${e.message}`)
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Spotify Monthly Playlist Creator</h1>
      <p>Enter a Spotify access token with the necessary scopes.</p>
      <input
        type="text"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="Access Token"
        style={{ width: '100%' }}
      />
      <button onClick={analyze} disabled={!token || loading}>
        Analyze Profile
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}
      {user && <p>Logged in as {user.display_name}</p>}
      {playlists.map(p => (
        <div key={p.month} style={{ marginTop: '1rem' }}>
          <h3>{p.month}</h3>
          <p>{p.tracks.length} tracks</p>
          <button onClick={() => create(p.month, p.tracks.map(t => `spotify:track:${t.id}`))}>
            Create Playlist
          </button>
        </div>
      ))}
    </div>
  )
}

export default App
