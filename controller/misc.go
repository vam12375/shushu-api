package controller

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

func TestStatus(c *gin.Context) {
	err := model.PingDB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "数据库连接失败",
		})
		return
	}
	// 获取HTTP统计信息
	httpStats := middleware.GetStats()
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Server is running",
		"http_stats": httpStats,
	})
	return
}

func GetStatus(c *gin.Context) {

	cs := console_setting.GetConsoleSetting()
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	passkeySetting := system_setting.GetPasskeySettings()
	legalSetting := system_setting.GetLegalSettings()

	data := gin.H{
		"version":                     common.Version,
		"start_time":                  common.StartTime,
		"email_verification":          common.EmailVerificationEnabled,
		"github_oauth":                common.GitHubOAuthEnabled,
		"github_client_id":            common.GitHubClientId,
		"linuxdo_oauth":               common.LinuxDOOAuthEnabled,
		"linuxdo_client_id":           common.LinuxDOClientId,
		"linuxdo_minimum_trust_level": common.LinuxDOMinimumTrustLevel,
		"theme":                       system_setting.GetThemeSettings().Frontend,
		"system_name":                 common.SystemName,
		"logo":                        common.Logo,
		"footer_html":                 common.Footer,
		"server_address":              system_setting.ServerAddress,
		"turnstile_check":             common.TurnstileCheckEnabled,
		"turnstile_site_key":          common.TurnstileSiteKey,
		"docs_link":                   operation_setting.GetGeneralSetting().DocsLink,
		"quota_per_unit":              common.QuotaPerUnit,
		// 兼容旧前端：保留 display_in_currency，同时提供新的 quota_display_type
		"display_in_currency":           operation_setting.IsCurrencyDisplay(),
		"quota_display_type":            operation_setting.GetQuotaDisplayType(),
		"custom_currency_symbol":        operation_setting.GetGeneralSetting().CustomCurrencySymbol,
		"custom_currency_exchange_rate": operation_setting.GetGeneralSetting().CustomCurrencyExchangeRate,
		"enable_batch_update":           common.BatchUpdateEnabled,
		"enable_drawing":                common.DrawingEnabled,
		"enable_task":                   common.TaskEnabled,
		"enable_data_export":            common.DataExportEnabled,
		"data_export_default_time":      common.DataExportDefaultTime,
		"default_collapse_sidebar":      common.DefaultCollapseSidebar,
		"mj_notify_enabled":             setting.MjNotifyEnabled,
		"chats":                         setting.Chats,
		"demo_site_enabled":             operation_setting.DemoSiteEnabled,
		"self_use_mode_enabled":         operation_setting.SelfUseModeEnabled,
		"register_enabled":              common.RegisterEnabled,
		"password_login_enabled":        common.PasswordLoginEnabled,
		"password_register_enabled":     common.PasswordRegisterEnabled,
		"default_use_auto_group":        setting.DefaultUseAutoGroup,

		"usd_exchange_rate": operation_setting.USDExchangeRate,
		"price":             operation_setting.Price,
		"stripe_unit_price": setting.StripeUnitPrice,

		// 面板启用开关
		"api_info_enabled":      cs.ApiInfoEnabled,
		"uptime_kuma_enabled":   cs.UptimeKumaEnabled,
		"announcements_enabled": cs.AnnouncementsEnabled,
		"faq_enabled":           cs.FAQEnabled,

		// 模块管理配置
		"HeaderNavModules":    common.OptionMap["HeaderNavModules"],
		"SidebarModulesAdmin": common.OptionMap["SidebarModulesAdmin"],

		"passkey_login":             passkeySetting.Enabled,
		"passkey_display_name":      passkeySetting.RPDisplayName,
		"passkey_rp_id":             passkeySetting.RPID,
		"passkey_origins":           passkeySetting.Origins,
		"passkey_allow_insecure":    passkeySetting.AllowInsecureOrigin,
		"passkey_user_verification": passkeySetting.UserVerification,
		"passkey_attachment":        passkeySetting.AttachmentPreference,
		"setup":                     constant.Setup,
		"user_agreement_enabled":    legalSetting.UserAgreement != "",
		"privacy_policy_enabled":    legalSetting.PrivacyPolicy != "",
		"checkin_enabled":           operation_setting.GetCheckinSetting().Enabled,
	}

	// 根据启用状态注入可选内容
	if cs.ApiInfoEnabled {
		data["api_info"] = console_setting.GetApiInfo()
	}
	if cs.AnnouncementsEnabled {
		data["announcements"] = console_setting.GetAnnouncements()
	}
	if cs.FAQEnabled {
		data["faq"] = console_setting.GetFAQ()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    data,
	})
	return
}

