# 开发者指南

## 1. 环境要求

- Node.js 18+
- npm

## 2. 安装与运行

```bash
npm install
npm run dev
```

开发服务默认端口：`3000`。

## 3. 构建与检查

```bash
npm run build
npm run lint
npm run format
```

说明：

- `build` 包含 `vue-tsc --noEmit`，会先做类型检查。
- `lint` 当前脚本带 `--fix`，执行时会直接修改可自动修复的问题。

## 4. 关键开发路径

### 4.1 新增或调整对局逻辑

优先修改：`src/services/antiFraudGame.ts`。

常见变更点：

- 主题池：`SCENARIO_THEMES`
- prompt 规则：`buildPromptMessages` 内容
- 判分模型：`evaluateCustomReply`
- 安全规则：`sanitizeUnsafeText` / `hasUnsafeText`

### 4.2 调整对局 UI

优先修改：`src/views/GameView.vue`。

涉及：

- 聊天气泡展示
- 选项按钮样式与行为
- 错误展示与重试入口
- 轮次和结算区块

### 4.3 调整统计看板

优先修改：

- 数据口径：`src/services/statsStore.ts`
- 页面布局：`src/views/StatsView.vue`

## 5. 本地存储数据说明

### 5.1 统计数据

- key：`anti_fraud_stats_v1`
- 内容：会话列表，最多保留最近 500 条会话。

### 5.2 检索记忆

- key：`anti_fraud_round_memory_v1`
- 内容：向量化回合记录，最多保留最近 400 条记录。

## 6. AI 请求与排障

### 6.1 代理行为

- 开发环境请求走 `/deepseek` 前缀。
- `vite.config.ts` 代理到 `https://api.deepseek.com`。

### 6.2 常见故障检查

1. `AI 请求失败`：检查网络连通与 API key。
2. `JSON 解析失败`：检查模型返回是否被截断，系统会自动进入修复流程。
3. `频繁兜底`：查看页面“本轮来源”和“本局标记”。
4. `统计异常`：检查 `sessionId` 生命周期与 `finishSession` 是否执行。

### 6.3 错误观测入口

对局页失败区域会展示：

- 错误阶段 `stage`
- 错误原因 `reason`
- HTTP 状态 `status`
- 原始返回 `rawContent`

## 7. 安全与配置建议

- 当前代码中 LLM key 位于 `src/config/llm.ts`。
- 生产环境建议迁移到服务端签发或安全配置通道。
- 文档、日志、示例统一使用 `<API_KEY>` 占位。

## 8. 文档维护规则

- 项目文档统一维护在 `/workspace/.monkeycode/docs/`。
- 每次改动以下内容时同步文档：
  - 路由结构
  - 服务接口签名
  - 统计口径
  - prompt 规则
