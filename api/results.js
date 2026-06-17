// 考试系统成绩存储 API
// ============================================================
// 推荐: Firebase Realtime Database (持久化)
//   在 Vercel Settings > Environment Variables 中配置:
//     FIREBASE_DB_URL  — 如 https://<project>.firebasedatabase.app
//     FIREBASE_SECRET  — Database Secrets 中的 token
//
// 未配置 Firebase 时，使用 /tmp 文件存储 (Vercel 冷启动会丢失)
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
const FIREBASE_SECRET = process.env.FIREBASE_SECRET;
const TMP_FILE = join('/tmp', 'exam_results.json');

// ── 从 exam_results.json 预置的初始数据 ──
const SEED_DATA = {
  results: [
    {"examType":"公共营养师","name":"测试学员","id":"1234****5678","score":75,"correct":75,"wrong":20,"unanswered":5,"timeUsed":3600,"timeDisplay":"60分0秒","submittedAt":"2026-06-17 20:00:00","timestamp":1718629200000},
    {"name":"向海龙","id":"4228****339X","score":0,"correct":0,"wrong":2,"unanswered":98,"answers":[3,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"timeUsed":5,"timeDisplay":"0分5秒","submittedAt":"2026/6/17 20:48:05","timestamp":1781700485486},
    {"name":"李玉","id":"3625****7592","score":6,"correct":6,"wrong":9,"unanswered":85,"answers":[2,2,2,1,1,1,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"timeUsed":26,"timeDisplay":"0分26秒","submittedAt":"2026/6/17 20:54:26","timestamp":1781700866060},
    {"examType":"中医康复理疗","name":"向婷","id":"4228****339X","score":4,"correct":4,"wrong":0,"unanswered":96,"answers":[0,1,0,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"timeUsed":36,"timeDisplay":"0分36秒","submittedAt":"2026/6/17 22:32:41","timestamp":1781706761104},
    {"examType":"中医康复理疗","name":"向海龙","id":"4228****339X","score":1,"correct":1,"wrong":1,"unanswered":98,"answers":[2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"timeUsed":5,"timeDisplay":"0分5秒","submittedAt":"2026/6/17 22:34:01","timestamp":1781706841135}
  ]
};

// ── Firebase helpers ──
function fbEndpoint(path = '/results.json') {
  const sep = path.includes('?') ? '&' : '?';
  return `${FIREBASE_DB_URL}${path}${sep}auth=${FIREBASE_SECRET}`;
}

async function fbGet() {
  const res = await fetch(fbEndpoint());
  if (!res.ok) throw new Error(`Firebase GET failed: ${res.status}`);
  const data = await res.json();
  return data || { results: [] };
}

async function fbPut(data) {
  const res = await fetch(fbEndpoint(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Firebase PUT failed: ${res.status}`);
  return res.json();
}

// ── /tmp file helpers (fallback) ──
function fileLoad() {
  try {
    if (existsSync(TMP_FILE)) {
      const raw = readFileSync(TMP_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) { /* corrupt file, start fresh */ }
  // First run: seed with historical data
  const seeded = JSON.parse(JSON.stringify(SEED_DATA));
  fileSave(seeded);
  return seeded;
}

function fileSave(data) {
  writeFileSync(TMP_FILE, JSON.stringify(data), 'utf8');
}

// ═══════════════ MAIN HANDLER ═══════════════
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const useFirebase = !!(FIREBASE_DB_URL && FIREBASE_SECRET);

  try {
    // ── GET /results ──
    if (req.method === 'GET') {
      const data = useFirebase ? await fbGet() : fileLoad();
      return res.json(data);
    }

    // ── POST /results ──
    if (req.method === 'POST') {
      const newResult = req.body;
      if (!newResult || !newResult.name) {
        return res.status(400).json({ error: 'Invalid result data' });
      }

      if (useFirebase) {
        const data = await fbGet();
        data.results.push(newResult);
        await fbPut(data);
        return res.json({ ok: true, count: data.results.length });
      } else {
        const data = fileLoad();
        data.results.push(newResult);
        fileSave(data);
        return res.json({ ok: true, count: data.results.length });
      }
    }

    // ── DELETE /results?timestamp=xxx ──
    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const tsParam = url.searchParams.get('timestamp');
      if (!tsParam) {
        return res.status(400).json({ error: 'Missing timestamp parameter' });
      }
      const ts = parseInt(tsParam);

      if (useFirebase) {
        const data = await fbGet();
        const before = data.results.length;
        data.results = data.results.filter(r => r.timestamp !== ts);
        await fbPut(data);
        return res.json({ ok: true, deleted: before - data.results.length });
      } else {
        const data = fileLoad();
        const before = data.results.length;
        data.results = data.results.filter(r => r.timestamp !== ts);
        fileSave(data);
        return res.json({ ok: true, deleted: before - data.results.length });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    console.error('API Error:', e);
    return res.status(500).json({ error: 'Internal server error', message: e.message });
  }
}
