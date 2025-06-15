// spotify.ts
export async function fetchProfile(token) {
    // Implementación real
    return { id: 'user_id', display_name: 'Sample User' };
}
export async function fetchRecentlyPlayed(token, after) {
    // Implementación real
    return [];
}
export function groupTracksByMonth(tracks) {
    const groups = {};
    for (const track of tracks) {
        const date = new Date(track.playedAt);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!groups[month]) {
            groups[month] = [];
        }
        groups[month].push(track);
    }
    return Object.entries(groups).map(([month, tracks]) => ({
        month,
        tracks
    }));
}
export async function createPlaylist(token, userId, name, uris) {
    // Implementación real
}
