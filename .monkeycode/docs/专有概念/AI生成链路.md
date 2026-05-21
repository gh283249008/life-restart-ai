# AI 生成链路

## 1. 目标

在每轮生成可玩、可判分、可审计的对话包，同时控制失败率与输出风险。

## 2. 主链路

入口：`generateRoundPack(history, round, theme)`。

主流程：

1. 构建 prompt（包含轮次、主题、历史对话、输出 JSON 结构和规则）。
2. 调用 `callLLM(...)` 请求回合内容。
3. 解析 `choices[0].message.content`。
4. `extractJson` 提取 JSON 文本。
5. `normalizeRoundPack` 归一化结构。
6. `enforceRoundPackSafety` 安全处理。
7. `rememberRoundPack` 写入记忆库。

## 3. 请求层稳定性

`callLLM` 中实现：

- 超时中断（AbortController）
- 可重试状态码（429、5xx）
- 网络异常重试
- 全局失败计数和熔断窗口
- inflight 并发复用

## 4. 解析修复链路

当首轮解析失败：

1. 先调用“JSON 修复器”模型提示。
2. 若仍失败，最多 3 次重新拉取生成内容。
3. 仍失败时触发二次回合修复器尝试。

该设计目标是提升“AI 直出成功率”。

## 5. 兜底链路

### 5.1 请求失败兜底

- 触发点：request 阶段失败。
- 行为：调用 `retrieveRoundPack` 检索历史相似回合。
- 命中则 `source='rag'` 并携带 `rawContent`。

### 5.2 校验失败兜底

- 触发点：parse/validate 阶段失败。
- 行为：优先 AI 二次修复，失败后检索兜底。

### 5.3 最终失败

- 抛出 `RoundGenerationError`。
- 页面显示 `stage/reason/status/rawContent` 并允许重试。

## 6. 记忆检索策略

实现文件：`src/services/ragStore.ts`。

- 文本特征：`theme + round + brief + 最近6条history`
- 向量维度：96
- 相似度：余弦
- 阈值：`score >= 0.24`
- 局内去重：`usedRecordIds`

## 7. 安全处理

关键函数：`sanitizeUnsafeText`, `hasUnsafeText`, `enforceRoundPackSafety`。

策略：

- 脱敏银行卡、身份证、手机号、验证码、收款人姓名。
- 命中高风险文本时替换为安全话术。

## 8. 结算生成链路

`generateFinalReport(history)` 使用独立提示词：

- 输入整局历史
- 输出固定 JSON
- 二次脱敏结果文本

返回结构满足页面展示与统计写入要求。
