/* 计算层 · util：各模块共用的小工具（纯函数，不读 DATA）。 */
(function (g) {
  'use strict';

  // "12.3万" / "1638" / 1638 → 数字
  function parseFans(s) {
    if (typeof s === 'number') return s;
    var str = String(s).trim();
    var m = str.match(/^([\d.]+)\s*万$/);
    if (m) return parseFloat(m[1]) * 10000;
    return parseFloat(str) || 0;
  }

  function median(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function roundTo(x, step) { return Math.round(x / step) * step; }

  // 可投放：粉丝 ≥ 1000（能接商单）；以下为潜力 KOC
  var DEPLOYABLE_MIN_FANS = 1000;
  function isDeployable(fans) { return parseFans(fans) >= DEPLOYABLE_MIN_FANS; }

  g.CalcUtil = {
    parseFans: parseFans,
    median: median,
    roundTo: roundTo,
    DEPLOYABLE_MIN_FANS: DEPLOYABLE_MIN_FANS,
    isDeployable: isDeployable,
  };
})(typeof window !== 'undefined' ? window : globalThis);
