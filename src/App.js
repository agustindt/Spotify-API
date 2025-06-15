import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// App.tsx
import { useState, useEffect } from 'react';
import { fetchProfile, fetchRecentlyPlayed, groupTracksByMonth, createPlaylist } from './spotify';
import { login, logout, getStoredToken } from './auth';
function App() {
    const [token, setToken] = useState('');
    const [user, setUser] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        getStoredToken().then(stored => {
            if (stored)
                setToken(stored);
        });
    }, []);
    async function analyze() {
        setError('');
        setLoading(true);
        try {
            const profile = await fetchProfile(token);
            setUser(profile);
            const now = new Date();
            const startYear = now.getFullYear();
            const startMonth = now.getMonth() - 11;
            let after = new Date(startYear, startMonth, 1).getTime();
            const tracks = [];
            while (true) {
                const batch = await fetchRecentlyPlayed(token, after);
                if (!batch.length)
                    break;
                tracks.push(...batch);
                const last = batch[batch.length - 1];
                after = last.playedAt.getTime() + 1000;
                if (tracks.length > 1000)
                    break;
            }
            const groups = groupTracksByMonth(tracks);
            setPlaylists(groups);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function create(month, uris) {
        if (!user)
            return;
        try {
            await createPlaylist(token, user.id, `Monthly ${month}`, uris);
            alert(`Playlist for ${month} created!`);
        }
        catch (e) {
            alert(`Failed to create playlist: ${e.message}`);
        }
    }
    return (_jsxs("div", { style: { padding: '1rem' }, children: [_jsx("h1", { children: "Spotify Monthly Playlist Creator" }), !token ? (_jsx("button", { onClick: login, children: "Login with Spotify" })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: logout, children: "Logout" }), _jsx("button", { onClick: analyze, disabled: loading, children: "Analyze Profile" })] })), error && _jsx("p", { style: { color: 'red' }, children: error }), loading && _jsx("p", { children: "Loading..." }), user && _jsxs("p", { children: ["Logged in as ", user.display_name] }), playlists.map(p => (_jsxs("div", { style: { marginTop: '1rem' }, children: [_jsx("h3", { children: p.month }), _jsxs("p", { children: [p.tracks.length, " tracks"] }), _jsx("button", { onClick: () => create(p.month, p.tracks.map(t => `spotify:track:${t.id}`)), children: "Create Playlist" })] }, p.month)))] }));
}
export default App;
