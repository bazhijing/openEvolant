# .ns 文件设计 | Natural Selection File Specification

本系统原创格式，用于持久化**自然选择配置**：定义「用哪些条件、参数多少」——运行约束、中断条件、评估器引用（id + key + weight）与聚合方式。驱动进化循环的启停与多维度综合分的计算。

---

## 1. 用途与定位（英文）

- **Carrier**: Configuration of the *combination* of conditions: which evaluators are used, their weights, run/interrupt constraints, and how scores are aggregated.
- **Usage**: User selects a Natural Selection config in the Web GUI; Evolution Engine reads run constraints and interrupt conditions, resolves evaluator refs to `.evaluator` configs, runs each evaluator to get per-dimension scores, then applies weights and aggregation to produce fitness. One `.ns` file = one selection policy.
- **Does not contain**: Prompt, model, or other “how to compute” details for each dimension; those live in the referenced `.evaluator` files.

---

## 1. 用途与定位（中文）

- **载体**：条件的*组合*配置：用了哪些评估器、权重多少、运行/中断约束、以及分数如何聚合。
- **使用方式**：用户在 Web GUI 中选择一个自然选择配置；进化引擎读取运行约束与中断条件，根据 evaluatorRefs 解析出 `.evaluator` 配置，运行各评估器得到各维度分数，再按权重与聚合得到适应度。一个 `.ns` 文件对应一种选择策略。
- **不包含**：各维度的 prompt、模型等「如何计算」的细节；这些在引用的 `.evaluator` 文件中。

---

## 2. 格式约定

- **Extension**: `.ns` (Natural Selection)
- **Serialization**: JSON (TypeScript-friendly).
- **Encoding**: UTF-8.
- **Version**: `specVersion` in file for compatibility.

---

## 3. 文件结构

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
  "evaluatorRefs": [
    { "evaluatorId": "string", "key": "string", "weight": "number" }
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
| `name` | string | 展示名称（如「平衡型（省时省钱+质量）」）。 |
| `createdAt` / `updatedAt` | string (ISO8601) | 创建与最后更新时间。 |
| `runConstraints` | object | 单次/总体运行的资源与次数约束。 |
| `interruptConditions` | object | 进化循环的中断条件。 |
| `evaluatorRefs` | array | 评估器引用列表：evaluatorId、key、weight。 |
| `aggregation` | object | 多维度如何合成为单一适应度。 |

### 4.2 runConstraints

| 字段 | 类型 | 说明 |
|------|------|------|
| `timeLimitSeconds` | number \| null | 总运行时间上限（秒），null 表示不限制。 |
| `budgetMoney` | number \| null | 金钱/成本预算，null 表示不限制。 |
| `maxIterations` | number | 最大进化迭代次数。 |
| `maxConcurrentRuns` | number \| null | 同时运行的评估任务数上限。 |

### 4.3 interruptConditions

| 字段 | 类型 | 说明 |
|------|------|------|
| `stopWhenScoreAbove` | number \| null | 当综合分 ≥ 该值时提前结束。 |
| `stopWhenScoreBelow` | number \| null | 当综合分 ≤ 该值时提前结束。 |
| `stopWhenNoImprovementForIterations` | number \| null | 连续 N 轮无提升则结束。 |
| `description` | string | 可选，人类可读的说明。 |

### 4.4 evaluatorRefs[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `evaluatorId` | string | 引用的 `.evaluator` 配置的 `id`。 |
| `key` | string | 该维度在聚合与分数对象中的键（如 `"ai"`、`"cost"`、`"time"`）。 |
| `weight` | number | 在加权聚合时的权重（≥ 0）。 |

### 4.5 aggregation

| 字段 | 类型 | 说明 |
|------|------|------|
| `method` | string | `weighted_sum` \| `min` \| `max`，多维度合成单分的规则。 |
| `primaryDimension` | string \| null | 若按单维排序时使用的 key。 |

---

## 5. 与系统其它部分的关系

- **Evolution Engine**: 读取 `.ns` 的 runConstraints 与 interruptConditions，决定是否继续迭代、何时结束；根据 evaluatorRefs 解析 `.evaluator`，对每次运行按各评估器打分，再按权重与 aggregation 得到综合分。
- **Evaluator（单条件）**: 每个 evaluatorRef 指向一个 `.evaluator` 文件，定义该维度的 kind 与 config（prompt、模型等）；同一 `.evaluator` 可被多个 `.ns` 引用。
- **Evolant Studio**: 提供「自然选择」与「评估器」的 UI：加载/保存 `.ns` 与 `.evaluator`，展示运行约束、中断条件、评估器引用与聚合。

---

## 6. 示例

```json
{
  "specVersion": "0.1",
  "id": "ns-balanced-01",
  "name": "Balanced (time, cost, quality)",
  "createdAt": "2025-02-22T00:00:00Z",
  "updatedAt": "2025-02-22T00:00:00Z",
  "runConstraints": {
    "timeLimitSeconds": 3600,
    "budgetMoney": 10,
    "maxIterations": 50,
    "maxConcurrentRuns": 2
  },
  "interruptConditions": {
    "stopWhenScoreAbove": 0.95,
    "stopWhenScoreBelow": null,
    "stopWhenNoImprovementForIterations": 5,
    "description": "Stop when score ≥ 0.95 or no improvement for 5 rounds"
  },
  "evaluatorRefs": [
    { "evaluatorId": "eval-ai-quality-01", "key": "ai", "weight": 0.5 },
    { "evaluatorId": "eval-cost-01", "key": "cost", "weight": 0.3 },
    { "evaluatorId": "eval-latency-01", "key": "time", "weight": 0.2 }
  ],
  "aggregation": {
    "method": "weighted_sum",
    "primaryDimension": null
  }
}
```

---

实现时建议在 `packages/evaluator`（或独立 `packages/natural-selection`）中维护 `.ns` 的 TypeScript 类型与校验逻辑。
