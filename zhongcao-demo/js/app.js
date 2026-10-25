/* 展示层 · app：只负责把计算结果画出来，不做任何计算判断。 */
(function (g) {
  'use strict';

  var D = g.DATA, T = g.TAGS, S = g.CalcSummary, Q = g.CalcQuote, B = g.CalcBudget;
  var state = { page: 'home', budget: D.product.budget };
  var res = S.run(D, state.budget);
  var app = document.getElementById('app');

  // ---------- 工具 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '¥' + Math.round(n).toLocaleString('zh-CN'); }
  function one(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function pct(x) { return Math.round(x * 1000) / 10 + '%'; }
  function tagTone(tag) {
    if (g.CalcEngine.isPurchase(tag)) return 'good';
    if (tag === T.CONCERN_NEGATIVE) return 'bad';
    if (tag === T.QUESTION_OTHER) return 'warn';
    return '';
  }
  function tierTone(t) { return { good: 'good', talk: 'warn', avoid: 'bad' }[t]; }
  function chip(text, tone) { return '<span class="chip ' + (tone || '') + '">' + esc(text) + '</span>'; }
  function flagChips(r) { return r.flags.map(function (f) { return chip(f.label, f.tone); }).join(''); }

  // ---------- 首页 ----------
  function home() {
    var c = res.conclusion, p = res.budget_, h = c.headline, top = res.radar.top;
    var maxK = Math.max(h.good.perK, h.bad.perK);
    return '' +
      '<section class="hero" id="hero">' +
      '  <div class="eyebrow">' + esc(D.product.category) + ' · 预算 ' + money(res.budget) + '</div>' +
      '  <h1>粉丝越多，越会带货？<em>评论区说，不一定。</em></h1>' +
      '  <p>每花 ¥1,000：投 <b>' + esc(h.good.name) + '</b>（' + esc(h.good.fans) + ' 粉）约换回 <b>' + one(h.good.perK) + '</b> 条购买意向，' +
      '投 <b>' + esc(h.bad.name) + '</b>（' + esc(h.bad.fans) + ' 粉）只有 <b>' + one(h.bad.perK) + '</b> 条，相差约 <b>' + Math.round(h.times) + ' 倍</b>。</p>' +
      '</section>' +

      '<div class="grid-3" id="actions">' +
      '  <div class="card action"><div class="q">投谁？</div><div class="big">' + p.selected.length + ' 位腰尾部博主</div>' +
      '    <div class="chips">' + p.selected.map(function (r) { return chip(r.name + ' ' + money(r.quote), 'accent'); }).join('') + '</div>' +
      (c.avoid.length ? '<div class="q">不建议：' + c.avoid.map(function (x) { return esc(x.name); }).join('、') + '</div>' : '') + '</div>' +
      '  <div class="card action"><div class="q">花多少？</div><div class="big num">' + money(p.spent) + ' <small>/ ' + money(res.budget) + '</small></div>' +
      '    <div>预计 <b class="num">' + one(p.intents) + '</b> 条购买意向，剩 <b class="num">' + money(p.remaining) + '</b></div>' +
      '    <div class="chips">' + chip('每千元 ' + one(p.recPerK) + ' 条', 'good') + chip('约 ' + one(p.times) + ' 倍于只投最贵', 'accent') + '</div></div>' +
      '  <div class="card action"><div class="q">写什么？</div><div class="big">' + esc(top.name) + '</div>' +
      '    <div>' + top.count + ' 条提问，' + top.unanswered + ' 条没人回答</div>' +
      '    <div class="chips">' + (top.matchesSellingPoint ? chip('对上卖点「' + D.product.sellingPoint + '」', 'good') : '') + '</div></div>' +
      '</div>' +

      '<div class="card" id="compare"><h2>为什么不投最贵的大号？</h2><p class="sub">每 ¥1,000 能换回多少条购买意向</p><div class="compare">' +
      bar(h.good.name + '<small>（' + esc(h.good.fans) + '）</small>', h.good.perK, maxK, false) +
      bar(h.bad.name + '<small>（' + esc(h.bad.fans) + '）</small>', h.bad.perK, maxK, true) +
      '</div></div>' +

      '<div class="card" id="plan"><div class="copy-row"><div><h2>一页结论</h2><p class="sub" style="margin:0">投谁、谈什么价、写什么，复制给自己或团队</p></div>' +
      '<button class="btn primary" type="button" id="copyBtn">复制方案</button></div>' +
      '<pre class="plan-text" id="planText">' + esc(S.toText(res)) + '</pre></div>' +
      foot();
  }
  function bar(label, v, max, bad) {
    return '<div class="bar-row"><div class="label">' + label + '</div><div class="bar' + (bad ? ' bad' : '') + '"><i style="width:' +
      Math.max(2, v / max * 100) + '%"></i></div><div class="val num">' + one(v) + ' 条</div></div>';
  }

  // ---------- 投谁 · 真种草 ----------
  function score() {
    var dep = res.score.deployable;
    var best = dep[0];
    var flagged = dep.filter(function (r) { return r.flags.some(function (f) { return f.tone !== 'gray'; }); });
    return head('投谁 · 真种草评分', '读懂评论：谁是真的种草，谁只是热闹。分数和组内最好的博主比，0–100。') +
      '<div class="callout">可投放博主中，<b>' + esc(best.name) + '</b> 真种草分最高（' + best.grassScore + '）。' +
      flagged.map(function (r) { return '<b>' + esc(r.name) + '</b> 被标「' + r.flags.filter(function (f) { return f.tone !== 'gray'; }).map(function (f) { return f.label; }).join('、') + '」'; }).join('；') + '。</div>' +
      '<div class="card" id="rank"><h2>可投放博主 · 种草榜</h2><p class="sub">粉丝 ≥ 1000。点开看命中的原评论（虚线框 = 夸赞/客套类）。</p><div class="rank">' +
      dep.map(function (r, i) { return rankItem(r, i + 1); }).join('') + '</div></div>' +
      '<div class="grid-2">' + scatter(dep) +
      '<div class="card"><h2>潜力观察（KOC）</h2><p class="sub">粉丝不足 1000，暂不能接商单，不计分、不进结论。</p><div class="table-wrap"><table><tr><th>博主</th><th class="r">粉丝</th><th class="r">笔记</th><th class="r">意向占比</th></tr>' +
      res.score.koc.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td class="r num">' + esc(r.fans) + '</td><td class="r num">' + r.notesCount + '</td><td class="r num">' + pct(r.purchaseIntentRatio) + '</td></tr>'; }).join('') +
      '</table></div></div></div>' +
      '<div class="callout formula">真种草分 = <code>0.6 × 购买意向占比得分 + 0.4 × 平均每篇购买意向得分</code>，两项都是「该值 ÷ 组内最高 × 100」。</div>' + foot();
  }
  function rankItem(r, no) {
    var hits = r.comments.filter(function (c) { return g.CalcEngine.isPurchase(c.tag) || c.ctrl; });
    return '<details class="rank-item" data-name="' + esc(r.name) + '"><summary>' +
      '<span class="rank-no">' + no + '</span>' +
      '<span class="rank-name"><b>' + esc(r.name) + '</b><span class="meta num">' + esc(r.fans) + ' 粉 · ' + r.notesCount + ' 篇 · 意向占比 ' + pct(r.purchaseIntentRatio) +
      ' · 平均每篇 ' + one(r.avgPurchaseIntent) + ' 条 · 平均点赞 ' + Math.round(r.avgLikes) + '</span><span class="chips">' + flagChips(r) + '</span></span>' +
      '<span class="score-bar"><i style="width:' + r.grassScore + '%"></i></span>' +
      '<span class="score-num num">' + r.grassScore + '</span></summary>' +
      '<div class="detail">' + r.flags.filter(function (f) { return f.reason; }).map(function (f) { return '<div class="flag-reason">' + chip(f.label, f.tone) + ' ' + esc(f.reason) + '</div>'; }).join('') +
      '<div class="comments">' + hits.map(function (c) {
        return '<div class="cm' + (c.ctrl ? ' ctrl' : '') + '"><span>' + esc(c.text) + '</span>' + chip(c.ctrl ? '夸赞/客套' : c.tag.replace('购买意向-', ''), c.ctrl ? 'warn' : 'good') + '</div>';
      }).join('') + '</div></div></details>';
  }
  function scatter(dep) {
    var W = 460, H = 280, L = 44, R = 20, TP = 20, BT = 40;
    var maxX = Math.max.apply(null, dep.map(function (r) { return r.avgLikes; })) * 1.1;
    var x = function (v) { return L + v / maxX * (W - L - R); };
    var y = function (v) { return TP + (1 - v / 100) * (H - TP - BT); };
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      return '<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    }).join('');
    var xt = [0, 1000, 2000, 3000].filter(function (v) { return v <= maxX; }).map(function (v) {
      return '<text x="' + x(v) + '" y="' + (H - BT + 18) + '" text-anchor="middle">' + v + '</text>';
    }).join('');
    var dots = dep.map(function (r) {
      var tone = r.flags.some(function (f) { return f.key === 'ctrl'; }) ? 'var(--warn)' : r.flags.some(function (f) { return f.tone === 'red'; }) ? 'var(--bad)' : 'var(--fg-3)';
      var px = x(r.avgLikes), py = y(r.grassScore);
      // 右边很近处有别的点：标签放到点的下方，避免和邻居的标签重叠
      var crowded = dep.some(function (o) { return o !== r && x(o.avgLikes) > px && x(o.avgLikes) - px < 120 && Math.abs(y(o.grassScore) - py) < 30; });
      var anchor = crowded ? 'middle' : px > W - 90 ? 'end' : 'start';
      var lx = crowded ? px : px + (anchor === 'end' ? -12 : 12);
      var ly = crowded ? py + 22 : py + 4;
      return '<circle cx="' + px + '" cy="' + py + '" r="7" fill="' + tone + '"/>' +
        '<text class="lbl" x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '">' + esc(r.name) + '</text>';
    }).join('');
    return '<div class="card scatter"><h2>热度 vs 种草</h2><p class="sub">横轴平均点赞，纵轴真种草分</p>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="平均点赞与真种草分散点图">' + grid + xt +
      '<text x="' + ((W + L) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">平均点赞（每篇）</text>' + dots + '</svg>' +
      '<div class="legend"><span><i style="background:var(--warn)"></i>疑似控评</span><span><i style="background:var(--bad)"></i>热度高但种草低</span><span><i style="background:var(--fg-3)"></i>其他</span></div></div>';
  }

  // ---------- 花多少 · 预算 ----------
  function budget() {
    var p = res.budget_, ct = p.contrast;
    return head('花多少 · 预算方案', '预算里，钱该给谁、给多少。拖动滑块会实时重算。') +
      '<div class="card" id="budgetCard"><div class="budget-top"><h2>投放预算</h2><div class="money num" id="budgetVal">' + money(res.budget) + '</div></div>' +
      '<input type="range" id="budgetRange" min="1000" max="20000" step="500" value="' + res.budget + '" aria-label="投放预算">' +
      '<div class="ticks num"><span>¥1,000</span><span>¥5,000</span><span>¥10,000</span><span>¥15,000</span><span>¥20,000</span></div></div>' +
      '<div class="vs" id="vs">' +
      '  <div class="card"><h2>只投报价最高的博主</h2><p class="sub">' + esc(ct.name) + ' · 1 篇</p><div class="kv">' +
      kv('花费', money(ct.spent)) + kv('预计购买意向', one(ct.intents) + ' 条') + kv('每千元意向', one(ct.perK) + ' 条') + '</div></div>' +
      '  <div class="times"><b class="num">' + (p.times ? one(p.times) + '×' : '—') + '</b><small>每千元<br>种草效率</small></div>' +
      '  <div class="card win"><h2>推荐组合</h2><p class="sub">' + p.selected.map(function (r) { return esc(r.name); }).join(' + ') + '</p><div class="kv">' +
      kv('花费', money(p.spent)) + kv('预计购买意向', one(p.intents) + ' 条') + kv('每千元意向', one(p.recPerK) + ' 条') + '</div></div>' +
      '</div>' +
      (p.remaining > 0 && p.cheapest ? '<div class="callout">还剩 <b>' + money(p.remaining) + '</b>：可以在成本最低的 <b>' + esc(p.cheapest.name) + '</b> 身上加投一篇（' + money(p.cheapest.quote) + '），或留作测试。</div>' : '') +
      '<div class="card" id="costTable"><h2>博主成本表</h2><p class="sub">按每条购买意向成本从低到高；中位数 ' + money(p.median) + '。≤ 中位数值得投，1–1.5 倍可谈价，更高不建议。</p>' +
      '<div class="table-wrap"><table><tr><th>博主</th><th class="r">报价</th><th class="r">平均意向/篇</th><th class="r">每条意向成本</th><th>结论</th></tr>' +
      p.rows.map(function (r) {
        var note = r.tier === 'talk' ? '建议谈到 ' + money(r.suggestedPrice) : r.tier === 'avoid' ? '成本是中位数的 ' + one(r.multiple) + ' 倍' : '';
        return '<tr data-name="' + esc(r.name) + '"><td>' + esc(r.name) + '</td><td class="r num">' + money(r.quote) + '</td><td class="r num">' + one(r.avgPurchaseIntent) +
          '</td><td class="r num">' + money(r.cost) + '</td><td>' + chip(r.tierLabel, tierTone(r.tier)) + (note ? ' <small style="color:var(--fg-3)">' + note + '</small>' : '') + '</td></tr>';
      }).join('') + '</table></div></div>' +
      '<div class="card"><h2>报价怎么算（模拟）</h2><p class="formula">报价 = <code>粉丝阶梯价 × 溢价系数</code>，溢价系数 = <code>0.8 + 0.5 × 真种草分 ÷ 100</code>（0.8–1.3）。种草好的博主被加价，所以推荐结论偏保守。</p>' +
      '<div class="table-wrap"><table><tr><th>博主</th><th>粉丝档位</th><th class="r">阶梯价</th><th class="r">种草分</th><th class="r">系数</th><th class="r">报价</th></tr>' +
      res.score.deployable.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.tierLabel) + '</td><td class="r num">' + money(r.baseQuote) + '</td><td class="r num">' + r.grassScore +
          '</td><td class="r num">×' + r.premium.toFixed(2) + '</td><td class="r num">' + money(r.quote) + '</td></tr>';
      }).join('') + '</table></div></div>' + foot();
  }
  function kv(k, v) { return '<div><span>' + k + '</span><b class="num">' + v + '</b></div>'; }

  // ---------- 写什么 · 问题雷达 ----------
  function radar() {
    var r = res.radar, top = r.top, max = Math.max.apply(null, r.topics.map(function (t) { return t.count; }));
    return head('写什么 · 问题雷达', '评论区里用户真正在问什么、哪些一直没人回答。按「提问数 × 没被回答比例」排序。') +
      '<div class="grid-3">' + stat('提问类评论', r.totalQuestions + ' 条') + stat('没被回答', r.totalUnanswered + ' 条（' + pct(r.totalUnanswered / r.totalQuestions) + '）') +
      stat('最该先写', top.name) + '</div>' +
      '<div class="grid-2"><div class="card" id="topics"><h2>评论区在问什么</h2><p class="sub">红色 = 没人回答，灰色 = 已回答；「其他问题」不参与排序。</p>' +
      r.topics.map(function (t) {
        return '<div class="topic" data-key="' + t.key + '"><div class="name">' + esc(t.name) +
          (t.matchesSellingPoint ? chip('命中卖点', 'good') : '') + (t.needsEvidence ? chip('需配方资料支撑', 'warn') : '') + '</div>' +
          '<div class="count num">' + t.count + ' 问 · ' + t.unanswered + ' 没人答</div>' +
          '<div class="stack" style="width:' + (t.count / max * 100) + '%"><i class="un" style="width:' + (t.unanswered / t.count * 100) + '%"></i><i class="an" style="flex:1"></i></div>' +
          (t.key !== 'other' ? '<div class="suggest">建议选题：' + esc(t.suggest) + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="card"><h2>原评论 · ' + esc(top.name) + '</h2><p class="sub">没人回答的提问</p><div class="quote-list">' +
      top.samples.filter(function (s) { return !s.replied; }).slice(0, 5).map(function (s) {
        return '<blockquote>' + esc(s.text) + '<cite>' + esc(s.creator) + ' ·《' + esc(s.note) + '》</cite></blockquote>';
      }).join('') + '</div></div></div>' +
      '<div class="callout">你的卖点「<b>' + esc(r.sellingPoint) + '</b>」：' +
      (top.matchesSellingPoint ? '正好回答「' + esc(top.name) + '」，下一篇优先写这个。' : '和最集中的问题没有直接对上，建议补一篇回应。') +
      ' 涉及肠胃健康的问题，要有配方或检测资料支撑再承诺。</div>' + foot();
  }
  function stat(k, v) { return '<div class="card stat"><small>' + k + '</small><b>' + esc(v) + '</b></div>'; }

  // ---------- 试一试 ----------
  var SAMPLE = ['蹲个真实反馈！之前喂的粮猫总是吃腻，这款适口性到底咋样啊？', '甜虾看得我都馋了……已下单，期待发货', '求链接，想给家里挑食的小祖宗试试',
    '多少钱一袋，贵吗', '学到了学到了 博主教的好好', '已囤两包，无限回购', '玻璃胃小咪可以吃的冻干，肠胃敏感能喂吗', '我家猫不爱吃，闻都不闻', '好可爱的小猫咪'].join('\n');
  function tryPage() {
    return head('试一试', '粘贴任意一篇笔记的评论，每行一条，现场打标。演示版用关键词规则，正式版换成大模型。') +
      '<div class="card"><div class="tools"><button class="btn" type="button" id="fillBtn">填入示例</button><button class="btn primary" type="button" id="runBtn">开始分析</button></div>' +
      '<label for="tryInput" class="sub" style="display:block">每行一条评论</label><textarea id="tryInput" placeholder="例如：这款挑食猫能吃吗？"></textarea></div>' +
      '<div id="tryOut"></div>' + foot();
  }
  function renderTry() {
    var lines = document.getElementById('tryInput').value.split('\n');
    var r = g.CalcTagger.analyze(lines);
    var out = document.getElementById('tryOut');
    if (!r.total) { out.innerHTML = '<div class="callout">先粘贴几条评论，或点「填入示例」。</div>'; return; }
    out.innerHTML = '<div class="card"><div class="stat-row">' +
      '<div class="stat"><small>评论数</small><b class="num">' + r.total + '</b></div>' +
      '<div class="stat"><small>购买意向</small><b class="num">' + r.purchase + ' 条（' + pct(r.ratio) + '）</b></div>' +
      '<div class="stat"><small>最多的提问话题</small><b>' + (r.topTopic ? esc(r.topTopic.name) : '暂无') + '</b></div></div>' +
      '<div class="comments" style="max-height:none;margin-top:14px">' + r.items.map(function (x) {
        return '<div class="cm"><span>' + esc(x.text) + '</span>' + chip(x.tag, tagTone(x.tag)) + '</div>';
      }).join('') + '</div></div>';
  }

  function head(t, s) { return '<header class="page-head"><h1>' + esc(t) + '</h1><p>' + esc(s) + '</p></header>'; }
  function foot() {
    return '<p class="foot">评论来自小红书公开笔记，仅用于方法演示，不构成对博主的评价。报价为模拟值；购买意向是种草信号，不等于成交。</p>';
  }

  // ---------- 路由与事件 ----------
  var PAGES = { home: home, score: score, budget: budget, radar: radar, try: tryPage };

  function render(page) {
    state.page = PAGES[page] ? page : 'home';
    app.innerHTML = '<div class="page" data-page="' + state.page + '">' + PAGES[state.page]() + '</div>';
    document.querySelectorAll('.nav button').forEach(function (b) {
      if (b.dataset.page === state.page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    bind();
  }

  function setBudget(v) {
    state.budget = v;
    res = S.run(D, v);
  }

  function bind() {
    var range = document.getElementById('budgetRange');
    if (range) {
      range.addEventListener('input', function () { document.getElementById('budgetVal').textContent = money(+range.value); });
      range.addEventListener('change', function () {
        setBudget(+range.value);
        var y = window.scrollY; render('budget'); window.scrollTo(0, y);
        document.getElementById('budgetRange').focus();
      });
    }
    var copy = document.getElementById('copyBtn');
    if (copy) copy.addEventListener('click', function () {
      var text = document.getElementById('planText').textContent;
      var done = function () { copy.textContent = '已复制'; setTimeout(function () { copy.textContent = '复制方案'; }, 1600); };
      var fallback = function () {
        var sel = window.getSelection(), range = document.createRange();
        range.selectNodeContents(document.getElementById('planText')); sel.removeAllRanges(); sel.addRange(range);
        copy.textContent = '已选中，按 ⌘C 复制';
      };
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
    var fill = document.getElementById('fillBtn');
    if (fill) {
      fill.addEventListener('click', function () { document.getElementById('tryInput').value = SAMPLE; renderTry(); });
      document.getElementById('runBtn').addEventListener('click', renderTry);
    }
  }

  document.querySelectorAll('.nav button').forEach(function (b) {
    b.addEventListener('click', function () { render(b.dataset.page); window.scrollTo(0, 0); });
  });

  var hash = (location.hash || '').slice(1);
  render(PAGES[hash] ? hash : 'home');

  // 给演示层用
  g.App = {
    go: function (p) { render(p); window.scrollTo(0, 0); },
    result: function () { return res; },
    resetBudget: function () { setBudget(D.product.budget); },
  };
})(window);
