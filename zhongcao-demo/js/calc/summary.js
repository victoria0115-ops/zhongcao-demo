/* 计算层 · summary：把各模块串起来，产出页面要用的一整份结果（原版这里是空壳，这次补全）。
 *   顺序：engine 计数 → score 打分 → quote 按分数定价 → budget 分预算 → radar 找问题 → 一页结论 */
(function (g) {
  'use strict';

  function run(data, budget) {
    var b = Number(budget) > 0 ? Number(budget) : data.product.budget;
    var stats = g.CalcEngine.run(data);
    var score = g.CalcScore.compute(stats, data);

    score.deployable.concat(score.koc).forEach(function (r) {
      var q = g.CalcQuote.quoteFor(r.fans, r.grassScore);
      r.baseQuote = q.base; r.premium = q.factor; r.quote = q.quote; r.tierLabel = q.tierLabel;
    });

    var budgetPlan = g.CalcBudget.compute(score.deployable, b);
    var radar = g.CalcRadar.scan(data);

    var byTier = function (t) { return budgetPlan.rows.filter(function (r) { return r.tier === t; }); };
    var best = budgetPlan.rows[0];
    var conclusion = {
      invest: budgetPlan.selected.map(function (r) { return r.name; }),
      negotiate: byTier('talk').map(function (r) { return { name: r.name, quote: r.quote, suggested: r.suggestedPrice }; }),
      avoid: byTier('avoid').map(function (r) { return { name: r.name, quote: r.quote, multiple: r.multiple }; }),
      topics: radar.topics.filter(function (t) { return t.key !== 'other'; }).slice(0, 3).map(function (t) { return t.suggest; }),
      // 首页对比：每千元购买意向，成本最低的博主 vs 报价最高的博主
      headline: best && budgetPlan.contrast ? {
        good: { name: best.name, fans: best.fans, perK: best.perK },
        bad: { name: budgetPlan.contrast.name, fans: budgetPlan.contrast.fans, perK: budgetPlan.contrast.perK },
        times: budgetPlan.contrast.perK > 0 ? best.perK / budgetPlan.contrast.perK : null,
      } : null,
    };

    return { product: data.product, budget: b, score: score, budget_: budgetPlan, radar: radar, conclusion: conclusion };
  }

  function toText(res) {
    var c = res.conclusion, p = res.budget_;
    var lines = [
      '【种草参谋 · 投放方案】' + res.product.category + ' · 预算 ¥' + res.budget.toLocaleString('zh-CN'),
      '1. 投谁：' + c.invest.join('、') + '（共 ¥' + p.spent.toLocaleString('zh-CN') + '，预计 ' + p.intents.toFixed(1) + ' 条购买意向，剩 ¥' + p.remaining.toLocaleString('zh-CN') + '）',
    ];
    c.negotiate.forEach(function (x) { lines.push('   谈价：' + x.name + ' 报价 ¥' + x.quote.toLocaleString('zh-CN') + '，建议谈到 ¥' + x.suggested.toLocaleString('zh-CN')); });
    c.avoid.forEach(function (x) { lines.push('   不建议：' + x.name + ' 报价 ¥' + x.quote.toLocaleString('zh-CN') + '，每条意向成本是中位数的 ' + x.multiple.toFixed(1) + ' 倍'); });
    lines.push('2. 效率：每千元购买意向约为只投报价最高博主的 ' + (p.times ? p.times.toFixed(1) : '—') + ' 倍');
    lines.push('3. 先写：' + c.topics.join(' / '));
    lines.push('注：评论来自小红书公开笔记；报价为模拟值；购买意向是种草信号，不等于成交。');
    return lines.join('\n');
  }

  g.CalcSummary = { run: run, toText: toText };
})(typeof window !== 'undefined' ? window : globalThis);
