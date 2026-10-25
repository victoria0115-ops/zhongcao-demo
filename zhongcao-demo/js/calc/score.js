/* 计算层 · score：真种草分 + 异常标记。
 * 只在「可投放博主」（粉丝 ≥ 1000）里比较；KOC 不计分，只放进潜力观察。
 *
 *   真种草分 = 0.6 × 占比得分 + 0.4 × 数量得分
 *   得分 = 该博主的值 ÷ 可投放组内最高值 × 100（保留差距大小，不是名次分）
 */
(function (g) {
  'use strict';

  var U = g.CalcUtil;
  var W_RATIO = 0.6, W_COUNT = 0.4;

  // 夸博主 / 客套话：用于「疑似控评」
  var CTRL_KEYWORDS = ['学到', '涨知识', '讲的好', '讲得好', '讲的太好', '博主推荐',
    '谢谢博主', '干货', '码住', '不错不错', '推荐推荐', '感谢科普'];
  var CTRL_MIN_RATIO = 0.15;   // 绝对门槛：占比至少 15%
  var CTRL_MEDIAN_TIMES = 5;   // 相对门槛：且至少是组内中位数的 5 倍

  function isCtrl(text) {
    return CTRL_KEYWORDS.some(function (k) { return text.indexOf(k) !== -1; });
  }

  // 返回 { rank: [...], score: [...] }，下标与 rows 对齐；rank 1 = 最高
  function rankAndScore(rows, get) {
    var vals = rows.map(get);
    var max = Math.max.apply(null, vals.concat([0]));
    var order = vals.map(function (v, i) { return i; })
      .sort(function (a, b) { return vals[b] - vals[a]; });
    var rank = [];
    order.forEach(function (idx, pos) { rank[idx] = pos + 1; });
    return { rank: rank, score: vals.map(function (v) { return max > 0 ? v / max * 100 : 0; }) };
  }

  function compute(stats, data) {
    var rows = stats.map(function (s, i) {
      var comments = [];
      data.creators[i].notes.forEach(function (note) {
        note.comments.forEach(function (c) {
          comments.push({ text: c.t, tag: c.tag, note: note.title, ctrl: isCtrl(c.t) });
        });
      });
      var ctrlCount = comments.filter(function (c) { return c.ctrl; }).length;
      return Object.assign({}, s, {
        comments: comments,
        ctrlCount: ctrlCount,
        ctrlRatio: comments.length ? ctrlCount / comments.length : 0,
        deployable: U.isDeployable(s.fans),
        flags: [],
        grassScore: null,
      });
    });

    var dep = rows.filter(function (r) { return r.deployable; });
    var koc = rows.filter(function (r) { return !r.deployable; });

    var ratio = rankAndScore(dep, function (r) { return r.purchaseIntentRatio; });
    var count = rankAndScore(dep, function (r) { return r.avgPurchaseIntent; });
    var likes = rankAndScore(dep, function (r) { return r.avgLikes; });
    var cc = rankAndScore(dep, function (r) { return r.avgCommentCount; });

    dep.forEach(function (r, i) {
      r.ratioScore = ratio.score[i];
      r.countScore = count.score[i];
      r.grassScore = Math.round(W_RATIO * ratio.score[i] + W_COUNT * count.score[i]);
      r.ratioRank = ratio.rank[i];
      r.likesRank = likes.rank[i];
      r.commentRank = cc.rank[i];
    });

    var n = dep.length;
    var topHalf = Math.ceil(n / 2);          // 名次 ≤ 它算「前一半」
    var bottomHalf = Math.floor(n / 2) + 1;  // 名次 ≥ 它算「后一半」
    var medCtrl = U.median(dep.map(function (r) { return r.ctrlRatio; }));

    dep.forEach(function (r) {
      if (r.likesRank <= topHalf && r.ratioRank >= bottomHalf) {
        r.flags.push({ key: 'likeHigh', label: '点赞高但种草低', tone: 'red',
          reason: '平均点赞第 ' + r.likesRank + '，购买意向占比第 ' + r.ratioRank });
      }
      if (r.commentRank <= topHalf && r.ratioRank >= bottomHalf) {
        r.flags.push({ key: 'commentHot', label: '评论热闹但种草低', tone: 'red',
          reason: '平均评论数第 ' + r.commentRank + '（前一半），购买意向占比第 ' + r.ratioRank + '（后一半）' });
      }
      if (r.ctrlRatio >= CTRL_MIN_RATIO && r.ctrlRatio >= medCtrl * CTRL_MEDIAN_TIMES) {
        r.flags.push({ key: 'ctrl', label: '疑似控评', tone: 'orange',
          reason: '夸赞/客套评论占 ' + pct(r.ctrlRatio) + '（' + r.ctrlCount + '/' + r.comments.length +
            '），组内中位数 ' + pct(medCtrl) });
      }
      if (r.notesCount === 1) {
        r.flags.push({ key: 'sample', label: '样本少，仅供参考', tone: 'gray', reason: '只有 1 篇笔记' });
      }
    });
    koc.forEach(function (r) {
      r.flags.push({ key: 'koc', label: '潜力 KOC', tone: 'gray', reason: '粉丝不足 1000，暂不能接商单' });
    });

    dep.sort(function (a, b) { return b.grassScore - a.grassScore; });
    return { deployable: dep, koc: koc, medianCtrlRatio: medCtrl };
  }

  function pct(x) { return Math.round(x * 1000) / 10 + '%'; }

  g.CalcScore = {
    CTRL_KEYWORDS: CTRL_KEYWORDS,
    W_RATIO: W_RATIO, W_COUNT: W_COUNT,
    isCtrl: isCtrl,
    compute: compute,
    pct: pct,
  };
})(typeof window !== 'undefined' ? window : globalThis);
