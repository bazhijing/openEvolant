# 跑通「1 美金跑出最漂亮产品页」还差哪些模块

本文档基于当前代码与架构，列出要跑通**单次迭代**「在 1 美元预算内、以“最漂亮产品页”为目标的进化」所缺的模块与实现点。不涉及前端文案或 UI 细节，仅从「端到端可跑」角度拆解。

---

## 目标简述

- **任务**：在预算 **1 USD** 内，通过进化（多轮「生成 → 评估 → 选择 → 变异」）优化「产品页美观度」。
- **约束**：`runConstraints.budgetMoney = 1`（已有配置形态），需在迭代过程中**累计成本并超预算即停**。
- **评估**：至少两个维度——**成本**（越低越好，不超预算）、**美观**（越高越好）；可由 `.ns` + `.evaluator` 的加权聚合得到综合适应度。

---

## 已有、且可直接复用的部分

| 模块 | 状态 | 说明 |
|------|------|------|
| **Gen / .genes 结构** | ✅ | `GenContent`、`Gen`、`GenesFile`、`taskIntent`、种群与 history 已定义；genes 包提供 `createEmptyGenesFile`、`addGen`、`setCurrentBest`。 |
| **Evaluator 配置与聚合** | ✅ | `.evaluator` 解析、`runConstraints`（含 `budgetMoney`）、`aggregateScore` 已存在。 |
| **Natural Selection 配置** | ✅ | `.ns` 的 runConstraints、interruptConditions、evaluatorRefs 等已有规范与配置示例。 |
| **Evolution 选择与种子** | ✅ | `selectTopByFitness`、`createSeedGen` 已实现。 |
| **Agent Runner 骨架** | ✅ | `buildSystemPromptFromGen`、`buildMessages` 已有；Gen 驱动 system prompt 的形态在。 |
| **LLM 配置与类型** | ✅ | `LLMConfig`、`ChatMessage`、`ChatCompletionResult`（含 `usage`）已定义；Settings + default.llm.json 可配置多模型。 |
| **模型价格与上下文** | ✅ | `config/llm/supported-vendors-models.json` 已有计费单位、输入/输出价格（CNY/USD）、contextLength。 |

---

## 还差的模块与实现点

### 1. LLM 真实调用（packages/llm）

- **现状**：`createLLMClient().chat()` 返回 `{ content: '' }`，未调任何 API。
- **需要**：
  - 按 `LLMConfig`（含 `baseURL`、`apiKey`）实际请求 Moonshot/Kimi 等兼容 OpenAI 的 chat completion 接口。
  - 返回内容 + **usage**（`promptTokens`, `completionTokens`），供下游算成本和截断。
- **影响**：无此项则无法「跑一次任务」、也无法算钱。

---

### 2. 成本计算与预算控制（新模块或 evaluator 扩展）

- **现状**：有 `runConstraints.budgetMoney` 和 `supported-vendors-models.json` 中的价格，但没有「按次计费」和「累计预算」的逻辑。
- **需要**：
  - **单次成本**：根据本次调用的 `provider/model` + `usage`（prompt/completion tokens）+ `supported-vendors-models.json` 中该模型的 `pricing`（按 billingUnit 换算），算出本次花费（建议统一 USD）。
  - **预算控制**：在进化循环中维护「当前轮已用预算」；每次调用 LLM 前/后更新累计成本，若 `累计 > budgetMoney` 则不再发起新调用并结束当轮/迭代。
- **建议**：独立小模块（如 `cost-tracker` 或放在 evaluator 的 runner 里），输入为 `(modelId, usage, pricingConfig)`，输出为 `costUsd`；上层在「跑一代/跑一次任务」时调用并累加。

---

### 3. 评估器「执行」逻辑（evaluator 扩展）

