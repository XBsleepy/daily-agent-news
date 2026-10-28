const $ = (id) => document.getElementById(id);
const state = { data: null, field: '', query: '', rank: new Map() };
const params = new URLSearchParams(location.search);
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function safeURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; }
  catch { return null; }
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme').setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
}
try { setTheme(localStorage.getItem('news-theme') || 'light'); } catch { setTheme('light'); }
$('theme').onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('news-theme', theme); } catch { /* Storage is optional. */ }
};
function fieldName(id) { return state.data.fields.find((f) => f.id === id)?.name || id; }
function filterButton(label, field, count) {
  const b = el('button', label);
  b.type = 'button'; b.dataset.field = field;
  b.setAttribute('aria-pressed', String(state.field === field));
  b.append(el('span', String(count)));
  b.onclick = () => { state.field = field; render(); };
  return b;
}
function render() {
  const { items, fields } = state.data;
  $('filters').replaceChildren(filterButton('全部', '', items.length));
  $('fields-nav').replaceChildren();
  for (const f of fields) {
    const count = items.filter((n) => n.fields.includes(f.id)).length;
    $('filters').append(filterButton(f.name, f.id, count));
    $('fields-nav').append(filterButton(f.name, f.id, count));
  }
  const words = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visible = items.filter((n) => (!state.field || n.fields.includes(state.field)) && words.every((w) =>
    [n.summary, n.title, n.detail, n.why_it_matters, ...n.fields.map(fieldName), ...n.sources.map((s) => s.name)].join(' ').toLocaleLowerCase().includes(w)));
  $('result-count').textContent = `${visible.length} 条`;
  $('reset').hidden = !state.field && !state.query;
  $('feed').replaceChildren();
  visible.forEach((n) => {
    const row = el('button', undefined, 'news-row');
    row.type = 'button'; row.dataset.id = n.id;
    row.setAttribute('aria-haspopup', 'dialog');
    row.append(el('span', String(state.rank.get(n.id)).padStart(2, '0'), 'rank'), el('span', n.summary, 'sentence'), el('span', n.fields.map(fieldName).join(' / '), 'badge'), el('span', '↗', 'arrow'));
    row.onclick = () => { location.hash = `news=${encodeURIComponent(n.id)}`; };
    $('feed').append(row);
  });
  if (!visible.length) $('feed').append(el('p', items.length ? '没有匹配的新闻，试试其他关键词或领域。' : '尚未接入日报。四个领域任务的结果整合后，将在这里显示。', 'empty'));
}
function detailSection(label, text) {
  if (!text) return;
  const section = el('section', undefined, 'detail-section');
  section.append(el('h3', label), el('p', text));
  $('detail-content').append(section);
}
function showHash() {
  if (!state.data) return;
  const id = new URLSearchParams(location.hash.slice(1)).get('news');
  const n = state.data.items.find((item) => item.id === id);
  if (!n) { if ($('detail').open) $('detail').close(); return; }
  const title = el('h2', n.title); title.id = 'detail-title';
  $('detail-content').replaceChildren(title, el('p', `${n.fields.map(fieldName).join(' / ')} · ${n.published} · 榜单 #${state.rank.get(n.id)}`, 'detail-meta'));
  detailSection('一句话速览', n.summary);
  detailSection('发生了什么', n.detail);
  detailSection('为什么值得关注', n.why_it_matters);
  const section = el('section', undefined, 'detail-section');
  section.append(el('h3', '原始来源'));
  const list = el('ul', undefined, 'source-list');
  n.sources.forEach((s) => {
    const url = safeURL(s.url); if (!url) return;
    const a = el('a', `${s.name} ↗`); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const li = el('li'); li.append(a); list.append(li);
  });
  section.append(list); $('detail-content').append(section);
  const actions = el('div', undefined, 'detail-actions');
  const copy = el('button', '复制本条新闻链接 ↗');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); copy.textContent = '链接已复制 ✓'; }
    catch { copy.textContent = '请复制浏览器地址栏中的链接'; }
  };
  actions.append(copy); $('detail-content').append(actions);
  if (!$('detail').open) $('detail').showModal();
  $('detail').scrollTop = 0;
}
function closeDetail() {
  history.replaceState(null, '', location.pathname + location.search);
  $('detail').close();
}
$('close-detail').onclick = closeDetail;
$('detail').addEventListener('cancel', (e) => { e.preventDefault(); closeDetail(); });
$('detail').addEventListener('click', (e) => { if (e.target === $('detail')) { const r = $('detail').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDetail(); } });
addEventListener('hashchange', showHash);
$('search').addEventListener('input', (e) => { state.query = e.target.value; render(); });
$('reset').onclick = () => { state.field = ''; state.query = ''; $('search').value = ''; render(); };
addEventListener('keydown', (e) => { if (e.key === '/' && !$('detail').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('search').focus(); } });
$('edition').onchange = () => {
  if (state.data?.demo) return;
  const p = new URLSearchParams(location.search);
  p.set('date', $('edition').value);
  location.href = `${location.pathname}?${p}`;
};
async function readJSON(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`数据加载失败（${response.status}）`);
  return response.json();
}
async function init() {
  try {
    const demo = params.get('demo') === '1' || (!params.has('date') && params.get('live') !== '1' && !(await readJSON('./data/index.json')).date);
    const archive = demo ? { days: ['2026-01-01'] } : await readJSON('./data/days.json');
    $('edition').replaceChildren(...archive.days.map((d) => { const o = el('option', d); o.value = d; return o; }));
    $('edition').disabled = demo || !archive.days.length;
    const date = params.get('date');
    if (date && !archive.days.includes(date)) throw new Error('所选日期暂无日报，请选择已有归档日期。');
    const data = await readJSON(demo ? './data/demo.json' : date ? `./data/days/${date}.json` : './data/index.json');
    state.data = data;
    data.items.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    state.rank = new Map(data.items.map((n, i) => [n.id, i + 1]));
    $('edition').value = data.date;
    $('edition-date').textContent = data.date ? `${data.date} / 北京时间` : '等待首期日报';
    $('news-count').textContent = String(data.items.length).padStart(2, '0');
    $('field-count').textContent = String(data.fields.length).padStart(2, '0');
    $('updated').textContent = data.generated_at ? `整合于 ${new Date(data.generated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）` : '等待四个领域的任务结果';
    $('brief-text').textContent = data.brief || '暂无当日导读。';
    $('demo-notice').hidden = !data.demo;
    $('feed-caption').textContent = data.demo ? '演示数据 · 仅用于预览交互和版式' : '每日归档 · 原始来源可追溯';
    render(); showHash();
  } catch (error) {
    $('feed').replaceChildren(el('p', `${error.message} 可刷新重试或从左侧切换日期。`, 'empty'));
    $('updated').textContent = '日报加载失败';
  }
}
init();
