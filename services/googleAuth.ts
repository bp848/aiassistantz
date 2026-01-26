// Direct Google OAuth 2.0 implementation
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = window.location.origin;
const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar';

const ACCESS_TOKEN_KEY = 'google_access_token';
const ACCESS_TOKEN_EXP_KEY = 'google_access_token_exp';

let accessToken: string | null = sessionStorage.getItem(ACCESS_TOKEN_KEY);
let accessTokenExpiry = Number(sessionStorage.getItem(ACCESS_TOKEN_EXP_KEY) || 0);

export const getGoogleAccessToken = (): string | null => {
  if (accessToken && accessTokenExpiry && Date.now() > accessTokenExpiry - 60_000) {
    clearGoogleAccessToken();
  }
  return accessToken;
};

export const clearGoogleAccessToken = () => {
  accessToken = null;
  accessTokenExpiry = 0;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_EXP_KEY);
};

export interface GoogleAuthResult {
  accessToken: string;
  expiresIn: number;
}

export const requestGoogleAccessToken = async (prompt?: string): Promise<GoogleAuthResult> => {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google client ID is not configured');

  // Check if returning from OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (code) {
    const tokenResponse = await exchangeCodeForToken(code);
    window.history.replaceState({}, document.title, window.location.pathname);
    return tokenResponse;
  }

  // Start OAuth flow
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: prompt || 'consent'
  }).toString()}`;

  window.location.href = authUrl;
  
  // Return a promise that will never resolve (redirect happens)
  return new Promise<never>(() => {});
};

export const exchangeCodeForToken = async (code: string): Promise<GoogleAuthResult> => {
  if (!GOOGLE_CLIENT_SECRET) {
    throw new Error('Google client secret is not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  accessTokenExpiry = Date.now() + data.expires_in * 1000;
  
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(ACCESS_TOKEN_EXP_KEY, accessTokenExpiry.toString());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in
  };
};

export const fetchGoogleUserInfo = async (token?: string) => {
  const effectiveToken = token || getGoogleAccessToken();
  if (!effectiveToken) throw new Error('No Google access token available');

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${effectiveToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json() as Promise<{ email?: string; name?: string; picture?: string }>;
};

export const handleOAuthCallback = async (): Promise<{ email: string; name: string; picture?: string } | null> => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) return null;
  
  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const profile = await fetchGoogleUserInfo(tokenResponse.accessToken);
    return {
      email: profile.email || '',
      name: profile.name || 'User',
      picture: profile.picture
    };
  } catch (e) {
    console.error('OAuth callback error:', e);
    return null;
  }
};