- **现状**：evaluator 包只有**配置解析**和**多维度加权聚合**（`aggregateScore`），没有「按维度执行并得到分数」的实现。
- **需要**：
  - 对每个 dimension：
    - **kind = cost**：用上面 2 的单次/累计成本换算为 0–1 分数（如 invert：成本越低分越高）。
    - **kind = time**：用实际耗时换算为 0–1（若 invert：越快分越高）。
    - **kind = ai / custom（美观）**：用「产品页」产出（如 HTML 或文本）调用**评判模型**（或规则），得到「美观度」0–1 分；例如：再调一次 LLM（prompt：请对这段产品页打分 0–1）+ 解析分数，或调用已有美学评估 API。
  - 输出 `scoresByDimension`，再交给现有 `aggregateScore` 得到综合 fitness。
- **影响**：无此项则无法得到「美观」维度和「成本」维度，进化没有目标。

---

### 4. 进化循环编排器（新模块，建议名 evolution-runner / orchestrator）

- **现状**：没有把「读 genes → 对每个 gen 跑任务 → 评估 → 选择 → 变异/重组 → 写回 genes」串起来的逻辑；Evolution 页是前端 mock。
- **需要**（最小可跑闭环）：
  1. 加载 `.genes`（种群）、`.ns`（约束与评估器引用）、`.evaluator`（维度定义）；
  2. 对当前种群中每个 gen（或按预算采样有限个）：
     - 用 agent-runner 根据 gen 构建 system prompt + 任务 user message（见下「任务定义」）；
     - 调 LLM 一次（或简单 loop：只取最终 text，不必须 tool call），得到「产品页」输出 + usage；
     - 用模块 2 算本次成本并累计，超预算则停；
     - 用模块 3 跑各 evaluator 维度（cost、美观等），得到 `scoresByDimension` → `aggregateScore` → fitness；
     - 把 fitness 写回该 gen（或写回内存中的 population，最后统一写 .genes）；
  3. 用现有 `selectTopByFitness` 取 top N；
  4. 用「变异/重组」生成子代（见下）；
  5. 更新 population、history、currentBestGenId，写回 `.genes`；
  6. 若未达 `interruptConditions`（如 stopWhenScoreAbove、stopWhenNoImprovementForIterations）且未超预算，可继续下一轮；否则结束。
- **影响**：无此项则「1 美金跑迭代」没有执行入口。

---

### 5. 变异与重组（packages/evolution）

- **现状**：只有 `selectTopByFitness` 和 `createSeedGen`，没有 `mutate(gen)`、`crossover(genA, genB)`。
- **需要**：
  - **mutate**：对 `GenContent`（如 `promptFragments`）做小改动（例如随机改一句、插一句、删一句），生成新 gen，`origin: 'mutation'`，`parentIds: [原 genId]`。
  - **crossover**：从两个父代 gen 的 `promptFragments` 等组合出子代，`origin: 'crossover'`，`parentIds: [idA, idB]`。
  - 新 gen 的 `genId`、`version`、`createdAt` 由调用方或 evolution 包统一生成。
- **影响**：无此项只能「评估一代」，无法产生新一代，进化停滞。

---

### 6. 任务定义与「产品页」输入/输出

- **现状**：`TaskIntent` 有 id/name/skillId，但没有「本轮任务」的具象描述；agent-runner 的 `buildMessages` 需要 `userInput`，目前没有约定「产品页」任务从哪来。
- **需要**：
  - **任务描述**：例如「生成一个单页产品页 HTML，要求：现代、简洁、美观」（可写死在编排器或从 .genes 的 taskIntent 关联的 config 读）。
  - **user message**：每轮/每个 gen 可同一条，或加随机种子/变体（如不同产品名），以便有多样性；编排器在调用 `buildMessages(systemPrompt, history, userInput)` 时传入。
  - **输出形态**：约定 LLM 直接输出 HTML 或 markdown；若需「产品页」图片，再考虑 MCP/Skill，v1 可先纯文本/HTML。
- **影响**：无明确任务则「产品页」不明确，评估「美观」的对象也不明确。

---

### 7. Agentic Loop / Dispatcher（packages/agentic-loop）

