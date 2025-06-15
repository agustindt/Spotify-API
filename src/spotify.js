// spotify.ts
/**
 * Map similar or synonymous genre names to a canonical representation.
 * This reduces duplication when an artist has multiple closely related
 * styles such as "hip-hop" and "rap" or many jazz subgenres.
 * Accents and hyphens are removed before matching to handle labels like
 * "rock clásico" or "jazz fusión".
 */
function canonicalGenre(name) {
    const lower = name
        .toLowerCase()
        .replace(/-/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    // hip hop / rap variations
    if (lower.includes('hip hop') ||
        lower.includes('hiphop') ||
        lower.includes('rap')) {
        return 'hip hop';
    }
    // rock and related subgenres
    if (lower.includes('rock') ||
        lower.includes('punk') ||
        lower.includes('metal') ||
        lower.includes('grunge') ||
        lower.includes('indie')) {
        return 'rock';
    }
    // electronic music umbrella
    if (lower.includes('electro') ||
        lower.includes('edm') ||
        lower.includes('dance') ||
        lower.includes('house') ||
        lower.includes('techno') ||
        lower.includes('electronica')) {
        return 'electronic';
    }
    // jazz styles
    if (lower.includes('jazz') ||
        lower.includes('bop') ||
        lower.includes('swing') ||
        lower.includes('big band') ||
        lower.includes('bossa nova') ||
        lower.includes('latin jazz') ||
        lower.includes('jazz latino') ||
        lower.includes('jazz funk') ||
        lower.includes('soul jazz') ||
        lower.includes('smooth jazz') ||
        (lower.includes('fusion') && lower.includes('jazz')) ||
        lower.includes('lounge')) {
        return 'jazz';
    }
    // r&b variations
    if (lower.includes('r&b') || lower.includes('rnb') || lower.includes('soul')) {
        return 'r&b';
    }
    if (lower.includes('navidad') || lower.includes('christmas')) {
        return 'christmas';
    }
    if (lower.includes('pop'))
        return 'pop';
    return lower.trim();
}
export async function fetchProfile(token) {
    const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        throw new Error('Failed to fetch profile');
    }
    return res.json();
}
export async function fetchRecentlyPlayed(token, after) {
    const url = new URL('https://api.spotify.com/v1/me/player/recently-played');
    url.searchParams.set('limit', '50');
    url.searchParams.set('after', String(after));
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        throw new Error('Failed to fetch recently played tracks');
    }
    const data = await res.json();
    const artistIds = new Set();
    for (const item of data.items) {
        for (const artist of item.track.artists) {
            artistIds.add(artist.id);
        }
    }
    const idArray = Array.from(artistIds);
    const artistGenres = {};
    for (let i = 0; i < idArray.length; i += 50) {
        const chunk = idArray.slice(i, i + 50).join(',');
        const resArtists = await fetch(`https://api.spotify.com/v1/artists?ids=${chunk}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resArtists.ok) {
            throw new Error('Failed to fetch artist genres');
        }
        const artistsData = await resArtists.json();
        for (const artist of artistsData.artists) {
            artistGenres[artist.id] = artist.genres;
        }
    }
    return data.items.map((item) => ({
        id: item.track.id,
        playedAt: new Date(item.played_at),
        genres: item.track.artists.flatMap((a) => artistGenres[a.id] || []),
        name: item.track.name,
        artists: item.track.artists.map((a) => a.name)
    }));
}
export function groupTracksByMonth(tracks) {
    const groups = {};
    const seen = {};
    for (const track of tracks) {
        const date = new Date(track.playedAt);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!groups[month]) {
            groups[month] = [];
            seen[month] = new Set();
        }
        if (!seen[month].has(track.id)) {
            groups[month].push(track);
            seen[month].add(track.id);
        }
    }
    return Object.entries(groups).map(([month, tracks]) => ({
        month,
        tracks
    }));
}
export function groupTracksByGenre(tracks) {
    const groups = {};
    const seen = {};
    for (const track of tracks) {
        if (!track.genres.length)
            continue;
        for (const genre of track.genres) {
            const canon = canonicalGenre(genre);
            if (!groups[canon]) {
                groups[canon] = [];
                seen[canon] = new Set();
            }
            if (!seen[canon].has(track.id)) {
                groups[canon].push(track);
                seen[canon].add(track.id);
            }
        }
    }
    return Object.entries(groups).map(([genre, tracks]) => ({
        genre,
        tracks
    }));
}
export function groupTracksByGenreDedup(tracks) {
    const groups = {};
    const seen = {};
    const trackGenres = {};
    const trackMap = {};
    for (const track of tracks) {
        trackMap[track.id] = track;
        if (!track.genres.length)
            continue;
        const uniqueGenres = Array.from(new Set(track.genres.map(g => canonicalGenre(g))));
        for (const genre of uniqueGenres) {
            if (!groups[genre]) {
                groups[genre] = [];
                seen[genre] = new Set();
            }
            if (!seen[genre].has(track.id)) {
                groups[genre].push(track);
                seen[genre].add(track.id);
            }
            if (!trackGenres[track.id])
                trackGenres[track.id] = new Set();
            trackGenres[track.id].add(genre);
        }
    }
    const duplicateIds = new Set();
    for (const id in trackGenres) {
        if (trackGenres[id].size > 1)
            duplicateIds.add(id);
    }
    const duplicates = Array.from(duplicateIds).map(id => trackMap[id]);
    for (const genre in groups) {
        groups[genre] = groups[genre].filter(t => !duplicateIds.has(t.id));
    }
    const genres = Object.entries(groups).map(([genre, tracks]) => ({
        genre,
        tracks
    }));
    return { genres, duplicates };
}
export async function createPlaylist(token, userId, name, uris) {
    const uniqueUris = Array.from(new Set(uris));
    const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, public: false })
    });
    if (!res.ok)
        throw new Error('Failed to create playlist');
    const playlist = await res.json();
    for (let i = 0; i < uniqueUris.length; i += 100) {
        const chunk = uniqueUris.slice(i, i + 100);
        const add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: chunk })
        });
        if (!add.ok)
            throw new Error('Failed to add tracks');
    }
}
