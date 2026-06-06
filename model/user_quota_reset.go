package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	UserQuotaResetStatusPending   = "pending"
	UserQuotaResetStatusCompleted = "completed"

	lowBalanceResetThresholdUSD = 50
	lowBalanceResetTargetUSD    = 200
	lowBalanceResetDelaySeconds = 24 * 60 * 60
	lowBalanceResetDefaultBatch = 300
)

type UserQuotaResetState struct {
	UserId       int    `json:"user_id" gorm:"primaryKey"`
	Status       string `json:"status" gorm:"type:varchar(16);not null;default:'completed';index"`
	TriggeredAt  int64  `json:"triggered_at" gorm:"type:bigint;not null;default:0"`
	ResetAt      int64  `json:"reset_at" gorm:"type:bigint;not null;default:0;index"`
	CompletedAt  int64  `json:"completed_at" gorm:"type:bigint;not null;default:0"`
	TriggerQuota int    `json:"trigger_quota" gorm:"type:int;not null;default:0"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt    int64  `json:"updated_at" gorm:"bigint"`
}

type UserQuotaResetSummary struct {
	ThresholdQuota      int   `json:"threshold_quota"`
	TargetQuota         int   `json:"target_quota"`
	ThresholdUSD        int64 `json:"threshold_usd"`
	TargetUSD           int64 `json:"target_usd"`
	DelaySeconds        int64 `json:"delay_seconds"`
	PendingCount        int64 `json:"pending_count"`
	DueCount            int64 `json:"due_count"`
	CompletedCount      int64 `json:"completed_count"`
	LowBalanceUserCount int64 `json:"low_balance_user_count"`
	NextResetAt         int64 `json:"next_reset_at"`
	Now                 int64 `json:"now"`
}

type UserQuotaResetListItem struct {
	UserId       int    `json:"user_id"`
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	Email        string `json:"email"`
	UserGroup    string `json:"group"`
	UserStatus   int    `json:"user_status"`
	CurrentQuota int    `json:"current_quota"`
	UsedQuota    int    `json:"used_quota"`
	Status       string `json:"status"`
	TriggeredAt  int64  `json:"triggered_at"`
	ResetAt      int64  `json:"reset_at"`
	CompletedAt  int64  `json:"completed_at"`
	TriggerQuota int    `json:"trigger_quota"`
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

func (s *UserQuotaResetState) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	s.CreatedAt = now
	s.UpdatedAt = now
	return nil
}

func (s *UserQuotaResetState) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = common.GetTimestamp()
	return nil
}

func LowBalanceResetThresholdQuota() int {
	return dollarsToQuota(lowBalanceResetThresholdUSD)
}

func LowBalanceResetTargetQuota() int {
	return dollarsToQuota(lowBalanceResetTargetUSD)
}

func LowBalanceResetDelaySeconds() int64 {
	return lowBalanceResetDelaySeconds
}

func dollarsToQuota(amount int64) int {
	if amount <= 0 || common.QuotaPerUnit <= 0 {
		return 0
	}
	return int(decimal.NewFromInt(amount).
		Mul(decimal.NewFromFloat(common.QuotaPerUnit)).
		Ceil().
		IntPart())
}

func ScheduleLowBalanceQuotaResetIfNeeded(userId int) (bool, error) {
	if userId <= 0 {
		return false, nil
	}
	quota, err := GetUserQuota(userId, false)
	if err != nil {
		return false, err
	}
	return MaybeScheduleLowBalanceQuotaReset(userId, quota)
}

func MaybeScheduleLowBalanceQuotaReset(userId int, quota int) (bool, error) {
	threshold := LowBalanceResetThresholdQuota()
	if userId <= 0 || threshold <= 0 || quota >= threshold {
		return false, nil
	}

	now := GetDBTimestamp()
	resetAt := now + lowBalanceResetDelaySeconds
	scheduled := false

	err := DB.Transaction(func(tx *gorm.DB) error {
		var state UserQuotaResetState
		err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ?", userId).
			First(&state).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err == nil && state.Status == UserQuotaResetStatusPending {
			return nil
		}

		nextState := UserQuotaResetState{
			UserId:       userId,
			Status:       UserQuotaResetStatusPending,
			TriggeredAt:  now,
			ResetAt:      resetAt,
			CompletedAt:  0,
			TriggerQuota: quota,
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := tx.Create(&nextState).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(&state).Updates(map[string]interface{}{
				"status":        nextState.Status,
				"triggered_at":  nextState.TriggeredAt,
				"reset_at":      nextState.ResetAt,
				"completed_at":  nextState.CompletedAt,
				"trigger_quota": nextState.TriggerQuota,
			}).Error; err != nil {
				return err
			}
		}
		scheduled = true
		return nil
	})
	if err != nil {
		return false, err
	}
	if scheduled {
		RecordLog(userId, LogTypeSystem, fmt.Sprintf(
			"Low balance reset scheduled: current=%s, threshold=%s, reset_target=%s",
			logger.LogQuota(quota),
			logger.LogQuota(threshold),
			logger.LogQuota(LowBalanceResetTargetQuota()),
		))
	}
	return scheduled, nil
}

func GetLowBalanceQuotaResetSummary() (*UserQuotaResetSummary, error) {
	now := GetDBTimestamp()
	threshold := LowBalanceResetThresholdQuota()
	summary := &UserQuotaResetSummary{
		ThresholdQuota: threshold,
		TargetQuota:    LowBalanceResetTargetQuota(),
		ThresholdUSD:   lowBalanceResetThresholdUSD,
		TargetUSD:      lowBalanceResetTargetUSD,
		DelaySeconds:   lowBalanceResetDelaySeconds,
		Now:            now,
	}

	if err := DB.Model(&UserQuotaResetState{}).
		Where("status = ?", UserQuotaResetStatusPending).
		Count(&summary.PendingCount).Error; err != nil {
		return nil, err
	}
	if err := DB.Model(&UserQuotaResetState{}).
		Where("status = ? AND reset_at > 0 AND reset_at <= ?", UserQuotaResetStatusPending, now).
		Count(&summary.DueCount).Error; err != nil {
		return nil, err
	}
	if err := DB.Model(&UserQuotaResetState{}).
		Where("status = ?", UserQuotaResetStatusCompleted).
		Count(&summary.CompletedCount).Error; err != nil {
		return nil, err
	}
	if threshold > 0 {
		if err := DB.Model(&User{}).
			Where("status = ? AND quota < ?", common.UserStatusEnabled, threshold).
			Count(&summary.LowBalanceUserCount).Error; err != nil {
			return nil, err
		}
	}
	if err := DB.Model(&UserQuotaResetState{}).
		Where("status = ? AND reset_at > ?", UserQuotaResetStatusPending, now).
		Select("COALESCE(MIN(reset_at), 0)").
		Scan(&summary.NextResetAt).Error; err != nil {
		return nil, err
	}

	return summary, nil
}

func GetLowBalanceQuotaResetStates(status string, pageInfo *common.PageInfo) ([]UserQuotaResetListItem, int64, error) {
	var items []UserQuotaResetListItem
	var total int64

	query := DB.Table("user_quota_reset_states AS s").
		Joins("LEFT JOIN users AS u ON u.id = s.user_id")

	switch status {
	case UserQuotaResetStatusPending, UserQuotaResetStatusCompleted:
		query = query.Where("s.status = ?", status)
	case "all", "":
	default:
		query = query.Where("s.status = ?", UserQuotaResetStatusPending)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderExpr := "CASE WHEN s.status = 'pending' THEN 0 ELSE 1 END, s.reset_at asc, s.completed_at desc, s.user_id asc"
	if status == UserQuotaResetStatusPending {
		orderExpr = "s.reset_at asc, s.user_id asc"
	} else if status == UserQuotaResetStatusCompleted {
		orderExpr = "s.completed_at desc, s.user_id asc"
	}

	groupCol := "u." + commonGroupCol
	err := query.
		Select("s.user_id, COALESCE(u.username, '') AS username, COALESCE(u.display_name, '') AS display_name, COALESCE(u.email, '') AS email, COALESCE(" + groupCol + ", '') AS user_group, COALESCE(u.status, 0) AS user_status, COALESCE(u.quota, 0) AS current_quota, COALESCE(u.used_quota, 0) AS used_quota, s.status, s.triggered_at, s.reset_at, s.completed_at, s.trigger_quota, s.created_at, s.updated_at").
		Order(orderExpr).
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Scan(&items).Error
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func ScheduleLowBalanceQuotaResets(limit int) (int, error) {
	threshold := LowBalanceResetThresholdQuota()
	if threshold <= 0 {
		return 0, nil
	}
	if limit <= 0 {
		limit = lowBalanceResetDefaultBatch
	}

	var users []User
	pendingSubquery := DB.Model(&UserQuotaResetState{}).
		Select("user_id").
		Where("status = ?", UserQuotaResetStatusPending)
	if err := DB.
		Select("id", "quota").
		Where("status = ? AND quota < ? AND id NOT IN (?)", common.UserStatusEnabled, threshold, pendingSubquery).
		Order("id asc").
		Limit(limit).
		Find(&users).Error; err != nil {
		return 0, err
	}

	count := 0
	for _, user := range users {
		scheduled, err := MaybeScheduleLowBalanceQuotaReset(user.Id, user.Quota)
		if err != nil {
			return count, err
		}
		if scheduled {
			count++
		}
	}
	return count, nil
}

func ResetDueLowBalanceQuota(limit int) (int, error) {
	if limit <= 0 {
		limit = lowBalanceResetDefaultBatch
	}
	now := GetDBTimestamp()
	var states []UserQuotaResetState
	if err := DB.
		Where("status = ? AND reset_at > 0 AND reset_at <= ?", UserQuotaResetStatusPending, now).
		Order("reset_at asc, user_id asc").
		Limit(limit).
		Find(&states).Error; err != nil {
		return 0, err
	}
	if len(states) == 0 {
		return 0, nil
	}

	processed := 0
	for _, state := range states {
		newQuota, resetApplied, err := resetDueLowBalanceQuotaState(state.UserId, now)
		if err != nil {
			return processed, err
		}
		processed++
		if resetApplied {
			RecordLog(state.UserId, LogTypeSystem, fmt.Sprintf(
				"Low balance reset completed: balance reset to %s",
				logger.LogQuota(newQuota),
			))
		}
	}
	return processed, nil
}

func resetDueLowBalanceQuotaState(userId int, now int64) (int, bool, error) {
	threshold := LowBalanceResetThresholdQuota()
	target := LowBalanceResetTargetQuota()
	if threshold <= 0 || target <= 0 {
		return 0, false, nil
	}

	var finalQuota int
	resetApplied := false
	err := DB.Transaction(func(tx *gorm.DB) error {
		var state UserQuotaResetState
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND status = ? AND reset_at > 0 AND reset_at <= ?",
				userId, UserQuotaResetStatusPending, now).
			First(&state).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}

		var user User
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Select("id", "quota").
			Where("id = ?", userId).
			First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return completeLowBalanceResetStateTx(tx, &state, now)
			}
			return err
		}

		checkinQuota, err := sumCheckinQuotaSinceTx(tx, userId, state.TriggeredAt)
		if err != nil {
			return err
		}
		quotaWithoutPendingCheckin := user.Quota - checkinQuota
		finalQuota = user.Quota
		if quotaWithoutPendingCheckin < threshold {
			desiredQuota := target + checkinQuota
			if desiredQuota > user.Quota {
				if err := tx.Model(&User{}).
					Where("id = ?", userId).
					Update("quota", desiredQuota).Error; err != nil {
					return err
				}
				finalQuota = desiredQuota
				resetApplied = true
			}
		}

		return completeLowBalanceResetStateTx(tx, &state, now)
	})
	if err != nil {
		return 0, false, err
	}
	if resetApplied {
		if err := updateUserQuotaCache(userId, finalQuota); err != nil {
			common.SysLog("failed to update user quota cache after low balance reset: " + err.Error())
		}
	}
	return finalQuota, resetApplied, nil
}

func completeLowBalanceResetStateTx(tx *gorm.DB, state *UserQuotaResetState, now int64) error {
	return tx.Model(state).Updates(map[string]interface{}{
		"status":       UserQuotaResetStatusCompleted,
		"completed_at": now,
		"reset_at":     int64(0),
	}).Error
}

func sumCheckinQuotaSinceTx(tx *gorm.DB, userId int, since int64) (int, error) {
	if since <= 0 {
		return 0, nil
	}
	var quota int
	err := tx.Model(&Checkin{}).
		Where("user_id = ? AND created_at >= ?", userId, since).
		Select("COALESCE(SUM(quota_awarded), 0)").
		Scan(&quota).Error
	return quota, err
}
