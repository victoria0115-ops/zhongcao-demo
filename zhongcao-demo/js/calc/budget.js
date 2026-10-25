/* 计算层 · budget：预算方案。只看可投放博主。
 *   每条意向成本 = 报价 ÷ 平均每篇购买意向数
 *   三档：≤ 中位数 值得投；≤ 1.5 倍 偏贵可谈价（给建议价）；更高 不建议
 *   推荐组合：按成本从低到高，预算内依次选入（每人 1 篇）
 *   对照：只投报价最高的博主 1 篇；比较「每千元购买意向」 */
(function (g) {
  'use strict';

  var U = g.CalcUtil;
  var TALK_LIMIT = 1.5;

  function perK(intents, spent) { return spent > 0 ? intents / spent * 1000 : 0; }

  function compute(creators, budget) {
    // creators：score.deployable（已带 quote 字段）
    var rows = creators.map(function (c) {
      var cost = c.avgPurchaseIntent > 0 ? c.quote / c.avgPurchaseIntent : Infinity;
      return {
        name: c.name, fans: c.fans, quote: c.quote, notesCount: c.notesCount,
        avgPurchaseIntent: c.avgPurchaseIntent, cost: cost, perK: perK(c.avgPurchaseIntent, c.quote),
      };
    });
    var med = U.median(rows.filter(function (r) { return isFinite(r.cost); }).map(function (r) { return r.cost; }));

    rows.forEach(function (r) {
      r.multiple = med > 0 && isFinite(r.cost) ? r.cost / med : null;
      if (!isFinite(r.cost) || r.cost > med * TALK_LIMIT) r.tier = 'avoid';
      else if (r.cost > med) r.tier = 'talk';
      else r.tier = 'good';
      r.tierLabel = { good: '值得投', talk: '偏贵可谈价', avoid: '不建议' }[r.tier] +
        (r.notesCount === 1 ? '（样本少）' : '');
      // 建议价：让它的成本回到中位数，取整百
      r.suggestedPrice = r.tier === 'talk' ? U.roundTo(med * r.avgPurchaseIntent, 100) : null;
    });
    rows.sort(function (a, b) { return a.cost - b.cost; });

    var selected = [], spent = 0;
    rows.forEach(function (r) {
      if (isFinite(r.cost) && spent + r.quote <= budget) { selected.push(r); spent += r.quote; }
    });
    var intents = selected.reduce(function (s, r) { return s + r.avgPurchaseIntent; }, 0);

    var top = rows.slice().sort(function (a, b) { return b.quote - a.quote; })[0];
    var recK = perK(intents, spent);
    var conK = top ? perK(top.avgPurchaseIntent, top.quote) : 0;

    return {
      budget: budget,
      rows: rows,
      median: med,
      selected: selected,
      spent: spent,
      intents: intents,
      remaining: Math.max(0, budget - spent),
      costPerIntent: intents > 0 ? spent / intents : 0,
      recPerK: recK,
      contrast: top ? { name: top.name, fans: top.fans, spent: top.quote, intents: top.avgPurchaseIntent, perK: conK } : null,
      times: conK > 0 ? recK / conK : null,
      cheapest: rows[0] || null, // 剩余预算可在它身上加投
    };
  }

  g.CalcBudget = { TALK_LIMIT: TALK_LIMIT, perK: perK, compute: compute };
})(typeof window !== 'undefined' ? window : globalThis);
