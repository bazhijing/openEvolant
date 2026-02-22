# LLM Config File Specification

Configuration format for listing available LLM models and their connection settings (API keys, base URLs). Used by Studio settings and `@openevolant/llm` to create clients.

---

## 1. Purpose

- **Scope**: Which models are available and how to connect (provider, model id, token/base URL).
- **Usage**: Loaded by the app or Studio; user selects a model and the runtime uses the matching credentials (from this file or environment).
- **Secrets**: Prefer environment variables for API keys; config may reference them (e.g. `"apiKey": "${KIMI_API_KEY}"`).

---

## 2. Format

- **Extension**: `.llm` or `.llm.json`
- **Serialization**: JSON
- **Encoding**: UTF-8
- **Version**: Include `specVersion` in the file for compatibility.

---

## 3. File Structure (draft)

```json
{
  "specVersion": "0.1",
  "id": "string",
  "name": "string",
  "models": [
    {
      "id": "string",
      "provider": "string",
      "model": "string",
      "apiKey": "string | ${ENV_VAR}",
      "baseURL": "string | null"
    }
  ]
}
```

---

## 4. Field Reference

### 4.1 Top level

| Field | Type | Description |
|-------|------|-------------|
| `specVersion` | string | Schema version, e.g. `"0.1"`. |
| `id` | string | Unique id for this config set. |
| `name` | string | Display name (e.g. "Default LLM config"). |
| `models` | array | List of model entries (provider, model, apiKey, baseURL). |

### 4.2 models[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique id for this model in the list (e.g. `kimi-k2`). |
| `provider` | string | Provider name (e.g. `kimi`, `openai`). |
| `model` | string | Model identifier (e.g. `k2`, `gpt-4`). |
| `apiKey` | string | API key or env reference like `"${KIMI_API_KEY}"`. |
| `baseURL` | string \| null | Optional base URL for the API. |

---

## 5. Relation to @openevolant/llm

Each entry in `models` maps to `LLMConfig` in `packages/llm`:

- `provider` → `LLMConfig.provider`
- `model` → `LLMConfig.model`
- `apiKey` → `LLMConfig.apiKey` (after resolving env vars if needed)
- `baseURL` → `LLMConfig.baseURL`

---

# LLM 配置文件规范

用于列出可用大模型及其连接方式（API Key、Base URL）的配置格式，供 Studio 设置页与 `@openevolant/llm` 创建客户端时使用。

---

## 1. 用途与定位

- **范围**：记录有哪些模型可用，以及如何连接（厂商、模型 id、token/base URL）。
- **使用**：由应用或 Studio 加载；用户选择模型后，运行时使用对应连接信息（来自本文件或环境变量）。
- **敏感信息**：API Key 建议用环境变量，配置中可引用（如 `"apiKey": "${KIMI_API_KEY}"`）。

---

## 2. 格式约定

- **扩展名**：`.llm` 或 `.llm.json`
- **序列化**：JSON
- **编码**：UTF-8
- **版本**：文件内带 `specVersion`，便于兼容。

---

## 3. 文件结构（草案）

```json
{
  "specVersion": "0.1",
  "id": "string",
  "name": "string",
  "models": [
    {
      "id": "string",
      "provider": "string",
      "model": "string",
      "apiKey": "string | ${ENV_VAR}",
      "baseURL": "string | null"
    }
  ]
}
```

---

## 4. 字段说明

### 4.1 顶层

| 字段 | 类型 | 说明 |
|------|------|------|
| `specVersion` | string | 格式版本，如 `"0.1"`。 |
| `id` | string | 本配置集的唯一标识。 |
| `name` | string | 展示名称（如「默认 LLM 配置」）。 |
| `models` | array | 模型列表（provider、model、apiKey、baseURL）。 |

### 4.2 models[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 该模型在列表中的唯一 id（如 `kimi-k2`）。 |
| `provider` | string | 厂商名（如 `kimi`、`openai`）。 |
| `model` | string | 模型标识（如 `k2`、`gpt-4`）。 |
| `apiKey` | string | API Key 或环境变量引用，如 `"${KIMI_API_KEY}"`。 |
| `baseURL` | string \| null | 可选，API 的 base URL。 |

---

## 5. 与 @openevolant/llm 的对应关系

`models` 中每一项对应 `packages/llm` 中的 `LLMConfig`：

- `provider` → `LLMConfig.provider`
- `model` → `LLMConfig.model`
- `apiKey` → `LLMConfig.apiKey`（需解析环境变量时在运行时解析）
- `baseURL` → `LLMConfig.baseURL`
