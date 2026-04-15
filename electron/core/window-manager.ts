import { BrowserWindow, protocol, app, shell, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getAppBasePath } from '../utils';
import { MIME_TYPES } from '../constants';
import { registerWorkspaceWindow } from './broadcast';

// Allowed origins for in-app navigation
const ALLOWED_ORIGINS = ['http://localhost', 'app://-'];

// Global reference to the main window
let mainWindow: BrowserWindow | null = null;

/**
 * Get the main window instance
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Set the main window instance
 */
export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window;
}

/**
 * Create the main application window.
 *
 * §13.3 — workspaceId is injected into the renderer via
 * `webPreferences.additionalArguments`. The renderer reads `process.argv`
 * synchronously at import time in `src/lib/workspace-context.ts`.
 *
 * §13.4 — Each workspace gets its own Chromium session via
 * `webPreferences.partition: 'persist:ws-<uuid>'`. localStorage, IndexedDB,
 * sessionStorage, cookies, and HTTP cache are fully isolated with zero
 * per-call-site changes in the renderer.
 *
 * §13.5 — Every created window is registered via `registerWorkspaceWindow`
 * so that agent-initiated and service-initiated IPC events can route correctly.
 */
export function createWindow(workspaceId: string = 'default') {
  const isDarkMode = nativeTheme.shouldUseDarkColors;

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'GRIP',
    titleBarStyle: 'hiddenInset',
    // Match Swiss Nihilism background to prevent white flash on load
    backgroundColor: isDarkMode ? '#0a0a0a' : '#EAEAEA',
    // macOS vibrancy — sidebar area gets native translucency
    vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
    visualEffectState: 'active',
    // Smooth window animation on macOS
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // §13.4: fully isolated Chromium session per workspace.
      partition: `persist:ws-${workspaceId}`,
      // §13.3: workspace ID flows into renderer process.argv before first render.
      additionalArguments: [`--grip-ws=${workspaceId}`],
    },
  });

  // §13.5: register immediately so broadcast.ts can route events to this window.
  registerWorkspaceWindow(workspaceId, mainWindow);

  // Show window with fade-in once content is ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the Next.js app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Only open DevTools if explicitly requested — keeps demo mode clean
    if (process.env.GRIP_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // In production, use the custom app:// protocol to properly serve static files
    // This fixes issues with absolute paths like /logo.png not resolving correctly
    mainWindow.loadURL('app://-/index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Navigation guards — prevent external URLs loading in the Electron window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAllowed = ALLOWED_ORIGINS.some(origin => url.startsWith(origin));
    if (!isAllowed) {
      event.preventDefault();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
    }
  });

  // Block all new-window requests — open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });
}

/**
 * Update window background colour when theme changes.
 * Called from renderer via IPC to keep Electron window bg in sync with CSS theme.
 */
export function updateWindowBackground(isDark: boolean): void {
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(isDark ? '#0a0a0a' : '#EAEAEA');
}

/**
 * Register custom protocol for serving static files
 * This must be called before app.whenReady()
 */
export function registerProtocolSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
    {
      scheme: 'local-file',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

/**
 * Setup the custom app:// protocol handler for serving static files
 * This should be called after app.whenReady() and before loading the window
 */
export function setupProtocolHandler() {
  // Serve local files via local-file:// protocol (for vault image previews etc.)
  // URLs are encoded as: local-file://host/path where host is empty
  // e.g. local-file:///Users/charlie/Desktop/photo.png
  protocol.handle('local-file', (request) => {
    try {
      // Parse as URL to properly decode path components
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname);

      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        return new Response(fs.readFileSync(filePath), {
          headers: { 'Content-Type': mimeType },
        });
      }
      console.error('local-file:// not found:', filePath);
    } catch (err) {
      console.error('local-file:// error:', err, request.url);
    }
    return new Response('Not Found', { status: 404 });
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const basePath = getAppBasePath();
    console.log('Registering app:// protocol with basePath:', basePath);

    protocol.handle('app', (request) => {
      let urlPath = request.url.replace('app://', '');

      // Remove the host part (e.g., "localhost" or "-")
      const slashIndex = urlPath.indexOf('/');
      if (slashIndex !== -1) {
        urlPath = urlPath.substring(slashIndex);
      } else {
        urlPath = '/';
      }

      // Strip query string — Next.js RSC adds ?_rsc=... to prefetch requests
      const queryIndex = urlPath.indexOf('?');
      if (queryIndex !== -1) {
        urlPath = urlPath.substring(0, queryIndex);
      }

      // Default to index.html for directory requests
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }

      // Handle page routes (e.g., /agents/, /settings/) - serve their index.html
      if (urlPath.endsWith('/')) {
        urlPath = urlPath + 'index.html';
      }

      // Remove leading slash for path.join
      const relativePath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
      const filePath = path.join(basePath, relativePath);

      console.log(`app:// request: ${request.url} -> ${filePath}`);

      // Check if file exists
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        return new Response(fs.readFileSync(filePath), {
          headers: { 'Content-Type': mimeType },
        });
      }

      // If it's a page route without .html, try adding index.html
      const htmlPath = path.join(basePath, relativePath, 'index.html');
      if (fs.existsSync(htmlPath)) {
        return new Response(fs.readFileSync(htmlPath), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      console.error(`File not found: ${filePath}`);
      return new Response('Not Found', { status: 404 });
    });
  }
}
