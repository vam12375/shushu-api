# IP 守卫提醒机制 - 实施文档

> **实施日期**: 2026-06-09  
> **版本**: v1.0  
> **类型**: 主动预警型（方案B）

---

## 一、功能概述

在原有 IP 守卫机制（被动拦截）的基础上，新增**主动预警功能**，为用户提供实时的 IP 使用状态监控，避免因不知情而触发令牌禁用或账号封禁。

### 核心改进

| 改进点 | 改进前 | 改进后 |
|--------|--------|--------|
| 用户感知时机 | ❌ 触发后才知道（事后通知） | ✅ 实时显示状态（主动预警） |
| 错误提示 | ❌ 硬编码中文，无国际化 | ✅ 完整 i18n 支持（中/英） |
| 用户操作指引 | ❌ 仅提示错误，无操作引导 | ✅ 可视化状态 + 进度条 + 操作建议 |
| 透明度 | ❌ 黑盒机制，用户不了解规则 | ✅ 显示阈值、窗口时间、strike 计数 |

---

## 二、技术实现

### 2.1 后端实现

#### **新增 API 端点**

```
GET /api/user/ip-guard-status
```

**权限**: 需要用户登录（UserAuth 中间件）

**响应格式**:
```json
{
  "success": true,
  "data": {
    "current_ips": 2,           // 当前窗口内的 IP 数
    "threshold": 3,              // 触发禁用的阈值
    "strike_count": 1,           // 当前 strike 累计
    "strike_threshold": 3,       // 触发封禁的阈值
    "status": "warning",         // normal/warning/danger
    "window_minutes": 30,        // IP 滑动窗口（分钟）
    "strike_window_hours": 24    // strike 滑动窗口（小时）
  }
}
```

#### **代码变更清单**

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `i18n/keys.go` | 新增 | 6 个 IP Guard 相关 i18n 常量 |
| `i18n/locales/zh-CN.yaml` | 新增 | 中文翻译（6 条） |
| `i18n/locales/en.yaml` | 新增 | 英文翻译（6 条） |
| `service/ip_guard.go` | 扩展 | 新增 `GetIPGuardStatus()` 函数及辅助函数 |
| `controller/user.go` | 新增 | `GetIPGuardStatus()` 控制器 |
| `router/api-router.go` | 修改 | 注册新路由 `/api/user/ip-guard-status` |
| `middleware/auth.go` | 修改 | 硬编码中文替换为 i18n 键值 |

#### **核心逻辑**

```go
// GetIPGuardStatus 获取指定用户的 IP 守卫状态
func GetIPGuardStatus(userId int) (*IPGuardStatus, error) {
    // 1. 获取当前窗口内的 IP 数（Redis 优先，内存兜底）
    currentIPs := getIPCount(userId, now)
    
    // 2. 获取当前 strike 计数
    strikeCount := getStrikeCount(userId, now)
    
    // 3. 计算状态等级
    status := "normal"
    if currentIPs >= threshold { 
        status = "danger" 
    } else if currentIPs >= threshold - 1 { 
        status = "warning" 
    }
    
    return &IPGuardStatus{...}
}
```

---

### 2.2 前端实现

#### **新增组件**

**文件**: `web/default/src/features/tokens/components/ip-guard-status-card.tsx`

**功能**:
- 调用 `/api/user/ip-guard-status` API
- 根据状态显示不同颜色卡片：
  - 🟢 **正常** (normal): 绿色
  - 🟠 **警告** (warning): 橙色
  - 🔴 **危险** (danger): 红色
- 显示 IP 数量进度条
- 显示 strike 历史计数
- 提供操作提示（危险状态时）

