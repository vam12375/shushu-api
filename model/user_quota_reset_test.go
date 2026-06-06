package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func useQuotaPerUnitForResetTest(t *testing.T, quotaPerUnit float64) {
	t.Helper()
	original := common.QuotaPerUnit
	common.QuotaPerUnit = quotaPerUnit
	t.Cleanup(func() {
		common.QuotaPerUnit = original
	})
}

func insertUserForQuotaResetTest(t *testing.T, id int, quota int) {
	t.Helper()
	user := &User{
		Id:       id,
		Username: fmt.Sprintf("quota_reset_user_%d", id),
		Status:   common.UserStatusEnabled,
		Quota:    quota,
	}
	require.NoError(t, DB.Create(user).Error)
}

func getUserQuotaForQuotaResetTest(t *testing.T, userId int) int {
	t.Helper()
	var user User
	require.NoError(t, DB.Select("quota").Where("id = ?", userId).First(&user).Error)
	return user.Quota
}

func insertDueQuotaResetStateForTest(t *testing.T, userId int, triggeredAt int64, resetAt int64, triggerQuota int) {
	t.Helper()
	require.NoError(t, DB.Create(&UserQuotaResetState{
		UserId:       userId,
		Status:       UserQuotaResetStatusPending,
		TriggeredAt:  triggeredAt,
		ResetAt:      resetAt,
		TriggerQuota: triggerQuota,
	}).Error)
}

func TestMaybeScheduleLowBalanceQuotaReset(t *testing.T) {
	truncateTables(t)
	useQuotaPerUnitForResetTest(t, 100)

	insertUserForQuotaResetTest(t, 201, 20*100)

	scheduled, err := MaybeScheduleLowBalanceQuotaReset(201, 20*100)
	require.NoError(t, err)
	assert.True(t, scheduled)

	var state UserQuotaResetState
	require.NoError(t, DB.Where("user_id = ?", 201).First(&state).Error)
	assert.Equal(t, UserQuotaResetStatusPending, state.Status)
	assert.Equal(t, int64(lowBalanceResetDelaySeconds), state.ResetAt-state.TriggeredAt)
	assert.Equal(t, 20*100, state.TriggerQuota)

	scheduled, err = MaybeScheduleLowBalanceQuotaReset(201, 10*100)
	require.NoError(t, err)
	assert.False(t, scheduled)
}

