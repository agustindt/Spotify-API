// spotify.ts

export interface Track {
  id: string
  playedAt: Date
  genres: string[]
  // Additional metadata for display purposes
  name: string
  artists: string[]
}

export interface PlaylistGroup {
  month: string
  tracks: Track[]
}

export interface GenreGroup {
  genre: string
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

export async function fetchRecentlyPlayed(
  token: string,
  after: number
): Promise<Track[]> {
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

  const artistIds = new Set<string>()
  for (const item of data.items) {
    for (const artist of item.track.artists) {
      artistIds.add(artist.id as string)
    }
  }
  const idArray = Array.from(artistIds)
  const artistGenres: Record<string, string[]> = {}
  for (let i = 0; i < idArray.length; i += 50) {
    const chunk = idArray.slice(i, i + 50).join(',')
    const resArtists = await fetch(
      `https://api.spotify.com/v1/artists?ids=${chunk}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!resArtists.ok) {
      throw new Error('Failed to fetch artist genres')
    }
    const artistsData = await resArtists.json()
    for (const artist of artistsData.artists) {
      artistGenres[artist.id] = artist.genres as string[]
    }
  }

  return data.items.map((item: any) => ({
    id: item.track.id as string,
    playedAt: new Date(item.played_at),
    genres: item.track.artists.flatMap((a: any) => artistGenres[a.id] || []),
    name: item.track.name as string,
    artists: item.track.artists.map((a: any) => a.name as string)
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

export function groupTracksByGenre(tracks: Track[]): GenreGroup[] {
  const groups: { [genre: string]: Track[] } = {}

  for (const track of tracks) {
    if (!track.genres.length) continue
    for (const genre of track.genres) {
      if (!groups[genre]) {
        groups[genre] = []
      }
      groups[genre].push(track)
    }
  }

  return Object.entries(groups).map(([genre, tracks]) => ({
    genre,
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
