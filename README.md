# 🧬 OpenEvolant: The Autonomous Evolution Engine
"Stop coding static agents. Start breeding them."

[![Discord](https://img.shields.io/badge/Discord-OpenEvolant-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/kueXC3vMKZ)  
**Join us on Discord:** [https://discord.gg/kueXC3vMKZ](https://discord.gg/kueXC3vMKZ)

---

# Part 1 — English

## 👤 About Us

**Jammie** — Former Tencent AiLab, now an AI hardware entrepreneur.  
**Company:** [someonewaits.com](https://someonewaits.com)

---

## 🌟 Overview

**OpenEvolant** is an open-source autonomous evolution engine built for **Skills** and **MCP**. It treats Agent logic not as static code, but as heritable **Gens (Genes)**. By introducing simulated pressure, mutation, and natural selection, OpenEvolant automatically compresses and optimizes redundant reasoning paths into high-performance **Apex Skills**.

---

## ⚔️ Comparison

| Dimension | Traditional Agents (e.g., static skills) | **OpenEvolant** |
| :--- | :--- | :--- |
| **Logic Basis** | Static Prompts | Evolving Gens |
| **Optimization** | Manual Tuning | Natural Selection |
| **Cost Curve** | Consistently High | Collapses via Iteration |
| **Output** | Execution results | Evolvable Asset (.gen) |

---

## 🛠️ Ecosystem Role

OpenEvolant acts as a "Parasitic Brain" that enhances existing host frameworks.

* **vs. Skills**: Skills provide the **"Muscles"** (task execution). OpenEvolant provides the **"Prefrontal Cortex"** (logic optimization).
* **vs. MCP**: MCP provides the **"Tools"** (static resources). OpenEvolant acts as the **"Dispatcher"** (learning the most efficient way to call them).

---

## 🖥️ Evolution GUI

Through **Evolant Studio**, you can witness digital Darwinism in real-time:

* **Mutation Tracking**: Watch prompt fragments recombine to find the "optimal sequence."
* **Survival of the Fittest**: See high-cost, low-accuracy genes being phased out by the `Evaluator`.
* **Gene Crystallization**: Witness raw logic settling into lightweight, distributable `.gen` files.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone <repo-url>
cd openEvolant
npm install
```

### 2. Build
```bash
npm run build
```
Builds `packages/*`, `studio`, and CLI (`@openevolant/cli`) in order.

### 3. Start Web GUI
```bash
npm start
# or
node packages/cli/dist/cli.js start
# or (after global install)
openevolant
```
Starts the local server hosting Evolant Studio; default: http://localhost:3000.  
**Runtime directory:** All config (LLM, evaluator), data (genes, sessions), and skills live under a single app root; default `./openevolant` (override with `--root=<path>`). So both dev and packaged runs use the same layout: `openevolant/config/`, `openevolant/data/`, `openevolant/skills/`.  
Options: `--port=4000`, `--root=./openevolant`, `--host=0.0.0.0`.  
Help: `openevolant --help`; version: `openevolant --version`.

### 4. Development
```bash
npm run dev
```
Starts the Evolant Studio dev server (Vite) and opens chat / evolution management / settings in the browser.

### 5. Global Install (TBD)
```bash
npm install -g openevolant
```

---

## 📚 Documentation

| Doc | Description |
| :--- | :--- |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Architecture and design |
| [FOLDER_STRUCTURE](docs/FOLDER_STRUCTURE.md) | Project folder structure |
| [SPEC_genes](docs/SPEC_genes.md) | Genes (Gens) specification |
| [SPEC_evaluator](docs/SPEC_evaluator.md) | Evaluator specification |
| [VERSIONS](docs/VERSIONS.md) | Version notes |

---

# Part 2 — 中文

## 👤 关于我们

**Jammie** — 前腾讯 AiLab，目前 AI 硬件创业者。  
**公司：** [someonewaits.com](https://someonewaits.com)

---

## 🌟 项目概览

**OpenEvolant** 是专为 **Skills** 与 **MCP** 打造的开源自主进化引擎。它不将 Agent 逻辑视为死板的代码，而是视其为可遗传的 **Gens（基因）**。通过引入模拟压力、变异与自然选择，OpenEvolant 能够自动将冗余的推理路径压缩并优化为高性能的 **Apex Skills（巅峰技能）**。

---

## ⚔️ 深度对比

| 维度 | 传统 Agent（如静态 Skills） | **OpenEvolant** |
| :--- | :--- | :--- |
| **逻辑本质** | 静态指令 | 进化基因 |
| **优化方式** | 手动调优 | 自然选择 |
| **成本曲线** | 持续高昂 | 随迭代坍缩 |
| **核心产物** | 执行结果 | 进化资产（.gen） |

---

## 🛠️ 生态位定位

OpenEvolant 作为一个「寄生大脑」，负责增强现有的宿主框架。

* **与 Skills**：Skills 提供「肌肉」（任务执行），OpenEvolant 提供「前额叶」（逻辑优化）。
* **与 MCP**：MCP 提供「工具」（静态资源），OpenEvolant 充当「调度员」（学习最高效的调用方式）。

---

## 🖥️ 进化可视化

通过 **Evolant Studio**，你可以实时见证数字达尔文主义：

* **变异追踪**：观察 Prompt 碎片如何重组以寻找「最优序列」。
* **优胜劣汰**：观察高成本、低准确率的基因如何被 `Evaluator` 淘汰。
* **基因沉淀**：见证原始逻辑如何凝结为轻量、可分发的 `.gen` 文件。

---

## 🚀 快速开始

### 1. 克隆与安装
```bash
git clone <repo-url>
cd openEvolant
npm install
```

### 2. 构建
```bash
npm run build
```
会依次构建 `packages/*`、`studio` 和 CLI（`@openevolant/cli`）。

### 3. 一键启动 Web GUI
```bash
npm start
# 或
node packages/cli/dist/cli.js start
# 或（全局安装后）
openevolant
```
启动本地服务，托管 Evolant Studio 静态资源；默认 http://localhost:3000。  
**运行时目录**：配置（LLM、evaluator）、数据（genes、会话）、skill 等统一放在一个应用根目录下，默认 `./openevolant`（可用 `--root=<路径>` 覆盖）。开发与打包后运行布局一致：`openevolant/config/`、`openevolant/data/`、`openevolant/skills/`。  
选项：`--port=4000`、`--root=./openevolant`、`--host=0.0.0.0`。  
帮助：`openevolant --help`；版本：`openevolant --version`。

### 4. 开发
```bash
npm run dev
```
启动 Evolant Studio 开发服务器（Vite），在浏览器中打开聊天 / 进化管理 / 设置占位页。

### 5. 全局安装（待发布）
```bash
npm install -g openevolant
```

---

## 📚 Docs 快速跳转

| 文档 | 说明 |
| :--- | :--- |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 架构与设计 |
| [FOLDER_STRUCTURE](docs/FOLDER_STRUCTURE.md) | 项目目录结构 |
| [SPEC_genes](docs/SPEC_genes.md) | 基因（Gens）规范 |
| [SPEC_evaluator](docs/SPEC_evaluator.md) | 评估器（Evaluator）规范 |
| [VERSIONS](docs/VERSIONS.md) | 版本说明 |
