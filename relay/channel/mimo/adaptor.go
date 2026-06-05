package mimo

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	channelconstant "github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/relay/channel"
	"github.com/QuantumNous/new-api/relay/channel/claude"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

type Adaptor struct {
}

func (a *Adaptor) ConvertGeminiRequest(*gin.Context, *relaycommon.RelayInfo, *dto.GeminiChatRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertClaudeRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.ClaudeRequest) (any, error) {
	adaptor := claude.Adaptor{}
	return adaptor.ConvertClaudeRequest(c, info, request)
}

func (a *Adaptor) ConvertAudioRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.AudioRequest) (io.Reader, error) {
	adaptor := openai.Adaptor{}
	return adaptor.ConvertAudioRequest(c, info, request)
}

func (a *Adaptor) ConvertImageRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.ImageRequest) (any, error) {
	adaptor := openai.Adaptor{}
	return adaptor.ConvertImageRequest(c, info, request)
}

func (a *Adaptor) Init(info *relaycommon.RelayInfo) {
}

func (a *Adaptor) GetRequestURL(info *relaycommon.RelayInfo) (string, error) {
	baseURL := resolveBaseURL(info)
	if info.RelayFormat == types.RelayFormatClaude {
		requestURL := fmt.Sprintf("%s/v1/messages", AnthropicBaseURL(baseURL))
		return appendClaudeBetaQuery(requestURL, info)
	}
	return BuildOpenAIRequestURL(baseURL, info.RequestURLPath), nil
}

func resolveBaseURL(info *relaycommon.RelayInfo) string {
	if info != nil && info.ChannelBaseUrl != "" {
		return strings.TrimRight(info.ChannelBaseUrl, "/")
	}
	return strings.TrimRight(channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeMiMo], "/")
}

func OpenAIBaseURL(baseURL string) string {
	baseURL = normalizeBaseURL(baseURL)
	if strings.HasSuffix(baseURL, "/v1") {
		return baseURL
	}
	if strings.HasSuffix(baseURL, "/anthropic") {
		return strings.TrimSuffix(baseURL, "/anthropic") + "/v1"
	}
	return baseURL + "/v1"
}

func AnthropicBaseURL(baseURL string) string {
	baseURL = normalizeBaseURL(baseURL)
	if strings.HasSuffix(baseURL, "/anthropic") {
		return baseURL
	}
	if strings.HasSuffix(baseURL, "/v1") {
		return strings.TrimSuffix(baseURL, "/v1") + "/anthropic"
	}
	return baseURL + "/anthropic"
}

func normalizeBaseURL(baseURL string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = strings.TrimRight(channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeMiMo], "/")
	}
	return baseURL
}

func BuildOpenAIRequestURL(baseURL string, requestURLPath string) string {
	requestURLPath = strings.TrimSpace(requestURLPath)
	if requestURLPath == "" {
		requestURLPath = "/v1/chat/completions"
	}
	requestURLPath = strings.TrimPrefix(requestURLPath, "/v1")
	if requestURLPath == "" {
		requestURLPath = "/"
	}
	if !strings.HasPrefix(requestURLPath, "/") {
		requestURLPath = "/" + requestURLPath
	}
	return OpenAIBaseURL(baseURL) + requestURLPath
}

func appendClaudeBetaQuery(requestURL string, info *relaycommon.RelayInfo) (string, error) {
	if info == nil || (!info.IsClaudeBetaQuery && !info.ChannelOtherSettings.ClaudeBetaQuery) {
		return requestURL, nil
	}
	parsedURL, err := url.Parse(requestURL)
	if err != nil {
		return "", err
	}
	query := parsedURL.Query()
	query.Set("beta", "true")
	parsedURL.RawQuery = query.Encode()
	return parsedURL.String(), nil
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Header, info *relaycommon.RelayInfo) error {
	channel.SetupApiRequestHeader(info, c, req)
	req.Set("Authorization", "Bearer "+info.ApiKey)
	if info.RelayFormat == types.RelayFormatClaude {
		anthropicVersion := c.Request.Header.Get("anthropic-version")
		if anthropicVersion == "" {
			anthropicVersion = "2023-06-01"
		}
		req.Set("anthropic-version", anthropicVersion)
		claude.CommonClaudeHeadersOperation(c, req, info)
	}
	return nil
}

func (a *Adaptor) ConvertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) ConvertRerankRequest(c *gin.Context, relayMode int, request dto.RerankRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) ConvertEmbeddingRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.EmbeddingRequest) (any, error) {
	return request, nil
}

func (a *Adaptor) ConvertOpenAIResponsesRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.OpenAIResponsesRequest) (any, error) {
	return request, nil
}

func (a *Adaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (any, error) {
	if info.RelayMode == relayconstant.RelayModeAudioTranscription ||
		info.RelayMode == relayconstant.RelayModeAudioTranslation ||
		(info.RelayMode == relayconstant.RelayModeImagesEdits && !isJSONRequest(c)) {
		return channel.DoFormRequest(a, c, info, requestBody)
	}
	if info.RelayMode == relayconstant.RelayModeRealtime {
		return channel.DoWssRequest(a, c, info, requestBody)
	}
	return channel.DoApiRequest(a, c, info, requestBody)
}

func isJSONRequest(c *gin.Context) bool {
	if c == nil || c.Request == nil {
		return false
	}
	return strings.HasPrefix(c.Request.Header.Get("Content-Type"), "application/json")
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (usage any, err *types.NewAPIError) {
	if info.RelayFormat == types.RelayFormatClaude {
		adaptor := claude.Adaptor{}
		return adaptor.DoResponse(c, resp, info)
	}
	adaptor := openai.Adaptor{}
	return adaptor.DoResponse(c, resp, info)
}

func (a *Adaptor) GetModelList() []string {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return ChannelName
}
