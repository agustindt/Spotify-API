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

export interface GenreGroupingResult {
  genres: GenreGroup[]
  duplicates: Track[]
}


/**
 * Map similar or synonymous genre names to a canonical representation.
 * This reduces duplication when an artist has multiple closely related
 * genres such as "hip-hop" and "rap".
 */
function canonicalGenre(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('hip hop') || lower.includes('hip-hop') || lower === 'rap') {
    return 'hip hop'
  }
  if (lower.includes('rock')) return 'rock'
  if (lower.includes('electro') || lower.includes('edm') || lower.includes('dance')) {
    return 'electronic'
  }
  if (lower.includes('r&b') || lower.includes('rnb')) return 'r&b'
  if (lower.includes('pop')) return 'pop'
  return lower
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
  const seen: { [month: string]: Set<string> } = {}

  for (const track of tracks) {
    const date = new Date(track.playedAt)
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' })
    if (!groups[month]) {
      groups[month] = []
      seen[month] = new Set()
    }
    if (!seen[month].has(track.id)) {
      groups[month].push(track)
      seen[month].add(track.id)
    }
  }

  return Object.entries(groups).map(([month, tracks]) => ({
    month,
    tracks
  }))
}

export function groupTracksByGenre(tracks: Track[]): GenreGroup[] {
  const groups: { [genre: string]: Track[] } = {}
  const seen: { [genre: string]: Set<string> } = {}

  for (const track of tracks) {
    if (!track.genres.length) continue
    for (const genre of track.genres) {
      const canon = canonicalGenre(genre)
      if (!groups[canon]) {
        groups[canon] = []
        seen[canon] = new Set()
      }
      if (!seen[canon].has(track.id)) {
        groups[canon].push(track)
        seen[canon].add(track.id)
      }
    }
  }

  return Object.entries(groups).map(([genre, tracks]) => ({
    genre,
    tracks
  }))
}

export function groupTracksByGenreDedup(tracks: Track[]): GenreGroupingResult {
  const groups: { [genre: string]: Track[] } = {}
  const seen: { [genre: string]: Set<string> } = {}
  const trackGenres: Record<string, Set<string>> = {}
  const trackMap: Record<string, Track> = {}

  for (const track of tracks) {
    trackMap[track.id] = track
    if (!track.genres.length) continue
    const uniqueGenres = Array.from(
      new Set(track.genres.map(g => canonicalGenre(g)))
    )
    for (const genre of uniqueGenres) {
      if (!groups[genre]) {
        groups[genre] = []
        seen[genre] = new Set()
      }
      if (!seen[genre].has(track.id)) {
        groups[genre].push(track)
        seen[genre].add(track.id)
      }
      if (!trackGenres[track.id]) trackGenres[track.id] = new Set()
      trackGenres[track.id].add(genre)
    }
  }

  const duplicateIds = new Set<string>()
  for (const id in trackGenres) {
    if (trackGenres[id].size > 1) duplicateIds.add(id)
  }

  const duplicates: Track[] = Array.from(duplicateIds).map(id => trackMap[id])

  for (const genre in groups) {
    groups[genre] = groups[genre].filter(t => !duplicateIds.has(t.id))
  }

  const genres = Object.entries(groups).map(([genre, tracks]) => ({
    genre,
    tracks
  }))

  return { genres, duplicates }
}

export function groupTracksByGenreDedup(tracks: Track[]): GenreGroupingResult {
  const groups: { [genre: string]: Track[] } = {}
  const trackGenres: Record<string, Set<string>> = {}
  const trackMap: Record<string, Track> = {}

  for (const track of tracks) {
    trackMap[track.id] = track
    if (!track.genres.length) continue
    const uniqueGenres = Array.from(new Set(track.genres))
    for (const genre of uniqueGenres) {
      if (!groups[genre]) groups[genre] = []
      groups[genre].push(track)
      if (!trackGenres[track.id]) trackGenres[track.id] = new Set()
      trackGenres[track.id].add(genre)
    }
  }

  const duplicateIds = new Set<string>()
  for (const id in trackGenres) {
    if (trackGenres[id].size > 1) duplicateIds.add(id)
  }

  const duplicates: Track[] = Array.from(duplicateIds).map(id => trackMap[id])

  for (const genre in groups) {
    groups[genre] = groups[genre].filter(t => !duplicateIds.has(t.id))
  }

  const genres = Object.entries(groups).map(([genre, tracks]) => ({
    genre,
    tracks
  }))

  return { genres, duplicates }
}

export async function createPlaylist(token: string, userId: string, name: string, uris: string[]) {
  const uniqueUris = Array.from(new Set(uris))
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
  for (let i = 0; i < uniqueUris.length; i += 100) {
    const chunk = uniqueUris.slice(i, i + 100)
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
