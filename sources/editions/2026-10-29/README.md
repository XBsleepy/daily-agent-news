# 2026-10-29 来源范围说明

本期基于当天 **4 个 08:00 定时调研结果**与 08:30 去重合并结果编辑，没有额外联网搜索、没有复现实验，也没有重新核验原始网页。各领域输出在本期保留交叉领域重复条目，由 `scripts/aggregate.py` 按首条来源 URL 合并；正式站点共 **25 个去重事件**。

- 排序沿用合并报告的重要性次序，并统一映射为 100–76 的编辑评分；不代表点击热度。
- arXiv 项使用原调研提供的 arXiv ID 构造论文原始链接；论文的首次提交日期与 10 月 28 日 Hugging Face / arXiv 列表收录日期并非一回事。
- 对 Gemini 4 Carbon、Copilot Harness、Alexa+、Chrome、Surge、Cognition、micro1、Anthropic、OpenAI、Scale AI 等公司消息，四份调研或合并文本中有原始页面引用，但可读取文字没有保留可复用的公告直链。本期为满足站点必填来源结构，**仅放官网新闻 / 文档入口，明确标注“非该公告直链”**；不能将这些入口误认为已验证对应具体新闻。
- Amazon 日本公告按调研标记为 10 月 29 日，精确发布时间未知；TTME 等较早首投论文属于本期关联补读，不当作当天首发。
- 由于本次避免额外核验，未把无具体原始链接或缺少足够独立事实的观察项单独放进新闻榜单；它们在可读版末尾保留关注清单，不据此补造链接或发布日期。
- 所有数值仅为原报告引用的作者 / 厂商陈述，并非独立复核。

- VibeVideoBench、HABIT-Bench：面向完整交付物与真实用户习惯的评测，原汇总将其列为高优先级观察项。
- ETAMem、EvoSpeakerMem / LoCoMo-ID：多视图个人记忆与家庭多说话者记忆归属。
- Mistral Timestral、Rollback、h1：合成时序预训练、具身反事实学习与可验证工具反馈。
- SearchHorizonBench、HaMo：搜索成本效用和记忆—参数混合持续学习。
- Words or Deeds、DiscernMem、EmbeddingGemma 2、ChronoReplay、ReCoPII、MedJev、KORA：行为证据、选择性记忆、多模态检索以及安全执行等补充方向。

复现入口：
```bash
python3 scripts/aggregate.py --date 2026-10-29 --input-dir sources/editions --brief-file sources/editions/2026-10-29/brief.txt
```
