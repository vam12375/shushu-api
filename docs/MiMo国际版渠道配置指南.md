# Xiaomi MiMO 国际版渠道配置指南

> 版本：v1.0
> 生成日期：2026-06-13
> 适用于：new-api 新增的 Xiaomi MiMO International 渠道类型

---

## 📋 背景

为了支持国外版 MiMo 服务（`https://token-plan-sgp.xiaomimimo.com`），本次更新新增了独立的渠道类型 **Xiaomi MiMO International (ID: 59)**，与现有的国内版 **Xiaomi MiMO (ID: 58)** 并存。

两个渠道使用相同的适配器逻辑，仅 BaseURL 不同。

---

## 🎯 渠道对比

| 项目 | 国内版 (ID: 58) | 国际版 (ID: 59) |
|------|----------------|----------------|
| **渠道名称** | Xiaomi MiMO | Xiaomi MiMO International |
| **默认 BaseURL** | `https://token-plan-cn.xiaomimimo.com` | `https://token-plan-sgp.xiaomimimo.com` |
| **支持的端点** | OpenAI (`/v1`), Anthropic (`/anthropic`) | OpenAI (`/v1`), Anthropic (`/anthropic`) |
| **模型列表** | mimo-v2.5-pro, mimo-v2.5, mimo-v2-pro, mimo-v2-omni 等 | 相同 |
| **适配器逻辑** | 复用 `relay/channel/mimo/adaptor.go` | 相同 |

---

## 🚀 配置步骤

### 1. 在 new-api 后台创建渠道

1. 登录 new-api 管理后台
2. 导航到 **渠道管理** → **新增渠道**
3. **渠道类型** 选择：`Xiaomi MiMO International`
4. **基础 URL**：自动填充为 `https://token-plan-sgp.xiaomimimo.com`（可自定义）
5. **API 密钥**：填入国际版 MiMo 的 API Key
6. **模型列表**：根据需要选择或自定义
   - 常用模型：`mimo-v2.5-pro`（主力）、`mimo-v2.5`（快速）
7. 保存渠道

---

### 2. 路径自动转换规则

系统会根据请求类型自动转换路径：

| 请求类型 | 原始请求路径 | 转换后的完整 URL |
|---------|-------------|-----------------|
| **OpenAI API** | `/v1/chat/completions` | `https://token-plan-sgp.xiaomimimo.com/v1/chat/completions` |
| **Anthropic API** | `/v1/messages` | `https://token-plan-sgp.xiaomimimo.com/anthropic/v1/messages` |

> 📝 **注意**：BaseURL 填写时**不要**带路径后缀（如 `/v1` 或 `/anthropic`），系统会根据适配器自动添加。

---

## 🧪 验证测试

### 测试 1：OpenAI 端点测试

```bash
curl -X POST https://你的new-api地址/v1/chat/completions \
  -H "Authorization: Bearer sk-你的new-api令牌" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 100
  }'
```

**预期结果**：返回 MiMo 的聊天响应

---

### 测试 2：Anthropic 端点测试

```bash
curl -X POST https://你的new-api地址/v1/messages \
  -H "Authorization: Bearer sk-你的new-api令牌" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**预期结果**：返回 Anthropic 格式的响应

---

### 测试 3：模型列表同步

1. 进入渠道管理，找到刚创建的国际版渠道
2. 点击 **同步模型** 按钮
3. 检查是否成功拉取到 MiMo 的模型列表

**预期结果**：模型列表包含 `mimo-v2.5-pro`, `mimo-v2.5` 等

---

## 🔧 技术实现

### 后端修改

1. **constant/channel.go**
   - 新增 `ChannelTypeMiMoInternational = 59`
   - 添加 BaseURL: `https://token-plan-sgp.xiaomimimo.com`
   - 添加渠道名称映射

2. **constant/api_type.go**
   - 新增 `APITypeMiMoInternational`

3. **common/api_type.go**
   - 添加 `ChannelTypeMiMoInternational` → `APITypeMiMoInternational` 映射

4. **relay/relay_adaptor.go**
   - 将 `APITypeMiMoInternational` 映射到 `mimo.Adaptor{}`（复用）

5. **common/endpoint_type.go**
   - 添加国际版到 Anthropic 端点支持列表

6. **controller/channel_upstream_update.go**
   - 添加国际版的模型列表同步逻辑

### 前端修改

1. **constants.ts**
   - 添加渠道类型 `59: 'Xiaomi MiMO International'`
   - 更新显示顺序

2. **channel-utils.ts**
   - 添加图标映射 `59: 'XiaomiMiMo'`

3. **channel-type-config.ts**
   - 添加完整配置（默认 BaseURL、模型列表、提示信息）

---

## 📝 注意事项

1. **API Key 隔离**：国内版和国际版使用各自独立的 API Key，互不通用
2. **模型可用性**：两个版本支持的模型列表可能略有差异，请以实际同步结果为准
3. **网络延迟**：国际版服务器在新加坡（SGP），国内访问可能有延迟
4. **现有渠道**：如果您之前手动配置了国际版（通过填写 SGP 的 BaseURL），建议迁移到新的渠道类型以获得更好的管理体验

---

## ❓ 常见问题

### Q1: 为什么要新增独立渠道类型，而不是用区域选择器？

**A**: 独立渠道类型有以下优势：
- ✅ 用户体验更直观（下拉即可区分）
- ✅ 渠道管理更清晰（国内/国际分开管理）
- ✅ 符合现有设计模式（参考 Baidu/BaiduV2、Zhipu/ZhipuV4）
- ✅ 无需数据库迁移（不影响现有渠道）

### Q2: 现有的国内版渠道会受影响吗？

**A**: 完全不会。现有的 `Xiaomi MiMO (ID: 58)` 渠道继续正常工作，新增的国际版是独立的渠道类型。

### Q3: 两个版本的适配器逻辑一样吗？

**A**: 是的。两者复用同一个适配器 `relay/channel/mimo/adaptor.go`，仅 BaseURL 不同。

### Q4: 能否在同一个 new-api 实例中同时使用两个版本？

**A**: 可以！您可以同时创建国内版和国际版渠道，系统会根据渠道类型自动路由到对应的 BaseURL。

---

## 📚 相关文档

- [MiMo 国内版配置（Claude Code 接入）](./ClaudeCode接入new-api-MiMo配置指南.md)
- [new-api 渠道管理文档](../README.md)

---

**变更日期**: 2026-06-13  
**版本**: v1.0  
**维护者**: QuantumNous
