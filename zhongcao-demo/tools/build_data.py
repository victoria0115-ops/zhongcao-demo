"""把采集好的 JSON 转成页面直接加载的 js/data.js。

用法：python3 tools/build_data.py <精简版数据.json>
换品类或补数据时，只需要重跑这一步，计算层和页面都不用改。
报价不从 JSON 里取：由 js/calc/quote.js 按「粉丝阶梯价 × 真种草溢价」统一计算。
"""
import json
import sys
from pathlib import Path

TAGS = {
    "ASK_CHANNEL": "购买意向-问渠道",
    "ASK_SPEC": "购买意向-问规格",
    "ASK_FIT": "购买意向-问适用",
    "PURCHASED": "购买意向-已购",
    "QUESTION_OTHER": "提问-其他",
    "CONCERN_NEGATIVE": "顾虑或负面",
    "IRRELEVANT": "无关",
}


def main(src: str) -> None:
    raw = json.loads(Path(src).read_text(encoding="utf-8"))
    valid = set(TAGS.values())
    creators = []
    for c in raw["creators"]:
        notes = []
        for n in c["notes"]:
            comments = []
            for cm in n["comments"]:
                if cm["tag"] not in valid:
                    raise ValueError(f"未知标签：{cm['tag']}（{cm['t'][:20]}）")
                comments.append({"t": cm["t"], "tag": cm["tag"], "replied": bool(cm.get("replied"))})
            notes.append({
                "title": n["title"],
                "likes": int(n["likes"]),
                "collects": int(n["collects"]),
                "commentCount": int(n["commentCount"]),
                "comments": comments,
            })
        creators.append({"name": c["name"], "fans": c["fans"], "notes": notes})

    data = {"product": raw["product"], "creators": creators}
    out = Path(__file__).resolve().parent.parent / "js" / "data.js"
    out.write_text(
        "/* 数据层 · 由 tools/build_data.py 生成，请勿手改。\n"
        " * 评论来自小红书公开笔记（只记文字，不记用户名）；报价不在这里，由 quote.js 计算。 */\n"
        "(function (g) {\n"
        f"  g.TAGS = {json.dumps(TAGS, ensure_ascii=False, indent=2)};\n"
        f"  g.DATA = {json.dumps(data, ensure_ascii=False, indent=1)};\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n",
        encoding="utf-8",
    )
    total = sum(len(n["comments"]) for c in creators for n in c["notes"])
    print(f"写入 {out}：{len(creators)} 位博主，{sum(len(c['notes']) for c in creators)} 篇笔记，{total} 条评论")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/raw.json")
