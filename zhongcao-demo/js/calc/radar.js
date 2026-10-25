/* 计算层 · radar：问题雷达。
 * 收集全部评论里的提问 → 按关键词归入话题 → 按「提问数 × 没被回答比例」排序。
 * 「没被回答」= 这条评论下没有博主或品牌回复（只看本笔记评论区）。
 * 「其他问题」不参与排序，永远放最后。 */
(function (g) {
  'use strict';

  var T = g.TAGS;
  var QUESTION_TAGS = [T.ASK_FIT, T.ASK_CHANNEL, T.ASK_SPEC, T.QUESTION_OTHER];
  var QUESTION_MARKS = ['吗', '？', '怎么', '咋'];

  // 按顺序匹配，第一条命中即归入
  var TOPICS = [
    { key: 'picky', name: '挑食 / 适口性 / 换粮', kw: ['挑食', '挑', '不吃', '不爱吃', '适口性', '换粮', '吃腻', '只吃'], suggest: '挑食猫换粮：7 天过渡怎么做' },
    { key: 'kitten', name: '幼猫怎么选粮', kw: ['幼猫', '小猫选粮'], suggest: '幼猫第一包冻干怎么选' },
    { key: 'neuter', name: '绝育后怎么喂', kw: ['绝育'], suggest: '绝育后食欲差怎么喂才不瘦' },
    { key: 'gut', name: '肠胃敏感能不能吃', kw: ['肠胃', '玻璃胃', '软便', '吸收', '拉稀'], suggest: '玻璃胃猫选冻干要看哪些成分', needsEvidence: true },
    { key: 'mix', name: '冻干怎么搭配主粮', kw: ['混', '拌', '搭配', '主食', '全价', '零食'], suggest: '冻干当主食还是零食一次讲清' },
    { key: 'price', name: '价格与活动', kw: ['贵', '价格', '活动', '好价', '多少钱'], suggest: '冻干什么时候买最划算' },
    { key: 'where', name: '在哪买 / 什么牌子', kw: ['链接', '哪里买', '什么牌子', '哪款', '同款', '车车'], suggest: '同款冻干哪家更值得买' },
  ];
  var OTHER = { key: 'other', name: '其他问题', kw: [], suggest: '评论区高频提问集中解答' };

  function isQuestion(text, tag) {
    if (QUESTION_TAGS.indexOf(tag) !== -1) return true;
    return QUESTION_MARKS.some(function (m) { return text.indexOf(m) !== -1; });
  }

  function topicOf(text) {
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].kw.some(function (k) { return text.indexOf(k) !== -1; })) return TOPICS[i];
    }
    return OTHER;
  }

  function scan(data) {
    var sp = data.product.sellingPoint || '';
    var buckets = {};
    TOPICS.concat([OTHER]).forEach(function (t) {
      buckets[t.key] = { topic: t, count: 0, unanswered: 0, creators: {}, samples: [] };
    });
    var total = 0, totalUnanswered = 0;

    data.creators.forEach(function (c) {
      c.notes.forEach(function (note) {
        note.comments.forEach(function (cm) {
          if (!isQuestion(cm.t, cm.tag)) return;
          var b = buckets[topicOf(cm.t).key];
          b.count += 1; total += 1;
          if (!cm.replied) { b.unanswered += 1; totalUnanswered += 1; }
          b.creators[c.name] = true;
          b.samples.push({ text: cm.t, creator: c.name, note: note.title, replied: cm.replied });
        });
      });
    });

    var topics = Object.keys(buckets).map(function (k) {
      var b = buckets[k], t = b.topic;
      var ratio = b.count ? b.unanswered / b.count : 0;
      return {
        key: t.key, name: t.name, suggest: t.suggest, needsEvidence: !!t.needsEvidence,
        count: b.count, unanswered: b.unanswered, unansweredRatio: ratio,
        creatorCount: Object.keys(b.creators).length,
        sortScore: b.count * ratio,
        matchesSellingPoint: t.kw.some(function (w) { return sp.indexOf(w) !== -1; }),
        samples: b.samples,
      };
    }).filter(function (t) { return t.count > 0; });

    var main = topics.filter(function (t) { return t.key !== 'other'; })
      .sort(function (a, b) { return b.sortScore - a.sortScore || b.count - a.count; });
    var rest = topics.filter(function (t) { return t.key === 'other'; });

    return {
      topics: main.concat(rest),
      top: main[0] || null,
      totalQuestions: total,
      totalUnanswered: totalUnanswered,
      sellingPoint: sp,
    };
  }

  g.CalcRadar = { TOPICS: TOPICS, isQuestion: isQuestion, topicOf: topicOf, scan: scan };
})(typeof window !== 'undefined' ? window : globalThis);
