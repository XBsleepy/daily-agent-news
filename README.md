# Daily Agent News

四个领域的每日信号，一份新闻榜单。默认浏览一句话摘要，点击查看完整说明、关注原因和原始来源。

界面参考 [Daily Agent Benchmarks](https://xbsleepy.github.io/daily-agent-benchmarks/) 的纸张配色、衬线标题、侧栏与细线布局，支持领域筛选、关键词搜索、深色模式、日期归档及新闻详情分享链接。

## 本地运行

Python 3.11+，应用和整合脚本均无需第三方依赖。

```bash
python3 -m http.server 8080 --directory docs
```

首次接入前，首页自动展示明确标注的虚构 mock 日报；`?live=1` 可检查正式数据的空状态。正式日报生成后，首页自动切换为真实数据。页面底部的「查看交互演示」打开 `?demo=1`，其中全部内容均为格式示例，不是真实新闻。演示数据独立存储，不进入正式榜单和归档。

## 四个任务 → 每日整合 → 新闻榜单

1. 在 `sources/fields.json` 填写四个领域名称。当前「领域一」到「领域四」为占位名称。
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

当前代码**不能直接读取 ChatGPT 的定时任务和聊天记录**，也没有创建、修改或替代现有任务。还需要取得四项任务的名称及输出样例，再将结果导出为约定文件。仅写提示词不能让没有 GitHub 写入能力的 ChatGPT 任务自动更新仓库；自动发布需要具有文件导出、执行脚本及仓库写入权限的运行环境。

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

`.github/workflows/pages.yml` 在推送 `main` 时运行整合单元测试并部署 `docs/`。启用方法：仓库 **Settings → Pages → Source → GitHub Actions**。配置已写入，尚未推送或部署。

每日整合完成后，由有权限的任务提交并推送 `docs/data/`，触发发布。若任务运行于 GitHub Actions，默认 `GITHUB_TOKEN` 的推送通常不会触发另一个工作流；此时应在同一个工作流调用部署步骤，或显式触发 `workflow_dispatch`。当前没有为未知的数据来源另建定时抓取任务。

## 目录

```text
docs/                 静态站点，可部署到 GitHub Pages
docs/data/            正式索引、日期归档及独立演示数据
sources/fields.json   四个领域配置
sources/examples/     任务输出格式示例
sources/inbox/        本地任务导出（已忽略，不提交）
scripts/aggregate.py  每日整合入口
tests/                整合测试与可选浏览器测试
news/                 手写 Markdown 日报模板（不自动导入站点）
```

不要提交令牌、密钥或本地环境配置。日期采用北京时间（Asia/Shanghai）。
