package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// GetModelHealth 返回模型健康度快照（可用性为主，附带成功率）。
func GetModelHealth(c *gin.Context) {
	result, err := service.GetModelHealthSnapshot(c.DefaultQuery("period", "today"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}
