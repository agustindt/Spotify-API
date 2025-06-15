export interface Track {
  id: string
  name: string
  artists: string[]
  playedAt: Date
}

export interface PlaylistData {
  month: string
  tracks: Track[]
}

export async function fetchProfile(token: string) {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return await res.json()
}

export async function fetchRecentlyPlayed(token: string, after: number) {
  const url = new URL('https://api.spotify.com/v1/me/player/recently-played')
  url.searchParams.set('limit', '50')
  if (after) url.searchParams.set('after', String(after))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch tracks')
  const data = await res.json()
  return data.items.map((item: any) => ({
    id: item.track.id,
    name: item.track.name,
    artists: item.track.artists.map((a: any) => a.name),
    playedAt: new Date(item.played_at)
  })) as Track[]
}

export function groupTracksByMonth(tracks: Track[]): PlaylistData[] {
  const map = new Map<string, Track[]>()
  for (const t of tracks) {
    const month = `${t.playedAt.getFullYear()}-${(t.playedAt.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(t)
  }
  return Array.from(map.entries()).map(([month, tracks]) => ({ month, tracks }))
}

export async function createPlaylist(
  token: string,
  userId: string,
  name: string,
  trackUris: string[]
) {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  })
  if (!res.ok) throw new Error('Failed to create playlist')
  const playlist = await res.json()
  if (trackUris.length) {
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: trackUris })
      }
    )
    if (!addRes.ok) throw new Error('Failed to add tracks')
  }
  return playlist
}
