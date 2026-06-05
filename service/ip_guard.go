package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/go-redis/redis/v8"
)

// IP 守卫：防止单个用户的 APIKEY 被多人共享/倒卖。
//
// 规则（阈值均可通过环境变量调整，默认值即公益站需求）：
//  1. 滑动窗口 IP_GUARD_WINDOW_MINUTES（默认 30 分钟）内，
//     同一用户出现的不同 IP 数 >= IP_GUARD_DISTINCT_IP_THRESHOLD（默认 3）
//     → 立即禁用该用户的全部令牌，并记一次 strike，提示用户删除 API 重新创建；
//  2. IP_GUARD_STRIKE_WINDOW_HOURS（默认 24 小时）内 strike 累计
//     >= IP_GUARD_STRIKE_THRESHOLD（默认 3）→ 直接封禁用户（写入 LinuxDO 黑名单，重注册也拦截）。
//
// Redis 优先（滑动窗口用 ZSET，strike 用计数键）；未启用 Redis 时退化为进程内存实现。

// ipGuardConfig 守卫配置，进程启动时读取一次。
type ipGuardConfig struct {
	Enabled         bool
	WindowSeconds   int64 // IP 滑动窗口（秒）
	DistinctIPLimit int   // 触发禁用的不同 IP 阈值
	StrikeWindowSec int64 // strike 滑动窗口（秒）
	StrikeLimit     int   // 触发封禁的 strike 阈值
}

var ipGuardCfg ipGuardConfig

func init() {
	ipGuardCfg = ipGuardConfig{
		Enabled:         common.GetEnvOrDefaultBool("IP_GUARD_ENABLED", true),
		WindowSeconds:   int64(common.GetEnvOrDefault("IP_GUARD_WINDOW_MINUTES", 30)) * 60,
		DistinctIPLimit: common.GetEnvOrDefault("IP_GUARD_DISTINCT_IP_THRESHOLD", 3),
		StrikeWindowSec: int64(common.GetEnvOrDefault("IP_GUARD_STRIKE_WINDOW_HOURS", 24)) * 3600,
		StrikeLimit:     common.GetEnvOrDefault("IP_GUARD_STRIKE_THRESHOLD", 3),
	}
}

// IPGuardResult 守卫检测结果，供中间件决定是否拦截及提示文案。
type IPGuardResult struct {
	TriggerDisable bool // 本次触发了令牌禁用
	TriggerBan     bool // 本次触发了用户封禁
	DistinctIPs    int  // 当前窗口内的不同 IP 数（用于日志）
}

// 进程内存兜底所用的结构与锁
var (
	ipGuardMu      sync.Mutex
	memIPWindows   = make(map[int]map[string]int64) // userId -> (ip -> lastTs)
	memStrikeTimes = make(map[int][]int64)           // userId -> strike 时间戳列表
)

func ipWindowKey(userId int) string  { return fmt.Sprintf("ipguard:ips:%d", userId) }
func strikeCountKey(userId int) string { return fmt.Sprintf("ipguard:strikes:%d", userId) }

