# 参与贡献 / Contributing

欢迎修复界面、改进无障碍与性能、补充文档、校对现有数据，以及增加有官方证据的新主体和数据源。中文和英文 Issue / PR 都可以。

## 本地准备

```sh
npm ci
npm run dev
```

网站可直接使用附带快照。开发界面不需要下载 SEC / House 原件，也不需要任何生产凭据。

```sh
npm test
npm run build
```

提交前请确保上述检查通过。界面改动请实际查看桌面与手机，附截图或录屏；如需运行浏览器检查，安装 Playwright 的 Chromium，启动网站后执行：

```sh
npx playwright install chromium
cd web
node qa/shot.mjs http://127.0.0.1:5190 qa/shots / /people/ /stocks/ /skills/
node qa/interact.mjs http://127.0.0.1:5190
```

## 数据贡献的最小证据

每个新的持仓或交易关系都应能追溯到原始披露。提供：

- 主体稳定 ID、名称、类型，及官方身份标识（CIK、Bioguide 或对应数据源 ID）。
- 官方原件 URL、报告编号、文件 SHA-256，以及页码或 XML 行/条目标识。
- 交易日期、申报日期、报告期的原文与规范化值。
- 资产类型、Owner、金额/区间、股数、期权、交易代码及脚注，按原件所能支持的范围填写。
- 解析器或经过复核的逐行修正；说明哪些记录无法读取。

只提交名字或头像可以建立待审核的资料条目，**不能建立持仓连线**。新闻、社交媒体、AI 输出可用于寻找原件，不作为持仓/交易证据。

## 修改数据的路径

1. 在 `research/v2/sources/` 的相应 roster / manifest 登记已确认的主体和原件。
2. 在 `research/sources.json` 登记原件路径、URL、SHA-256、字节数及类型。
3. 用 `scripts/fetch_sources.py` 获取并校验原件，再运行 `npm run data:parse`；原始文件通常不提交。
4. 提交对应的规范化 `research/v2/out/*.json`，运行 `npm run data` 更新公开图、详情分片与 Skills。
5. 运行检查，描述新增、删除与无法解析的记录，以及使用的报告截止日期。

新增 OGE、参议院或非股票资产适配器先开 Issue。年度资产披露、债券、私人企业和股票交易需要不同口径，不能套用 House PTR 或仅按发行人名称映射到股票。

## 审核规则

- 13F 是机构季度快照；不可把机构申报写成基金经理个人交易。报告口径不一致时不推导增减持。
- PTR 的 SP/JT/DC 与区间金额保留原样；不将期权当成现股，不将申报日期当成交易日期。
- Form 4 的 A/M/F/G 等不当作公开市场主动买卖；保留 10b5-1 标记与脚注。
- 扫描件没有可核验的人工转录时只显示原件入口。
- 不虚构收益率、目标价、实时性或指数点数。
- 头像/Logo 提供来源和授权；不确定时使用文字占位。

## PR 内容

写清解决了什么问题、改动后的行为、如何验证。数据 PR 附来源和口径；界面 PR 附手机/桌面证据。CI 负责构建与结构检查，维护者负责原件审核。请不要提交密钥、运行时配置、采集会话、用户数据或与本项目无关的部署文件。

提交贡献表示你有权提供相关代码或素材。原创代码按本项目 MIT 许可贡献；第三方材料保留原许可。

## English quick guide

Fork, create a branch, run `npm ci`, make the change, then run `npm test` and `npm run build`. Include desktop/mobile evidence for UI changes. Data changes require official source URLs, filing IDs, SHA-256 hashes and page/row references. Preserve owner, option, interval amount, filing date and reporting-period distinctions. AI output alone is not evidence. Open an issue before adding a new source adapter. Pull requests are reviewed before being merged or deployed.
