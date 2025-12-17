package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	err := InitDB()
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
	}
}

// AI Provider configuration
const (
	GeminiAPIEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
	OllamaEndpoint    = "http://localhost:11434/api/generate"
	OllamaModel       = "llama3.1:8b" // Fallback model

	// Hugging Face API configuration
	HuggingFaceAPIBase   = "https://api-inference.huggingface.co/models/"
	HFTextModel          = "mistralai/Mistral-7B-Instruct-v0.3"
	HFImageModel         = "black-forest-labs/FLUX.1-dev"
	HFWhisperModel       = "openai/whisper-large-v3-turbo"
	HFEmbeddingModel     = "sentence-transformers/all-MiniLM-L6-v2"
	HFSummarizationModel = "facebook/bart-large-cnn"
	HFTranslationModel   = "facebook/nllb-200-distilled-600M"
	HFSentimentModel     = "cardiffnlp/twitter-roberta-base-sentiment-latest"
	HFZeroShotModel      = "facebook/bart-large-mnli"
)

// GetGeminiAPIKey returns the API key from environment or config
func getGeminiAPIKey() string {
	// Try environment variable first
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		return key
	}
	// Try reading from config file
	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".apostrophe", "gemini_key.txt")
	if data, err := os.ReadFile(configPath); err == nil {
		return strings.TrimSpace(string(data))
	}
	return ""
}

// getHuggingFaceAPIKey returns the HF API key from environment or config
func getHuggingFaceAPIKey() string {
	if key := os.Getenv("HUGGINGFACE_API_KEY"); key != "" {
		return key
	}
	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".apostrophe", "hf_key.txt")
	if data, err := os.ReadFile(configPath); err == nil {
		return strings.TrimSpace(string(data))
	}
	return ""
}

// Gemini API types
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

// Ollama API types
type OllamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type OllamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// Hugging Face API types
type HFTextRequest struct {
	Inputs     string       `json:"inputs"`
	Parameters HFTextParams `json:"parameters,omitempty"`
}

type HFTextParams struct {
	MaxNewTokens   int     `json:"max_new_tokens,omitempty"`
	Temperature    float64 `json:"temperature,omitempty"`
	ReturnFullText bool    `json:"return_full_text"`
}

type HFImageRequest struct {
	Inputs string `json:"inputs"`
}

type HFEmbeddingRequest struct {
	Inputs  []string `json:"inputs"`
	Options struct {
		WaitForModel bool `json:"wait_for_model"`
	} `json:"options"`
}

type HFSummarizeRequest struct {
	Inputs     string `json:"inputs"`
	Parameters struct {
		MaxLength int `json:"max_length,omitempty"`
		MinLength int `json:"min_length,omitempty"`
	} `json:"parameters,omitempty"`
}

type HFZeroShotRequest struct {
	Inputs     string `json:"inputs"`
	Parameters struct {
		CandidateLabels []string `json:"candidate_labels"`
	} `json:"parameters"`
}

type HFZeroShotResponse struct {
	Sequence string    `json:"sequence"`
	Labels   []string  `json:"labels"`
	Scores   []float64 `json:"scores"`
}

type HFSentimentResponse struct {
	Label string  `json:"label"`
	Score float64 `json:"score"`
}

// GenerateContent generates text based on a prompt (Gemini with Ollama fallback)
func (a *App) GenerateContent(prompt string) string {
	return a.callAI(prompt)
}

// AskAI generates an answer to a question based on provided context (note content)
func (a *App) AskAI(question string, context string) string {
	prompt := fmt.Sprintf("Context:\n%s\n\nQuestion: %s\n\nAnswer the question based on the context above. If the answer is not in the context, say so but try to be helpful based on general knowledge if appropriate.", context, question)
	return a.callAI(prompt)
}

// ProcessContent transforms existing text (format, highlight, etc.)
func (a *App) ProcessContent(text string, instruction string) string {
	prompt := fmt.Sprintf("%s\n\nContent:\n%s", instruction, text)
	return a.callAI(prompt)
}

// callAI tries Gemini first, then HuggingFace, then falls back to Ollama
func (a *App) callAI(prompt string) string {
	// Try Gemini first
	result, err := a.callGemini(prompt)
	if err == nil && result != "" {
		return result
	}
	fmt.Printf("Gemini failed (%v), trying Hugging Face...\n", err)

	// Try Hugging Face second
	result, err = a.callHuggingFaceText(prompt)
	if err == nil && result != "" {
		return result
	}
	fmt.Printf("Hugging Face failed (%v), falling back to Ollama...\n", err)

	// Fallback to Ollama
	result, err = a.callOllama(prompt)
	if err != nil {
		return "Error: All AI providers failed. " + err.Error()
	}
	return result
}

