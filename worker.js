// Cloudflare Worker — 考试系统 API
// 部署步骤见下方注释
// ============================================================
// 1. 打开 https://dash.cloudflare.com
// 2. Workers & Pages → 创建 Worker
// 3. 粘贴此代码
// 4. 创建 KV 命名空间：Storage & Databases → KV → Create
//    名称随意（如 EXAM_DB）
// 5. Worker 设置 → Variables → KV Namespace Bindings
//    变量名: EXAM_KV，选择刚创建的命名空间
// 6. 部署，记下 URL（如 https://tcm-api.xxx.workers.dev）
// 7. 把 URL 发给我，我来更新前端
// ============================================================

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // ── GET /results ──
      if (request.method === 'GET' && url.pathname === '/results') {
        const raw = await env.EXAM_KV.get('results');
        const data = raw ? JSON.parse(raw) : { results: [] };
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      // ── POST /results ──
      if (request.method === 'POST' && url.pathname === '/results') {
        const result = await request.json();
        if (!result || !result.name) {
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const raw = await env.EXAM_KV.get('results');
        const data = raw ? JSON.parse(raw) : { results: [] };
        data.results.push(result);
        await env.EXAM_KV.put('results', JSON.stringify(data));
        return new Response(JSON.stringify({ ok: true, count: data.results.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── DELETE /results?timestamp=xxx ──
      if (request.method === 'DELETE' && url.pathname === '/results') {
        const ts = parseInt(url.searchParams.get('timestamp'));
        if (!ts) {
          return new Response(JSON.stringify({ error: 'Missing timestamp' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const raw = await env.EXAM_KV.get('results');
        const data = raw ? JSON.parse(raw) : { results: [] };
        const before = data.results.length;
        data.results = data.results.filter(r => r.timestamp !== ts);
        await env.EXAM_KV.put('results', JSON.stringify(data));
        return new Response(JSON.stringify({ ok: true, deleted: before - data.results.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
