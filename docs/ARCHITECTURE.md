# OpenEvolant 架构说明 | Architecture

本文档描述 OpenEvolant 的总体架构与核心模块，作为设计与实现的蓝图。

---

## 1. 架构总览 | High-Level Architecture

整体分为**进化层**（离线优化逻辑）与**对话执行管线**（在线响应用户）；进化层产出的 Gen 注入到管线中的 System Prompt 与 Agentic Loop，实现「自主进化的 Agent」。

### 1.1 总览图

```
  ┌─ 进化层 (Evolution) ─────────────────────────────────────────────────────────┐
  │  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                 │
  │  │  Gen Pool   │◄────┤   Evolution  │────►│   Evaluator     │                 │
  │  │  基因池     │     │   Engine     │     │   评估器        │                 │
  │  │ (.genes)    │     │  进化引擎    │     │ (.evaluator)    │                 │
  │  └──────┬──────┘     └──────────────┘     └─────────────────┘                 │
  │         │ 当前最优 Gen                                                         │
  └─────────┼─────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌─ 对话执行管线 (Request-Response Pipeline) ────────────────────────────────────┐
  │                                                                               │
  │   You ──► Input Adapter ──► Gateway ──► Agent Runner ──► LLM API ──► Agentic   │
  │   (用户)   (归一化/附件)   (会话路由)   (Gen 驱动       (模型调用)   Loop      │
  │                                    │   Prompt 构建)              (Dispatcher │
  │                                    │   Model Resolver             驱动工具   │
  │                                    │   History / Context Guard    与 Skills)  │
  │                                    │                                      │   │
  │   You ◄── Output Adapter ◄── Response Path (Stream / 格式化) ◄──────────────┘   │
  │                                                                               │
  └───────────────────────────────────────────────────────────────────────────────┘
            │                                      │
            ▼                                      ▼
  ┌─────────────────┐                   ┌─────────────────┐     ┌─────────────────┐
  │  Skills          │                   │  MCP            │     │ Evolant Studio  │
  │  (技能生态)      │                   │  (工具/资源)    │     │ (进化可视化)    │
  └─────────────────┘                   └─────────────────┘     └─────────────────┘
```

### 1.2 进化层（Evolution Layer）

| 模块 | 说明 |
|------|------|
| **Gen Pool（基因池）** | 存储可遗传的 Gens，持久化为 `.genes`；向管线提供「当前最优 Gen」。 |
| **Evolution Engine（进化引擎）** | 变异、重组、种群管理，读/写 Gen Pool，受 Evaluator 分数驱动。 |
| **Evaluator（评估器）** | 对 Gen 表现打分（成本、准确率等），策略可持久化为 `.evaluator`，驱动自然选择。 |

### 1.3 对话执行管线（Pipeline）

| 阶段 | 模块 | 说明 |
|------|------|------|
| 入站 | **Input Channel Adapter** | 归一化消息、提取附件，送入 Gateway。 |
| 协调 | **Gateway Server** | Session Router + Lane Queue，将消息路由到对应会话与 Agent Runner。 |
| 上下文 | **Agent Runner** | **Gen 驱动**的 System Prompt Builder（tools, skills, memory）+ Model Resolver + Session History Loader + Context Window Guard，构造发给 LLM 的 prompt。 |
| 推理 | **LLM API** | 调用外部大模型，返回生成结果。 |
| 决策与执行 | **Agentic Loop** | **Dispatcher 驱动**：根据 LLM 输出决定是否 tool call，编排 Skills、调用 MCP，或生成最终回复。 |
| 出站 | **Response Path** | 流式输出、按通道格式化，经 Output Channel Adapter 回传用户。 |

### 1.4 外部依赖与观测

| 对象 | 说明 |
|------|------|
| **Skills** | 技能生态；Dispatcher 根据 Gen 选择并编排要触发的 Skills。 |
| **MCP** | 工具与资源；Agentic Loop 通过 Dispatcher 学习并执行最优调用序列。 |
| **Evolant Studio** | 进化过程与结果的可视化、调试与导出。 |

### 1.5 系统原创文件 | Native File Types

本系统原创的、用于持久化核心状态的**两大类文件**为：

| 文件类型 | 含义 | 用途 |
|----------|------|------|
| **`.genes`** | 基因 / 进化过程 | 记录种群中的基因、变异与重组历史、进化轨迹等，便于追溯、复现与调试；基因池的持久化格式。 |
| **`.evaluator`** | 评估器 | 记录评估策略、打分规则、筛选条件等，用于驱动自然选择与优胜劣汰；评估器的配置或结果持久化格式。 |

- **`.genes`** = 进化过程与基因池的载体
- **`.evaluator`** = 评估逻辑与选择标准的载体

---

## 2. 核心模块 | Core Modules