// callGemini calls the Gemini API
func (a *App) callGemini(prompt string) (string, error) {
	apiKey := getGeminiAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Gemini API key configured")
	}

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("%s?key=%s", GeminiAPIEndpoint, apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// Check for rate limit or other errors
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("rate limited")
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API error: status %d", resp.StatusCode)
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", fmt.Errorf("parse error: %v", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("empty response")
}

// callOllama calls the local Ollama API
func (a *App) callOllama(prompt string) (string, error) {
	fmt.Printf("Calling Ollama with prompt: %s\n", prompt[:min(100, len(prompt))])

	reqBody, _ := json.Marshal(OllamaRequest{
		Model:  OllamaModel,
		Prompt: prompt,
		Stream: false,
	})

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Post(OllamaEndpoint, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("Ollama connection error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var ollamaResp OllamaResponse
	json.Unmarshal(body, &ollamaResp)

	if ollamaResp.Response == "" {
		return "", fmt.Errorf("no response from Ollama")
	}

	return ollamaResp.Response, nil
}

// callHuggingFaceText calls the Hugging Face text generation API
func (a *App) callHuggingFaceText(prompt string) (string, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

	fmt.Printf("Calling Hugging Face with prompt: %s\n", prompt[:min(100, len(prompt))])

	reqBody := HFTextRequest{
		Inputs: prompt,
		Parameters: HFTextParams{
			MaxNewTokens:   1024,
			Temperature:    0.7,
			ReturnFullText: false,
		},
	}

	return a.callHuggingFaceAPI(HFTextModel, reqBody)
}

// callHuggingFaceAPI is a generic helper for HF API calls that return text
func (a *App) callHuggingFaceAPI(model string, payload interface{}) (string, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal error: %v", err)
	}

	url := HuggingFaceAPIBase + model
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("request error: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// Handle HF-specific status codes
	if resp.StatusCode == 503 {
		return "", fmt.Errorf("model loading, try again")
	}
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("rate limited")
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API error: status %d - %s", resp.StatusCode, string(body))
	}

	// HF returns array of objects with generated_text
	var textResp []struct {
		GeneratedText string `json:"generated_text"`
	}
	if err := json.Unmarshal(body, &textResp); err != nil {
		return "", fmt.Errorf("parse error: %v", err)
	}

	if len(textResp) > 0 && textResp[0].GeneratedText != "" {
		return textResp[0].GeneratedText, nil
	}

	return "", fmt.Errorf("empty response from Hugging Face")
}

// GenerateCoverImage generates an image for a note cover using FLUX
func (a *App) GenerateCoverImage(prompt string, noteId string) (string, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

	reqBody := HFImageRequest{Inputs: prompt}
	jsonBody, _ := json.Marshal(reqBody)

	url := HuggingFaceAPIBase + HFImageModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("image API error: %d - %s", resp.StatusCode, string(body))
	}

	// Response is raw image bytes
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Save to notes-images directory
	homeDir, _ := os.UserHomeDir()
	imagesDir := filepath.Join(homeDir, "notes-images", noteId)
	os.MkdirAll(imagesDir, 0755)

	filePath := filepath.Join(imagesDir, "cover.png")
	if err := os.WriteFile(filePath, imageData, 0644); err != nil {
		return "", err
	}

	return "file:///" + filepath.ToSlash(filePath), nil
}

// TranscribeAudio transcribes audio to text using Whisper
func (a *App) TranscribeAudio(audioBase64 string) (string, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

	// Decode base64 audio
	if idx := strings.Index(audioBase64, ","); idx != -1 {
		audioBase64 = audioBase64[idx+1:]
	}
	audioData, err := base64.StdEncoding.DecodeString(audioBase64)
	if err != nil {
		return "", fmt.Errorf("invalid audio data: %v", err)
	}

	url := HuggingFaceAPIBase + HFWhisperModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(audioData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "audio/wav")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("whisper API error: %d - %s", resp.StatusCode, string(body))
	}

	var result struct {
		Text string `json:"text"`
	}
	json.Unmarshal(body, &result)

	return result.Text, nil
}

// GetEmbeddings returns vector embeddings for semantic search
func (a *App) GetEmbeddings(texts []string) ([][]float32, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("no Hugging Face API key configured")
	}

	reqBody := HFEmbeddingRequest{Inputs: texts}
	reqBody.Options.WaitForModel = true
	jsonBody, _ := json.Marshal(reqBody)

	url := HuggingFaceAPIBase + HFEmbeddingModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("embedding API error: %d - %s", resp.StatusCode, string(body))
	}

	var embeddings [][]float32
	if err := json.Unmarshal(body, &embeddings); err != nil {
		return nil, fmt.Errorf("parse error: %v", err)
	}

	return embeddings, nil
}

