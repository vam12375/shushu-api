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