### 2.1 Gen / 基因 (Gens)

| 项目 | 说明 |
|------|------|
| **职责** | 将 Agent 的推理逻辑表达为可遗传、可变异的结构化单元。 |
| **形态** | 可序列化为 `.genes` 文件（或纳入基因池的 `.genes` 中），便于版本管理与分发。 |
| **内容** | 包含 prompt 片段、决策序列、工具调用偏好等「可进化」的配置与逻辑描述。 |

基因是进化的基本单位：变异与重组作用于 Gen，评估与选择基于 Gen 的表现。

### 2.2 Gen Pool / 基因池

| 项目 | 说明 |
|------|------|
| **职责** | 存储、检索、版本管理当前种群与历史优良基因。 |
| **输入** | 来自 Evolution Engine 的新基因、来自 Evaluator 的存活/淘汰结果。 |
| **输出** | 提供给 Evolution Engine 的父代基因、提供给 Dispatcher 的「当前最优」或指定 Gen。 |
| **持久化** | 基因池可持久化为 `.genes` 文件（系统原创格式之一）。 |

可扩展为本地文件、数据库或分布式存储。

### 2.3 Evolution Engine / 进化引擎

| 项目 | 说明 |
|------|------|
| **职责** | 实现变异（mutation）、重组（crossover）、种群轮替与进化策略。 |
| **依赖** | Gen Pool（读父代、写子代），Evaluator（适应度/得分）。 |
| **策略** | 在模拟压力下（如任务集、成本约束）生成新一代 Gen，淘汰低分个体、保留/组合高分个体。 |

进化引擎是「数字达尔文」的核心：把冗余推理路径压缩为更优序列。

### 2.4 Evaluator / 评估器

| 项目 | 说明 |
|------|------|
| **职责** | 对 Gen 在给定任务或环境下的表现进行量化（成本、延迟、准确率、成功率等）。 |
| **输入** | Gen + 任务/环境描述（或与 Skills/MCP 联调时的真实运行轨迹）。 |
| **输出** | 适应度分数或多维指标，供 Evolution Engine 做选择与排序。 |
| **持久化** | 评估策略、打分规则等可写入 `.evaluator` 文件（系统原创格式之一）。 |

高成本、低准确率的基因被逐步淘汰；优良基因得以保留并参与重组。

### 2.5 Dispatcher / 调度层

| 项目 | 说明 |
|------|------|
| **职责** | 在运行时根据当前选定的 Gen，决定「何时选用哪些 Skills」与「如何调用 MCP 工具」。 |
| **定位** | 学习并执行「最高效的调用方式」，充当 Skills 与 MCP 之间的智能调度员。 |
| **接口** | 与 Skills 生态（如 SKILL.md / 技能注册表）对接；与 MCP 的 tool/resource 调用接口对接。 |

Dispatcher 使进化得到的逻辑真正落地到执行层。

### 2.6 Evolant Studio / 进化可视化

| 项目 | 说明 |
|------|------|
| **职责** | GUI 展示进化过程：变异追踪、优胜劣汰、基因沉淀为 `.genes`。 |
| **数据来源** | 从 Gen Pool、Evolution Engine、Evaluator 拉取状态与历史。 |
| **用户价值** | 实时观察「数字达尔文」、调试进化策略、导出/分享 Apex Skills。 |

---

## 3. 与外部生态的关系 | Integration Points

| 系统 | 角色 | OpenEvolant 的对接方式 |
|------|------|------------------------|
| **Skills** | 技能生态（可被调用的能力单元） | 进化产出的 Apex Skills 可自 `.genes` 导出或与既有 Skills（如 SKILL.md）融合；Dispatcher 根据 Gen 选择与编排要触发的 Skills。 |
| **MCP** | 工具与资源 | Dispatcher 学习并执行最优工具调用序列；可读取 MCP 的 tools/resources 描述以指导进化。 |
| **宿主/Agent 环境** | 运行环境 | OpenEvolant 以「寄生大脑」形式挂载，通过 Skills + MCP 增强 Agent，而非替换宿主。 |

---

## 4. 数据流与进化循环 | Data Flow & Evolution Loop

1. **初始化**：从 Gen Pool 加载种子 Gen（或从既有 `.genes` 导入）。
2. **评估**：Evaluator 在任务集/模拟环境下对当前种群中的 Gen 打分。
3. **选择**：Evolution Engine 根据分数进行选择（保留高分、淘汰低分）。
4. **变异与重组**：对选中 Gen 进行变异与重组，生成子代。
5. **回写**：子代写入 Gen Pool，持久化为 `.genes`（基因结晶）。
6. **分发**：Dispatcher 使用当前最优 Gen 编排 Skills 并响应 MCP 的调用。
7. **循环**：重复 2–5，直至满足收敛条件或用户停止。

---

