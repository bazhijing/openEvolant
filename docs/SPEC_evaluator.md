# .evaluator 文件设计 | Evaluator File Specification

本系统原创格式，用于持久化**评估器配置**：定义评估维度、资源约束（时间、金钱、循环次数）与中断条件（如「分数太好则提前结束」）。驱动自然选择与进化循环的启停。

---

## 1. 用途与定位

- **载体**：评估逻辑与选择标准的配置（及可选的结果快照）。
- **使用方式**：用户在 Web GUI 中「选择对应的评估配置」，并给定时间、金钱、循环次数与评估分中断条件后，开始循环执行 Agent；Evaluator 按本配置对每次结果做多维度评估。
- **维度**：支持 AI 评估（语义/质量）、金钱（成本）、时间（延迟）等简单多维度，每次迭代产出可写回运行结果或仅用于选择。

---

## 2. 格式约定

- **扩展名**：`.evaluator`
- **推荐序列化**：JSON（便于 TypeScript 与工具链）。
- **编码**：UTF-8。
- **版本**：文件内带 `specVersion`，便于兼容。

---

## 3. 文件结构（草案）

```json
{
  "specVersion": "0.1",
  "id": "string",
  "name": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "runConstraints": {
    "timeLimitSeconds": "number | null",
    "budgetMoney": "number | null",
    "maxIterations": "number",
    "maxConcurrentRuns": "number | null"
  },
  "interruptConditions": {
    "stopWhenScoreAbove": "number | null",
    "stopWhenScoreBelow": "number | null",
    "stopWhenNoImprovementForIterations": "number | null",
    "description": "string"
  },
  "dimensions": [
    {
      "key": "string",
      "name": "string",
      "weight": "number",
      "kind": "ai | cost | time | accuracy | custom",
      "config": {}
    }
  ],
  "aggregation": {
    "method": "weighted_sum | min | max",
    "primaryDimension": "string | null"
  }
}
```

---

## 4. 字段说明

### 4.1 顶层

| 字段 | 类型 | 说明 |
|------|------|------|
| `specVersion` | string | 格式版本，如 `"0.1"`。 |
| `id` | string | 本配置唯一标识。 |
| `name` | string | 展示名称（如「省时省钱的平衡型」）。 |
| `createdAt` / `updatedAt` | string (ISO8601) | 创建与最后更新时间。 |
| `runConstraints` | object | 单次/总体运行的资源与次数约束。 |
| `interruptConditions` | object | 进化循环的中断条件（如太好/太差/无进步则停）。 |
| `dimensions` | array | 评估维度列表（AI、钱、时间等）。 |
| `aggregation` | object | 多维度如何合成为单一适应度或排序依据。 |

### 4.2 runConstraints

| 字段 | 类型 | 说明 |
|------|------|------|
| `timeLimitSeconds` | number \| null | 总运行时间上限（秒），null 表示不限制。 |
| `budgetMoney` | number \| null | 金钱/成本预算（单位可约定），null 表示不限制。 |
| `maxIterations` | number | 最大进化迭代次数（循环次数）。 |
| `maxConcurrentRuns` | number \| null | 可选：同时运行的评估任务数上限。 |

### 4.3 interruptConditions

| 字段 | 类型 | 说明 |
|------|------|------|
| `stopWhenScoreAbove` | number \| null | 当综合分 ≥ 该值时提前结束（「太好中断」）。 |
| `stopWhenScoreBelow` | number \| null | 当综合分 ≤ 该值时提前结束（可选策略）。 |
| `stopWhenNoImprovementForIterations` | number \| null | 连续 N 轮无提升则结束。 |
| `description` | string | 可选，人类可读的说明。 |

### 4.4 dimensions[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | 维度键，如 `"ai"`、`"cost"`、`"time"`。 |
| `name` | string | 展示名称。 |
| `weight` | number | 在加权聚合时的权重（≥ 0）。 |
| `kind` | string | `ai` \| `cost` \| `time` \| `accuracy` \| `custom`，用于选用对应计算方式。 |
| `config` | object | 维度相关配置（如 AI 评估的 prompt、cost 的单位）。 |

**kind 简要约定**：

- **ai**：由 LLM 或规则对输出做质量/语义评估，`config` 可含 prompt、模型、阈值。
- **cost**：金钱/ token 费用等，`config` 可含单价、上限。
- **time**：延迟或耗时，`config` 可含单位、上限。
- **accuracy**：准确率/成功率等，`config` 可含目标、采样方式。
- **custom**：自定义计算方式，由实现解析 `config`。

### 4.5 aggregation

| 字段 | 类型 | 说明 |
|------|------|------|
| `method` | string | `weighted_sum` \| `min` \| `max` 等，多维度合成单分的规则。 |
| `primaryDimension` | string \| null | 若按单维排序时使用的维度 key。 |

---

## 5. 与系统其它部分的关系

- **Evolution Engine**：读取 `runConstraints` 与 `interruptConditions`，决定是否继续迭代、何时结束；将每次运行交给 Evaluator 打分。
- **Evaluator 实现**：按 `dimensions` 与 `aggregation` 计算各 Gen 的分数，结果可写回 `.genes` 的 `fitness` 或单独结果存储。
- **Evolant Studio**：提供「选择对应的评估配置」的 UI，加载/保存 `.evaluator`；展示时间、金钱、循环次数与中断条件，并可编辑。

---

## 6. 示例（最小）

```json
{
  "specVersion": "0.1",
  "id": "eval-balanced-01",
  "name": "平衡型（省时省钱+质量）",
  "createdAt": "2025-02-22T00:00:00Z",
  "updatedAt": "2025-02-22T00:00:00Z",
  "runConstraints": {
    "timeLimitSeconds": 3600,
    "budgetMoney": 10.0,
    "maxIterations": 50,
    "maxConcurrentRuns": 2
  },
  "interruptConditions": {
    "stopWhenScoreAbove": 0.95,
    "stopWhenScoreBelow": null,
    "stopWhenNoImprovementForIterations": 5,
    "description": "分数≥0.95 或连续 5 轮无提升则停止"
  },
  "dimensions": [
    {
      "key": "ai",
      "name": "AI 质量",
      "weight": 0.5,
      "kind": "ai",
      "config": {}
    },
    {
      "key": "cost",
      "name": "花费",
      "weight": 0.3,
      "kind": "cost",
      "config": { "invert": true }
    },
    {
      "key": "time",
      "name": "响应时间",
      "weight": 0.2,
      "kind": "time",
      "config": { "invert": true }
    }
  ],
  "aggregation": {
    "method": "weighted_sum",
    "primaryDimension": null
  }
}
```

---

## 7. 可选：评估结果快照

若需将某次运行或某轮迭代的评估结果也持久化在同一格式下，可增加可选字段（或单独 `.evaluator.result.json`）：

```json
{
  "evaluatorId": "string",
  "runId": "string",
  "iteration": "number",
  "at": "ISO8601",
  "genId": "string",
  "scoresByDimension": { "ai": 0.8, "cost": 0.2, "time": 0.9 },
  "aggregateScore": "number"
}
```

是否纳入 `.evaluator` 或单独文件，可由实现决定。

---

本文档随实现推进可增删字段；实现时建议在 `packages/evaluator` 中维护 TypeScript 类型与校验逻辑。