- **现状**：`decideFromGenContent` 直接返回 `{ type: 'final', text: _llmResponse }`，没有解析 tool call、也没有调 MCP/Skills。
- **需要（与目标强相关时）**：若「产品页」需要插图和调工具（如取图、调 MCP），则需要解析 LLM 输出中的 tool call、调用工具、把结果再喂回 LLM，直到得到 final text。若 v1 只做「纯 LLM 生成 HTML」则可暂不实现，用一次 chat 的 content 作为产出即可。
- **影响**：决定是「单轮生成」还是「多轮 tool call 生成」；后者才必须补全 Dispatcher。

---

### 8. Context Window Guard（packages/agent-runner）

- **现状**：`trimHistoryToFit` 未实现，直接返回原 history。
- **需要**：按 token 估算（或用 LLM 返回的 usage）对 history 截断/压缩，保证不超模型 contextLength。
- **影响**：长对话会爆窗；若 v1 每轮只发一条 user message、无长 history，可延后。

---

### 9. Model Resolver

- **现状**：未实现。进化时「主任务」和「评估器（美观）」可能用不同模型（如主任务用贵模型、评判用便宜模型），需要根据配置解析「当前这一步用哪个 model」。
- **需要**：根据 run/config 决定本次调用用 default.llm.json 中的哪一个 model（或固定一个），并把对应 `LLMConfig` 传给 LLM 客户端；成本计算时用该模型的 pricing。
- **影响**：多模型时能控成本、控质量；单模型可先写死一个。

---

### 10. Evolant Studio 与进化后端对接

- **现状**：Evolution 页的 runs、进度、bestScore 等均为前端 mock，没有调用真实编排器 API。
- **需要**：后端提供「启动进化」「暂停/恢复」「查询当前状态与历史」等 API（可由 evolution-runner 暴露）；前端用真实数据展示 .genes 的 population、history、当前 best 与分数。
- **影响**：不阻塞「跑通迭代」，但若要在 GUI 里看到真实「1 美金跑出最漂亮产品页」的进度，需要这一块。

---

## 建议实现顺序（仅从「跑通一次迭代」角度）

1. **LLM 真实调用**（1）  
   → 能拿到 content + usage，后续成本和评估才有输入。

2. **成本计算 + 预算控制**（2）  
   → 满足「1 美金」硬约束。

3. **任务定义 + 产品页 user message**（6）  
   → 与编排器一起定：单轮、单条 user message、输出即「产品页」文本/HTML。

4. **评估器执行**（3）：至少实现 cost 维度和一个「美观」维度（如 LLM-as-judge）。  
   → 进化才有目标函数。

5. **变异（和可选的重组）**（5）  
   → 一代跑完后能生成下一代。

6. **进化循环编排器**（4）  
   → 串联 1–5，读 .genes/.ns/.evaluator，跑一代：执行任务 → 评估 → 选择 → 变异 → 写回。

7. 其余：Model Resolver（9）、Context Window Guard（8）、Agentic Loop 工具调用（7）、Studio 对接（10）可按需插入或延后。

---

## 小结表

| # | 模块/实现点 | 优先级（跑通 1 美金迭代） |
|---|-------------|----------------------------|
| 1 | LLM 真实调用 | 必须 |
| 2 | 成本计算与预算控制 | 必须 |
| 3 | 评估器执行（cost + 美观等） | 必须 |
| 4 | 进化循环编排器 | 必须 |
| 5 | 变异（与可选重组） | 必须 |
| 6 | 任务定义与产品页输入/输出 | 必须 |
| 7 | Agentic Loop / Dispatcher（tool call） | 可选（单轮生成可先不做） |
| 8 | Context Window Guard | 建议（长对话时必须） |
| 9 | Model Resolver | 建议（多模型时必须） |
| 10 | Studio 与进化后端对接 | 可选（观察与调试用） |

完成 **1 + 2 + 3 + 4 + 5 + 6** 后，即可在命令行或单测中「跑通」一次「1 美金预算内的产品页美观度进化」迭代；7–10 可在其后逐步补全。
