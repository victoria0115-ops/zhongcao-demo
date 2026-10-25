/* 计算层 · tagger：「试一试」页的关键词打标（正式版换成大模型）。
 * 规则按顺序匹配，第一条命中即返回：已购 › 顾虑 › 问渠道 › 问规格 › 问适用 › 其他提问 › 无关 */
(function (g) {
  'use strict';

  var T = g.TAGS;
  var RULES = [
    { tag: T.PURCHASED, kw: ['已下单', '下单', '已买', '已购', '已囤', '囤', '加入购物车', '加购', '回购', '到手', '购入', '买了'] },
    { tag: T.CONCERN_NEGATIVE, kw: ['不吃', '不爱吃', '软便', '拉稀', '呕吐', '咬不动', '噱头', '难吃', '翻车', '踩雷', '克重不够', '贵'] },
    { tag: T.ASK_CHANNEL, kw: ['链接', '同款', '哪买', '哪里买', '怎么买', '什么牌子', '哪款', '车车', '店铺'] },
    { tag: T.ASK_SPEC, kw: ['规格', '口味', '多少克', '克重', '小份', '小包', '大包', '价格', '多少钱', '活动', '好价'] },
    { tag: T.ASK_FIT, kw: ['适口性', '适合', '适用', '挑食', '玻璃胃', '肠胃', '幼猫', '成猫', '换粮', '能吃吗', '吃吗', '能喂吗', '怎么样', '咋样'] },
    { tag: T.QUESTION_OTHER, kw: ['?', '？', '吗', '呢', '是不是', '怎么', '咋', '为什么'] },
  ];

  function tag(text) {
    var t = String(text || '').trim();
    if (!t) return T.IRRELEVANT;
    for (var i = 0; i < RULES.length; i++) {
      for (var j = 0; j < RULES[i].kw.length; j++) {
        var w = RULES[i].kw[j];
        if (t.indexOf(w) === -1) continue;
        if (w === '贵' && /不贵|多少钱|贵吗/.test(t)) continue; // 问价不算顾虑
        return RULES[i].tag;
      }
    }
    return T.IRRELEVANT;
  }

  function analyze(lines) {
    var E = g.CalcEngine, R = g.CalcRadar;
    var items = lines.map(function (s) { return String(s).trim(); }).filter(Boolean)
      .map(function (t) { return { text: t, tag: tag(t) }; });
    var pi = items.filter(function (x) { return E.isPurchase(x.tag); }).length;
    var topicCount = {};
    items.forEach(function (x) {
      if (!R.isQuestion(x.text, x.tag)) return;
      var tp = R.topicOf(x.text);
      if (tp.key === 'other') return;
      topicCount[tp.name] = (topicCount[tp.name] || 0) + 1;
    });
    var top = Object.keys(topicCount).sort(function (a, b) { return topicCount[b] - topicCount[a]; })[0];
    return {
      items: items,
      total: items.length,
      purchase: pi,
      ratio: items.length ? pi / items.length : 0,
      topTopic: top ? { name: top, count: topicCount[top] } : null,
    };
  }

  g.CalcTagger = { RULES: RULES, tag: tag, analyze: analyze };
})(typeof window !== 'undefined' ? window : globalThis);