// SummarizeText generates a summary of the provided text
func (a *App) SummarizeText(text string) (string, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

	reqBody := HFSummarizeRequest{Inputs: text}
	reqBody.Parameters.MaxLength = 150
	reqBody.Parameters.MinLength = 30
	jsonBody, _ := json.Marshal(reqBody)

	url := HuggingFaceAPIBase + HFSummarizationModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("summarize API error: %d - %s", resp.StatusCode, string(body))
	}

	var result []struct {
		SummaryText string `json:"summary_text"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result) > 0 {
		return result[0].SummaryText, nil
	}
	return "", fmt.Errorf("empty summary response")
}

// ClassifyText performs zero-shot classification on text
func (a *App) ClassifyText(text string, labels []string) (map[string]interface{}, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("no Hugging Face API key configured")
	}

	reqBody := HFZeroShotRequest{Inputs: text}
	reqBody.Parameters.CandidateLabels = labels
	jsonBody, _ := json.Marshal(reqBody)

	url := HuggingFaceAPIBase + HFZeroShotModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("classify API error: %d - %s", resp.StatusCode, string(body))
	}

	var result HFZeroShotResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"labels": result.Labels,
		"scores": result.Scores,
	}, nil
}

// AnalyzeSentiment returns sentiment analysis for text
func (a *App) AnalyzeSentiment(text string) (map[string]interface{}, error) {
	apiKey := getHuggingFaceAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("no Hugging Face API key configured")
	}

	jsonBody, _ := json.Marshal(map[string]string{"inputs": text})

	url := HuggingFaceAPIBase + HFSentimentModel
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("sentiment API error: %d - %s", resp.StatusCode, string(body))
	}

	// Response is [[{label, score}, ...]]
	var results [][]HFSentimentResponse
	if err := json.Unmarshal(body, &results); err != nil {
		return nil, err
	}

	if len(results) > 0 && len(results[0]) > 0 {
		top := results[0][0]
		return map[string]interface{}{
			"sentiment":  top.Label,
			"confidence": top.Score,
		}, nil
	}
	return nil, fmt.Errorf("empty sentiment response")
}

// SetHuggingFaceAPIKey saves the HF API key to config
func (a *App) SetHuggingFaceAPIKey(apiKey string) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	configDir := filepath.Join(homeDir, ".apostrophe")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}
	configPath := filepath.Join(configDir, "hf_key.txt")
	return os.WriteFile(configPath, []byte(apiKey), 0600)
}

// SetGeminiAPIKey saves the API key to a config file
func (a *App) SetGeminiAPIKey(apiKey string) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	configDir := filepath.Join(homeDir, ".apostrophe")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}
	configPath := filepath.Join(configDir, "gemini_key.txt")
	return os.WriteFile(configPath, []byte(apiKey), 0600)
}

// GetAIProvider returns the current active provider status
func (a *App) GetAIProvider() map[string]interface{} {
	hasGemini := getGeminiAPIKey() != ""
	hasHuggingFace := getHuggingFaceAPIKey() != ""
	return map[string]interface{}{
		"gemini_configured":      hasGemini,
		"huggingface_configured": hasHuggingFace,
		"ollama_model":           OllamaModel,
		"hf_text_model":          HFTextModel,
		"hf_image_model":         HFImageModel,
		"hf_whisper_model":       HFWhisperModel,
	}
}

// SaveImage saves a base64-encoded image to local storage and returns the file path
func (a *App) SaveImage(noteId string, base64Data string, filename string) (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	imagesDir := filepath.Join(homeDir, "notes-images", noteId)
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return "", err
	}

	if idx := strings.Index(base64Data, ","); idx != -1 {
		base64Data = base64Data[idx+1:]
	}

	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", err
	}

	filePath := filepath.Join(imagesDir, filename)
	if err := os.WriteFile(filePath, imageData, 0644); err != nil {
		return "", err
	}

	return "file:///" + filepath.ToSlash(filePath), nil
}

// GetPresetBackgrounds returns a list of preset background names
func (a *App) GetPresetBackgrounds() []string {
	return []string{
		"gradient-purple",
		"gradient-blue",
		"gradient-warm",
		"paper-texture",
		"nature-forest",
		"nature-mountains",
		"abstract-waves",
		"minimal-dots",
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
