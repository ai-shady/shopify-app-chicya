const STYLE = `
:root{--bg:#121212;--fg:#FFF6EF;--pink:#FF3EA5;--lime:#D6F32F;--blue:#2F4BFF;--orange:#FF6B2B;--cream:#EBDBCE;--card:#1E1E1E;}
*{box-sizing:border-box}
body{margin:0;font-family:Poppins,system-ui,sans-serif;background:var(--bg);color:var(--fg);padding:32px 24px;max-width:960px;margin:0 auto}
h1{font-family:Anton,sans-serif;font-size:clamp(40px,7vw,80px);text-transform:uppercase;line-height:.95;margin:0 0 12px}
h2{font-family:Anton,sans-serif;font-size:26px;text-transform:uppercase;margin:32px 0 14px;color:var(--lime)}
.badge{display:inline-block;background:var(--pink);color:var(--fg);padding:6px 14px;border-radius:100px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-right:8px}
.badge.gray{background:var(--card);color:var(--cream);border:1px solid var(--cream)}
.card{background:var(--card);border:1px solid var(--cream);border-radius:20px;padding:22px;margin:18px 0}
.card h3{margin:0 0 10px;font-family:Anton,sans-serif;text-transform:uppercase;font-size:20px;color:var(--fg)}
.card p{margin:0 0 16px;line-height:1.6;color:var(--cream)}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
a.btn{display:inline-block;background:var(--lime);color:#121212;padding:12px 20px;border-radius:100px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.02em;font-size:13px}
a.btn.secondary{background:transparent;color:var(--fg);border:1px solid var(--fg)}
a.btn:hover{transform:translate(-2px,-2px)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--cream);border-radius:14px;overflow:hidden}
th{background:var(--card);color:var(--lime);text-align:left;padding:12px;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.05em;border-bottom:1px solid var(--cream)}
td{padding:12px;border-bottom:1px solid #333;vertical-align:top;font-size:13px}
.code{background:#0E0E0E;color:var(--lime);padding:10px;border-radius:10px;font-family:monospace;font-size:12px;max-height:140px;overflow:auto;white-space:pre-wrap;color:#b9f03f}
.empty{text-align:center;padding:40px 20px;color:#999}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--lime);margin-right:8px;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.meta{color:var(--cream);font-size:13px;margin-bottom:4px}
`;

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const host = req.headers.host || 'app.chicya.com';
  const base = `https://${host}`;
  const shop = url.searchParams.get('shop') || '';
  const embedHost = url.searchParams.get('host') || '';
  const embedded = embedHost !== '' || url.searchParams.get('embedded') === '1';
  const apiKey = process.env.SHOPIFY_API_KEY || '';

  const bridgeScript = embedded ? `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<script>
window['app-bridge-init'] = function(){
  var createApp = window['app-bridge'].default;
  window.app = createApp({apiKey: '${apiKey}', host: '${embedHost}'});
  window.app.dispatch(window['app-bridge'].actions.toast.show({message: 'CHICYA embedded app connected'}));
};
</script>` : '';

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CHICYA App Console</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
${bridgeScript}
<style>${STYLE}</style>
</head>
<body>
  <span class="badge">embedded app</span>
  ${embedded ? '<span class="badge gray">在 Shopify Admin 内嵌运行中</span>' : '<span class="badge gray">外部预览模式</span>'}
  <h1>CHICYA<br>app console</h1>
  <p class="meta">${shop ? `商店: <strong>${shop}</strong>` : '未传递 shop 参数'} · 状态: 已安装并订阅 <code>products/create</code> / <code>orders/create</code> webhook</p>

  <h2>Webhook 实时事件</h2>
  <div class="card">
    <p><span class="dot"></span>端点 <code>${base}/events/webhook</code> · 最近 50 条</p>
    <div class="actions">
      <a class="btn" href="${base}/events" target="_blank" rel="noopener">打开独立事件面板</a>
      <a class="btn secondary" href="${base}/events?view=json" target="_blank" rel="noopener">JSON 数据</a>
    </div>
    <table>
      <thead><tr><th>时间</th><th>Topic</th><th>来源</th><th>Payload 摘要</th></tr></thead>
      <tbody id="rows"><tr><td colspan="4" class="empty">加载中…</td></tr></tbody>
    </table>
  </div>

  <h2>App Proxy Lookbook</h2>
  <div class="card">
    <h3>店铺路径 /apps/lookbook</h3>
    <p>通过 Shopify App Proxy 把店铺路径代理到本服务，Shopify 转发时自动补尾斜杠，返回 Liquid 渲染进主题。</p>
    <div class="actions">
      <a class="btn" href="https://chicya.com/apps/lookbook" target="_blank" rel="noopener">查看店铺 Lookbook 页</a>
      <a class="btn secondary" href="https://chicya.com/apps/lookbook?view=json" target="_blank" rel="noopener">JSON 视图</a>
    </div>
  </div>

<script>
async function loadEvents(){
  try{
    const r = await fetch('${base}/events?view=json');
    const j = await r.json();
    const list = j.events || [];
    const tbody = document.getElementById('rows');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无事件。在后台创建一个商品或订单后刷新。</td></tr>'; return; }
    tbody.innerHTML = list.map(e =>
      '<tr><td>' + new Date(e.time).toLocaleString('zh-CN') +
      '</td><td><strong>' + e.type + '</strong>' +
      '</td><td>' + e.source +
      '</td><td><div class="code">' + JSON.stringify(e.payload, null, 2).slice(0, 300).replace(/</g,'&lt;') + (JSON.stringify(e.payload).length > 300 ? '…' : '') + '</div></td></tr>'
    ).join('');
  }catch(err){
    document.getElementById('rows').innerHTML = '<tr><td colspan="4" class="empty">加载失败: ' + err.message + '</td></tr>';
  }
}
loadEvents();
setInterval(loadEvents, 8000);
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "frame-ancestors https://admin.shopify.com https://*.myshopify.com");
  res.status(200).send(html);
}