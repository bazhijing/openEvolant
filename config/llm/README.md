# LLM 配置说明

## supported-vendors-models.json

用于定义**支持的供应商与模型**列表，以及各模型的**计费与上下文**信息（供计费、预算或展示使用，与前端展示解耦）。

### 顶层字段

| 字段 | 说明 |
|------|------|
| `cnyPerUsd` | 人民币兑美元参考汇率（1 USD = 多少 CNY），用于将人民币价格换算为美元，可按需更新。 |
| `cnyPerUsdNote` | 可选，汇率说明。 |
| `vendors` | 供应商数组。 |

### 供应商与模型结构

- **vendor**: `id`, `name`, `models[]`
- **model**:
  - `id`, `name`: 模型标识与显示名。
  - `billingUnit`: 计费单位，如 `"1M tokens"`。
  - `pricing`: 价格（人民币与美元，按计费单位）  
    - `inputCnyCacheHit`: 输入价格（缓存命中），元/单位  
    - `inputCnyCacheMiss`: 输入价格（缓存未命中），元/单位  
    - `outputCny`: 输出价格，元/单位  
    - `inputUsdCacheHit`, `inputUsdCacheMiss`, `outputUsd`: 按 `cnyPerUsd` 换算的美元价，便于统一计费。
  - `contextLength`: 模型上下文长度（tokens）。

### 美元换算

- 换算公式：`USD = CNY / cnyPerUsd`（例如 `cnyPerUsd: 7.25` 时，￥0.70 ≈ $0.097）。
- 更新汇率时，可重算并更新各模型 `pricing` 中的 `*Usd*` 字段，或由下游按 `cnyPerUsd` 自行换算。

### 示例（kimi-k2.5）

- 计费单位：1M tokens  
- 输入（缓存命中）：￥0.70 / 1M tokens  
- 输入（缓存未命中）：￥4.00 / 1M tokens  
- 输出：￥21.00 / 1M tokens  
- 上下文长度：262,144 tokens  

---

## example.llm.json / default.llm.json

用户实际使用的 LLM 配置（API Key、模型选用等），见 API 与 Studio 设置页。
