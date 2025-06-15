export const CLIENT_ID = '<YOUR_SPOTIFY_CLIENT_ID>'
// Force HTTPS for the redirect to avoid mixed content issues
export const REDIRECT_URI = window.location.origin.replace(/^http:/, 'https:')

export const SCOPES = [
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ')

export function login() {
  const url = new URL('https://accounts.spotify.com/authorize')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('response_type', 'token')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('show_dialog', 'true')
  window.location.assign(url.toString())
}

export function logout() {
  localStorage.removeItem('spotify_token')
}

export function getStoredToken(): string | null {
  if (window.location.hash.startsWith('#access_token=')) {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('spotify_token', token)
      window.location.hash = ''
      return token
    }
  }
  return localStorage.getItem('spotify_token')
}
