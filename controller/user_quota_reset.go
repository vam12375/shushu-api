package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func GetLowBalanceQuotaResetMonitor(c *gin.Context) {
	status := c.DefaultQuery("status", model.UserQuotaResetStatusPending)
	pageInfo := common.GetPageQuery(c)

	summary, err := model.GetLowBalanceQuotaResetSummary()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	items, total, err := model.GetLowBalanceQuotaResetStates(status, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)

	common.ApiSuccess(c, gin.H{
		"summary": summary,
		"states":  pageInfo,
	})
}
