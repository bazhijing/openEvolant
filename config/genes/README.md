# 预设 Genes | Preset Genes

本目录为**预设**基因池（随仓库打包），符合 [SPEC_genes](../docs/SPEC_genes.md)。用户创建或进化产生的 `.genes` 存放在**应用根目录**下的 `data/genes/` 或 `genes/`（如 `openevolant/data/genes/`、`openevolant/genes/`）。

## 预设列表

| 文件 | id | 说明 |
|------|-----|------|
| `preset.genes` | preset-default | 默认预设：单一种子 Gen、通用任务意图，供首次运行或复制到运行时目录作为起点。 |

## 使用

- 首次运行或初始化时，可将 `preset.genes` 复制到 `openevolant/data/genes/` 或 `openevolant/genes/` 作为初始基因池。
- 进化引擎、Studio 进化管理页等会从运行时目录读写 `.genes`，本目录仅作示例与预设，不参与运行时读写。
