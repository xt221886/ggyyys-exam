// 考试系统后端 — 数据存储 + 静态页面 + API
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'exam_results.json');
const PORT = 8765;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// Load data
let data = { results: [] };
if (fs.existsSync(DATA_FILE)) {
  try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Serve a static file
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch(e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

const server = http.createServer((req, res) => {
  // CORS for API routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url.split('?')[0]; // strip query string for routing

  // ── API: GET /results ──
  if (req.method === 'GET' && url === '/results') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
    return;
  }

  // ── API: POST /results ──
  if (req.method === 'POST' && url === '/results') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const result = JSON.parse(body);
        data.results.push(result);
        saveData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: data.results.length }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── API: DELETE /results?timestamp=xxx ──
  if (req.method === 'DELETE' && url === '/results') {
    const searchParams = new URL(req.url, 'http://localhost').searchParams;
    const ts = parseInt(searchParams.get('timestamp'));
    if (!ts) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing timestamp' }));
      return;
    }
    const before = data.results.length;
    data.results = data.results.filter(r => r.timestamp !== ts);
    saveData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, deleted: before - data.results.length }));
    return;
  }

  // ── Static pages ──
  const pageMap = {
    '/': 'index.html',
    '/tcm': 'tcm-exam.html',
    '/admin': 'admin.html',
    '/admin-tcm': 'admin-tcm.html',
  };

  if (pageMap[url]) {
    serveFile(res, path.join(__dirname, pageMap[url]));
    return;
  }

  // Fallback: try to serve as static file
  const filePath = path.join(__dirname, url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  考试系统后端已启动');
  console.log('========================================');
  console.log('');
  console.log('  本地访问地址:');
  console.log('   🥗 公共营养师考试:  http://localhost:' + PORT + '/');
  console.log('   🏥 中医康复理疗考试: http://localhost:' + PORT + '/tcm');
  console.log('   📊 营养师管理后台:  http://localhost:' + PORT + '/admin');
  console.log('   📊 中医管理后台:    http://localhost:' + PORT + '/admin-tcm');
  console.log('');
  console.log('   API: http://localhost:' + PORT + '/results');
  console.log('   数据文件: ' + DATA_FILE);
  console.log('   当前记录数: ' + data.results.length);
  console.log('========================================');
});
