# OpenEvolant 文件夹结构 | Folder Structure

针对 **v0.1** 的仓库目录规划，与 [ARCHITECTURE.md](./ARCHITECTURE.md) 和 [VERSIONS.md](./VERSIONS.md) 对齐。

**技术栈与打包**：全项目使用 **TypeScript**，最终打包为 **Node.js** 应用（可发布为 npm 包或独立可执行）。后端与 CLI 为 Node.js + TS，Studio 前端为 TS 构建后的静态资源，由 Node 服务托管或一并打包。

---

## 根目录

```
openEvolant/
├── package.json          # 根 workspace 配置、脚本、依赖
├── tsconfig.json         # 根 TS 配置（可含 base + references）
├── node_modules/         # 依赖（gitignore）
├── dist/                 # 构建产物（gitignore），或各子包各自 dist
├── docs/                 # 项目文档
├── packages/             # 核心逻辑（进化层 + 管线 + LLM），均为 TypeScript
├── studio/               # Evolant Studio Web GUI，TypeScript 前端
├── data/                 # 运行时数据（.genes、会话历史等，gitignore）
├── config/               # 默认/示例配置（如 .evaluator 模板）
├── README.md
└── LICENSE
```

---

## docs/

| 路径 | 说明 |
|------|------|
| `ARCHITECTURE.md` | 架构与模块说明 |
| `VERSIONS.md` | 各版本目标 |
| `FOLDER_STRUCTURE.md` | 本文件，文件夹结构 |
| `SPEC_genes.md` | `.genes` 文件格式与结构设计 |
| `SPEC_evaluator.md` | `.evaluator` 文件格式与结构设计 |

---

## packages/

核心逻辑，**全部 TypeScript**，对应架构中的进化层与对话管线。每子包可含 `src/`、`dist/`（或由根统一 build）、自有 `package.json` 与 `tsconfig.json`（继承根配置）。

| 路径 | 对应模块 | 说明 |
|------|----------|------|
| `packages/genes/` | Gen Pool | 基因池读写、`.genes` 序列化与版本管理 |
| `packages/evolution/` | Evolution Engine | 变异、重组、种群轮替 |
| `packages/evaluator/` | Evaluator | 评估逻辑、`.evaluator` 配置、多维度打分（AI 评估、金钱、时间等） |
| `packages/gateway/` | Gateway Server | 会话路由、Lane Queue，v0.1 仅 Web 单通道 |
| `packages/agent-runner/` | Agent Runner | Gen 驱动 Prompt 构建、Session History、Memory、Context Window Guard；执行 tools/skills |
| `packages/agentic-loop/` | Agentic Loop + Dispatcher | 是否 tool call、编排 Skills、调用 MCP |
| `packages/llm/` | LLM API | 大模型接入与配置，v0.1 优先支持 Kimi K2 |
| `packages/shared/` | 公共类型与工具 | 跨包共用类型、常量、工具函数（TS 类型与 utils） |

构建后由 Node.js 入口（如 `packages/cli/` 或根目录 `dist/index.js`）加载，可发布为 npm 包或单机运行。

---

## studio/

Evolant Studio：v0.1 唯一入口，**TypeScript** Web GUI。构建产物（如 `studio/dist/`）由 Node 服务托管（如 Express 静态中间件），或与后端一起打包为单一 Node 应用。

| 路径 | 说明 |
|------|------|
| `studio/` | 前端工程根目录（如 Vite + React / Next.js，TS） |
| `studio/src/` | 源码：页面与组件（.tsx/.ts） |
| `studio/dist/` 或 `studio/build/` | 构建输出（静态资源），由 Node 提供 HTTP 服务 |
| `studio/.../chat/` | 聊天页：发起任务意图、与 Genes Agent 对话、看会话历史 |
| `studio/.../evolution/` | 进化管理：基因池、评估配置、触发/观察进化、统计与可视化 |
| `studio/.../settings/` | 设置（如 LLM 接入与配置） |

---

## data/

运行时生成，建议加入 `.gitignore`。

| 路径 | 说明 |
|------|------|
| `data/genes/` | `.genes` 文件或基因池存储 |
| `data/sessions/` | 各 session 的对话历史与 memory |
| `data/evaluator/` | 运行时评估结果或缓存（可选） |

---

## config/

| 路径 | 说明 |
|------|------|
| `config/` | 默认或示例配置 |
| `config/evaluator/` | 示例 `.evaluator` 配置（时间、金钱、循环次数、中断条件等） |

---

## 与 v0.1 的对应关系

- **聊天**：`studio` 聊天页 → `packages/gateway` → `packages/agent-runner` → `packages/llm` → `packages/agentic-loop`，会话与历史落 `data/sessions/`。
- **进化管理**：`studio` 进化管理页 读/写 `packages/genes`、`packages/evaluator`，触发 `packages/evolution`，展示 `.genes` 与统计；评估配置来自 `config/evaluator/` 或用户保存的 `.evaluator`。
- **任务意图 → skill / .genes**：在 `studio` 创建任务意图，对应新 skill 或已有 skill，进化过程写 `data/genes/`，迭代信息写入 `.genes`。

随实现可增删子目录，本文档随仓库实际结构更新。

---

## 构建与运行（Node.js + TypeScript）

- **开发**：`tsc -b` 或 `tsup`/`esbuild` 等编译各包；Studio 用 Vite/Next 等 dev server；后端可 `ts-node` 或 `node --loader ts-node/esm`。
- **打包**：各 `packages/*` 输出到 `dist/`，Studio 构建到 `studio/dist/`；根或某包提供 `main`/`bin` 入口，最终以 **Node.js** 运行（`node dist/index.js` 或 `npm run start`）。
- **发布**：可发布为 npm 包（`npm publish`）或提供全局 CLI（如 `openevolant`），安装后本地运行 Node 服务 + 打开 Web GUI。
