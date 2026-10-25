/* 计算层 · quote：模拟报价。博主真实报价不公开，Demo 用两层估算：
 *   报价 = 粉丝阶梯价 × 溢价系数
 *   溢价系数 = 0.8 + 0.5 × 真种草分 ÷ 100（0.8–1.3；KOC 无分数，按 1.0）
 * 种草好的博主被加价，会让推荐结论偏保守。正式版换成蒲公英真实报价，只替换本文件。 */
(function (g) {
  'use strict';

  var U = g.CalcUtil;

  var FAN_TIERS = [
    { min: 100000, price: 3000, label: '≥10 万粉' },
    { min: 50000, price: 2000, label: '5–10 万粉' },
    { min: 10000, price: 1000, label: '1–5 万粉' },
    { min: 5000, price: 600, label: '5000–1 万粉' },
    { min: 1000, price: 300, label: '1000–5000 粉' },
    { min: 500, price: 100, label: '500–1000 粉（KOC）' },
    { min: 0, price: 50, label: '<500 粉（KOC）' },
  ];
  var FLOOR = 0.8, SLOPE = 0.5;

  function tier(fans) {
    var n = U.parseFans(fans);
    for (var i = 0; i < FAN_TIERS.length; i++) if (n >= FAN_TIERS[i].min) return FAN_TIERS[i];
    return FAN_TIERS[FAN_TIERS.length - 1];
  }

  function premium(grassScore) {
    if (grassScore === null || grassScore === undefined) return 1;
    return FLOOR + SLOPE * Math.max(0, Math.min(100, grassScore)) / 100;
  }

  // 返回 { base, factor, quote }，报价取整到 10 元
  function quoteFor(fans, grassScore) {
    var base = tier(fans).price;
    var factor = premium(grassScore);
    return { base: base, factor: factor, quote: U.roundTo(base * factor, 10), tierLabel: tier(fans).label };
  }

  g.CalcQuote = { FAN_TIERS: FAN_TIERS, FLOOR: FLOOR, SLOPE: SLOPE, tier: tier, premium: premium, quoteFor: quoteFor };
})(typeof window !== 'undefined' ? window : globalThis);
