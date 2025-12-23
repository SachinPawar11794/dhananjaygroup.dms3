/**
 * Simple test server to verify the app works
 * Run with: node test-server.js
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = createServer((req, res) => {
    // Strip query string and normalize path (so ?v=... cache-busters don't break file lookup)
    const reqUrl = req.url || '/';
    const pathname = (() => {
        try {
            // Use URL to safely parse; fallback to raw split if host is missing
            return new URL(reqUrl, 'http://localhost').pathname;
        } catch {
            return reqUrl.split('?')[0];
        }
    })();

    let filePath = join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Security: prevent directory traversal
    const normalized = filePath.replace(/\\/g, '/');
    const rootNormalized = __dirname.replace(/\\/g, '/');
    if (!normalized.startsWith(rootNormalized)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('File not found');
        return;
    }
    
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(500);
        res.end('Server error');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${__dirname}`);
    console.log(`\n✅ Open http://localhost:${PORT} in your browser`);
});

