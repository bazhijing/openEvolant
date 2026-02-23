# OpenEvolant 架构说明 | Architecture

本文档描述 OpenEvolant 的总体架构与核心模块，作为设计与实现的蓝图。

---

## 1. 架构总览 | High-Level Architecture

整体分为**进化层**（离线优化逻辑）与**对话执行管线**（在线响应用户）；进化层产出的 Gen 注入到管线中的 System Prompt 与 Agentic Loop，实现「自主进化的 Agent」。

### 1.1 总览图

```
  ┌─ 进化层 (Evolution) ─────────────────────────────────────────────────────────┐
  │  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────────────┐    │
  │  │  Gen Pool   │◄────┤   Evolution  │────►│ Natural Selection + Evaluator│    │
  │  │  基因池     │     │   Engine     │     │ (.ns 条件组合 + .evaluator   │    │
  │  │ (.genes)    │     │  进化引擎    │     │  单条件评估器)                │    │
  │  └──────┬──────┘     └──────────────┘     └─────────────────────────────┘    │
  │         │ 当前最优 Gen                                                         │
  └─────────┼─────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌─ 对话执行管线 (Request-Response Pipeline) ────────────────────────────────────┐
  │                                                                               │
  │   You ──► Input Adapter ──► Gateway ──► Agentic Loop ──► LLM API ──► 输出     │
  │   (用户)   (归一化/附件)   (会话路由)   (Gen 驱动 Prompt   (模型调用)  (单轮    │
  │                                    │   构建 + 单轮生成* + Dispatcher)  或多轮)  │
  │                                    │   * 可先简化为单轮生成                     │
  │   You ◄── Output Adapter ◄── Response Path (Stream / 格式化) ◄────────────────┘   │
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
| **Evolution Runner（进化编排器）** | 编排整轮进化：加载 .genes/.ns/.evaluator → 对每个 Gen 用 Agentic Loop 跑任务（单轮生成）→ 评估 → 选择 → 变异/重组 → 写回 .genes。 |
| **Evolution Engine（进化引擎）** | 变异、重组、种群管理，读/写 Gen Pool，受 Natural Selection + Evaluator 分数驱动；由 Evolution Runner 调用。 |
| **Natural Selection（自然选择）** | 条件的组合：运行/中断约束、评估器引用（id+key+weight）、聚合；持久化为 `.ns`。 |
| **Evaluator（评估器）** | 单条件：一个打分维度及实现（prompt、config），持久化为 `.evaluator`，可被多个 `.ns` 引用。 |

### 1.3 对话执行管线（Pipeline）

管线仅保留 **Agentic Loop** 与 **LLM API**，不再单独设 Agent Runner；Agentic Loop 内聚「Gen 驱动 Prompt 构建 + 单轮/多轮生成 + 决策」。

| 阶段 | 模块 | 说明 |
|------|------|------|
| 入站 | **Input Channel Adapter** | 归一化消息、提取附件，送入 Gateway。 |
| 协调 | **Gateway Server** | Session Router + Lane Queue，将消息路由到对应会话与 Agentic Loop。 |
| 执行与推理 | **Agentic Loop** | **Gen 驱动**：从 Gen 构建 System Prompt、组消息（Session History、Context Window Guard 可在此内实现）；调用 LLM；根据输出决定 tool call 或最终回复（可先简化为**单轮生成**）。 |
| 推理 | **LLM API** | 调用外部大模型，返回生成结果。 |
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
| **`.ns`** | 自然选择 | 条件的组合：运行/中断约束、评估器引用与权重、聚合方式；驱动进化循环启停与综合分计算。 |
| **`.evaluator`** | 单条件评估器 | 一个打分维度及实现（kind + config，如 prompt、模型）；可被多个 `.ns` 引用。 |

- **`.genes`** = 进化过程与基因池的载体
- **`.ns`** = 条件组合与选择策略的载体
- **`.evaluator`** = 单条件评估逻辑的载体（可复用）

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
| **输入** | 来自 Evolution Engine 的新基因、来自 Natural Selection + Evaluator 的存活/淘汰结果。 |
| **输出** | 提供给 Evolution Engine 的父代基因、提供给 Dispatcher 的「当前最优」或指定 Gen。 |
| **持久化** | 基因池可持久化为 `.genes` 文件（系统原创格式之一）。 |

可扩展为本地文件、数据库或分布式存储。

### 2.3 Evolution Engine / 进化引擎

| 项目 | 说明 |
|------|------|
| **职责** | 实现变异（mutation）、重组（crossover）、种群轮替与进化策略。 |
| **依赖** | Gen Pool（读父代、写子代），Natural Selection（.ns）+ Evaluator（.evaluator）（适应度/得分）。 |
| **策略** | 在模拟压力下（如任务集、成本约束）生成新一代 Gen，淘汰低分个体、保留/组合高分个体。 |

进化引擎是「数字达尔文」的核心：把冗余推理路径压缩为更优序列。

### 2.4 Natural Selection / 自然选择

| 项目 | 说明 |
|------|------|
| **职责** | 定义条件的组合：用哪些评估器、权重与运行/中断约束、聚合方式；驱动进化循环启停与综合分计算。 |
| **输入** | 读取 `.ns` 与引用的 `.evaluator`；Evolution Engine 按 `.ns` 调用各评估器并聚合。 |
| **输出** | 综合适应度与各维度分数，供 Evolution Engine 做选择与排序。 |
| **持久化** | 自然选择配置持久化为 `.ns` 文件（系统原创格式之一）。 |

### 2.5 Evaluator / 评估器（单条件）

| 项目 | 说明 |
|------|------|
| **职责** | 对 Gen 在**一个维度**上的表现进行量化（如成本、延迟、准确率、AI 质量等）；实现方式由 kind + config 定义（prompt、模型等）。 |
| **输入** | Gen + 任务/环境描述（或运行轨迹）。 |
| **输出** | 该维度的分数，供 Natural Selection 按权重与聚合合成综合分。 |
| **持久化** | 单条件评估器持久化为 `.evaluator` 文件（系统原创格式之一）；可被多个 `.ns` 引用。 |

高成本、低准确率的基因被逐步淘汰；优良基因得以保留并参与重组。

### 2.6 Dispatcher / 调度层

| 项目 | 说明 |
|------|------|
| **职责** | 在运行时根据当前选定的 Gen，决定「何时选用哪些 Skills」与「如何调用 MCP 工具」。 |
| **定位** | 学习并执行「最高效的调用方式」，充当 Skills 与 MCP 之间的智能调度员。 |
| **接口** | 与 Skills 生态（如 SKILL.md / 技能注册表）对接；与 MCP 的 tool/resource 调用接口对接。 |

Dispatcher 使进化得到的逻辑真正落地到执行层。

### 2.7 Evolant Studio / 进化可视化

| 项目 | 说明 |
|------|------|
| **职责** | GUI 展示进化过程：变异追踪、优胜劣汰、基因沉淀为 `.genes`。 |
| **数据来源** | 从 Gen Pool、Evolution Engine、Natural Selection（.ns）与 Evaluator（.evaluator）拉取状态与历史。 |
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
2. **评估**：按 `.ns` 引用的各 `.evaluator` 对当前种群中的 Gen 打分，再按 `.ns` 的权重与聚合得到综合分。
3. **选择**：Evolution Engine 根据分数进行选择（保留高分、淘汰低分）。
4. **变异与重组**：对选中 Gen 进行变异与重组，生成子代。
5. **回写**：子代写入 Gen Pool，持久化为 `.genes`（基因结晶）。
6. **分发**：Dispatcher 使用当前最优 Gen 编排 Skills 并响应 MCP 的调用。
7. **循环**：重复 2–5，直至满足收敛条件或用户停止。

---

## 5. 模块依赖简图 | Module Dependencies

```
Evolant Studio ──► 只读/订阅 ──► Gen Pool, Evolution Runner, Evolution Engine, Natural Selection (.ns), Evaluator (.evaluator)

