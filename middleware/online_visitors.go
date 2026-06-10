package middleware

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"

	"github.com/go-redis/redis/v8"
)

// 在线访客统计:以 /api/status 的访问作为"最近活跃访客"信号。
// active_connections 只反映瞬时请求压力,不适合作为首页"在线用户"口径,
// 这里改为统计活跃窗口内访问过站点的去重 IP 数:
// 单机使用内存兜底,Redis 可用时跨实例聚合。

const (
	// 活跃窗口:窗口内访问过即视为在线
	onlineVisitorWindow = 5 * time.Minute
	// Redis 有序集合 key:member=访客IP,score=最近活跃时间戳
	onlineVisitorRedisKey = "online_visitors"
)

var (
	onlineVisitorMu  sync.Mutex
	onlineVisitorMem = make(map[string]int64) // 内存兜底:IP -> 最近活跃时间戳
)

// RecordVisitor 记录一次访客活跃(以 IP 为去重维度)
func RecordVisitor(ip string) {
	if ip == "" {
		return
	}
	now := time.Now().Unix()

	// 内存始终记录,作为 Redis 不可用或写入失败时的兜底
	onlineVisitorMu.Lock()
	onlineVisitorMem[ip] = now
	onlineVisitorMu.Unlock()

	if common.RedisEnabled {
		ctx := context.Background()
		// Redis 写入失败时静默降级到内存统计,不影响 /api/status 主流程
		if err := common.RDB.ZAdd(ctx, onlineVisitorRedisKey, &redis.Z{
			Score:  float64(now),
			Member: ip,
		}).Err(); err == nil {
			// 设置过期时间,避免长期无人访问时残留数据
			common.RDB.Expire(ctx, onlineVisitorRedisKey, onlineVisitorWindow*2)
		}
	}
}

// GetOnlineVisitors 返回活跃窗口内的去重访客数;Redis 可用时为跨实例口径
func GetOnlineVisitors() int64 {
	cutoff := time.Now().Add(-onlineVisitorWindow).Unix()

	if common.RedisEnabled {
		ctx := context.Background()
		// 先清理窗口外的成员再计数;任一步失败则回落到内存统计
		if err := common.RDB.ZRemRangeByScore(ctx, onlineVisitorRedisKey, "-inf", strconv.FormatInt(cutoff, 10)).Err(); err == nil {
			if count, err := common.RDB.ZCard(ctx, onlineVisitorRedisKey).Result(); err == nil {
				return count
			}
		}
	}

	onlineVisitorMu.Lock()
	defer onlineVisitorMu.Unlock()
	var count int64
	for ip, ts := range onlineVisitorMem {
		if ts < cutoff {
			// 顺手清理过期访客,防止内存无界增长
			delete(onlineVisitorMem, ip)
			continue
		}
		count++
	}
	return count
}
