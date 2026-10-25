/* 计算层 · engine：只做计数，不做任何判断。
 * 输入 DATA → 每篇笔记、每位博主的标签数、购买意向数、平均值。 */
(function (g) {
  'use strict';

  var T = g.TAGS;
  // 购买意向 = 这 4 个标签之和
  var PURCHASE_TAGS = [T.ASK_CHANNEL, T.ASK_SPEC, T.ASK_FIT, T.PURCHASED];

  function isPurchase(tag) { return PURCHASE_TAGS.indexOf(tag) !== -1; }

  function emptyCounts() {
    var c = {};
    Object.keys(T).forEach(function (k) { c[T[k]] = 0; });
    return c;
  }

  function noteStats(note) {
    var counts = emptyCounts();
    var pi = 0;
    note.comments.forEach(function (cm) {
      counts[cm.tag] += 1;
      if (isPurchase(cm.tag)) pi += 1;
    });
    return {
      title: note.title,
      likes: note.likes,
      collects: note.collects,
      commentCount: note.commentCount, // 笔记上显示的评论数（热闹度）
      sampled: note.comments.length,   // 实际采到的评论条数
      counts: counts,
      purchaseIntent: pi,
    };
  }

  function creatorStats(creator) {
    var notes = creator.notes.map(noteStats);
    var n = notes.length;
    var counts = emptyCounts();
    var pi = 0, sampled = 0, likes = 0, cc = 0;
    notes.forEach(function (ns) {
      Object.keys(ns.counts).forEach(function (t) { counts[t] += ns.counts[t]; });
      pi += ns.purchaseIntent;
      sampled += ns.sampled;
      likes += ns.likes;
      cc += ns.commentCount;
    });
    return {
      name: creator.name,
      fans: creator.fans,
      notesCount: n,
      notes: notes,
      counts: counts,
      purchaseIntent: pi,
      sampled: sampled,
      avgLikes: n ? likes / n : 0,
      avgCommentCount: n ? cc / n : 0,
      avgPurchaseIntent: n ? pi / n : 0,               // 平均每篇购买意向条数
      purchaseIntentRatio: sampled ? pi / sampled : 0, // 购买意向占比
    };
  }

  function run(data) { return data.creators.map(creatorStats); }

  g.CalcEngine = {
    PURCHASE_TAGS: PURCHASE_TAGS,
    isPurchase: isPurchase,
    noteStats: noteStats,
    creatorStats: creatorStats,
    run: run,
  };
})(typeof window !== 'undefined' ? window : globalThis);
