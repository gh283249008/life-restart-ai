# 项目文档索引

## 项目概览
- 项目名称：`life-restart-ai`（当前实现为“好薯坏薯・票务反诈局”）
- 技术栈：Vue 3 + TypeScript + Vue Router + Tailwind CSS + Vite
- 运行形态：单页应用（SPA），包含首页、对局页、统计页
- 核心能力：AI 生成诈骗对话、玩家应对选择、5 轮结算、本地检索兜底、数据统计

## 文档导航
- 架构文档：`/workspace/.monkeycode/docs/ARCHITECTURE.md`
- 接口文档：`/workspace/.monkeycode/docs/INTERFACES.md`
- 开发者指南：`/workspace/.monkeycode/docs/DEVELOPER_GUIDE.md`

## 专有概念
- 对局流程与判定：`/workspace/.monkeycode/docs/专有概念/对局机制.md`
- AI 生成与兜底链路：`/workspace/.monkeycode/docs/专有概念/AI生成链路.md`

## 模块说明
- 入口与路由：`/workspace/.monkeycode/docs/模块/入口与路由.md`
- 游戏界面模块：`/workspace/.monkeycode/docs/模块/游戏界面模块.md`
- 核心服务模块：`/workspace/.monkeycode/docs/模块/核心服务模块.md`
- 统计模块：`/workspace/.monkeycode/docs/模块/统计模块.md`
- 构建与样式模块：`/workspace/.monkeycode/docs/模块/构建与样式模块.md`

## 现状说明
- 仓库根目录存在历史文档 `PURE-AI-EVENT-SYSTEM.md`、`doubao_migration_checklist.md`，描述的是旧版“人生重开/豆包迁移”背景。
- 当前 `src/` 代码已聚焦“票务反诈对话游戏”，建议以后续维护以本目录文档为准。
