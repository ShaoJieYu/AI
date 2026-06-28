# 文档导航索引

**更新**: 2026-06-27 | **语言**: 中文

> 本索引反映 `01-Documentation/Markdown文档汇总/` 清理后的实际目录结构。所有链接均为相对路径，从本文件位置出发。

---

## 文档目录结构

```
01-Documentation/Markdown文档汇总/
├── 01-项目文档/          # 项目状态、规划设计、模块说明、技术文档
│   ├── 导航索引/INDEX.md  # 本文件
│   ├── 技术文档/DATABASE_SETUP.md
│   ├── 模块说明/{AI服务,前端}/README.md
│   ├── 规划设计/{DESIGN,PLAN,login_fix_plan}.md
│   ├── 需求文档/需求文档.md
│   └── 项目状态/{00-PROJECT-STATUS,02-ROADMAP}.md
├── 02-需求文档/          # 8 篇需求文档 + README
├── 03-设计文档/          # 7 篇设计文档 + README
├── 04-规划文档/          # 4 篇规划文档
├── 05-架构文档/          # 整体/前端/后端/AI服务 架构文档
├── 06-快速开始/          # 整体/前端/后端/AI服务 启动指南
├── 07-基础设施/          # 数据库、部署、监控
├── 08-工作文档/          # 工作记录、bug 排查、实现总结
└── 09-其他文档/          # SKILL 等补充材料
```

---

## 按场景快速导航

### 我是新人，不知道从何开始

1. 阅读 [项目状态总览](../项目状态/00-PROJECT-STATUS.md)（10 分钟）
2. 选角色读对应启动指南（各 5 分钟）：
   - 前端：[06-快速开始/前端/QUICK-START.md](../../06-快速开始/前端/QUICK-START.md)
   - 后端：[06-快速开始/后端/QUICK-START.md](../../06-快速开始/后端/QUICK-START.md)
   - AI 服务：[06-快速开始/AI服务/QUICK-START.md](../../06-快速开始/AI服务/QUICK-START.md)
   - 整体：[06-快速开始/整体/QUICKSTART.md](../../06-快速开始/整体/QUICKSTART.md)
3. 配置环境并启动（10 分钟）

### 我要理解项目架构

- 实现架构（推荐先读）：[05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md](../../05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md)
- 前端架构：[05-架构文档/前端/ARCHITECTURE.md](../../05-架构文档/前端/ARCHITECTURE.md)
- 后端架构：[05-架构文档/后端/ARCHITECTURE.md](../../05-架构文档/后端/ARCHITECTURE.md)
- AI 服务架构：[05-架构文档/AI服务/ARCHITECTURE.md](../../05-架构文档/AI服务/ARCHITECTURE.md)

### 我要查看设计文档

- 设计总览：[03-设计文档/00-OVERVIEW.md](../../03-设计文档/00-OVERVIEW.md)
- 系统架构设计：[03-设计文档/01-ARCHITECTURE.md](../../03-设计文档/01-ARCHITECTURE.md)
- 数据库设计：[03-设计文档/02-DATABASE-DESIGN.md](../../03-设计文档/02-DATABASE-DESIGN.md)
- API 设计：[03-设计文档/03-API-DESIGN.md](../../03-设计文档/03-API-DESIGN.md)
- 前端设计：[03-设计文档/04-FRONTEND-DESIGN.md](../../03-设计文档/04-FRONTEND-DESIGN.md)
- AI 引擎设计：[03-设计文档/05-AI-ENGINE-DESIGN.md](../../03-设计文档/05-AI-ENGINE-DESIGN.md)
- 部署与安全：[03-设计文档/06-DEPLOYMENT-SECURITY.md](../../03-设计文档/06-DEPLOYMENT-SECURITY.md)

### 我要查看需求文档

- 需求导航：[02-需求文档/README.md](../../02-需求文档/README.md)
- 项目背景：[02-需求文档/01-project-background.md](../../02-需求文档/01-project-background.md)
- 功能需求：[02-需求文档/02-functional-requirements.md](../../02-需求文档/02-functional-requirements.md)
- UI/UX 需求：[02-需求文档/03-ui-ux-requirements.md](../../02-需求文档/03-ui-ux-requirements.md)
- 用户故事：[02-需求文档/05-user-stories.md](../../02-需求文档/05-user-stories.md)
- 术语表：[02-需求文档/07-glossary.md](../../02-需求文档/07-glossary.md)

### 我要查看规划文档

- 项目总览：[04-规划文档/00-PROJECT-OVERVIEW.md](../../04-规划文档/00-PROJECT-OVERVIEW.md)
- 模块详情：[04-规划文档/01-MODULE-DETAILS.md](../../04-规划文档/01-MODULE-DETAILS.md)
- 里程碑：[04-规划文档/02-MILESTONES.md](../../04-规划文档/02-MILESTONES.md)
- 风险评估：[04-规划文档/03-RISK-ASSESSMENT.md](../../04-规划文档/03-RISK-ASSESSMENT.md)
- Roadmap：[01-项目文档/项目状态/02-ROADMAP.md](../项目状态/02-ROADMAP.md)

### 我要排查问题或查看历史修复记录

`08-工作文档/` 目录下的工作记录：

- [AI 备课五段式升级与 PDF 导出优化记录](../../08-工作文档/AI备课五段式升级与PDF导出优化记录.md)
- [文科备课 PDF 导出伪公式修复记录](../../08-工作文档/文科备课PDF导出伪公式修复记录.md)
- [物理小节层级与 AI 生成超时修复记录](../../08-工作文档/物理小节层级与AI生成超时修复记录.md)
- [学生列表空数据 bug 排查记录](../../08-工作文档/学生列表空数据bug排查记录.md)
- [学生详情页接口缺失与编辑缓存失效修复记录](../../08-工作文档/学生详情页接口缺失与编辑缓存失效修复记录.md)
- [作业错题分析总结](../../08-工作文档/homework-wrong-question-analysis-summary.md)
- [最终验证报告](../../08-工作文档/FINAL_VERIFICATION_REPORT.md)
- [测试指南](../../08-工作文档/testing-guide.md)
- [快速参考](../../08-工作文档/QUICK_REFERENCE.md)
- [实现总结](../../08-工作文档/implementation-summary.md)

### 我要配置基础设施

- 数据库配置：[07-基础设施/DATABASE.md](../../07-基础设施/DATABASE.md)
- 部署指南：[07-基础设施/DEPLOYMENT.md](../../07-基础设施/DEPLOYMENT.md)
- 监控规划：[07-基础设施/MONITORING.md](../../07-基础设施/MONITORING.md)
- 数据库初始化（简明）：[01-项目文档/技术文档/DATABASE_SETUP.md](../技术文档/DATABASE_SETUP.md)

---

## 项目根目录入口

项目根目录 `d:\AI\` 下已新增 [README.md](../../../../../README.md)，包含：
- 完整目录结构说明
- 4 个服务的启动顺序与端口
- 数据库初始化命令
- 关键工程约定
- 历史归档注意事项

新成员请先读根目录 README.md，再回来读本文档导航。

---

## 文档维护

- 新增文档时，按主题归入对应编号目录（02~08）
- 同步在本索引的对应场景区块添加链接
- 链接统一用相对路径，从本文件位置出发计算
- 工作记录类文档统一放 `08-工作文档/`，命名用中文描述 + "记录"后缀

**最后更新**: 2026-06-27
