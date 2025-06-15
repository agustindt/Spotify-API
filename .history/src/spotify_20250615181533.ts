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

export async function fetchProfile(token: string) {
  // Implementación real
  return { id: 'user_id', display_name: 'Sample User' }
}

export async function fetchRecentlyPlayed(token: string, after: number): Promise<Track[]> {
  // Implementación real
  return []
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
  // Implementación real
}