// CheckIPGuard 记录一次用户访问 IP 并执行守卫逻辑。
// 该函数对主请求容错：任何内部错误都降级为“不触发”，不影响正常转发。
func CheckIPGuard(userId int, clientIP string) IPGuardResult {
	if !ipGuardCfg.Enabled || userId <= 0 || clientIP == "" {
		return IPGuardResult{}
	}

	now := common.GetTimestamp()

	var distinct int
	if common.RedisEnabled {
		distinct = recordIPRedis(userId, clientIP, now)
	} else {
		distinct = recordIPMemory(userId, clientIP, now)
	}

	result := IPGuardResult{DistinctIPs: distinct}
	if distinct < ipGuardCfg.DistinctIPLimit {
		return result
	}

	// 触发：达到不同 IP 阈值
	result.TriggerDisable = true

	// 重置 IP 窗口，避免同一窗口内连环触发，给用户“删 key 重建”的机会
	resetIPWindow(userId)

	// 记录一次 strike，并判断是否累计到封禁阈值
	strikeCount := incrStrike(userId, now)

	// 立即禁用该用户全部令牌
	if err := model.DisableUserTokens(userId); err != nil {
		common.SysError(fmt.Sprintf("IP守卫禁用用户 %d 令牌失败: %s", userId, err.Error()))
	} else {
		common.SysLog(fmt.Sprintf("IP守卫：用户 %d 在 %d 秒窗口内出现 %d 个不同 IP，已禁用其令牌（第 %d 次 strike）",
			userId, ipGuardCfg.WindowSeconds, distinct, strikeCount))
	}

	if strikeCount >= ipGuardCfg.StrikeLimit {
		result.TriggerBan = true
		reason := fmt.Sprintf("IP守卫：%d 小时内累计 %d 次多IP异常，自动封禁", ipGuardCfg.StrikeWindowSec/3600, strikeCount)
		if err := model.BanUserByIPGuard(userId, reason); err != nil {
			common.SysError(fmt.Sprintf("IP守卫封禁用户 %d 失败: %s", userId, err.Error()))
		} else {
			common.SysLog(fmt.Sprintf("IP守卫：用户 %d 已被自动封禁并加入 LinuxDO 黑名单", userId))
		}
	}

	return result
}

// recordIPRedis 用 ZSET 维护滑动窗口，返回窗口内不同 IP 数。
func recordIPRedis(userId int, clientIP string, now int64) int {
	ctx := context.Background()
	key := ipWindowKey(userId)
	cutoff := now - ipGuardCfg.WindowSeconds

	pipe := common.RDB.Pipeline()
	pipe.ZAdd(ctx, key, &redis.Z{Score: float64(now), Member: clientIP})
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", cutoff))
	cardCmd := pipe.ZCard(ctx, key)
	pipe.Expire(ctx, key, time.Duration(ipGuardCfg.WindowSeconds)*time.Second)
	if _, err := pipe.Exec(ctx); err != nil {
		common.SysError("IP守卫 Redis 记录失败，降级放行: " + err.Error())
		return 0
	}
	return int(cardCmd.Val())
}

// recordIPMemory 进程内存版滑动窗口。
func recordIPMemory(userId int, clientIP string, now int64) int {
	cutoff := now - ipGuardCfg.WindowSeconds
	ipGuardMu.Lock()
	defer ipGuardMu.Unlock()

	window := memIPWindows[userId]
	if window == nil {
		window = make(map[string]int64)
		memIPWindows[userId] = window
	}
	window[clientIP] = now
	// 清理窗口外的 IP
	for ip, ts := range window {
		if ts < cutoff {
			delete(window, ip)
		}
	}
	return len(window)
}

// resetIPWindow 清空用户的 IP 滑动窗口。
func resetIPWindow(userId int) {
	if common.RedisEnabled {
		_ = common.RedisDelKey(ipWindowKey(userId))
		return
	}
	ipGuardMu.Lock()
	delete(memIPWindows, userId)
	ipGuardMu.Unlock()
}

// incrStrike 记一次 strike，返回 strike 窗口内的累计次数。
func incrStrike(userId int, now int64) int {
	if common.RedisEnabled {
		ctx := context.Background()
		key := strikeCountKey(userId)
		pipe := common.RDB.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		// 每次触发都续期，保证 strike 窗口为“最近 N 小时”
		pipe.Expire(ctx, key, time.Duration(ipGuardCfg.StrikeWindowSec)*time.Second)
		if _, err := pipe.Exec(ctx); err != nil {
			common.SysError("IP守卫 Redis strike 记录失败: " + err.Error())
			return 1
		}
		return int(incrCmd.Val())
	}

	cutoff := now - ipGuardCfg.StrikeWindowSec
	ipGuardMu.Lock()
	defer ipGuardMu.Unlock()
	times := memStrikeTimes[userId]
	kept := times[:0]
	for _, ts := range times {
		if ts >= cutoff {
			kept = append(kept, ts)
		}
	}
	kept = append(kept, now)
	memStrikeTimes[userId] = kept
	return len(kept)
}
