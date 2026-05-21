# 接口文档

## 1. 外部接口

### 1.1 DeepSeek Chat Completions

- 请求地址：
  - 开发：`/deepseek/chat/completions`（通过 Vite 代理）
  - 生产：`https://api.deepseek.com/chat/completions`
- 请求方法：`POST`
- 请求头：
  - `Content-Type: application/json`
  - `Authorization: Bearer <API_KEY>`

请求体结构（核心字段）：

```json
{
  "model": "deepseek-v4-flash",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.75,
  "max_tokens": 3000
}
```

响应读取路径：

- `choices[0].message.content`

错误处理：

- 非 2xx 响应时读取 `response.text()` 作为原始内容。
- 429/5xx 进入可重试分支。

## 2. 前端服务接口

### 2.1 `antiFraudGame` 服务

文件：`src/services/antiFraudGame.ts`

#### 类型定义

- `ScenarioOption`
- `RoundPack`
- `RoundPackResult`
- `RoundGenerationError`
- `FinalReport`
- `ScenarioTheme`

#### 常量

- `SCENARIO_THEMES`: 6 类票务诈骗情节。

#### 方法：`generateRoundPack(history, round, theme)`

- 输入：
  - `history: Array<{ role: 'user' | 'scammer'; text: string }>`
  - `round: number`
  - `theme: ScenarioTheme`
- 输出：`Promise<RoundPackResult>`
  - `scammerMessages: string[]`
  - `options: ScenarioOption[]`
  - `correctOptionId: string`
  - `source: 'ai' | 'rag'`
  - `rawContent?: string`
- 异常：`RoundGenerationError`

#### 方法：`evaluateCustomReply(scammerMessage, userReply)`

- 输入：骗子消息 + 玩家自定义回复
- 输出：`Promise<{ verdict: 'safe' | 'risky' | 'tease' }>`

#### 方法：`generateFinalReport(history)`

- 输入：整局历史对话
- 输出：`Promise<FinalReport>`
  - `result: '得逞了' | '认输了'`
  - `scammerSummary: string`
  - `tips: string[]`

### 2.2 `ragStore` 服务

文件：`src/services/ragStore.ts`

#### 方法：`rememberRoundPack(history, round, theme, pack)`

- 将回合结果向量化并存入本地记忆。

#### 方法：`retrieveRoundPack(history, round, theme)`

- 检索相似度最高且满足阈值的历史包。
- 返回：`RoundPack | null`

#### 方法：`resetRetrieveSession()`

- 清空当前局内使用记录，避免同一条记忆重复命中。

### 2.3 `statsStore` 服务

文件：`src/services/statsStore.ts`

#### 类型定义

- `ChoiceCategory`
- `RoundChoiceRecord`
- `SessionRecord`
- `DayStats`

#### 方法

- `startSession(sessionId, themeId, themeName)`
- `recordRoundChoice(sessionId, round, choiceCategory, isCorrect, themeId, themeName)`
- `finishSession(sessionId, finalScore, finalResult)`
- `getDayStats(dateStr?)`
- `getRecentDayStats(days = 7)`

## 3. 页面间接口约定

### 3.1 路由入口

文件：`src/main.ts`

- `/` 首页
- `/game` 对局
- `/stats` 统计

### 3.2 对局页与服务交互

文件：`src/views/GameView.vue`

- 对局启动：
  - `startSession(...)`
  - `loadRoundPack()` -> `generateRoundPack(...)`
- 选项提交：
  - 本地积分计算
  - `recordRoundChoice(...)`
- 自定义提交：
  - `evaluateCustomReply(...)`
  - `recordRoundChoice(...)`
- 对局结束：
  - `generateFinalReport(...)`
  - `finishSession(...)`

### 3.3 统计页与服务交互

文件：`src/views/StatsView.vue`

- 初始化和切换日期时调用：
  - `getDayStats(...)`
  - `getRecentDayStats(7)`

## 4. 配置接口

### 4.1 LLM 配置对象

文件：`src/config/llm.ts`

结构：

```ts
{
  apiKey: string,
  baseUrl: string,
  model: string
}
```

### 4.2 Vite Dev Server 配置

文件：`vite.config.ts`

- `server.port = 3000`
- `server.allowedHosts = ['.monkeycode-ai.online']`
- `server.proxy['/deepseek']` 指向 DeepSeek 域名

## 5. 错误接口

### 5.1 `RoundGenerationError`

字段：

- `message: string`
- `stage: 'request' | 'parse_or_validate'`
- `reason?: 'timeout' | 'network' | 'http' | 'circuit_open' | 'empty_content' | 'unknown'`
- `status?: number`
- `rawContent?: string`

对局页展示：

- `GameView` 将 `stage/reason/status/rawContent` 输出到失败卡片，支持“重试本轮”。
