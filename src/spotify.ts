// spotify.ts

export interface Track {
  id: string
  playedAt: Date
  // Podés agregar más propiedades como name, artist, etc.
}

export interface PlaylistGroup {
  month: string
  tracks: Track[]
}

export interface Profile {
  id: string
  display_name: string
}

export async function fetchProfile(token: string): Promise<Profile> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error('Failed to fetch profile')
  }
  return res.json()
}

export async function fetchRecentlyPlayed(token: string, after: number): Promise<Track[]> {
  const url = new URL('https://api.spotify.com/v1/me/player/recently-played')
  url.searchParams.set('limit', '50')
  url.searchParams.set('after', String(after))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error('Failed to fetch recently played tracks')
  }
  const data = await res.json()
  return data.items.map((item: any) => ({
    id: item.track.id as string,
    playedAt: new Date(item.played_at)
  }))
}

export function groupTracksByMonth(tracks: Track[]): PlaylistGroup[] {
  const groups: { [month: string]: Track[] } = {}

  for (const track of tracks) {
    const date = new Date(track.playedAt)
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' })
    if (!groups[month]) {
      groups[month] = []
    }
    groups[month].push(track)
  }

  return Object.entries(groups).map(([month, tracks]) => ({
    month,
    tracks
  }))
}

export async function createPlaylist(token: string, userId: string, name: string, uris: string[]) {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, public: false })
  })
  if (!res.ok) throw new Error('Failed to create playlist')
  const playlist = await res.json()
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100)
    const add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: chunk })
    })
    if (!add.ok) throw new Error('Failed to add tracks')
  }
}
