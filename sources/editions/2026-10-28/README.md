# 2026-10-28 首期来源说明

本期选题、排序评分与核心判断来自当日的四大 AI 调研合并任务记录；Personal Agent、Code/Work/Life Agent 和 RSI/AI4AI 的可读取原始记录用于交叉比对。Personal Agent 与 RSI 原始记录存在截断，模型训练与数据任务的单独运行结果本次无法读取，因此不声称完整覆盖四份原始输出。

本次仅查找已有选题的原文链接、核对标题与日期，没有扩充新闻选题。研究数字来自作者报告或已有调研，未独立复现实验。观点与未来研究建议列在 why_it_matters 中。

- 24 个去重条目，跨领域条目在四份领域导出中重复保留，由整合脚本合并领域标签。
- 同组包含多项工作时，published 采用首条来源对应的原文日期；例如 Google Sleep 为 10 月 27 日，TTME 为 10 月 23 日。
- 今日合并记录中的“Environment-First Synthesis”明确对应 EnvLunch；“独立验证研究与 Ai2 Novelty Judge”仅保留有明确原文的 Ai2 部分，AgentProofBench 已在第 9 项收录。
- 修正原始 Code/Work/Life 调研中 Memory–Skill 论文的错链：2610.33084 是数学论文，正确来源为 2610.33128，首投日期 10 月 23 日。
- 分数沿用合并任务的编辑优先级，换算为 0–100 整数；同分条目由现有脚本以稳定 ID 排序，P0/P1/P2 沿用合并稿分组。

复现：

```bash
python3 scripts/aggregate.py --date 2026-10-28 --input-dir sources/editions --brief-file sources/editions/2026-10-28/brief.txt
```