func TestGetLowBalanceQuotaResetMonitorData(t *testing.T) {
	truncateTables(t)
	useQuotaPerUnitForResetTest(t, 100)

	now := GetDBTimestamp()
	require.NoError(t, DB.Create(&User{
		Id:          204,
		Username:    "quota_reset_monitor_pending",
		DisplayName: "Pending Reset",
		Email:       "pending-reset@example.com",
		Status:      common.UserStatusEnabled,
		Quota:       10 * 100,
		UsedQuota:   7 * 100,
		Group:       "monitor",
		AffCode:     "quota_reset_monitor_pending_aff",
	}).Error)
	require.NoError(t, DB.Create(&User{
		Id:          205,
		Username:    "quota_reset_monitor_completed",
		DisplayName: "Completed Reset",
		Email:       "completed-reset@example.com",
		Status:      common.UserStatusEnabled,
		Quota:       80 * 100,
		UsedQuota:   9 * 100,
		Group:       "monitor",
		AffCode:     "quota_reset_monitor_completed_aff",
	}).Error)
	require.NoError(t, DB.Create(&UserQuotaResetState{
		UserId:       204,
		Status:       UserQuotaResetStatusPending,
		TriggeredAt:  now - lowBalanceResetDelaySeconds,
		ResetAt:      now - 1,
		TriggerQuota: 10 * 100,
	}).Error)
	require.NoError(t, DB.Create(&UserQuotaResetState{
		UserId:       205,
		Status:       UserQuotaResetStatusCompleted,
		TriggeredAt:  now - lowBalanceResetDelaySeconds - 100,
		ResetAt:      0,
		CompletedAt:  now - 10,
		TriggerQuota: 20 * 100,
	}).Error)

	summary, err := GetLowBalanceQuotaResetSummary()
	require.NoError(t, err)
	assert.Equal(t, LowBalanceResetThresholdQuota(), summary.ThresholdQuota)
	assert.Equal(t, LowBalanceResetTargetQuota(), summary.TargetQuota)
	assert.Equal(t, int64(lowBalanceResetDelaySeconds), summary.DelaySeconds)
	assert.Equal(t, int64(1), summary.PendingCount)
	assert.Equal(t, int64(1), summary.DueCount)
	assert.Equal(t, int64(1), summary.CompletedCount)
	assert.Equal(t, int64(1), summary.LowBalanceUserCount)
	assert.Equal(t, int64(0), summary.NextResetAt)

	pageInfo := &common.PageInfo{Page: 1, PageSize: 10}
	items, total, err := GetLowBalanceQuotaResetStates("all", pageInfo)
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.Equal(t, int64(2), total)
	assert.Equal(t, 204, items[0].UserId)
	assert.Equal(t, "Pending Reset", items[0].DisplayName)
	assert.Equal(t, "monitor", items[0].UserGroup)
	assert.Equal(t, 10*100, items[0].CurrentQuota)
	assert.Equal(t, 7*100, items[0].UsedQuota)
	assert.Equal(t, UserQuotaResetStatusPending, items[0].Status)

	pendingItems, pendingTotal, err := GetLowBalanceQuotaResetStates(
		UserQuotaResetStatusPending,
		pageInfo,
	)
	require.NoError(t, err)
	require.Len(t, pendingItems, 1)
	assert.Equal(t, int64(1), pendingTotal)
	assert.Equal(t, 204, pendingItems[0].UserId)
}

func TestResetDueLowBalanceQuotaPreservesCheckinRewards(t *testing.T) {
	truncateTables(t)
	useQuotaPerUnitForResetTest(t, 100)

	now := GetDBTimestamp()
	triggeredAt := now - lowBalanceResetDelaySeconds - 10
	insertUserForQuotaResetTest(t, 202, 60*100)
	insertDueQuotaResetStateForTest(t, 202, triggeredAt, now-1, 20*100)
	require.NoError(t, DB.Create(&Checkin{
		UserId:       202,
		CheckinDate:  "2026-06-01",
		QuotaAwarded: 40 * 100,
		CreatedAt:    triggeredAt + 10,
	}).Error)

	processed, err := ResetDueLowBalanceQuota(10)
	require.NoError(t, err)
	assert.Equal(t, 1, processed)
	assert.Equal(t, 240*100, getUserQuotaForQuotaResetTest(t, 202))

	var state UserQuotaResetState
	require.NoError(t, DB.Where("user_id = ?", 202).First(&state).Error)
	assert.Equal(t, UserQuotaResetStatusCompleted, state.Status)
	assert.Greater(t, state.CompletedAt, int64(0))
}

func TestResetDueLowBalanceQuotaSkipsWhenNonCheckinBalanceRecovered(t *testing.T) {
	truncateTables(t)
	useQuotaPerUnitForResetTest(t, 100)

	now := GetDBTimestamp()
	triggeredAt := now - lowBalanceResetDelaySeconds - 10
	insertUserForQuotaResetTest(t, 203, 120*100)
	insertDueQuotaResetStateForTest(t, 203, triggeredAt, now-1, 20*100)
	require.NoError(t, DB.Create(&Checkin{
		UserId:       203,
		CheckinDate:  "2026-06-02",
		QuotaAwarded: 40 * 100,
		CreatedAt:    triggeredAt + 10,
	}).Error)

	processed, err := ResetDueLowBalanceQuota(10)
	require.NoError(t, err)
	assert.Equal(t, 1, processed)
	assert.Equal(t, 120*100, getUserQuotaForQuotaResetTest(t, 203))
}
