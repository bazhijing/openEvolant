# 🧬 OpenEvolant: The Autonomous Evolution Engine
"Stop coding static agents. Start breeding them."

[![Discord](https://img.shields.io/badge/Discord-OpenEvolant-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/kueXC3vMKZ)  
**Join us on Discord:** [https://discord.gg/kueXC3vMKZ](https://discord.gg/kueXC3vMKZ)

---

## 🌟 Overview | 项目概览

**OpenEvolant** is an open-source autonomous evolution engine built for the **OpenClaw** and **MCP** ecosystem. It treats Agent logic not as static code, but as heritable **Gens (Genes)**. By introducing simulated pressure, mutation, and natural selection, OpenEvolant automatically compresses and optimizes redundant reasoning paths into high-performance **Apex Skills**.

**OpenEvolant** 是专为 **OpenClaw** 与 **MCP** 生态打造的开源自主进化引擎。它不将 Agent 逻辑视为死板的代码，而是视其为可遗传的 **Gens (基因)**。通过引入模拟压力、变异与自然选择，OpenEvolant 能够自动将冗余的推理路径压缩并优化为高性能的 **Apex Skills (巅峰技能)**。

---

## ⚔️ Comparison | 深度对比

| Dimension | Traditional Agents (e.g., OpenClaw) | **OpenEvolant** |
| :--- | :--- | :--- |
| **Logic Basis / 逻辑本质** | **Static Prompts / 静态指令** | **Evolving Gens / 进化基因** |
| **Optimization / 优化方式** | Manual Tuning / 手动调优 | Natural Selection / 自然选择 |
| **Cost Curve / 成本曲线** | Consistently High / 持续高昂 | Collapses via Iteration / 随迭代坍缩 |
| **Output / 核心产物** | Execution results / 执行结果 | Evolvable Asset (.gen) / 进化资产 |

---

## 🛠️ Ecosystem Role | 生态位定位

OpenEvolant acts as a "Parasitic Brain" that enhances existing host frameworks.  
OpenEvolant 作为一个“寄生大脑”，负责增强现有的宿主框架。



* **vs. OpenClaw**: OpenClaw provides the **"Muscles"** (task orchestration). OpenEvolant provides the **"Prefrontal Cortex"** (logic optimization).  
    *OpenClaw 提供“肌肉”（任务编排），OpenEvolant 提供“前额叶”（逻辑优化）。*
* **vs. MCP**: MCP provides the **"Tools"** (static resources). OpenEvolant acts as the **"Dispatcher"** (learning the most efficient way to call them).  
    *MCP 提供“工具”（静态资源），OpenEvolant 充当“调度员”（学习最高效的调用方式）。*

---

## 🖥️ Evolution GUI | 进化可视化



Through the **Evolant Studio**, you can witness digital Darwinism in real-time:  
通过 **Evolant Studio**，你可以实时见证数字达尔文主义：

* **Mutation Tracking**: Watch prompt fragments recombine to find the "optimal sequence."  
    **变异追踪**：观察 Prompt 碎片如何重组以寻找“最优序列”。
* **Survival of the Fittest**: See high-cost, low-accuracy genes being phased out by the `Evaluator`.  
    **优胜劣汰**：观察高成本、低准确率的基因如何被 `Evaluator` 淘汰。
* **Gene Crystallization**: Witness raw logic settling into lightweight, distributable `.gen` files.  
    **基因沉淀**：见证原始逻辑如何凝结为轻量、可分发的 `.gen` 文件。

---

## 🚀 Getting Started | 快速开始

### 1. 克隆与安装 | Clone & Install
```bash
git clone <repo-url>
cd openEvolant
npm install
```

### 2. 构建 | Build
```bash
npm run build
```
- 会依次构建 `packages/*`、`studio` 和 CLI（`@openevolant/cli`）。

### 3. 一键启动 Web GUI | Start
```bash
npm start
# 或
node packages/cli/dist/cli.js start
# 或（全局安装后）
openevolant
```
- 启动本地服务，托管 Evolant Studio 静态资源；默认 http://localhost:3000。
- 选项：`--port=4000`、`--data-dir=./data`、`--config-dir=./config`、`--host=0.0.0.0`。
- 帮助与版本：`node packages/cli/dist/cli.js --help`、`node packages/cli/dist/cli.js --version`。
- **本地用「命令」测试**：可不做 `npm link`，直接 `npm start`；若想用 `openevolant` 命令，可用 **`npx openevolant`**（在项目根执行，会调当前包）。

### 4. 开发 | Development
```bash
npm run dev
```
- 启动 Evolant Studio 开发服务器（Vite），在浏览器中打开聊天 / 进化管理 / 设置占位页。

### 5. 全局命令（可选）| Global command (optional)
- **发布后**：`npm install -g openevolant` 即可使用 `openevolant` 命令。
- **开发时想用全局命令**：
  - 推荐：**手动创建符号链接**（不依赖 npm link，避免 EACCES）：
    ```bash
    # 将 /path/to/openEvolant 换成你的项目绝对路径（在项目根执行 pwd 可得）
    sudo ln -sf /path/to/openEvolant/packages/cli/dist/cli.js /usr/local/bin/openevolant
    ```
  - 或使用 **`npx openevolant`**（在项目根执行）；或把 npm 全局目录改到用户目录后再 `npm link`。