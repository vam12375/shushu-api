# IP 记录功能增强 - 实施总结

> 实施日期:2026-06-11
> 涉及需求:① 管理员可强制所有用户记录 IP ② 使用日志列表直接显示 IP 列 ③ 用户端开关停用(IP 记录完全由管理员控制,用户无法取消)

---

## 一、背景

项目原有「记录 IP 地址」能力是**用户级开关**(个人中心 → 设置与偏好),用户自行决定是否在使用/错误日志中记录自己的 IP,且 IP 仅在日志详情弹窗中可见。

本次增强后,行为变更为:

| 维度 | 原行为 | 新行为 |
|------|--------|--------|
| 控制权 | 用户自行开关 | **仅管理员全局开关**(运营设置 → 日志维护) |
| 用户能否取消 | 能 | **不能**(个人设置开关已注释停用) |
| 列表展示 | 不显示,仅详情弹窗 | **日志列表新增 IP 列**(详情弹窗保留) |

## 二、功能行为

1. **管理员开启**「运营设置 → 日志维护 → 强制记录 IP 地址」后,所有用户的**消费日志(type=2)与错误日志(type=5)**均记录客户端 IP(`c.ClientIP()`),写入 `logs.ip` 字段。
2. 管理员关闭后,不再记录任何用户的 IP(用户个人设置不再参与判断)。
3. 日志列表(使用日志页)在「**费用**」列后新增「IP 地址」列:
   - 仅当该条日志记录了 IP 时显示内容;
   - **完整明文显示**(不随敏感信息开关遮罩);
   - 支持列显示/隐藏(列设置中标签为「IP 地址」)。
4. 充值日志 IP 为独立逻辑(始终记录回调方 IP,仅管理员在详情中可见),不受本开关影响。

## 三、改动清单

### 后端

| 文件 | 改动 |
|------|------|
| `common/constants.go` | 新增全局变量 `ForceRecordIpLogEnabled`(默认 `false`) |
| `model/option.go` | 注册 `OptionMap["ForceRecordIpLogEnabled"]` + 更新分支(option 表持久化,管理端 API 可读写) |
| `model/log.go` | `RecordConsumeLog` / `RecordErrorLog` 两处:`needRecordIp` 仅取全局开关;用户个人设置(`GetUserSetting → RecordIpLog`)回退逻辑**已注释停用** |

### 前端

| 文件 | 改动 |
|------|------|
| `features/system-settings/types.ts` | `OperationsSettings` 新增 `ForceRecordIpLogEnabled: boolean` |
| `features/system-settings/operations/index.tsx` | 默认值 `ForceRecordIpLogEnabled: false` |
| `features/system-settings/operations/section-registry.tsx` | 向日志设置区传递 `defaultForceIpEnabled` |
| `features/system-settings/maintenance/log-settings-section.tsx` | 新增「强制记录 IP 地址」开关(zod schema、表单重置、按变更项分别提交) |
| `features/usage-logs/components/columns/common-logs-columns.tsx` | 新增 `ip` 列(位于费用列后,等宽字体、完整明文显示、空值不渲染) |
| `features/profile/components/tabs/notification-tab.tsx` | 用户端「记录 IP 地址」开关**已注释停用**(保留代码便于回滚) |

### i18n

- 新增键(en/zh/fr/ru/ja/vi 全量翻译):
  - `Force record IP address` →「强制记录 IP 地址」
  - `Record client IP for all usage and error logs, ignoring personal user settings` →「为所有用户的使用和错误日志记录客户端 IP,忽略用户个人设置」
- 列头复用既有键 `IP Address` →「IP 地址」。
- 已运行 `bun run i18n:sync`(顺带规范化了既有重复键与首页遗留缺失键,运行时值不变)。

### 保留兼容(未删除)

- `dto/user_settings.go` 的 `RecordIpLog` 字段与 `controller/user.go` 的设置保存逻辑保留:历史数据兼容,字段现已不参与判定。

## 四、使用方法

1. 管理员登录 → 系统设置 → 运营设置 → **日志维护**;
2. 开启「**强制记录 IP 地址**」并保存;
3. 此后所有新产生的对话/错误日志均带 IP,在「日志」页列表的「IP 地址」列直接查看,点击行打开详情弹窗也有 IP 行(🌐 图标)。

## 五、注意事项

- **仅对开启后的新日志生效**:历史日志无 IP 数据,列表与详情中均显示为空。
- **反向代理需透传真实 IP**:经 Nginx/CDN 部署时需正确设置 `X-Real-IP` / `X-Forwarded-For`,否则记录的是代理 IP(IP 守卫功能同样依赖此项)。
- **隐私合规**:IP 属个人信息,公益站建议在用户协议/公告中告知记录行为。
- **回滚方式**:恢复用户自主控制只需还原 `model/log.go` 与 `notification-tab.tsx` 中两段注释代码。

## 六、验证

- `go build ./...` 编译通过 ✅
- `bun run build` 前端构建通过 ✅
- 验证脚本:`scripts/test_ip_log_feature.ps1`
  - 静态检查(后端开关注册/日志逻辑/前端组件/i18n)+ 编译验证;
  - 可选运行时检查:`.\scripts\test_ip_log_feature.ps1 -BaseUrl http://localhost:3000 -AdminToken "<管理员Token>"`(验证 option API 读写)。
