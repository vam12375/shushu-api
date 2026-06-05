package mimo

import "testing"

func TestBaseURLNormalization(t *testing.T) {
	tests := []struct {
		name          string
		baseURL       string
		wantOpenAI    string
		wantAnthropic string
	}{
		{
			name:          "root base url",
			baseURL:       "https://token-plan-cn.xiaomimimo.com",
			wantOpenAI:    "https://token-plan-cn.xiaomimimo.com/v1",
			wantAnthropic: "https://token-plan-cn.xiaomimimo.com/anthropic",
		},
		{
			name:          "openai base url from dashboard",
			baseURL:       "https://token-plan-cn.xiaomimimo.com/v1",
			wantOpenAI:    "https://token-plan-cn.xiaomimimo.com/v1",
			wantAnthropic: "https://token-plan-cn.xiaomimimo.com/anthropic",
		},
		{
			name:          "anthropic base url from dashboard",
			baseURL:       "https://token-plan-cn.xiaomimimo.com/anthropic",
			wantOpenAI:    "https://token-plan-cn.xiaomimimo.com/v1",
			wantAnthropic: "https://token-plan-cn.xiaomimimo.com/anthropic",
		},
		{
			name:          "trailing slash",
			baseURL:       "https://token-plan-cn.xiaomimimo.com/v1/",
			wantOpenAI:    "https://token-plan-cn.xiaomimimo.com/v1",
			wantAnthropic: "https://token-plan-cn.xiaomimimo.com/anthropic",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OpenAIBaseURL(tt.baseURL); got != tt.wantOpenAI {
				t.Fatalf("OpenAIBaseURL() = %q, want %q", got, tt.wantOpenAI)
			}
			if got := AnthropicBaseURL(tt.baseURL); got != tt.wantAnthropic {
				t.Fatalf("AnthropicBaseURL() = %q, want %q", got, tt.wantAnthropic)
			}
		})
	}
}

func TestBuildOpenAIRequestURL(t *testing.T) {
	tests := []struct {
		name       string
		baseURL    string
		requestURL string
		want       string
	}{
		{
			name:       "root base with v1 request path",
			baseURL:    "https://token-plan-cn.xiaomimimo.com",
			requestURL: "/v1/chat/completions",
			want:       "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
		},
		{
			name:       "v1 base with v1 request path",
			baseURL:    "https://token-plan-cn.xiaomimimo.com/v1",
			requestURL: "/v1/audio/speech",
			want:       "https://token-plan-cn.xiaomimimo.com/v1/audio/speech",
		},
		{
			name:       "anthropic base with v1 request path",
			baseURL:    "https://token-plan-cn.xiaomimimo.com/anthropic",
			requestURL: "/v1/embeddings",
			want:       "https://token-plan-cn.xiaomimimo.com/v1/embeddings",
		},
		{
			name:       "request path with query",
			baseURL:    "https://token-plan-cn.xiaomimimo.com/v1",
			requestURL: "/v1/responses?trace=true",
			want:       "https://token-plan-cn.xiaomimimo.com/v1/responses?trace=true",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BuildOpenAIRequestURL(tt.baseURL, tt.requestURL); got != tt.want {
				t.Fatalf("BuildOpenAIRequestURL() = %q, want %q", got, tt.want)
			}
		})
	}
}
