# .evaluator 文件设计 | Evaluator File Specification

本系统原创格式，用于持久化**单条件评估器**：定义**一个**打分维度及其实现方式（kind + config，如 prompt、模型、阈值）。不包含权重、运行约束或聚合；这些由引用该评估器的 `.ns`（自然选择）配置定义。同一 `.evaluator` 可被多个 `.ns` 复用。

---

## 1. 用途与定位（英文）

- **Carrier**: One scoring dimension and how it is implemented (one condition).
- **Contains**: `id`, `name`, `kind` (ai | cost | time | accuracy | custom), `config` (prompt, model, thresholds, etc.). No weights, run constraints, interrupt conditions, or aggregation.
- **Usage**: Referenced by `.ns` files via `evaluatorId`; Evolution Engine loads the evaluator, runs it to get a per-dimension score, then the Natural Selection config applies weights and aggregation.

---

## 1. 用途与定位（中文）

- **载体**：一个打分维度及其实现方式（一个条件）。
- **包含**：`id`、`name`、`kind`（ai | cost | time | accuracy | custom）、`config`（prompt、模型、阈值等）。不包含权重、运行约束、中断条件或聚合。
- **使用方式**：由 `.ns` 文件通过 `evaluatorId` 引用；进化引擎加载该评估器、运行得到该维度分数，再由自然选择配置应用权重与聚合。

---

## 2. 格式约定

- **Extension**: `.evaluator`
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
  "kind": "ai | cost | time | accuracy | custom",
  "config": {}
}
```

---

## 4. 字段说明

### 4.1 顶层

| 字段 | 类型 | 说明 |
|------|------|------|
| `specVersion` | string | 格式版本，如 `"0.1"`。 |
| `id` | string | 本评估器唯一标识（被 `.ns` 的 evaluatorRefs 引用）。 |
| `name` | string | 展示名称。 |
| `createdAt` / `updatedAt` | string (ISO8601) | 创建与最后更新时间。 |
| `kind` | string | 计算方式类型。 |
| `config` | object | 该 kind 下的全部实现参数（见下）。 |

### 4.2 kind 与 config 约定

| kind | 说明 | config 常见字段 |
|------|------|-----------------|
| **ai** | LLM 或规则对输出做质量/语义评估 | `prompt`, `model`, `temperature`, `outputFormat`, `min`, `max`, `normalizeToZeroOne`, 阈值等。 |
| **cost** | 金钱/ token 费用等 | 单价、上限、`invert` 等。 |
| **time** | 延迟或耗时 | 单位、上限、`invert` 等。 |
| **accuracy** | 准确率/成功率等 | 目标指标、采样方式等。 |
| **custom** | 自定义计算方式 | 由实现解析。 |

---

## 5. 与系统其它部分的关系

- **Natural Selection（.ns）**: 通过 `evaluatorRefs[].evaluatorId` 引用本评估器，并指定 key、weight；不包含本文件中的 prompt/config。
- **Evolution Engine**: 根据 `.ns` 的 evaluatorRefs 加载对应 `.evaluator`，按 kind + config 执行打分，得到各维度分数后由 `.ns` 的 aggregation 合成适应度。
- **Evolant Studio**: 提供「评估器」列表与编辑 UI（单条件：id、name、kind、config）；「自然选择」UI 管理 `.ns` 与 evaluatorRefs。

---

## 6. 示例

```json
{
  "specVersion": "0.1",
  "id": "eval-ai-quality-01",
  "name": "AI quality (1–5 rubric)",
  "createdAt": "2025-02-22T00:00:00Z",
  "updatedAt": "2025-02-22T00:00:00Z",
  "kind": "ai",
  "config": {
    "prompt": "Rate the response quality from 1 to 5...",
    "model": "gpt-4o-mini",
    "temperature": 0,
    "outputFormat": "number",
    "min": 1,
    "max": 5,
    "normalizeToZeroOne": true
  }
}
```

```json
{
  "specVersion": "0.1",
  "id": "eval-cost-01",
  "name": "Cost (token budget)",
  "createdAt": "2025-02-22T00:00:00Z",
  "updatedAt": "2025-02-22T00:00:00Z",
  "kind": "cost",
  "config": {
    "unit": "usd",
    "cap": 0.01,
    "invert": true
  }
}
```

---

## 7. 可选：评估结果快照

若需将某次运行或某轮迭代的**单维度**评估结果持久化，可单独存储（如 `.evaluator.result.json` 或统一结果文件中的 per-evaluator 条目）：

```json
{
  "evaluatorId": "string",
  "runId": "string",
  "iteration": "number",
  "at": "ISO8601",
  "genId": "string",
  "score": "number"
}
```

综合分与多维度汇总由 `.ns` 与进化引擎产出，可与 `.genes` 或单独结果存储对齐。

---

实现时建议在 `packages/evaluator` 中维护 TypeScript 类型与校验逻辑。
