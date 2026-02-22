# Natural Selection policies (.ns)

本目录为自然选择策略预设，供进化引擎与 Studio 参考。每个 `.ns` 文件对应一种选择策略。

## 预设说明

| 文件 | 说明 |
|------|------|
| **quality-first.ns** | 以质量为主：AI 质量权重 0.85，成本与时间各约 0.08/0.07；`primaryDimension` 为 `ai`，适合优先优化回答质量。 |
| **balanced.ns** | 平衡型：质量 0.5、成本 0.3、时间 0.2，兼顾质量与资源；适合默认或资源敏感场景。 |

评估器引用使用 `config/evaluator/` 下预设的 `id`（如 `preset-ai-quality`、`preset-cost`、`preset-time`）。格式见 [SPEC_ns](../../docs/SPEC_ns.md)。
