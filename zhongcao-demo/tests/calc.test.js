// 计算层测试：用真实数据跑一遍，核对和线上版一致的关键数字。
// 运行：node tests/calc.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/data.js', 'js/calc/util.js', 'js/calc/engine.js', 'js/calc/score.js', 'js/calc/quote.js',
  'js/calc/budget.js', 'js/calc/radar.js', 'js/calc/tagger.js', 'js/calc/summary.js'];
FILES.forEach((f) => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }));

const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;
let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; console.log('  ✓ ' + name); }
  catch (e) { console.log('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

const res = CalcSummary.run(DATA, 5000);
const dep = Object.fromEntries(res.score.deployable.map((r) => [r.name.replace('🐱', ''), r]));
const B = res.budget_;

console.log('数据层');
check('6 位博主、12 篇笔记、273 条评论', () => {
  assert.strictEqual(DATA.creators.length, 6);
  assert.strictEqual(DATA.creators.reduce((s, c) => s + c.notes.length, 0), 12);
  assert.strictEqual(DATA.creators.reduce((s, c) => s + c.notes.reduce((t, n) => t + n.comments.length, 0), 0), 273);
});

console.log('评分');
check('可投放 4 位、KOC 2 位', () => { assert.strictEqual(res.score.deployable.length, 4); assert.strictEqual(res.score.koc.length, 2); });
check('真种草分 hey：100 / 乖乖不乖 81 / 弓长张 78 / 猫奴 43', () => {
  assert.deepStrictEqual(['hey：', '乖乖不乖', '弓长张（猫咪版）', '猫奴de食堂'].map((n) => dep[n].grassScore), [100, 81, 78, 43]);
});
check('乖乖不乖 = 疑似控评（22%）', () => {
  assert.ok(dep['乖乖不乖'].flags.some((f) => f.key === 'ctrl'));
  assert.ok(near(dep['乖乖不乖'].ctrlRatio, 0.22, 0.005));
});
check('猫奴de食堂 = 评论热闹但种草低（意向占比 10%）', () => {
  assert.ok(dep['猫奴de食堂'].flags.some((f) => f.key === 'commentHot'));
  assert.ok(near(dep['猫奴de食堂'].purchaseIntentRatio, 0.10, 0.005));
});
check('「点赞高但种草低」本批数据不触发', () => {
  assert.ok(!res.score.deployable.some((r) => r.flags.some((f) => f.key === 'likeHigh')));
});

console.log('报价');
check('报价 hey：390 / 弓长张 1190 / 猫奴 1020 / 乖乖不乖 3620；KOC 50', () => {
  assert.deepStrictEqual(['hey：', '弓长张（猫咪版）', '猫奴de食堂', '乖乖不乖'].map((n) => dep[n].quote), [390, 1190, 1020, 3620]);
  res.score.koc.forEach((r) => assert.strictEqual(r.quote, 50));
});

console.log('预算（¥5,000）');
check('每条意向成本 56 / 255 / 340 / 835，中位数 297.5', () => {
  assert.deepStrictEqual(B.rows.map((r) => Math.round(r.cost)), [56, 255, 340, 835]);
  assert.strictEqual(B.median, 297.5);
});
check('三档：值得投 ×2、猫奴偏贵可谈价（建议 ¥900）、乖乖不乖不建议（2.8 倍）', () => {
  assert.deepStrictEqual(B.rows.map((r) => r.tier), ['good', 'good', 'talk', 'avoid']);
  assert.strictEqual(B.rows[2].suggestedPrice, 900);
  assert.ok(near(B.rows[3].multiple, 2.8, 0.05));
});
check('推荐组合 ¥2,600、14.7 条、剩 ¥2,400、每条 ¥177', () => {
  assert.strictEqual(B.spent, 2600);
  assert.ok(near(B.intents, 14.67, 0.01));
  assert.strictEqual(B.remaining, 2400);
  assert.strictEqual(Math.round(B.costPerIntent), 177);
});
check('每千元 5.6 vs 1.2，约 4.7 倍', () => {
  assert.ok(near(B.recPerK, 5.64, 0.01));
  assert.ok(near(B.contrast.perK, 1.20, 0.01));
  assert.ok(near(B.times, 4.71, 0.01));
});
check('首页单博主对比：hey：17.9 vs 乖乖不乖 1.2（约 15 倍）', () => {
  const h = res.conclusion.headline;
  assert.ok(near(h.good.perK, 17.9, 0.05)); assert.ok(near(h.bad.perK, 1.2, 0.01)); assert.ok(near(h.times, 15, 0.1));
});
check('预算 ¥10,000：四位全选、¥6,220、约 2.6 倍', () => {
  const r = CalcSummary.run(DATA, 10000).budget_;
  assert.strictEqual(r.selected.length, 4); assert.strictEqual(r.spent, 6220); assert.ok(near(r.times, 2.55, 0.01));
});

console.log('问题雷达');
check('41 条提问，31 条没人答', () => { assert.strictEqual(res.radar.totalQuestions, 41); assert.strictEqual(res.radar.totalUnanswered, 31); });
check('第一名：挑食 / 适口性 / 换粮，14 问 11 没人答，命中卖点', () => {
  const t = res.radar.top;
  assert.strictEqual(t.key, 'picky'); assert.strictEqual(t.count, 14); assert.strictEqual(t.unanswered, 11); assert.ok(t.matchesSellingPoint);
});
check('「其他问题」排在最后', () => { assert.strictEqual(res.radar.topics[res.radar.topics.length - 1].key, 'other'); });

console.log('试一试打标');
check('典型评论打对标签', () => {
  assert.strictEqual(CalcTagger.tag('甜虾看得我都馋了……已下单'), TAGS.PURCHASED);
  assert.strictEqual(CalcTagger.tag('求链接'), TAGS.ASK_CHANNEL);
  assert.strictEqual(CalcTagger.tag('玻璃胃小咪能吃吗'), TAGS.ASK_FIT);
  assert.strictEqual(CalcTagger.tag('多少钱，贵吗'), TAGS.ASK_SPEC);
  assert.strictEqual(CalcTagger.tag('我家猫不爱吃'), TAGS.CONCERN_NEGATIVE);
  assert.strictEqual(CalcTagger.tag('好可爱的小猫'), TAGS.IRRELEVANT);
});

console.log('\n' + passed + ' 项通过' + (process.exitCode ? '，有失败项' : '，全部通过'));
console.log('\n' + CalcSummary.toText(res));