func GetNotice(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["Notice"],
	})
	return
}

func GetAbout(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["About"],
	})
	return
}

func GetUserAgreement(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().UserAgreement,
	})
	return
}

func GetPrivacyPolicy(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().PrivacyPolicy,
	})
	return
}

func GetMidjourney(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["Midjourney"],
	})
	return
}

func GetHomePageContent(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["HomePageContent"],
	})
	return
}

func buildBrandedEmailHTML(title string, bodyHTML string) string {
	systemName := html.EscapeString(common.SystemName)
	escapedTitle := html.EscapeString(title)
	return fmt.Sprintf(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;background:#f3f4f6;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">%s - %s</div>
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:34px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="padding:0 0 12px;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:13px;line-height:20px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Secure Notice</td>
                  <td align="right" style="font-size:13px;line-height:20px;color:#6b7280;">%s</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #d8dde6;border-radius:24px;overflow:hidden;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="14" style="width:14px;background:#111827;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:34px 38px 0;">
                    <div style="display:inline-block;padding:6px 10px;border:1px solid #d8dde6;border-radius:999px;background:#ffffff;color:#4b5563;font-size:12px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;">Account Verification</div>
                    <div style="margin-top:18px;font-size:30px;line-height:38px;font-weight:800;color:#111827;">%s</div>
                    <div style="margin-top:10px;width:44px;height:3px;background:#111827;font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td width="14" style="width:14px;background:#111827;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:28px 38px 34px;">%s</td>
                </tr>
                <tr>
                  <td width="14" style="width:14px;background:#111827;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:20px 38px 28px;border-top:1px solid #eef0f3;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:13px;line-height:20px;color:#6b7280;">这是一封系统自动发送的邮件，请勿直接回复。</td>
                        <td align="right" style="font-size:13px;line-height:20px;color:#9ca3af;">%s</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 6px 0;color:#9ca3af;font-size:12px;line-height:18px;text-align:center;">
              如果你没有发起这次操作，可以安全忽略。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, systemName, escapedTitle, systemName, escapedTitle, bodyHTML, escapedTitle)
}

func buildVerificationEmailHTML(code string) string {
	systemName := html.EscapeString(common.SystemName)
	escapedCode := html.EscapeString(code)
	body := fmt.Sprintf(`
<p style="margin:0 0 20px;font-size:16px;line-height:27px;color:#374151;">您好，你正在进行 <strong style="color:#111827;">%s</strong> 邮箱验证。请使用下面这枚一次性凭证完成操作。</p>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #111827;border-radius:18px;background:#fbfcfe;border-collapse:separate;border-spacing:0;overflow:hidden;">
  <tr>
    <td style="padding:13px 18px;border-bottom:1px solid #d8dde6;">
      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size:12px;line-height:18px;color:#6b7280;letter-spacing:1.4px;text-transform:uppercase;">One-time Code</td>
          <td align="right" style="font-size:12px;line-height:18px;color:#6b7280;">%d 分钟有效</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:30px 18px 32px;">
      <div style="font-family:'SFMono-Regular','Cascadia Code','Roboto Mono',Consolas,monospace;font-size:42px;line-height:50px;font-weight:800;letter-spacing:9px;color:#111827;">%s</div>
    </td>
  </tr>
</table>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
  <tr>
    <td width="8" style="width:8px;background:#111827;border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding-left:12px;font-size:14px;line-height:22px;color:#4b5563;">验证码只用于本次邮箱验证，请不要转发给他人。</td>
  </tr>
  <tr>
    <td width="8" style="width:8px;background:#9ca3af;border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding-left:12px;font-size:14px;line-height:22px;color:#4b5563;">如果不是你本人操作，可以直接忽略这封邮件。</td>
  </tr>
</table>`,
		systemName, common.VerificationValidMinutes, escapedCode)
	return buildBrandedEmailHTML("邮箱验证码", body)
}

