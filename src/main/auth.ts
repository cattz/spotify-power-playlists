/**
 * Spotify OAuth authentication handler
 *
 * This module handles:
 * - Spotify Authorization Code Flow with PKCE
 * - Token storage and refresh
 * - OAuth callback server
 */

import SpotifyWebApi from 'spotify-web-api-node';
import { shell } from 'electron';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import Store from 'electron-store';
import { SPOTIFY_SCOPES, SPOTIFY_REDIRECT_URI } from '@shared/constants';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// Secure token storage
const store = new Store<{ tokens: TokenData | null }>({
  name: 'spotify-tokens',
  encryptionKey: 'spotify-playlist-manager-encryption-key',
});

export class SpotifyAuth {
  private spotifyApi: SpotifyWebApi;
  private codeVerifier: string | null = null;
  private callbackServer: ReturnType<typeof createServer> | null = null;
  private authCallback: ((code: string) => void) | null = null;

  constructor(clientId: string) {
    this.spotifyApi = new SpotifyWebApi({
      clientId,
      redirectUri: SPOTIFY_REDIRECT_URI,
    });

    // Load stored tokens
    this.loadStoredTokens();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = store.get('tokens');
    return tokens !== null && tokens !== undefined;
  }

  /**
   * Get current access token (refreshes if expired)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = store.get('tokens');

    if (!tokens) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiresAt = tokens.expiresAt;

    if (now >= expiresAt - 5 * 60 * 1000) {
      // Token expired or about to expire, refresh it
      await this.refreshAccessToken();
      const newTokens = store.get('tokens');
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }

  /**
   * Start OAuth flow with PKCE
   */
  async startAuthFlow(): Promise<void> {
    // Generate PKCE codes
    this.codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(this.codeVerifier);

    // Start local callback server
    await this.startCallbackServer();

    // Build authorization URL
    // Note: spotify-web-api-node doesn't directly support PKCE in createAuthorizeURL
    // We need to build the URL manually with PKCE parameters
    const clientId = this.spotifyApi.getClientId();
    const redirectUri = SPOTIFY_REDIRECT_URI;
    const scopes = SPOTIFY_SCOPES.join(' ');
    const state = 'state'; // TODO: Generate random state for CSRF protection

    const params = new URLSearchParams({
      client_id: clientId || '',
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    // Open browser for user authorization
    await shell.openExternal(authUrl);
  }

  /**
   * Start local HTTP server to handle OAuth callback
   */
  private startCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbackServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            this.sendResponse(res, 400, 'Authentication failed', error);
            if (this.authCallback) {
              reject(new Error(`Authentication error: ${error}`));
            }
            this.stopCallbackServer();
            return;
          }

          if (code) {
            this.sendResponse(res, 200, 'Success!', 'Authentication successful. You can close this window.');

            if (this.authCallback) {
              this.authCallback(code);
            }

            this.stopCallbackServer();
            return;
          }

          this.sendResponse(res, 400, 'Error', 'No code received');
          this.stopCallbackServer();
        }
      });

      this.callbackServer.on('error', reject);

      this.callbackServer.listen(8888, () => {
        resolve();
      });
    });
  }

  /**
   * Send HTML response to callback server
   */
  private sendResponse(res: ServerResponse, status: number, title: string, message: string): void {
    res.writeHead(status, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              background: #000;
              color: #0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              border: 2px solid #0f0;
              padding: 40px;
              max-width: 500px;
            }
            h1 { margin: 0 0 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            <p>${message}</p>
          </div>
        </body>
      </html>
    `);
  }

  /**
   * Stop callback server
   */
  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = null;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string): Promise<void> {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not found. Start auth flow first.');
    }

    try {
      // Exchange authorization code for tokens with PKCE
      // Note: spotify-web-api-node doesn't have built-in PKCE support for authorizationCodeGrant
      // We need to make a manual request to Spotify's token endpoint
      const tokenUrl = 'https://accounts.spotify.com/api/token';
      const clientId = this.spotifyApi.getClientId();

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: clientId || '',
        code_verifier: this.codeVerifier,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();

      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresIn = data.expires_in;

      // Store tokens
      this.saveTokens(accessToken, refreshToken, expiresIn);

      // Set access token on API instance
      this.spotifyApi.setAccessToken(accessToken);
      this.spotifyApi.setRefreshToken(refreshToken);

      // Clear code verifier
      this.codeVerifier = null;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const tokens = store.get('tokens');

    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      this.spotifyApi.setRefreshToken(tokens.refreshToken);
      const data = await this.spotifyApi.refreshAccessToken();

      const accessToken = data.body.access_token;
      const expiresIn = data.body.expires_in;

      // Update stored tokens
      this.saveTokens(accessToken, tokens.refreshToken, expiresIn);

      // Set new access token
      this.spotifyApi.setAccessToken(accessToken);
    } catch (error) {
      console.error('Error refreshing access token:', error);
      // Clear stored tokens on refresh failure
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Save tokens to secure storage
   */
  private saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;

    store.set('tokens', {
      accessToken,
      refreshToken,
      expiresAt,
    });
  }

  /**
   * Load stored tokens on initialization
   */
  private loadStoredTokens(): void {
    const tokens = store.get('tokens');

    if (tokens) {
      this.spotifyApi.setAccessToken(tokens.accessToken);
      this.spotifyApi.setRefreshToken(tokens.refreshToken);
    }
  }

  /**
   * Clear stored tokens (logout)
   */
  clearTokens(): void {
    store.delete('tokens');
    this.spotifyApi.resetAccessToken();
    this.spotifyApi.resetRefreshToken();
  }

  /**
   * Complete authentication flow
   */
  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authCallback = async (code: string) => {
        try {
          await this.handleCallback(code);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      this.startAuthFlow().catch(reject);
    });
  }

  /**
   * Get Spotify API instance
   */
  getSpotifyApi(): SpotifyWebApi {
    return this.spotifyApi;
  }
}
