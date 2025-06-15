export const CLIENT_ID = '26f584098dae4d02b5647086929b483b'
// Redirect back to the current origin after auth.
// This must match a URI whitelisted in your Spotify app settings and use HTTPS
// unless the host is a loopback IP.
const isLoopback = /^(127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
export const REDIRECT_URI = isLoopback
  ? window.location.origin
  : window.location.origin.replace(/^http:/, 'https:')

export const SCOPES = [
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ')

function base64UrlEncode(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  const data = new Uint8Array(64)
  crypto.getRandomValues(data)
  return base64UrlEncode(data)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

export async function login() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_pkce_verifier', verifier)
  const url = new URL('https://accounts.spotify.com/authorize')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('show_dialog', 'true')
  window.location.assign(url.toString())
}

export function logout() {
  localStorage.removeItem('spotify_token')
  sessionStorage.removeItem('spotify_pkce_verifier')
}

export async function getStoredToken(): Promise<string | null> {
  if (window.location.hash.startsWith('#access_token=')) {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('spotify_token', token)
      window.location.hash = ''
      return token
    }
  }

  const search = new URLSearchParams(window.location.search)
  const code = search.get('code')
  if (code) {
    const verifier = sessionStorage.getItem('spotify_pkce_verifier')
    if (!verifier) return null
    const body = new URLSearchParams()
    body.set('client_id', CLIENT_ID)
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('redirect_uri', REDIRECT_URI)
    body.set('code_verifier', verifier)
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (res.ok) {
      const data = await res.json()
      const token = data.access_token as string
      if (token) {
        localStorage.setItem('spotify_token', token)
        sessionStorage.removeItem('spotify_pkce_verifier')
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('state')
        history.replaceState({}, '', url.toString())
        return token
      }
    }
  }

  return localStorage.getItem('spotify_token')
}
