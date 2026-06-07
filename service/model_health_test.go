package service

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
)

func TestComputeHealthStatus(t *testing.T) {
	cases := []struct {
		name string
		stat model.ModelChannelHealth
		want string
	}{
		{
			name: "no channels => offline",
			stat: model.ModelChannelHealth{TotalChannels: 0, HealthyChannels: 0},
			want: ModelHealthStatusOffline,
		},
		{
			name: "all channels disabled => offline",
			stat: model.ModelChannelHealth{TotalChannels: 3, HealthyChannels: 0},
			want: ModelHealthStatusOffline,
		},
		{
			name: "healthy but never tested => unknown",
			stat: model.ModelChannelHealth{TotalChannels: 2, HealthyChannels: 2, LastTestTime: 0},
			want: ModelHealthStatusUnknown,
		},
		{
			name: "partial healthy => degraded",
			stat: model.ModelChannelHealth{TotalChannels: 3, HealthyChannels: 1, LastTestTime: 100},
			want: ModelHealthStatusDegraded,
		},
		{
			name: "all healthy and tested => online",
			stat: model.ModelChannelHealth{TotalChannels: 2, HealthyChannels: 2, LastTestTime: 100},
			want: ModelHealthStatusOnline,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := computeHealthStatus(&tc.stat)
			if got != tc.want {
				t.Fatalf("computeHealthStatus = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestModelHealthPeriodStart(t *testing.T) {
	now := time.Unix(1_000_000, 0)
	cases := []struct {
		period     string
		wantID     string
		wantStart  int64
		expectErr  bool
		limitCheck bool
	}{
		{period: "", wantID: "week", wantStart: now.Add(-7 * 24 * time.Hour).Unix()},
		{period: "today", wantID: "today", wantStart: now.Add(-24 * time.Hour).Unix()},
		{period: "month", wantID: "month", wantStart: now.Add(-30 * 24 * time.Hour).Unix()},
		{period: "all", wantID: "all", wantStart: 0},
		{period: "bogus", expectErr: true},
	}

	for _, tc := range cases {
		id, start, err := modelHealthPeriodStart(tc.period, now)
		if tc.expectErr {
			if err == nil {
				t.Fatalf("period %q: expected error, got nil", tc.period)
			}
			continue
		}
		if err != nil {
			t.Fatalf("period %q: unexpected error %v", tc.period, err)
		}
		if id != tc.wantID {
			t.Fatalf("period %q: id = %q, want %q", tc.period, id, tc.wantID)
		}
		if start != tc.wantStart {
			t.Fatalf("period %q: start = %d, want %d", tc.period, start, tc.wantStart)
		}
	}
}

func TestSortModelHealthItems(t *testing.T) {
	items := []ModelHealthItem{
		{ModelName: "a-online", Status: ModelHealthStatusOnline, RequestCount: 100},
		{ModelName: "b-offline", Status: ModelHealthStatusOffline, RequestCount: 1},
		{ModelName: "c-degraded", Status: ModelHealthStatusDegraded, RequestCount: 5},
		{ModelName: "d-online-busier", Status: ModelHealthStatusOnline, RequestCount: 500},
	}

	sortModelHealthItems(items)

	// 离线优先暴露
	if items[0].Status != ModelHealthStatusOffline {
		t.Fatalf("first item status = %q, want offline", items[0].Status)
	}
	if items[1].Status != ModelHealthStatusDegraded {
		t.Fatalf("second item status = %q, want degraded", items[1].Status)
	}
	// 同为在线时，调用量大的排前面
	if items[2].ModelName != "d-online-busier" {
		t.Fatalf("third item = %q, want d-online-busier", items[2].ModelName)
	}
}

func TestAccumulateSummary(t *testing.T) {
	summary := ModelHealthSummary{}
	accumulateSummary(&summary, ModelHealthItem{Status: ModelHealthStatusOnline, TotalChannels: 2})
	accumulateSummary(&summary, ModelHealthItem{Status: ModelHealthStatusDegraded, TotalChannels: 3})
	accumulateSummary(&summary, ModelHealthItem{Status: ModelHealthStatusOffline, TotalChannels: 0})
	accumulateSummary(&summary, ModelHealthItem{Status: ModelHealthStatusUnknown, TotalChannels: 1})

	if summary.Online != 1 || summary.Degraded != 1 || summary.Offline != 1 || summary.Unknown != 1 {
		t.Fatalf("unexpected status counts: %+v", summary)
	}
	if summary.TotalChannels != 6 {
		t.Fatalf("TotalChannels = %d, want 6", summary.TotalChannels)
	}
}

func TestRoundFloat(t *testing.T) {
	if got := roundFloat(0.123456, 4); got != 0.1235 {
		t.Fatalf("roundFloat(0.123456,4) = %v, want 0.1235", got)
	}
	if got := roundFloat(12.345, 2); got != 12.35 {
		t.Fatalf("roundFloat(12.345,2) = %v, want 12.35", got)
	}
}