**组件截图（伪代码示意）**:
```
┌─────────────────────────────────────────┐
│ 🛡️ IP Guard Protection         [正常]   │
├─────────────────────────────────────────┤
│ 当前状态: 2 个 IP / 阈值 3              │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░ 66%                  │
│                                         │
│ 触发历史: 24 小时内 1 次触发            │
│                                         │
│ ⚠️ 当在 30 分钟内检测到 3 个不同 IP     │
│   时，您的令牌将被自动禁用。            │
└─────────────────────────────────────────┘
```

#### **集成位置**

**文件**: `web/default/src/features/keys/index.tsx`

在 API Keys 表格**上方**添加 IP 守卫状态卡片：

```tsx
<SectionPageLayout.Content>
  {/* IP 守卫状态卡片 */}
  <div className="mb-6">
    <IPGuardStatusCard />
  </div>
  <ApiKeysTable />
</SectionPageLayout.Content>
```

#### **国际化支持**

| 文件 | 新增翻译数量 |
|------|-------------|
| `web/default/src/i18n/locales/zh.json` | 20+ 条 |
| `web/default/src/i18n/locales/en.json` | 20+ 条 |

**关键翻译键**:
- `IP Guard Status`, `IP Usage Monitor`
- `Current IPs`, `Threshold`, `Strike Count`
- `Normal`, `Warning`, `Danger`
- `Your tokens are currently disabled. Please delete and recreate them.`

---

## 三、用户体验流程

### 3.1 正常状态（绿色）

```
用户访问 API Keys 页面
  ↓
看到绿色卡片：「IP Guard Protection [正常]」
  ↓
显示：1 个 IP / 阈值 3
  ↓
用户继续正常使用，无需操作
```

### 3.2 警告状态（橙色）

```
用户在多个 IP 使用 API Key
  ↓
卡片变为橙色：「IP Guard Protection [警告]」
  ↓
显示：2 个 IP / 阈值 3
  ↓
⚠️ 提示：「当在 30 分钟内检测到 3 个不同 IP 时，
          您的令牌将被自动禁用。」
  ↓
用户可以选择：
  - 停止多 IP 使用
  - 等待 30 分钟窗口过期
```

### 3.3 危险状态（红色）

```
触发 IP 守卫（≥3 个不同 IP）
  ↓
卡片变为红色：「IP Guard Protection [危险]」
  ↓
显示：3 个 IP / 阈值 3（进度条 100%）
  ↓
🚨 提示：「您的令牌已被禁用，请删除后重新创建。」
  ↓
用户必须：
  1. 删除所有现有 API Key
  2. 重新创建新 API Key
```

---

## 四、项目规范遵循

### ✅ Rule 1: JSON Package
所有 JSON 操作使用 `common.Marshal/Unmarshal` 包装函数。

### ✅ Rule 2: Database Compatibility
- Service 层全部使用 GORM 抽象
- 兼容 SQLite, MySQL, PostgreSQL
- 无原生 SQL，无数据库特定操作

### ✅ Rule 3: Frontend Package Manager
前端使用 `bun` 作为包管理器：
```bash
cd web/default
bun install
bun run dev
```

### ✅ Rule 5: Protected Project Information
保留所有 `new-api` 和 `QuantumNous` 相关引用，未做任何修改。

### ✅ SOLID 原则应用
- **单一职责**: Service 层负责业务逻辑，Controller 层负责 HTTP 处理
- **开闭原则**: 不修改现有 `CheckIPGuard` 逻辑，新增独立的查询函数
- **依赖倒置**: 前端通过 API 接口与后端解耦

---

## 五、测试指南

### 5.1 后端单元测试

**扩展文件**: `service/ip_guard_test.go`

```go
func TestGetIPGuardStatus(t *testing.T) {
    // 测试正常状态
    // 测试警告状态
    // 测试危险状态
    // 测试 Redis 失败降级
}
```

### 5.2 手动测试场景

| 场景 | 操作 | 预期结果 |
|------|------|----------|
| 单 IP 访问 | 从一个 IP 调用 API | 卡片显示绿色「正常」，1/3 |
| 双 IP 访问 | 模拟两个不同 IP | 卡片显示橙色「警告」，2/3 |
| 三 IP 访问 | 模拟三个不同 IP | 卡片显示红色「危险」，3/3 + 禁用提示 |
| 语言切换 | 切换到英文 | 所有文案切换为英文 |

