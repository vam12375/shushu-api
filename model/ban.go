package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// BannedUser 永久黑名单表。
// 以不可变的 LinuxDO ID 作为锚点，即使用户删除账号后用同一 LinuxDO 账号重新注册，
// 仍会在 OAuth 注册/登录阶段被拦截，从而实现“封禁后无法重新注册”。
type BannedUser struct {
	Id        int    `json:"id"`
	LinuxDOId string `json:"linux_do_id" gorm:"column:linux_do_id;index"` // 触发封禁时用户绑定的 LinuxDO ID（核心锚点）
	UserId    int    `json:"user_id" gorm:"index"`                        // 触发封禁时的用户 ID（仅作记录，可能已被删除）
	Reason    string `json:"reason" gorm:"type:varchar(255)"`             // 封禁原因
	CreatedAt int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
}

// IsLinuxDOIdBanned 判断指定 LinuxDO ID 是否已在黑名单中。
func IsLinuxDOIdBanned(linuxDOId string) bool {
	if linuxDOId == "" {
		return false
	}
	var count int64
	if err := DB.Model(&BannedUser{}).Where("linux_do_id = ?", linuxDOId).Count(&count).Error; err != nil {
		common.SysError("查询 LinuxDO 黑名单失败: " + err.Error())
		return false
	}
	return count > 0
}

// AddLinuxDOBan 将指定 LinuxDO ID 加入黑名单（已存在则跳过）。
func AddLinuxDOBan(linuxDOId string, userId int, reason string) error {
	if linuxDOId == "" {
		return errors.New("linux do id 为空，无法加入黑名单")
	}
	// 幂等：已存在则不重复写入
	if IsLinuxDOIdBanned(linuxDOId) {
		return nil
	}
	ban := BannedUser{
		LinuxDOId: linuxDOId,
		UserId:    userId,
		Reason:    reason,
	}
	return DB.Create(&ban).Error
}

// DisableUserTokens 将指定用户的所有令牌状态置为禁用，并清理其令牌缓存。
// 用于 IP 守卫触发时立即冻结该用户全部 APIKEY，使后续请求即时失效。
func DisableUserTokens(userId int) error {
	if userId <= 0 {
		return errors.New("userId 无效")
	}
	err := DB.Model(&Token{}).Where("user_id = ?", userId).
		Update("status", common.TokenStatusDisabled).Error
	if err != nil {
		return err
	}
	// 清理令牌缓存，确保被禁用状态立即生效
	return InvalidateUserTokensCache(userId)
}

// BanUserByIPGuard 因 IP 守卫累计触发而封禁用户：
//  1. 将用户状态置为禁用；
//  2. 取其 LinuxDO ID 写入黑名单（重注册拦截的锚点）；
//  3. 清理用户与令牌缓存，使封禁立即生效。
func BanUserByIPGuard(userId int, reason string) error {
	if userId <= 0 {
		return errors.New("userId 无效")
	}

	var user User
	if err := DB.Where("id = ?", userId).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	// 1. 禁用用户
	if err := DB.Model(&User{}).Where("id = ?", userId).
		Update("status", common.UserStatusDisabled).Error; err != nil {
		return err
	}

	// 2. 写入 LinuxDO 黑名单（无绑定则跳过，至少用户已被禁用）
	if user.LinuxDOId != "" {
		if err := AddLinuxDOBan(user.LinuxDOId, userId, reason); err != nil {
			common.SysError("写入 LinuxDO 黑名单失败: " + err.Error())
		}
	}

	// 3. 清理缓存，确保封禁立即生效
	_ = InvalidateUserCache(userId)
	_ = InvalidateUserTokensCache(userId)
	return nil
}
