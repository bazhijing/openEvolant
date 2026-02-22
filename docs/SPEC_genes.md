# .genes 文件设计 | Genes File Specification

本系统原创格式，用于持久化**基因池**与**进化过程**：记录种群中的基因、每次迭代信息、变异与重组历史，并与任务意图、Skill 关联。便于追溯、复现与导出为 Skills。

---

## 1. 用途与定位

- **载体**：进化过程与基因池的持久化。
- **关联**：与「任务意图」对应；任务意图可绑定一个新 Skill 或已安装 Skill，开始生成/更新 `.genes`。
- **产出**：每次迭代写入当前种群与历史；优良基因可导出为 Skill（如 Apex Skills / SKILL.md）。

---

## 2. 格式约定

- **扩展名**：`.genes`
- **推荐序列化**：JSON（便于工具链与 TypeScript 解析），可选 YAML 以提升可读性。
- **编码**：UTF-8。
- **版本**：文件内带 `version` 或 `specVersion`，便于后续兼容。

---

## 3. 文件结构（草案）

```json
{
  "specVersion": "0.1",
  "id": "uuid-or-slug",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "taskIntent": {
    "id": "string",
    "name": "string",
    "skillId": "string | null",
    "skillSource": "new | installed"
  },
  "population": [
    {
      "genId": "string",
      "version": "number",
      "fitness": "number | null",
      "content": {
        "promptFragments": ["string"],
        "decisionSequence": [],
        "toolCallPreference": {},
        "metadata": {}
      },
      "parentIds": ["string"],
      "origin": "seed | mutation | crossover",
      "createdAt": "ISO8601"
    }
  ],
  "currentBestGenId": "string | null",
  "history": [
    {
      "iteration": "number",
      "at": "ISO8601",
      "event": "init | mutation | crossover | selection",
      "genIds": ["string"],
      "scores": {},
      "summary": "string"
    }
  ]
}
```

---

## 4. 字段说明

### 4.1 顶层

| 字段 | 类型 | 说明 |
|------|------|------|
| `specVersion` | string | 格式版本，如 `"0.1"`，用于解析兼容。 |
| `id` | string | 本 `.genes` 唯一标识（UUID 或业务 slug）。 |
| `createdAt` / `updatedAt` | string (ISO8601) | 创建与最后更新时间。 |
| `taskIntent` | object | 关联的任务意图与 Skill。 |
| `population` | array | 当前种群，每项为一个 Gen。 |
| `currentBestGenId` | string \| null | 当前最优 Gen 的 `genId`，供 Dispatcher / Agent Runner 使用。 |
| `history` | array | 进化历史：每轮迭代、变异/重组/选择事件及涉及基因、得分摘要。 |

### 4.2 taskIntent

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务意图 ID。 |
| `name` | string | 任务意图名称（可展示）。 |
| `skillId` | string \| null | 绑定的 Skill ID（新建或已安装）。 |
| `skillSource` | `"new"` \| `"installed"` | 对应新生成的 Skill 或已有安装 Skill。 |

### 4.3 population[]（单个 Gen）

| 字段 | 类型 | 说明 |
|------|------|------|
| `genId` | string | 该基因唯一 ID。 |
| `version` | number | 同一逻辑的版本号（变异/重组后递增或新 id）。 |
| `fitness` | number \| null | 最近一次评估的适应度，未评估可为 null。 |
| `content` | object | 可遗传、可变异的内容（见下）。 |
| `parentIds` | string[] | 父代 genId 列表；种子为空，变异为单元素，重组为多元素。 |
| `origin` | `"seed"` \| `"mutation"` \| `"crossover"` | 来源。 |
| `createdAt` | string (ISO8601) | 该 Gen 生成时间。 |

### 4.4 content（可进化逻辑）

| 字段 | 类型 | 说明 |
|------|------|------|
| `promptFragments` | string[] | 组成 system prompt 的片段，顺序可进化。 |
| `decisionSequence` | array | 决策序列（结构可后续细化：如步骤、分支）。 |
| `toolCallPreference` | object | 工具/技能调用偏好（如优先级、条件）。 |
| `metadata` | object | 其它可进化或不可进化的元数据。 |

### 4.5 history[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `iteration` | number | 迭代轮次。 |
| `at` | string (ISO8601) | 发生时间。 |
| `event` | string | `init` \| `mutation` \| `crossover` \| `selection`。 |
| `genIds` | string[] | 本事件涉及的 genId。 |
| `scores` | object | 本轮相关得分摘要（可与 Natural Selection + Evaluator 输出对齐）。 |
| `summary` | string | 可选文字摘要，便于人工查看。 |

---

## 5. 与系统其它部分的关系

- **Evolution Engine**：读取 `population` 与 `history`，执行选择/变异/重组后写回 `population` 并追加 `history`。
- **Natural Selection（.ns）+ Evaluator（.evaluator）**：按 `.ns` 引用的各 `.evaluator` 对 `population` 中 Gen 打分，结果可写回各 Gen 的 `fitness` 或仅用于内存中的选择，再由 Evolution Engine 持久化。
- **Dispatcher / Agent Runner**：根据 `currentBestGenId` 取对应 Gen 的 `content`，驱动 Prompt 构建与工具/Skills 编排。
- **Evolant Studio**：展示/编辑 `population`、`history`，管理 `taskIntent`，导出为 Skill（如生成 SKILL.md 或平台 Skill 包）。

---

## 6. 示例（最小）

```json
{
  "specVersion": "0.1",
  "id": "task-weather-001",
  "createdAt": "2025-02-22T00:00:00Z",
  "updatedAt": "2025-02-22T01:00:00Z",
  "taskIntent": {
    "id": "intent-1",
    "name": "天气查询助手",
    "skillId": "skill-weather-v1",
    "skillSource": "new"
  },
  "population": [
    {
      "genId": "gen-seed-1",
      "version": 1,
      "fitness": 0.72,
      "content": {
        "promptFragments": ["你是一个天气助手。", "请先确认用户所在城市再查天气。"],
        "decisionSequence": [],
        "toolCallPreference": {},
        "metadata": {}
      },
      "parentIds": [],
      "origin": "seed",
      "createdAt": "2025-02-22T00:00:00Z"
    }
  ],
  "currentBestGenId": "gen-seed-1",
  "history": [
    {
      "iteration": 0,
      "at": "2025-02-22T00:00:00Z",
      "event": "init",
      "genIds": ["gen-seed-1"],
      "scores": {},
      "summary": "种子种群初始化"
    }
  ]
}
```

---

本文档随实现推进可增删字段；实现时建议在 `packages/genes` 中维护 TypeScript 类型与读写逻辑。
