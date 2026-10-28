const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const state = { data: null, field: params.get('field') || '', topic: params.get('topic') || '', query: params.get('q') || '', rank: new Map() };
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
const shortFields = { 'field-1': '训练与数据', 'field-2': '个人助手', 'field-3': '代码与办公', 'field-4': 'RSI / AI4AI' };
function topicName(id) { return (state.data.topics || []).find((t) => t.id === id)?.name || id; }
function syncFilterURL() {
  const p = new URLSearchParams(location.search);
  for (const [key, value] of [['field', state.field], ['topic', state.topic], ['q', state.query]]) {
    if (value) p.set(key, value); else p.delete(key);
  }
  const query = p.toString();
  history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
}
function fieldButton(label, field, count) {
  const b = el('button', label); b.type = 'button'; b.dataset.field = field;
  b.setAttribute('aria-pressed', String(state.field === field));
  b.append(el('span', String(count)));
  b.onclick = () => { state.field = field; render(); };
  return b;
}
function topicButton(id, count, className = 'tag') {
  const b = el('button', topicName(id), className); b.type = 'button'; b.dataset.topic = id;
  b.setAttribute('aria-pressed', String(state.topic === id));
  b.setAttribute('aria-label', '筛选主题：' + topicName(id));
  if (count !== undefined) { b.append(el('span', String(count))); b.title = '本期共 ' + count + ' 条'; }
  b.onclick = () => {
    state.topic = state.topic === id ? '' : id;
    if ($('detail').open) closeDetail();
    render();
  };
  return b;
}
function renderTopics() {
  const nav = $('topics-nav'); nav.replaceChildren();
  for (const group of state.data.topic_groups || []) {
    const topics = (state.data.topics || []).filter((t) => t.group === group.id);
    const used = topics.map((t) => ({ ...t, count: state.data.items.filter((n) => (n.topics || []).includes(t.id)).length })).filter((t) => t.count);
    if (!used.length) continue;
    const section = el('section', undefined, 'topic-group');
    section.append(el('h3', group.name));
    const list = el('div', undefined, 'topic-list');
    used.forEach((t) => list.append(topicButton(t.id, t.count, 'topic-filter')));
    section.append(list); nav.append(section);
  }
  if (!nav.children.length) nav.append(el('p', '此期尚未标注细分主题。', 'empty'));
}
function render() {
  const { items, fields } = state.data;
  $('filters').replaceChildren(fieldButton('全部', '', items.length));
  for (const f of fields) $('filters').append(fieldButton(shortFields[f.id] || f.name, f.id, items.filter((n) => n.fields.includes(f.id)).length));
  renderTopics();
  const words = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visible = items.filter((n) => (!state.field || n.fields.includes(state.field)) && (!state.topic || (n.topics || []).includes(state.topic)) && words.every((w) =>
    [n.summary, n.title, n.detail, n.why_it_matters, ...n.fields.map(fieldName), ...(n.topics || []).map(topicName), ...n.sources.map((s) => s.name)].join(' ').toLocaleLowerCase().includes(w)));
  $('result-count').textContent = visible.length + ' 条';
  $('reset').hidden = !state.field && !state.query && !state.topic;
  $('active-filter').hidden = !state.topic;
  $('active-filter').replaceChildren();
  if (state.topic) {
    $('active-filter').append(el('span', '当前主题'));
    const clear = el('button', topicName(state.topic) + ' ×');
    clear.type = 'button'; clear.setAttribute('aria-label', '移除主题筛选');
    clear.onclick = () => { state.topic = ''; render(); };
    $('active-filter').append(clear);
  }
  $('feed').replaceChildren();
  visible.forEach((n) => {
    const row = el('article', undefined, 'news-row'); row.dataset.id = n.id;
    const content = el('div', undefined, 'story-content');
    const heading = el('h3');
    const open = el('button', n.title, 'story-open'); open.type = 'button'; open.setAttribute('aria-haspopup', 'dialog');
    const openStory = () => { location.hash = 'news=' + encodeURIComponent(n.id); };
    open.onclick = openStory; heading.append(open);
    content.append(heading, el('p', n.summary, 'sentence'));
    const meta = el('div', undefined, 'story-meta');
    const kind = (n.topics || []).find((id) => (state.data.topics || []).find((t) => t.id === id)?.group === 'format');
    if (kind) meta.append(el('span', topicName(kind), 'story-kind'), el('span', '·', 'meta-dot'));
    meta.append(el('time', n.published), el('span', '·', 'meta-dot'));
    const source = n.sources[0]; const url = safeURL(source.url);
    meta.append(el('span', url ? new URL(url).hostname.replace(/^www\./, '') : source.name));
    if (n.sources.length > 1) meta.append(el('span', '+' + (n.sources.length - 1) + ' 来源'));
    content.append(meta);
    const tags = el('div', undefined, 'story-tags'); tags.setAttribute('aria-label', '文章主题');
    (n.topics || []).filter((id) => id !== kind).slice(0, 3).forEach((id) => tags.append(topicButton(id)));
    row.append(el('span', String(state.rank.get(n.id)).padStart(2, '0'), 'rank'), content, tags);
    row.onclick = (event) => { if (!event.target.closest('button, a')) openStory(); };
    $('feed').append(row);
  });
  if (!visible.length) $('feed').append(el('p', items.length ? '没有匹配的动态，试试其他关键词或清除筛选。' : '尚未接入日报。四个领域任务的结果整合后，将在这里显示。', 'empty'));
  syncFilterURL();
}
function detailSection(label, text, className = '') {
  if (!text) return;
  const section = el('section', undefined, 'detail-section ' + className);
  section.append(el('h3', label), el('p', text));
  $('detail-content').append(section);
}
function showHash() {
  if (!state.data) return;
  const id = new URLSearchParams(location.hash.slice(1)).get('news');
  const n = state.data.items.find((item) => item.id === id);
  if (!n) { if ($('detail').open) $('detail').close(); return; }
  const title = el('h2', n.title, 'detail-heading'); title.id = 'detail-title';
  $('detail-content').replaceChildren(title, el('p', n.published + ' · ' + n.fields.map(fieldName).join(' / '), 'detail-meta'));
  const tags = el('div', undefined, 'detail-tags');
  (n.topics || []).forEach((topic) => tags.append(topicButton(topic)));
  $('detail-content').append(tags);
  detailSection('一句话速览', n.summary, 'lead');
  detailSection('背景介绍', n.intro);
  detailSection(n.intro ? '方法与机制' : '发生了什么', n.detail);
  detailSection('主要发现与边界', n.findings);
  detailSection('为什么值得关注', n.why_it_matters, 'insight');
  const section = el('section', undefined, 'detail-section');
  section.append(el('h3', '原始来源'));
  const list = el('ul', undefined, 'source-list');
  n.sources.forEach((s) => {
    const url = safeURL(s.url); if (!url) return;
    const a = el('a', s.name + ' ↗'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const li = el('li'); li.append(a); list.append(li);
  });
  section.append(list); $('detail-content').append(section);
  const actions = el('div', undefined, 'detail-actions');
  const copy = el('button', '复制本条动态链接 ↗'); copy.type = 'button';
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); copy.textContent = '链接已复制 ✓'; }
    catch { copy.textContent = '请复制浏览器地址栏中的链接'; }
  };
  actions.append(copy, el('span', '编辑优先级 ' + n.score + '/100'));
  $('detail-content').append(actions);
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
$('search').value = state.query;
$('search').addEventListener('input', (e) => { state.query = e.target.value; if (state.data) render(); });
$('reset').onclick = () => { state.field = ''; state.query = ''; state.topic = ''; $('search').value = ''; render(); };
addEventListener('keydown', (e) => { if (e.key === '/' && !$('detail').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('search').focus(); } });
$('edition').onchange = () => {
  if (state.data?.demo) return;
  const p = new URLSearchParams(location.search); p.set('date', $('edition').value);
  location.href = location.pathname + '?' + p;
};
const smallScreen = matchMedia('(max-width: 760px)');
document.querySelector('.topic-panel').open = !smallScreen.matches;
smallScreen.addEventListener('change', (e) => { document.querySelector('.topic-panel').open = !e.matches; });
async function readJSON(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error('数据加载失败（' + response.status + '）');
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
    const data = await readJSON(demo ? './data/demo.json' : date ? './data/days/' + date + '.json' : './data/index.json');
    state.data = data;
    if (!data.fields.some((f) => f.id === state.field)) state.field = '';
    if (!(data.topics || []).some((t) => t.id === state.topic)) state.topic = '';
    data.items.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    state.rank = new Map(data.items.map((n, i) => [n.id, i + 1]));
    $('edition').value = data.date;
    $('edition-date').textContent = data.date ? data.date + ' / 北京时间' : '等待首期日报';
    $('news-count').textContent = String(data.items.length).padStart(2, '0');
    $('field-count').textContent = String(data.fields.length).padStart(2, '0');
    $('updated').textContent = data.generated_at ? '整合于 ' + new Date(data.generated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）' : '等待四个领域的任务结果';
    const brief = typeof data.brief === 'string' ? data.brief.trim() : '';
    $('brief-text').textContent = brief;
    $('brief-text').hidden = !brief;
    $('brief-placeholder').hidden = !!brief;
    $('demo-notice').hidden = !data.demo;
    $('feed-caption').textContent = data.demo ? '演示数据 · 仅用于预览交互和版式' : '每日归档 · 原始来源可追溯';
    render(); showHash();
  } catch (error) {
    $('feed').replaceChildren(el('p', error.message + ' 可刷新重试或切换日期。', 'empty'));
    $('updated').textContent = '日报加载失败';
  }
}
init();

