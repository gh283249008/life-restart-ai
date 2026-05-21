# 系统架构文档

## 1. 架构总览

本项目是前端单体应用，采用“视图层 + 业务服务层 + 本地存储层”的轻量结构。

- 视图层：Vue SFC 页面与交互逻辑
- 业务服务层：AI 生成、检索兜底、统计聚合
- 存储层：浏览器 `localStorage`
- 外部依赖：DeepSeek Chat Completions API

核心数据流：

1. 页面进入 `GameView` 后创建会话并随机情节。
2. 调用 `generateRoundPack` 请求 AI 生成骗子话术与选项。
3. 生成失败时进入修复与兜底链路（AI 修复 -> RAG 检索 -> 前端失败态）。
4. 用户作答后更新积分与记录。
5. 第 5 轮后调用 `generateFinalReport` 结算并写入统计。

## 2. 目录结构（实际代码）

`src/` 当前文件：

- `src/main.ts`：应用入口、路由注册。
- `src/App.vue`：根布局与导航。
- `src/style.css`：Tailwind 与组件样式。
- `src/config/llm.ts`：LLM 固定配置。
- `src/views/HomeView.vue`：首页。
- `src/views/GameView.vue`：对局主页面。
- `src/views/StatsView.vue`：统计后台。
- `src/services/antiFraudGame.ts`：核心 AI 业务服务。
- `src/services/ragStore.ts`：本地检索记忆服务。
- `src/services/statsStore.ts`：统计数据服务。

## 3. 分层设计

### 3.1 展示层

- 路由页面负责状态展示与用户操作。
- 样式集中在 Tailwind 工具类和少量组件类（`game-card`、`choice-button`）。
- 页面之间通过路由切换，无全局状态管理库实际使用痕迹（`pinia` 在依赖中存在，当前代码未使用）。

### 3.2 业务层

- `antiFraudGame.ts` 承担以下职责：
  - 回合内容生成
  - AI 请求重试与熔断
  - JSON 解析修复
  - 输出安全脱敏
  - 自定义输入判定
  - 最终结算生成
- `ragStore.ts` 实现轻量向量检索兜底。
- `statsStore.ts` 实现会话与回合统计。

### 3.3 存储层

- `localStorage` key：
  - `anti_fraud_round_memory_v1`（RAG 记忆）
  - `anti_fraud_stats_v1`（统计）
- 无后端数据库，无服务端会话。

## 4. 路由架构

定义于 `src/main.ts`：

- `/` -> 首页 `HomeView`
- `/game` -> 对局页 `GameView`
- `/stats` -> 统计页 `StatsView`

路由模式为 `createWebHistory()`。

## 5. AI 调用架构

### 5.1 配置

`src/config/llm.ts`：

- `model = deepseek-v4-flash`
- 开发环境 `baseUrl = /deepseek`（经 Vite 代理）
- 生产环境 `baseUrl = https://api.deepseek.com`

### 5.2 请求策略

`callLLM` 内置机制：

- 超时：10 秒
- 默认重试：2 次
- 重试间隔：300ms / 800ms / 1500ms
- 并发去重：按 `messages + maxTokens` 建立 inflight map
- 熔断：连续失败阈值 6，冷却 8 秒
- 状态码策略：429 与 5xx 可重试

### 5.3 回合生成链路

`generateRoundPack` 顺序：

1. 按主题、轮次、历史构造 prompt。
2. 调用 LLM 生成 JSON。
3. 解析失败时触发 JSON 修复器。
4. 对结构执行归一化（固定 4 选项和分类分布）。
5. 进行文本安全处理与脱敏。
6. 记忆写入 `ragStore`。
7. 若请求失败，优先检索历史包兜底。

## 6. 对局与统计架构

### 6.1 对局状态

`GameView` 本地状态：

- 对局控制：`round`, `score`, `stage`
- 异步状态：`loading`, `delivering`, `replying`
- 内容状态：`chatHistory`, `currentOptions`, `finalReport`
- 观测状态：`roundSource`, `sessionRagUsed`, `loadError`, `rawAiError`

### 6.2 评分规则

- 正确：`+10`
- 错误：`-5`
- 整活：`0`

### 6.3 结算规则

- 第 5 轮后由 `generateFinalReport` 输出：
  - `result: 得逞了 | 认输了`
  - `scammerSummary`
  - `tips[3]`

### 6.4 统计聚合

`statsStore.ts` 提供：

- 会话生命周期：`startSession` / `finishSession`
- 回合记录：`recordRoundChoice`
- 日期聚合：`getDayStats`
- 近 N 天趋势：`getRecentDayStats`

## 7. 安全与合规机制

`antiFraudGame.ts` 中通过正则处理敏感信息：

- 银行卡号、身份证号、手机号
- 收款人/姓名/户名字段
- 验证码字段

并结合 `unsafeKeywordList` 与 `hasUnsafeText` 对生成内容降敏。

## 8. 已知实现特征

- `main.ts` 使用 history 路由，对某些内嵌 WebView 场景可能需要 hash 路由适配。
- `llm.ts` 中包含明文 API key，文档不复述具体值，建议后续迁移到环境配置。
- 根目录历史文档描述旧业务，与当前 `src/` 实现存在代际差异。
