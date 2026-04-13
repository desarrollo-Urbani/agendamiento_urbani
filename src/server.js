const fs = require('fs');
const path = require('path');
const http = require('http');

const ENV = require('./config/env');
const { handleApi } = require('./routes/apiRouter');
const { sendJson } = require('./shared/http');
const { asAppError } = require('./shared/errors');
const logger = require('./shared/logger');
const authService = require('./services/authService');

const frontendDistDir = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndex = path.join(frontendDistDir, 'index.html');
const legacyPublicDir = path.join(__dirname, '..', 'public');

function sendStatic(response, contentType, filePath, isBinary = false) {
  const content = isBinary ? fs.readFileSync(filePath) : fs.readFileSync(filePath, 'utf8');
  const isProduction = ENV.nodeEnv === 'production';
  const cacheControl = isProduction ? 'public, max-age=3600' : 'no-store, no-cache, must-revalidate';
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl
  });
  response.end(content);
}

const server = http.createServer(async (request, response) => {
  const startedAt = Date.now();

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    // CORS
    const origin = request.headers.origin;
    const allowedOrigins = ENV.corsOrigins === '*'
      ? null
      : (ENV.corsOrigins || '').split(',').map((s) => s.trim()).filter(Boolean);
    const originAllowed = !origin || !allowedOrigins || allowedOrigins.includes(origin);
    if (origin && originAllowed) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const frontendRoutes = new Set(['/', '/login', '/restablecer-contrasena', '/dashboard', '/catalogo', '/calendario', '/citas', '/cambiar-contrasena', '/administradores', '/logs', '/auth-supabase']);

    if (request.method === 'GET' && (url.pathname === '/confirmacion' || url.pathname === '/formulario')) {
      response.writeHead(302, { Location: '/calendario' });
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { ok: true, env: ENV.nodeEnv });
    }

    const handled = await handleApi(request, response, url);
    if (handled !== false) {
      return;
    }

    if (request.method === 'GET' && ENV.nodeEnv === 'production' && fs.existsSync(frontendDistDir)) {
      if (url.pathname.startsWith('/assets/')) {
        const assetPath = path.join(frontendDistDir, url.pathname);
        if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
          const ext = path.extname(assetPath).toLowerCase();
          const contentType = ext === '.js' ? 'application/javascript; charset=utf-8' :
            ext === '.css' ? 'text/css; charset=utf-8' :
              ext === '.svg' ? 'image/svg+xml' :
                ext === '.json' ? 'application/json; charset=utf-8' :
                  'application/octet-stream';
          return sendStatic(response, contentType, assetPath, true);
        }
      }

      if ((frontendRoutes.has(url.pathname) || /^\/proyectos\/\d+\/historial$/.test(url.pathname)) && fs.existsSync(frontendIndex)) {
        return sendStatic(response, 'text/html; charset=utf-8', frontendIndex);
      }
    }

    const legacyPageMap = {
      '/': 'catalogo.html',
      '/dashboard': 'catalogo.html',
      '/catalogo': 'catalogo.html',
      '/calendario': 'calendario.html',
      '/citas': 'calendario.html'
    };

    if (request.method === 'GET' && legacyPageMap[url.pathname]) {
      const legacyFile = path.join(legacyPublicDir, legacyPageMap[url.pathname]);
      if (fs.existsSync(legacyFile)) {
        return sendStatic(response, 'text/html; charset=utf-8', legacyFile);
      }
    }

    if (request.method === 'GET' && url.pathname === '/styles.css') {
      const legacyStyles = path.join(legacyPublicDir, 'styles.css');
      if (fs.existsSync(legacyStyles)) {
        return sendStatic(response, 'text/css; charset=utf-8', legacyStyles);
      }
    }

    if (request.method === 'GET' && url.pathname === '/app.js') {
      const legacyJs = path.join(legacyPublicDir, 'app.js');
      if (fs.existsSync(legacyJs)) {
        return sendStatic(response, 'application/javascript; charset=utf-8', legacyJs);
      }
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const appError = asAppError(error);
    logger.error('Request failed', {
      method: request.method,
      url: request.url,
      statusCode: appError.statusCode,
      code: appError.code,
      message: appError.message,
      details: appError.details
    });

    sendJson(response, appError.statusCode, {
      error: appError.message,
      code: appError.code,
      details: appError.details
    });
  } finally {
    logger.info('Request handled', {
      method: request.method,
      url: request.url,
      durationMs: Date.now() - startedAt
    });
  }
});

function listenWithFallback(basePort, maxAttempts = 10) {
  let attempt = 0;

  const tryListen = () => {
    const port = basePort + attempt;
    server.listen(port, () => {
      logger.info('API running', { url: `http://localhost:${port}`, env: ENV.nodeEnv });
    });
  };

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < maxAttempts) {
      attempt += 1;
      logger.info('Port busy, trying next port', { triedPort: basePort + attempt - 1, nextPort: basePort + attempt });
      tryListen();
      return;
    }

    throw error;
  });

  tryListen();
}

listenWithFallback(ENV.port);

authService.ensureDefaultAdmin()
  .then(() => logger.info('Default admin ensured', { email: 'desarrollo@urbani.cl' }))
  .catch((error) => logger.error('Failed to ensure default admin', { message: error.message }));
