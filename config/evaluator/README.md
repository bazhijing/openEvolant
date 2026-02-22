# 预设评估器 | Preset Evaluators

本目录为**预设**评估器（随仓库打包）。用户新建的评估器存放在**应用根目录** `config/evaluator/`（如 `openevolant/config/evaluator/`）。API `GET /api/config/evaluators` 合并两者返回，每项带 `source: 'preset' | 'user'`。根目录下无用户 evaluator 时，服务会写入 `example-user.evaluator` 便于测试。

本目录下为**单条件**预设（每文件一个维度），符合 [SPEC_evaluator](../docs/SPEC_evaluator.md)。可被 `.ns` 通过 `evaluatorId` 引用。

## 预设列表

| 文件 | id | 名称 | 类型 | 分数方向（0–100 或归一化 0–1） |
|------|-----|------|------|-------------------------------|
| `preset-ai-quality.evaluator` | preset-ai-quality | AI answer quality (1-5) | ai（LLM 评判） | **越大越好** |
| `preset-ai-screenshot-quality.evaluator` | preset-ai-screenshot-quality | AI website screenshot quality (1-5) | ai（LLM 评判） | **越大越好** |
| `preset-ai-conciseness.evaluator` | preset-ai-conciseness | AI conciseness and usefulness | ai（LLM 评判） | **越大越好** |
| `preset-cost.evaluator` | preset-cost | Cost | cost | **越小越好**（配置中 `higherBetter: false`） |
| `preset-time.evaluator` | preset-time | Total time per Gen | time | **越小越好**（`higherBetter: false`） |
| `preset-accuracy.evaluator` | preset-accuracy | Accuracy / Conformance | accuracy | **越大越好** |

- **越大越好**：质量、准确率、简洁度等，分数高表示更好。
- **越小越好**：成本、耗时等，在实现中会先按上限归一化再取 `1 - ratio`，因此调用方拿到的仍是 0–1 中「越高越好」的分数。

## 使用

- 单条件解析与运行见 `@openevolant/evaluator`：`parseSingleEvaluatorConfig`、`runSingleEvaluator`、`isHigherBetter`。
- AI 类评估器运行需传入 `SingleEvaluatorRunOptions.llmConfig`。
