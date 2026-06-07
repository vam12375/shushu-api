package service

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/model"
)

const (
	modelHealthCacheTTL = 5 * time.Minute

	// 健康状态枚举
	ModelHealthStatusOnline   = "online"   // 全部渠道在线
	ModelHealthStatusDegraded = "degraded" // 部分渠道在线
	ModelHealthStatusOffline  = "offline"  // 无在线渠道
	ModelHealthStatusUnknown  = "unknown"  // 从未探活
)

// ModelHealthItem 单个模型的健康度（可用性为主，附带成功率）
type ModelHealthItem struct {
	ModelName       string  `json:"model_name"`
	Vendor          string  `json:"vendor"`
	VendorIcon      string  `json:"vendor_icon,omitempty"`
	Status          string  `json:"status"`
	TotalChannels   int     `json:"total_channels"`
	HealthyChannels int     `json:"healthy_channels"`
	AvgResponseTime int     `json:"avg_response_time_ms"` // 毫秒
	LastTestTime    int64   `json:"last_test_time"`
	SuccessRate     float64 `json:"success_rate"` // 0~1，附带（按所选周期日志计算）
	RequestCount    int64   `json:"request_count"`
	ErrorCount      int64   `json:"error_count"`
	AvgUseTime      float64 `json:"avg_use_time"` // 秒
}

// ModelHealthSummary 顶部概览
type ModelHealthSummary struct {
	TotalModels   int `json:"total_models"`
	Online        int `json:"online"`
	Degraded      int `json:"degraded"`
	Offline       int `json:"offline"`
	Unknown       int `json:"unknown"`
	TotalChannels int `json:"total_channels"`
}

// ModelHealthResponse 接口返回体
type ModelHealthResponse struct {
	Period    string             `json:"period"`
	UpdatedAt int64              `json:"updated_at"`
	Summary   ModelHealthSummary `json:"summary"`
	Models    []ModelHealthItem  `json:"models"`
}

type modelHealthCacheItem struct {
	expiresAt time.Time
	data      *ModelHealthResponse
}

var (
	modelHealthCacheMu sync.Mutex
	modelHealthCache   = map[string]modelHealthCacheItem{}
)

// modelHealthPeriodStart 将周期标识转换为起始时间戳（<=0 表示不限制）。
func modelHealthPeriodStart(period string, now time.Time) (string, int64, error) {
	switch period {
	case "today":
		return "today", now.Add(-24 * time.Hour).Unix(), nil
	case "", "week":
		return "week", now.Add(-7 * 24 * time.Hour).Unix(), nil
	case "month":
		return "month", now.Add(-30 * 24 * time.Hour).Unix(), nil
	case "all":
		return "all", 0, nil
	default:
		return "", 0, fmt.Errorf("invalid model health period: %s", period)
	}
}

// GetModelHealthSnapshot 返回模型健康度快照（带 5 分钟缓存）。
func GetModelHealthSnapshot(period string) (*ModelHealthResponse, error) {
	now := time.Now()
	normalizedPeriod, start, err := modelHealthPeriodStart(period, now)
	if err != nil {
		return nil, err
	}

	modelHealthCacheMu.Lock()
	if item, ok := modelHealthCache[normalizedPeriod]; ok && now.Before(item.expiresAt) {
		modelHealthCacheMu.Unlock()
		return item.data, nil
	}
	modelHealthCacheMu.Unlock()

	data, err := buildModelHealthSnapshot(normalizedPeriod, start)
	if err != nil {
		return nil, err
	}
	data.UpdatedAt = now.Unix()

	modelHealthCacheMu.Lock()
	modelHealthCache[normalizedPeriod] = modelHealthCacheItem{
		expiresAt: now.Add(modelHealthCacheTTL),
		data:      data,
	}
	modelHealthCacheMu.Unlock()

	return data, nil
}

