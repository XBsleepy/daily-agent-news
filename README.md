# Daily Agent News

四个领域的每日信号，一份新闻榜单。默认浏览一句话摘要，点击查看完整说明、关注原因和原始来源。

界面参考 [Daily Agent Benchmarks](https://xbsleepy.github.io/daily-agent-benchmarks/) 的纸张配色、衬线标题、侧栏与细线布局，支持领域筛选、关键词搜索、深色模式、日期归档及新闻详情分享链接。

新版结合 Anthropic Research 的留白和阅读层级：主栏展示标题、摘要和来源，右栏提供检索、日期归档及 18 项细分标签。标签分为研究主题、应用场景和信息类型，可与领域、关键词联合筛选；移动端分类可展开，避免挤占阅读空间。新闻详情包含背景介绍、方法与机制、主要发现与边界及来源。每日 Brief 可选，来源范围说明见各期 README。

## 本地运行

Python 3.11+，应用和整合脚本均无需第三方依赖。

```bash
python3 -m http.server 8080 --directory docs
```

已发布 2026-10-28（24 条）和 2026-10-29（25 条）两期正式日报，覆盖模型训练与数据、Personal Agent、Code/Work/Life Agent、RSI/AI4AI/自进化。首页展示正式数据，日期选择器可访问归档。页面底部的「查看交互演示」打开 `?demo=1`，其中全部内容均为格式示例，不是真实新闻；演示数据不进入正式榜单和归档。

## 四个任务 → 每日整合 → 新闻榜单

1. `sources/fields.json` 已配置四个真实领域名称；继续沿用 `field-1` 到 `field-4` 的稳定 ID。
2. 四项任务分别按 [数据接入约定](sources/README.md) 输出当天 JSON。
3. 每日整合任务将四份输出保存到 `sources/inbox/YYYY-MM-DD/<field-id>.json`，然后运行：

```bash
python3 scripts/aggregate.py --date YYYY-MM-DD
# 可选：使用当天整合任务写出的 UTF-8 导读
python3 scripts/aggregate.py --date YYYY-MM-DD --brief-file /path/to/brief.txt
```

省略 `--date` 使用北京时间当日日期。脚本读取四份文件，验证后按 `score` 降序排序，以首条来源链接去重，并生成 `docs/data/index.json`、`docs/data/days.json` 与日期归档。评分由任务提供，表示编辑优先级，不是浏览量或自动测算的热度。同一事件使用不同原文链接时，需要整合任务先人工或语义去重。

四个文件必须全部存在；某领域无新闻时仍提交空 `items`。错误输入会在写入前拒绝，保留上次日报。正文只作为纯文本渲染。生成过程应由一个整合任务串行执行，不要并发运行多个写入者。

### 接入状态

首期已根据当天四领域合并任务的可读取结果整理入库，保留原有选题与评分，并补全来源和核对日期；部分原始记录截断及单项结果不可读取的限制见[首期来源说明](sources/editions/2026-10-28/README.md)。10 月 29 日根据四个定时调研任务与去重汇总整理了 25 条可发布条目；缺乏原文直链的行业消息明确标为官网入口，详见[当期来源说明](sources/editions/2026-10-29/README.md)。公开领域导出和导读保存在 `sources/editions/2026-10-28/`，可复现生成：

```bash
python3 scripts/aggregate.py --date 2026-10-28 --input-dir sources/editions \
  --brief-file sources/editions/2026-10-28/brief.txt
```

仓库代码本身**不能直接读取 ChatGPT 的定时任务和聊天记录**，本次也没有修改现有五个任务。后续每日自动入库仍需具有结果读取、文件导出、执行脚本及仓库写入权限的运行环境；仅写提示词不能自动完成这些操作。

`sources/examples/` 提供四份完整格式样例。可在不修改正式数据的情况下验证整合：

```bash
mkdir -p /tmp/daily-news-input/2026-01-01
cp sources/examples/*.json /tmp/daily-news-input/2026-01-01/
python3 scripts/aggregate.py --date 2026-01-01 \
  --input-dir /tmp/daily-news-input --output-dir /tmp/daily-news-output
```

## 验证

```bash
python3 -m unittest discover -s tests -v
node --check docs/assets/app.js  # 可选，需 Node.js
```

浏览器交互检查（可选，需要 Playwright 和 Chromium）：

```bash
python3 tests/browser_smoke.py --browser /usr/bin/chromium
```

## GitHub Pages

`.github/workflows/pages.yml` 在推送 `main` 时运行整合单元测试并部署 `docs/`。仓库已启用 GitHub Actions 发布，站点地址为 https://xbsleepy.github.io/daily-agent-news/ 。新部署状态见仓库 Actions 页面。

每日整合完成后，由有权限的任务提交并推送 `docs/data/`，触发发布。若任务运行于 GitHub Actions，默认 `GITHUB_TOKEN` 的推送通常不会触发另一个工作流；此时应在同一个工作流调用部署步骤，或显式触发 `workflow_dispatch`。当前没有为未知的数据来源另建定时抓取任务。

## 目录

```text
docs/                 静态站点，可部署到 GitHub Pages
docs/data/            正式索引、日期归档及独立演示数据
sources/fields.json   四个领域配置
sources/examples/     任务输出格式示例
sources/inbox/        本地任务导出（已忽略，不提交）
sources/editions/     已发布期次的公开领域导出、导读及来源说明
scripts/aggregate.py  每日整合入口
tests/                整合测试与可选浏览器测试
news/                 可直接阅读的 Markdown 日报与格式说明（不自动导入站点）
```

不要提交令牌、密钥或本地环境配置。日期采用北京时间（Asia/Shanghai）。

