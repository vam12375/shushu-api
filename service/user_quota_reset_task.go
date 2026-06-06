package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/bytedance/gopkg/util/gopool"
)

const (
	lowBalanceQuotaResetTickInterval = 1 * time.Minute
	lowBalanceQuotaResetBatchSize    = 300
)

var (
	lowBalanceQuotaResetOnce    sync.Once
	lowBalanceQuotaResetRunning atomic.Bool
)

func StartLowBalanceQuotaResetTask() {
	lowBalanceQuotaResetOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("low balance quota reset task started: tick=%s", lowBalanceQuotaResetTickInterval))
			ticker := time.NewTicker(lowBalanceQuotaResetTickInterval)
			defer ticker.Stop()

			runLowBalanceQuotaResetOnce()
			for range ticker.C {
				runLowBalanceQuotaResetOnce()
			}
		})
	})
}

func runLowBalanceQuotaResetOnce() {
	if !lowBalanceQuotaResetRunning.CompareAndSwap(false, true) {
		return
	}
	defer lowBalanceQuotaResetRunning.Store(false)

	ctx := context.Background()
	totalScheduled := 0
	totalReset := 0
	for {
		n, err := model.ScheduleLowBalanceQuotaResets(lowBalanceQuotaResetBatchSize)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("low balance quota reset schedule task failed: %v", err))
			return
		}
		totalScheduled += n
		if n < lowBalanceQuotaResetBatchSize {
			break
		}
	}
	for {
		n, err := model.ResetDueLowBalanceQuota(lowBalanceQuotaResetBatchSize)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("low balance quota reset task failed: %v", err))
			return
		}
		totalReset += n
		if n < lowBalanceQuotaResetBatchSize {
			break
		}
	}
	if common.DebugEnabled && (totalScheduled > 0 || totalReset > 0) {
		logger.LogDebug(ctx, "low balance quota reset maintenance: scheduled_count=%d, reset_count=%d", totalScheduled, totalReset)
	}
}