func buildModelHealthSnapshot(period string, start int64) (*ModelHealthResponse, error) {
	channelStats, err := model.GetModelChannelHealthStats()
	if err != nil {
		return nil, err
	}
	logStats, err := model.GetModelLogStats(start)
	if err != nil {
		return nil, err
	}

	meta := buildModelHealthMeta()

	items := make([]ModelHealthItem, 0, len(meta))
	summary := ModelHealthSummary{}

	for modelName, vendorMeta := range meta {
		stat, ok := channelStats[modelName]
		if !ok {
			// 公开定价中存在、但当前无任何渠道提供：视为离线
			stat = &model.ModelChannelHealth{ModelName: modelName}
		}

		item := ModelHealthItem{
			ModelName:       modelName,
			Vendor:          vendorMeta.vendor,
			VendorIcon:      vendorMeta.vendorIcon,
			TotalChannels:   stat.TotalChannels,
			HealthyChannels: stat.HealthyChannels,
			AvgResponseTime: int(math.Round(stat.AvgResponseTime)),
			LastTestTime:    stat.LastTestTime,
			Status:          computeHealthStatus(stat),
		}

		if logStat, ok := logStats[modelName]; ok {
			item.RequestCount = logStat.RequestCount
			item.ErrorCount = logStat.ErrorCount
			item.AvgUseTime = roundFloat(logStat.AvgUseTime, 2)
			total := logStat.RequestCount + logStat.ErrorCount
			if total > 0 {
				item.SuccessRate = roundFloat(float64(logStat.RequestCount)/float64(total), 4)
			}
		}

		accumulateSummary(&summary, item)
		items = append(items, item)
	}

	sortModelHealthItems(items)

	summary.TotalModels = len(items)

	return &ModelHealthResponse{
		Period:  period,
		Summary: summary,
		Models:  items,
	}, nil
}

// computeHealthStatus 依据在线/总渠道数与探活情况计算健康状态。
func computeHealthStatus(stat *model.ModelChannelHealth) string {
	if stat.HealthyChannels <= 0 {
		// 有渠道但全部禁用/离线 => 离线；完全没有渠道 => 离线
		return ModelHealthStatusOffline
	}
	if stat.LastTestTime <= 0 {
		// 有在线渠道但从未探活，无法确认实际可用性
		return ModelHealthStatusUnknown
	}
	if stat.HealthyChannels < stat.TotalChannels {
		return ModelHealthStatusDegraded
	}
	return ModelHealthStatusOnline
}

func accumulateSummary(summary *ModelHealthSummary, item ModelHealthItem) {
	summary.TotalChannels += item.TotalChannels
	switch item.Status {
	case ModelHealthStatusOnline:
		summary.Online++
	case ModelHealthStatusDegraded:
		summary.Degraded++
	case ModelHealthStatusOffline:
		summary.Offline++
	default:
		summary.Unknown++
	}
}

// sortModelHealthItems 排序：在线优先级（离线优先暴露）、再按调用量、再按模型名。
func sortModelHealthItems(items []ModelHealthItem) {
	order := map[string]int{
		ModelHealthStatusOffline:  0,
		ModelHealthStatusDegraded: 1,
		ModelHealthStatusUnknown:  2,
		ModelHealthStatusOnline:   3,
	}
	sort.SliceStable(items, func(i, j int) bool {
		oi, oj := order[items[i].Status], order[items[j].Status]
		if oi != oj {
			return oi < oj
		}
		if items[i].RequestCount != items[j].RequestCount {
			return items[i].RequestCount > items[j].RequestCount
		}
		return items[i].ModelName < items[j].ModelName
	})
}

type modelHealthMeta struct {
	vendor     string
	vendorIcon string
}

// buildModelHealthMeta 从公开定价构建 模型名 -> 厂商信息 映射（仅展示面向用户的公开模型）。
func buildModelHealthMeta() map[string]modelHealthMeta {
	vendorByID := make(map[int]model.PricingVendor)
	for _, vendor := range model.GetVendors() {
		vendorByID[vendor.ID] = vendor
	}

	meta := make(map[string]modelHealthMeta)
	for _, pricing := range model.GetPricing() {
		item := modelHealthMeta{vendor: "Unknown"}
		if vendor, ok := vendorByID[pricing.VendorID]; ok {
			item.vendor = vendor.Name
			item.vendorIcon = vendor.Icon
		} else if pricing.OwnerBy != "" {
			item.vendor = pricing.OwnerBy
		}
		meta[pricing.ModelName] = item
	}
	return meta
}

func roundFloat(v float64, precision int) float64 {
	pow := math.Pow(10, float64(precision))
	return math.Round(v*pow) / pow
}
