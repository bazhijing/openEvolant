# 预设评估器 | Preset Evaluators

本目录下为**单条件**评估器预设（每文件一个维度），符合 [SPEC_evaluator](../docs/SPEC_evaluator.md)。可被 `.ns` 通过 `evaluatorId` 引用。

## 预设列表

| 文件 | id | 名称 | 类型 | 分数方向（0–100 或归一化 0–1） |
|------|-----|------|------|-------------------------------|
| `preset-ai-quality.evaluator.json` | preset-ai-quality | AI 回答质量（1-5 分） | ai（LLM 评判） | **越大越好** |
| `preset-ai-conciseness.evaluator.json` | preset-ai-conciseness | AI 简洁度与有用性 | ai（LLM 评判） | **越大越好** |
| `preset-cost.evaluator.json` | preset-cost | 花费（成本） | cost | **越小越好**（配置中 `higherBetter: false`） |
| `preset-time.evaluator.json` | preset-time | 响应时间 | time | **越小越好**（`higherBetter: false`） |
| `preset-accuracy.evaluator.json` | preset-accuracy | 准确率/符合度 | accuracy | **越大越好** |

- **越大越好**：质量、准确率、简洁度等，分数高表示更好。
- **越小越好**：成本、耗时等，在实现中会先按上限归一化再取 `1 - ratio`，因此调用方拿到的仍是 0–1 中「越高越好」的分数。

## 使用

- 单条件解析与运行见 `@openevolant/evaluator`：`parseSingleEvaluatorConfig`、`runSingleEvaluator`、`isHigherBetter`。
- AI 类评估器运行需传入 `SingleEvaluatorRunOptions.llmConfig`。
