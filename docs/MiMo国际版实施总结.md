# MiMo 国际版渠道实施总结

> **实施日期**: 2026-06-13  
> **任务**: 新增 Xiaomi MiMO International 渠道类型  
> **目标**: 支持国外版 MiMo 服务 (`https://token-plan-sgp.xiaomimimo.com`)

---

## 📋 实施概要

### 需求背景
用户获得国外捐赠的 MiMo 服务，使用新加坡节点 (`token-plan-sgp.xiaomimimo.com`)，需要在已有国内版 MiMo 渠道的基础上，添加国际版作为独立渠道类型。

### 实施方案
采用**方案1：新增独立渠道类型**，新增 `ChannelTypeMiMoInternational = 59`，与现有 `ChannelTypeMiMo = 58` 并存，复用同一个适配器逻辑。

### 设计理念
- **KISS (Keep It Simple, Stupid)**: 复用现有 mimo 适配器逻辑，仅增加常量声明
- **YAGNI (You Aren't Gonna Need It)**: 不引入复杂的区域选择器或动态配置
- **SOLID - 开放封闭原则**: 扩展新渠道类型，无需修改适配器核心逻辑
- **最佳实践**: 参考 Baidu/BaiduV2、Zhipu/ZhipuV4 的双渠道设计模式

---

## 🔧 技术实施

### 后端修改清单

#### 1. `constant/channel.go`
**改动内容**:
- 新增常量 `ChannelTypeMiMoInternational = 59`
- 添加 BaseURL: `https://token-plan-sgp.xiaomimimo.com` (索引59)
- 添加渠道名称映射: `59: "Xiaomi MiMO International"`

**代码片段**:
```go
ChannelTypeMiMo                = 58
ChannelTypeMiMoInternational   = 59
ChannelTypeDummy               // sentinel

// BaseURLs
"https://token-plan-cn.xiaomimimo.com",      //58
"https://token-plan-sgp.xiaomimimo.com",     //59

// Names
ChannelTypeMiMo:           "Xiaomi MiMO",
ChannelTypeMiMoInternational: "Xiaomi MiMO International",
```

---

#### 2. `constant/api_type.go`
**改动内容**:
- 新增 API 类型 `APITypeMiMoInternational`

**代码片段**:
```go
APITypeMiMo
APITypeMiMoInternational
APITypeDummy
```

---

#### 3. `common/api_type.go`
**改动内容**:
- 添加 ChannelType → APIType 映射

**代码片段**:
```go
case constant.ChannelTypeMiMo:
    apiType = constant.APITypeMiMo
case constant.ChannelTypeMiMoInternational:
    apiType = constant.APITypeMiMoInternational
```

---

#### 4. `relay/relay_adaptor.go`
**改动内容**:
- 将 `APITypeMiMoInternational` 映射到 `mimo.Adaptor{}`（复用）

**代码片段**:
```go
case constant.APITypeMiMo:
    return &mimo.Adaptor{}
case constant.APITypeMiMoInternational:
    return &mimo.Adaptor{}
```

---

#### 5. `common/endpoint_type.go`
**改动内容**:
- 添加国际版到 Anthropic 端点支持列表

**代码片段**:
```go
case constant.ChannelTypeAws:
    fallthrough
case constant.ChannelTypeMiMo:
    fallthrough
case constant.ChannelTypeMiMoInternational:
    fallthrough
case constant.ChannelTypeAnthropic:
    endpointTypes = []constant.EndpointType{
        constant.EndpointTypeAnthropic, 
        constant.EndpointTypeOpenAI
    }
```

---

#### 6. `controller/channel_upstream_update.go`
**改动内容**:
- 添加国际版的模型列表同步逻辑

**代码片段**:
```go
case constant.ChannelTypeMiMo:
    url = fmt.Sprintf("%s/models", mimo.OpenAIBaseURL(baseURL))
case constant.ChannelTypeMiMoInternational:
    url = fmt.Sprintf("%s/models", mimo.OpenAIBaseURL(baseURL))
```

---

### 前端修改清单

#### 7. `web/default/src/features/channels/constants.ts`
**改动内容**:
- 添加渠道类型常量 `59: 'Xiaomi MiMO International'`
- 更新显示顺序数组（在58后插入59）

**代码片段**:
```typescript
export const CHANNEL_TYPES = {
  58: 'Xiaomi MiMO',
  59: 'Xiaomi MiMO International',
} as const

const CHANNEL_TYPE_DISPLAY_ORDER: number[] = [
  1, 14, 33, 24, 43, 58, 59, ...
]
```

---

#### 8. `web/default/src/features/channels/lib/channel-utils.ts`
**改动内容**:
- 添加图标映射 `59: 'XiaomiMiMo'`

**代码片段**:
```typescript
const TYPE_TO_ICON: Record<number, string> = {
  58: 'XiaomiMiMo', // Xiaomi MiMO
  59: 'XiaomiMiMo', // Xiaomi MiMO International
}
```

---

#### 9. `web/default/src/features/channels/lib/channel-type-config.ts`
**改动内容**:
- 添加完整配置对象（ID 59）

**代码片段**:
```typescript
59: {
  id: 59,
  name: CHANNEL_TYPES[59],
  icon: 'xiaomi-mimo',
  defaultBaseUrl: 'https://token-plan-sgp.xiaomimimo.com',
  supportedModels: [
    'mimo-v2.5-pro',
    'mimo-v2.5',
    // ... 其他模型
  ],
  hints: {
    baseUrl: 'Default: https://token-plan-sgp.xiaomimimo.com (OpenAI: /v1, Anthropic: /anthropic)',
    key: 'MiMO Token Plan API Key (International)',
    models: 'mimo-v2.5-pro,mimo-v2.5,...',
  },
}
```

---

## ✅ 验证结果

### 编译验证
- ✅ **后端编译**: 成功 (`go build` 无错误)
- ✅ **前端构建**: 成功 (`bun run build` 无错误)

### 功能验证（需用户实施后测试）
- ⏳ OpenAI 端点测试
- ⏳ Anthropic 端点测试
- ⏳ 模型列表同步测试

---

## 📊 改动统计

| 类型 | 文件数 | 改动行数（估算） |
|------|--------|-----------------|
| 后端 Go 代码 | 6 | +30 |
| 前端 TypeScript | 3 | +45 |
| 文档 | 3 | +500 |
| **总计** | **12** | **~575** |

---

## 📚 交付物清单

### 代码修改
1. ✅ `constant/channel.go` - 渠道常量定义
2. ✅ `constant/api_type.go` - API 类型定义
3. ✅ `common/api_type.go` - 类型映射
4. ✅ `relay/relay_adaptor.go` - 适配器映射
5. ✅ `common/endpoint_type.go` - 端点类型支持
6. ✅ `controller/channel_upstream_update.go` - 模型同步逻辑
7. ✅ `web/default/src/features/channels/constants.ts` - 前端常量
8. ✅ `web/default/src/features/channels/lib/channel-utils.ts` - 前端工具
9. ✅ `web/default/src/features/channels/lib/channel-type-config.ts` - 前端配置

### 文档
1. ✅ `docs/MiMo国际版渠道配置指南.md` - 用户配置手册
2. ✅ `docs/test-mimo-international.ps1` - PowerShell 测试脚本
3. ✅ `docs/MiMo国际版实施总结.md` - 本文档

### 编译产物
1. ✅ `new-api.exe` - 后端可执行文件
2. ✅ `web/default/dist/` - 前端静态资源

---

## 🚀 部署步骤

### 1. 停止服务
```powershell
# 停止现有的 new-api 服务
Stop-Process -Name "new-api" -Force -ErrorAction SilentlyContinue
```

### 2. 备份旧版本
```powershell
Copy-Item new-api.exe new-api.exe.backup
Copy-Item -Recurse web\default\dist web\default\dist.backup
```

### 3. 替换文件
- 替换 `new-api.exe`
- 替换 `web/default/dist/` 目录

### 4. 启动服务
```powershell
.\new-api.exe
```

### 5. 创建国际版渠道
1. 登录 new-api 后台
2. 渠道管理 → 新增渠道
3. 类型选择 `Xiaomi MiMO International`
4. 填写国际版 API Key
5. 保存并测试

### 6. 运行测试脚本
```powershell
.\docs\test-mimo-international.ps1
```

---

## 🔍 兼容性说明

### 向后兼容
- ✅ **现有渠道不受影响**: 国内版 MiMo (ID: 58) 继续正常工作
- ✅ **数据库无需迁移**: 新增渠道类型不影响现有数据
- ✅ **API 端点不变**: 客户端无需修改请求路径

### 数据库支持
- ✅ SQLite
- ✅ MySQL >= 5.7.8
- ✅ PostgreSQL >= 9.6

---

## 📝 后续维护建议

1. **模型列表同步**: 定期检查国内版和国际版的模型列表差异
2. **性能监控**: 对比两个版本的响应延迟和成功率
3. **文档更新**: 如 MiMo 官方有新特性，同步更新配置指南
4. **用户反馈**: 收集国际版用户的使用体验，优化配置

---

## ✨ 亮点总结

1. **零侵入性**: 复用现有适配器，无需修改核心逻辑
2. **高内聚低耦合**: 国内版和国际版完全独立，互不影响
3. **遵循最佳实践**: 参考现有双渠道设计模式（Baidu/BaiduV2）
4. **完整的交付**: 代码 + 文档 + 测试脚本 + 编译产物
5. **快速部署**: 替换文件即可，无需数据库变更

---

**实施人员**: Claude Opus 4.8 (AI Assistant)  
**审核状态**: 待用户验证  
**版本**: v1.0  
**日期**: 2026-06-13