## 5. 模块依赖简图 | Module Dependencies

```
Evolant Studio ──► 只读/订阅 ──► Gen Pool, Evolution Engine, Evaluator

Evaluator ──► 读 Gen Pool（可选） ──► 输出分数 ──► Evolution Engine

Evolution Engine ──► 读/写 Gen Pool

Dispatcher ──► 读 Gen Pool（当前最优/指定 Gen） ──► 编排 Skills、调用 MCP

Skills / MCP ──► 运行时被 Dispatcher 选用与调用
```

---

## 6. 与 OpenClaw 架构对比及需实现模块 | OpenClaw Mapping

OpenEvolant 定位为**可自主进化的 Agent 系统**，与 OpenClaw 在「对话与执行管线」上对齐，在「逻辑从何而来」上由静态配置变为进化驱动。下表对照 OpenClaw 的模块，说明**我们需要实现的部分**及与进化层的关系。

### 6.1 OpenClaw 管线简述

| 阶段 | OpenClaw 模块 | 作用 |
|------|----------------|------|
| 入站 | **Input Channel Adapter** | 归一化消息、提取附件 → Gateway |
| 协调 | **Gateway Server** | Session Router、Lane Queue，把消息路由到对应会话与 Agent Runner |
| 准备上下文 | **Agent Runner** | Model Resolver、**System Prompt Builder (tools, skills, memory)**、Session History Loader → **Context Window Guard** |
| 推理 | **LLM API** | 接收构造好的 prompt，返回模型输出 |
| 决策与执行 | **Agentic Loop** | 根据 LLM 输出判断是否 tool call → 执行工具或生成 Final Text |
| 出站 | **Response Path** | Stream Chunks、Output Channel Adapter → 回传用户 |

### 6.2 我们需要实现的模块（与 OpenClaw 对应）

| OpenClaw 模块 | 我们是否实现 | OpenEvolant 对应 / 说明 |
|----------------|--------------|--------------------------|
| **Input Channel Adapter** | ✅ 需实现 | 入站通道适配器：归一化消息、提取附件，供 Gateway 使用。 |
| **Gateway Server**（Session Router + Lane Queue） | ✅ 需实现 | 会话路由与队列：把消息路由到正确会话，控制会话并发与顺序。 |
| **Model Resolver** | ✅ 需实现 | 解析当前会话/任务使用哪类模型（进化或评估时可能用不同模型）。 |
| **System Prompt Builder** | ✅ 需实现（进化驱动） | **由 Gen / `.genes` 驱动**：从基因池取当前 Gen，将 tools、skills、memory 等组装为 system prompt，而非静态配置。 |
| **Session History Loader** | ✅ 需实现 | 加载当前会话历史，供上下文与评估使用。 |
| **Context Window Guard** | ✅ 需实现 | 控制上下文长度，必要时压缩，保证不超窗。 |
| **LLM API** | ✅ 需实现 / 对接 | 调用外部 LLM；推理与进化（如变异时的生成）都会用到。 |
| **Agentic Loop** | ✅ 需实现（进化驱动） | **由 Dispatcher + Gen 驱动**：是否 tool call、选哪些 Skills、如何调 MCP 由进化得到的逻辑决定，而非写死。 |
| **Response Path**（Stream + Output Adapter） | ✅ 需实现 | 流式输出、按通道格式化，将最终回复送回用户。 |

### 6.3 我们独有的模块（OpenClaw 无）

| 模块 | 说明 |
|------|------|
| **Gen Pool**（`.genes`） | 基因池与进化过程持久化；驱动 System Prompt Builder 与 Dispatcher 的「逻辑」来源。 |
| **Evolution Engine** | 变异、重组、种群管理，在离线/后台持续进化。 |
| **Evaluator**（`.evaluator`） | 对 Gen 表现打分，驱动自然选择；策略与规则可持久化。 |
| **Dispatcher** | 在 Agentic Loop 中根据 Gen 编排 Skills、调用 MCP，相当于「可进化的工具/技能调度」。 |
| **Evolant Studio** | 进化过程与结果的可视化、调试与导出。 |

### 6.4 一句话对应

- **OpenClaw**：静态的 System Prompt + 静态的 Agentic Loop（tools/skills 写死）。
- **OpenEvolant**：**Gen 驱动的 System Prompt** + **Dispatcher/Gen 驱动的 Agentic Loop**，外加 **Evolution Engine + Evaluator + Gen Pool** 持续优化这两部分，产出 `.genes` 与 `.evaluator`。

因此我们需要实现整条「从用户消息到回复」的管线（与 OpenClaw 对齐），并在 System Prompt 构建与 Agentic Loop 两处接入进化层（Gen Pool + Dispatcher），并实现进化与评估独有模块。

---

本文档会随实现推进而更新；新增模块或接口时应同步修改此处。
