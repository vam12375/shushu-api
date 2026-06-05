package service

import (
	"fmt"
	"testing"
)

// 这些测试覆盖 IP 守卫的纯内存滑动窗口逻辑（不依赖 Redis / DB）。
// 通过临时调整 ipGuardCfg 并直接调用底层 record/incr 函数，验证窗口与 strike 计数。
//
// 运行：go test ./service/ -run TestIPGuard -v

func resetIPGuardState() {
	ipGuardMu.Lock()
	memIPWindows = make(map[int]map[string]int64)
	memStrikeTimes = make(map[int][]int64)
	ipGuardMu.Unlock()
}

// 验证：滑动窗口内不同 IP 计数正确，过期 IP 被剔除。
func TestIPGuardMemoryWindowDistinctCount(t *testing.T) {
	resetIPGuardState()
	old := ipGuardCfg
	defer func() { ipGuardCfg = old }()
	ipGuardCfg.WindowSeconds = 1800 // 30 分钟

	userId := 1001
	base := int64(1_000_000)

	if got := recordIPMemory(userId, "1.1.1.1", base); got != 1 {
		t.Fatalf("第 1 个 IP，期望 distinct=1，实际=%d", got)
	}
	if got := recordIPMemory(userId, "1.1.1.1", base+10); got != 1 {
		t.Fatalf("重复 IP 不应增加计数，期望 distinct=1，实际=%d", got)
	}
	if got := recordIPMemory(userId, "2.2.2.2", base+20); got != 2 {
		t.Fatalf("第 2 个不同 IP，期望 distinct=2，实际=%d", got)
	}
	// 第 3 个 IP 在窗口外（>1800s 前的第一个 IP 应被剔除，但这里第 3 个是新时刻）
	if got := recordIPMemory(userId, "3.3.3.3", base+30); got != 3 {
		t.Fatalf("第 3 个不同 IP，期望 distinct=3，实际=%d", got)
	}

	// 推进时间到让前面 IP 全部过期
	farFuture := base + 30 + ipGuardCfg.WindowSeconds + 1
	if got := recordIPMemory(userId, "4.4.4.4", farFuture); got != 1 {
		t.Fatalf("窗口外旧 IP 应被剔除，仅剩当前 IP，期望 distinct=1，实际=%d", got)
	}
}

// 验证：strike 计数在窗口内累加，窗口外重置。
func TestIPGuardMemoryStrikeCount(t *testing.T) {
	resetIPGuardState()
	old := ipGuardCfg
	defer func() { ipGuardCfg = old }()
	ipGuardCfg.StrikeWindowSec = 86400 // 24 小时

	userId := 2002
	base := int64(2_000_000)

	if got := incrStrike(userId, base); got != 1 {
		t.Fatalf("第 1 次 strike，期望 1，实际 %d", got)
	}
	if got := incrStrike(userId, base+100); got != 2 {
		t.Fatalf("第 2 次 strike，期望 2，实际 %d", got)
	}
	if got := incrStrike(userId, base+200); got != 3 {
		t.Fatalf("第 3 次 strike，期望 3（应触发封禁阈值），实际 %d", got)
	}

	// 24 小时之后的新 strike，旧记录过期，计数重置为 1
	farFuture := base + 200 + ipGuardCfg.StrikeWindowSec + 1
	if got := incrStrike(userId, farFuture); got != 1 {
		t.Fatalf("窗口外 strike 应重置，期望 1，实际 %d", got)
	}
}

// 验证：完整阈值判定逻辑——distinct 达标即应触发禁用。
func TestIPGuardDistinctThresholdBoundary(t *testing.T) {
	resetIPGuardState()
	old := ipGuardCfg
	defer func() { ipGuardCfg = old }()
	ipGuardCfg.WindowSeconds = 1800
	ipGuardCfg.DistinctIPLimit = 3

	userId := 3003
	base := int64(3_000_000)

	distinct := 0
	for i, ip := range []string{"10.0.0.1", "10.0.0.2", "10.0.0.3"} {
		distinct = recordIPMemory(userId, ip, base+int64(i))
	}
	if distinct < ipGuardCfg.DistinctIPLimit {
		t.Fatalf("3 个不同 IP 应达到禁用阈值 %d，实际 distinct=%d", ipGuardCfg.DistinctIPLimit, distinct)
	}
	fmt.Printf("✓ 阈值判定正确：distinct=%d >= limit=%d\n", distinct, ipGuardCfg.DistinctIPLimit)
}