func buildPasswordResetEmailHTML(link string) string {
	systemName := html.EscapeString(common.SystemName)
	escapedLink := html.EscapeString(link)
	body := fmt.Sprintf(`
<p style="margin:0 0 18px;font-size:16px;line-height:27px;color:#374151;">您好，你正在为 <strong style="color:#111827;">%s</strong> 重置密码。</p>
<p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4b5563;">请点击下面的按钮完成重置，链接 %d 分钟内有效。</p>
<p style="margin:0 0 26px;">
  <a href="%s" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">重置密码</a>
</p>
<div style="padding:16px;border:1px solid #d8dde6;border-radius:14px;background:#fbfcfe;">
  <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#6b7280;">如果按钮无法打开，请复制下面的链接到浏览器：</p>
  <p style="margin:0;word-break:break-all;font-size:13px;line-height:20px;color:#111827;">%s</p>
</div>
<p style="margin:22px 0 0;font-size:15px;line-height:24px;color:#4b5563;">如果不是你本人操作，可以忽略这封邮件。</p>`,
		systemName, common.VerificationValidMinutes, escapedLink, escapedLink)
	return buildBrandedEmailHTML("密码重置", body)
}

func SendEmailVerification(c *gin.Context) {
	email := c.Query("email")
	if err := common.Validate.Var(email, "required,email"); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的邮箱地址",
		})
		return
	}
	localPart := parts[0]
	domainPart := parts[1]
	if common.EmailDomainRestrictionEnabled {
		allowed := false
		for _, domain := range common.EmailDomainWhitelist {
			if domainPart == domain {
				allowed = true
				break
			}
		}
		if !allowed {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "The administrator has enabled the email domain name whitelist, and your email address is not allowed due to special symbols or it's not in the whitelist.",
			})
			return
		}
	}
	if common.EmailAliasRestrictionEnabled {
		containsSpecialSymbols := strings.Contains(localPart, "+") || strings.Contains(localPart, ".")
		if containsSpecialSymbols {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员已启用邮箱地址别名限制，您的邮箱地址由于包含特殊符号而被拒绝。",
			})
			return
		}
	}

	if model.IsEmailAlreadyTaken(email) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "邮箱地址已被占用",
		})
		return
	}
	code := common.GenerateVerificationCode(6)
	common.RegisterVerificationCodeWithKey(email, code, common.EmailVerificationPurpose)
	subject := fmt.Sprintf("%s 邮箱验证码", common.SystemName)
	content := buildVerificationEmailHTML(code)
	err := common.SendEmail(subject, email, content)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func SendPasswordResetEmail(c *gin.Context) {
	email := c.Query("email")
	if err := common.Validate.Var(email, "required,email"); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	if model.IsEmailAlreadyTaken(email) {
		code := common.GenerateVerificationCode(0)
		common.RegisterVerificationCodeWithKey(email, code, common.PasswordResetPurpose)
		link := fmt.Sprintf("%s/user/reset?email=%s&token=%s", strings.TrimRight(system_setting.ServerAddress, "/"), url.QueryEscape(email), url.QueryEscape(code))
		subject := fmt.Sprintf("%s 密码重置", common.SystemName)
		content := buildPasswordResetEmailHTML(link)
		err := common.SendEmail(subject, email, content)
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("failed to send password reset email to %s: %s", email, err.Error()))
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

type PasswordResetRequest struct {
	Email string `json:"email"`
	Token string `json:"token"`
}

func ResetPassword(c *gin.Context) {
	var req PasswordResetRequest
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if req.Email == "" || req.Token == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	if !common.VerifyCodeWithKey(req.Email, req.Token, common.PasswordResetPurpose) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "重置链接非法或已过期",
		})
		return
	}
	password := common.GenerateVerificationCode(12)
	err = model.ResetUserPasswordByEmail(req.Email, password)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.DeleteKey(req.Email, common.PasswordResetPurpose)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    password,
	})
	return
}
