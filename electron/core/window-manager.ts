import { BrowserWindow, protocol, app, shell, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getAppBasePath } from '../utils';
import { MIME_TYPES } from '../constants';

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
 * Create the main application window
 */
export function createWindow() {
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
    },
  });

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

  // did-finish-load: no-op in production, retained for debugging with GRIP_DEVTOOLS=1
  mainWindow.webContents.on('did-finish-load', () => {
    if (process.env.GRIP_DEVTOOLS === '1') console.log('Page loaded successfully');
  });
}

/**
 * Update window background colour when theme changes.
 * Called from renderer via IPC to keep Electron window bg in sync with CSS theme.
 * Accepts the actual theme background hex so non-Swiss themes (Cyberpunk, Matrix, etc.)
 * don't flash the wrong background colour.
 */
export function updateWindowBackground(isDark: boolean, backgroundColor?: string): void {
  if (!mainWindow) return;
  const bg = backgroundColor ?? (isDark ? '#0a0a0a' : '#EAEAEA');
  mainWindow.setBackgroundColor(bg);
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
  // Async to avoid blocking the main process event loop for large binary files.
  protocol.handle('local-file', async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname);

      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        const data = await fs.promises.readFile(filePath);
        return new Response(data, { headers: { 'Content-Type': mimeType } });
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
    // Single startup log — not per-request
    console.log('app:// protocol registered, basePath:', basePath);

    protocol.handle('app', async (request) => {
      let urlPath = request.url.replace('app://', '');

      // Remove the host part (e.g., "localhost" or "-")
      const slashIndex = urlPath.indexOf('/');
      urlPath = slashIndex !== -1 ? urlPath.substring(slashIndex) : '/';

      // Strip query string — Next.js RSC adds ?_rsc=... to prefetch requests
      const queryIndex = urlPath.indexOf('?');
      if (queryIndex !== -1) urlPath = urlPath.substring(0, queryIndex);

      // Default to index.html for root or directory requests
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
      if (urlPath.endsWith('/')) urlPath += 'index.html';

      const relativePath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
      const filePath = path.join(basePath, relativePath);

      // Check direct path first
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        const data = await fs.promises.readFile(filePath);
        return new Response(data, { headers: { 'Content-Type': mimeType } });
      }

      // Page route fallback — try index.html in subdirectory
      const htmlPath = path.join(basePath, relativePath, 'index.html');
      if (fs.existsSync(htmlPath)) {
        const data = await fs.promises.readFile(htmlPath);
        return new Response(data, { headers: { 'Content-Type': 'text/html' } });
      }

      console.error(`app:// not found: ${filePath}`);
      return new Response('Not Found', { status: 404 });
    });
  }
}