Evolution Runner ──► 读/写 Gen Pool、读 .ns / .evaluator ──► 调用 Evolution Engine、Evaluator、Agentic Loop（跑任务）

Natural Selection (.ns) ──► 引用 ──► Evaluator (.evaluator)
Evaluator ──► 输出各维度分数 ──► Evolution Runner 聚合 ──► Evolution Engine 选择

Evolution Engine ──► 读/写 Gen Pool（变异、重组、种群）

Agentic Loop ──► 读 Gen Pool（当前 Gen） ──► Prompt 构建 + LLM + Dispatcher（单轮可先简化）
Dispatcher（在 Agentic Loop 内） ──► 编排 Skills、调用 MCP

Skills / MCP ──► 运行时被 Dispatcher 选用与调用
```

---

## 6. 与 OpenClaw 架构对比及需实现模块 | OpenClaw Mapping

OpenEvolant 定位为**可自主进化的 Agent 系统**，与 OpenClaw 在「对话与执行管线」上对齐，在「逻辑从何而来」上由静态配置变为进化驱动。下表对照 OpenClaw 的模块，说明**我们需要实现的部分**及与进化层的关系。

### 6.1 OpenClaw 管线简述（参考）

| 阶段 | OpenClaw 模块 | 作用 |
|------|----------------|------|
| 入站 | **Input Channel Adapter** | 归一化消息、提取附件 → Gateway |
| 协调 | **Gateway Server** | Session Router、Lane Queue，把消息路由到对应会话 |
| 准备上下文 | **Agent Runner** | Model Resolver、System Prompt Builder、Session History、Context Window Guard |
| 推理 | **LLM API** | 接收构造好的 prompt，返回模型输出 |
| 决策与执行 | **Agentic Loop** | 根据 LLM 输出判断是否 tool call → 执行工具或生成 Final Text |
| 出站 | **Response Path** | Stream Chunks、Output Channel Adapter → 回传用户 |

### 6.2 我们需要实现的模块（简化设计：无 Agent Runner）

**设计选择**：不设独立 Agent Runner；仅保留 **Evolution Runner**（进化编排）与 **Agentic Loop**（执行管线）。Agentic Loop 内聚「Gen 驱动 Prompt 构建 + 单轮生成（可先简化）+ 决策」；Evolution Runner 编排「读 genes → 对每个 Gen 跑 Agentic Loop → 评估 → 选择 → 变异 → 写回」。

| 功能 | 我们是否实现 | OpenEvolant 对应 / 说明 |
|------|--------------|--------------------------|
| **Input Channel Adapter** | ✅ 需实现 | 入站通道适配器：归一化消息、提取附件，供 Gateway 使用。 |
| **Gateway Server** | ✅ 需实现 | 会话路由与队列：把消息路由到正确会话，控制会话并发与顺序。 |
| **Model Resolver** | ✅ 需实现 | 解析当前会话/任务使用哪类模型；可在 Agentic Loop 或 Evolution Runner 内使用。 |
| **System Prompt / History / Context Guard** | ✅ 需实现 | 均在 **Agentic Loop** 内：由 Gen 驱动组装 system prompt、加载会话历史、控制上下文长度。 |
| **LLM API** | ✅ 需实现 / 对接 | 调用外部 LLM；推理与进化都会用到。 |
| **Agentic Loop** | ✅ 需实现（进化驱动） | **Gen 驱动**：Prompt 构建 + 单轮生成（可先不做多轮 tool call）+ Dispatcher 决定 tool/final。 |
| **Response Path** | ✅ 需实现 | 流式输出、按通道格式化，将最终回复送回用户。 |
| **Evolution Runner** | ✅ 需实现 | 进化编排器：加载 .genes/.ns/.evaluator，对种群中每个 Gen 跑 Agentic Loop（单轮）→ 评估 → 选择 → 变异/重组 → 写回。 |

### 6.3 我们独有的模块（OpenClaw 无）

| 模块 | 说明 |
|------|------|
| **Gen Pool**（`.genes`） | 基因池与进化过程持久化；驱动 Agentic Loop 的 Prompt 与 Dispatcher 的「逻辑」来源。 |
| **Evolution Runner** | 进化循环编排：串起「跑任务 → 评估 → 选择 → 变异 → 写回」，调用 Evolution Engine、Evaluator、Agentic Loop。 |
| **Evolution Engine** | 变异、重组、种群管理，在离线/后台由 Evolution Runner 调用。 |
| **Natural Selection**（`.ns`） | 条件组合与选择策略；运行/中断约束、评估器引用与聚合。 |
| **Evaluator**（`.evaluator`） | 单条件评估器，对 Gen 在某一维度打分；可被多个 `.ns` 引用。 |
| **Dispatcher** | 在 Agentic Loop 内根据 Gen 编排 Skills、调用 MCP（可先简化为单轮生成时不触发）。 |
| **Evolant Studio** | 进化过程与结果的可视化、调试与导出。 |

### 6.4 一句话对应

- **OpenClaw**：静态的 System Prompt + 静态的 Agentic Loop（tools/skills 写死）。
- **OpenEvolant**：**无独立 Agent Runner**；**Agentic Loop** 内聚 Gen 驱动 Prompt + 单轮/多轮生成 + Dispatcher；**Evolution Runner** 编排进化循环；Evolution Engine + Natural Selection + Evaluator + Gen Pool 持续优化，产出 `.genes`、`.ns` 与 `.evaluator`。

因此我们实现：**Evolution Runner**（进化编排）+ **Agentic Loop**（整条「从用户消息到回复」的管线，含 Prompt 构建与单轮生成），并实现进化与评估独有模块。

---

本文档会随实现推进而更新；新增模块或接口时应同步修改此处。
