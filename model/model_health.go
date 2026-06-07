package model

import (
	"github.com/QuantumNous/new-api/common"
)

// ModelChannelHealth 单个模型的渠道可用性聚合结果
type ModelChannelHealth struct {
	ModelName       string  // 模型名
	TotalChannels   int     // 提供该模型的渠道总数（含禁用）
	HealthyChannels int     // 当前启用（在线）的渠道数
	AvgResponseTime float64 // 启用渠道的平均探活响应时间（毫秒）
	LastTestTime    int64   // 最近一次探活的时间戳（0 表示从未探活）
}

// 内部行结构，用于承接两条聚合查询的结果
type modelTotalRow struct {
	Model         string `gorm:"column:model"`
	TotalChannels int    `gorm:"column:total_channels"`
}

type modelHealthyRow struct {
	Model           string  `gorm:"column:model"`
	HealthyChannels int     `gorm:"column:healthy_channels"`
	AvgResponseTime float64 `gorm:"column:avg_response_time"`
	LastTestTime    int64   `gorm:"column:last_test_time"`
}

// GetModelChannelHealthStats 聚合每个模型的渠道可用性。
// 为兼容 SQLite / MySQL / PostgreSQL，拆成两条标准聚合查询（不使用 CASE/FILTER/布尔入 SELECT）：
//  1. abilities 按 model 统计总渠道数（含禁用）；
//  2. abilities JOIN channels 仅取启用渠道，统计在线渠道数、平均响应时间、最近探活时间。
func GetModelChannelHealthStats() (map[string]*ModelChannelHealth, error) {
	result := make(map[string]*ModelChannelHealth)

	// 1) 每个模型的总渠道数（含禁用），来源 abilities 表
	var totals []modelTotalRow
	if err := DB.Table("abilities").
		Select("model, COUNT(DISTINCT channel_id) as total_channels").
		Group("model").
		Scan(&totals).Error; err != nil {
		return nil, err
	}
	for _, row := range totals {
		if row.Model == "" {
			continue
		}
		result[row.Model] = &ModelChannelHealth{
			ModelName:     row.Model,
			TotalChannels: row.TotalChannels,
		}
	}

	// 2) 每个模型的在线渠道数 + 平均响应时间 + 最近探活时间（仅统计启用渠道）
	var healthy []modelHealthyRow
	if err := DB.Table("abilities").
		Select("abilities.model as model, "+
			"COUNT(DISTINCT abilities.channel_id) as healthy_channels, "+
			"AVG(channels.response_time) as avg_response_time, "+
			"MAX(channels.test_time) as last_test_time").
		Joins("JOIN channels ON channels.id = abilities.channel_id").
		Where("channels.status = ?", common.ChannelStatusEnabled).
		Group("abilities.model").
		Scan(&healthy).Error; err != nil {
		return nil, err
	}
	for _, row := range healthy {
		if row.Model == "" {
			continue
		}
		item, ok := result[row.Model]
		if !ok {
			item = &ModelChannelHealth{ModelName: row.Model}
			result[row.Model] = item
		}
		item.HealthyChannels = row.HealthyChannels
		item.AvgResponseTime = row.AvgResponseTime
		item.LastTestTime = row.LastTestTime
	}

	return result, nil
}

// ModelLogStat 单个模型在时间窗内的调用质量统计
type ModelLogStat struct {
	ModelName    string  // 模型名
	RequestCount int64   // 成功调用次数（消费日志）
	ErrorCount   int64   // 失败调用次数（错误日志）
	AvgUseTime   float64 // 成功调用的平均耗时（秒）
}

type modelConsumeRow struct {
	ModelName    string  `gorm:"column:model_name"`
	RequestCount int64   `gorm:"column:request_count"`
	AvgUseTime   float64 `gorm:"column:avg_use_time"`
}

type modelErrorRow struct {
	ModelName  string `gorm:"column:model_name"`
	ErrorCount int64  `gorm:"column:error_count"`
}

// GetModelLogStats 聚合每个模型在 [start, 现在] 内的成功/失败次数与平均耗时。
// start <= 0 表示不限制起始时间（对应 all 周期）。
// 成功取自消费日志（LogTypeConsume），失败取自错误日志（LogTypeError），二者均记录 model_name。
func GetModelLogStats(start int64) (map[string]*ModelLogStat, error) {
	result := make(map[string]*ModelLogStat)

	// 1) 成功调用：消费日志计数 + 平均耗时
	consumeQuery := DB.Table("logs").
		Select("model_name, COUNT(*) as request_count, AVG(use_time) as avg_use_time").
		Where("type = ?", LogTypeConsume)
	if start > 0 {
		consumeQuery = consumeQuery.Where("created_at >= ?", start)
	}
	var consumeRows []modelConsumeRow
	if err := consumeQuery.Group("model_name").Scan(&consumeRows).Error; err != nil {
		return nil, err
	}
	for _, row := range consumeRows {
		if row.ModelName == "" {
			continue
		}
		result[row.ModelName] = &ModelLogStat{
			ModelName:    row.ModelName,
			RequestCount: row.RequestCount,
			AvgUseTime:   row.AvgUseTime,
		}
	}

	// 2) 失败调用：错误日志计数
	errorQuery := DB.Table("logs").
		Select("model_name, COUNT(*) as error_count").
		Where("type = ?", LogTypeError)
	if start > 0 {
		errorQuery = errorQuery.Where("created_at >= ?", start)
	}
	var errorRows []modelErrorRow
	if err := errorQuery.Group("model_name").Scan(&errorRows).Error; err != nil {
		return nil, err
	}
	for _, row := range errorRows {
		if row.ModelName == "" {
			continue
		}
		item, ok := result[row.ModelName]
		if !ok {
			item = &ModelLogStat{ModelName: row.ModelName}
			result[row.ModelName] = item
		}
		item.ErrorCount = row.ErrorCount
	}

	return result, nil
}
