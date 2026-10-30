# 2026-10-30 四领域合并与来源说明

本期仅依据北京时间 2026-10-30 08:00 四项定时调研的已完成结果，不做额外新闻搜索或重新核验。**22 条候选 → 22 条独立新闻；其中合并跨领域复现的同一产品、论文与事件，各领域仅保留同一条目的复制记录以供聚合脚本标注领域。**

同日去重以事件标题规范化、首条链接及论文编号为主，同时与 10 月 28、29 日已发布的论文编号和同名标题比对。被自动排除的历史或当日重复条目：0。旧论文如 LongZero、TeleTune、ForkPilot、RealCLI 只标识为“近期补读”“HF 新收录”或“研究精选”，**不宣称 10 月 29 日首次发表**。同一公司的不同产品事件（例如 Alexa Shopping 与 Echo Time）不视为重复。

**资料局限：**部分产业新闻的原始调研只保留临时引用标识，未提供可公开复制的文章直链；为避免伪造链接，其 sources 字段明确写成“官方入口/目录页（非对应公告直链）”。这些公司消息只代表既有任务的转述，本期未进行独立核验；原始研究数字也未复现。缺少原始论文编号或可以复用的具体来源的高优先级观察项列于下方而不混入独立新闻条目。

- UniPat ScienceVision 与 TauIndianBankBench：原始调研列为高分发现，但可读取的结果缺少可复用原文直链，暂不伪造来源入榜。
- Amortizing Sequential Experimental Design、Know, then Draw、TAO、OmniShowcase：10 月 29 日 Hugging Face 新收录研究，部分原始论文编号未保留，待补原文链接。
- HuGe、CIVER、BiPA：具身学习和代码执行评测关联研究，其中 HuGe 是旧论文于 10 月 29 日新收录。

可复现：
```bash
python3 scripts/aggregate.py --date 2026-10-30 --input-dir sources/editions --brief-file sources/editions/2026-10-30/brief.txt
```