### 5.3 API 测试

```bash
# 获取 IP 守卫状态
curl -X GET http://localhost:3000/api/user/ip-guard-status \
  -H "Content-Type: application/json" \
  -H "New-Api-User: 1" \
  -H "Cookie: session=..."
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "current_ips": 2,
    "threshold": 3,
    "strike_count": 0,
    "strike_threshold": 3,
    "status": "warning",
    "window_minutes": 30,
    "strike_window_hours": 24
  }
}
```

---

## 六、部署说明

### 6.1 环境变量（无需修改）

IP 守卫机制沿用现有环境变量：

```bash
IP_GUARD_ENABLED=true
IP_GUARD_WINDOW_MINUTES=30
IP_GUARD_DISTINCT_IP_THRESHOLD=3
IP_GUARD_STRIKE_WINDOW_HOURS=24
IP_GUARD_STRIKE_THRESHOLD=3
```

### 6.2 编译与部署

```bash
# 后端编译
go build -ldflags "-s -w" -o new-api

# 前端编译
cd web/default
bun install
bun run build

# 部署
# 直接替换二进制文件和前端静态资源即可
```

### 6.3 数据库迁移

**无需迁移** - 本次更新未涉及数据库表结构变更。

---

## 七、常见问题

### Q1: IP 守卫状态卡片不显示？

**A**: 检查以下几点：
1. 用户是否已登录
2. `/api/user/ip-guard-status` API 是否返回成功
3. 浏览器控制台是否有错误日志
4. `IP_GUARD_ENABLED` 环境变量是否为 `true`

### Q2: 为什么显示的 IP 数量与实际不符？

**A**: IP 守卫使用**滑动窗口**机制，只统计窗口期内（默认 30 分钟）的不同 IP。超过窗口的旧 IP 会被自动清除。

### Q3: 如何解除已被禁用的令牌？

**A**: 
1. 删除所有被禁用的 API Key
2. 重新创建新的 API Key
3. 等待 IP 窗口过期（30 分钟）

### Q4: Strike 计数何时重置？

**A**: Strike 使用滑动窗口（默认 24 小时），超过窗口期的 strike 会自动失效。但如果达到 3 次 strike，账号已被永久封禁，需联系站长手动解封。

---

## 八、后续优化建议

### 可选增强功能（未实施）

1. **实时通知**: 接近阈值时发送邮件/站内信通知（需要新增通知系统）
2. **IP 白名单**: 允许用户添加信任 IP，不计入守卫检测（需要新增数据表）
3. **历史记录**: 保存 IP 使用历史，供用户查询（需要新增数据表）
4. **自动刷新**: 前端组件每 30 秒自动刷新状态（已预留接口，未启用）

### 技术债务

- 前端组件可进一步抽象为通用的状态卡片组件
- 考虑使用 WebSocket 实现实时推送（当前为轮询模式）

---

## 九、总结

本次实施成功将 IP 守卫机制从**被动拦截**升级为**主动预警**，在不改变现有逻辑的前提下，大幅提升了用户体验和系统透明度。

**关键成果**:
- ✅ 用户可实时查看 IP 使用状态
- ✅ 完整的国际化支持（中/英）
- ✅ 可视化的状态展示（颜色 + 进度条）
- ✅ 零数据库迁移，零配置变更
- ✅ 完全向后兼容，不影响现有功能

**工期**: 4 小时（计划）→ 实际完成  
**技术风险**: 低（无数据库变更，API 轻量级）  
**用户体验提升**: 显著（从事后通知 → 实时监控）

---

**文档版本**: v1.0  
**最后更新**: 2026-06-09  
**维护人**: Claude Code (Opus 4.8)
