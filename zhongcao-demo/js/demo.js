/* 演示层 · demo：一键演示 5 步。每一步切到对应页面、高亮一个区域、弹出一句说明。
 * 所有数字都实时读计算结果，不写死。 */
(function (g) {
  'use strict';

  var panel = null, i = 0;

  function money(n) { return '¥' + Math.round(n).toLocaleString('zh-CN'); }

  function steps() {
    var r = g.App.result(), p = r.budget_, top = r.radar.top;
    var ctrl = r.score.deployable.find(function (x) { return x.flags.some(function (f) { return f.key === 'ctrl'; }); });
    var hot = r.score.deployable.find(function (x) { return x.flags.some(function (f) { return f.key === 'commentHot'; }); });
    return [
      { page: 'home', target: '#hero', text: '小商家只有 ' + money(r.budget) + '，该投谁？粉丝最多的，未必最会带货。' },
      { page: 'score', target: '#rank', open: [ctrl && ctrl.name, hot && hot.name],
        text: (ctrl ? ctrl.name + '：夸赞评论占比异常，疑似控评；' : '') + (hot ? hot.name + '：评论最热闹，购买意向却最少。' : '') },
      { page: 'budget', target: '#vs', text: '同样 ' + money(r.budget) + '，推荐组合只花 ' + money(p.spent) + '，每千元种草效率约 ' + p.times.toFixed(1) + ' 倍，还剩 ' + money(p.remaining) + '。' },
      { page: 'radar', target: '#topics', text: '「' + top.name + '」' + top.count + ' 条提问、' + top.unanswered + ' 条没人答，正好对上卖点，下一篇就写它。' },
      { page: 'home', target: '#plan', text: '投谁、谈什么价、写什么，一页带走。' },
    ];
  }

  function clear() {
    document.querySelectorAll('.demo-hl').forEach(function (el) { el.classList.remove('demo-hl'); });
  }

  function show() {
    var list = steps(), s = list[i];
    g.App.go(s.page);
    clear();
    (s.open || []).forEach(function (name) {
      if (!name) return;
      var d = document.querySelector('.rank-item[data-name="' + CSS.escape(name) + '"]');
      if (d) d.open = true;
    });
    var el = document.querySelector(s.target);
    if (el) {
      el.classList.add('demo-hl');
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'demo-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', '一键演示');
      document.body.appendChild(panel);
    }
    var last = i === list.length - 1;
    panel.innerHTML = '<div class="step">演示 ' + (i + 1) + ' / ' + list.length + '</div><p>' + s.text.replace(/</g, '&lt;') + '</p>' +
      '<div class="row"><button type="button" class="btn" data-a="prev"' + (i === 0 ? ' disabled' : '') + '>上一步</button>' +
      '<button type="button" class="btn primary" data-a="next">' + (last ? '完成' : '下一步') + '</button>' +
      '<button type="button" class="btn" data-a="exit">退出</button></div>';
    panel.querySelector('[data-a="next"]').focus();
  }

  function stop() {
    clear();
    if (panel) { panel.remove(); panel = null; }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.demo-panel [data-a]');
    if (!a) return;
    var n = steps().length;
    if (a.dataset.a === 'prev' && i > 0) { i -= 1; show(); }
    else if (a.dataset.a === 'next') { if (i < n - 1) { i += 1; show(); } else stop(); }
    else if (a.dataset.a === 'exit') stop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel) stop(); });

  document.getElementById('demoBtn').addEventListener('click', function () {
    g.App.resetBudget(); // 演示固定用产品预算
    i = 0; show();
  });

  g.Demo = { start: function () { document.getElementById('demoBtn').click(); }, stop: stop };
})(window);
