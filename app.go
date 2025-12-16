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

// GenerateContent generates text based on a prompt (Gemini with Ollama fallback)
func (a *App) GenerateContent(prompt string) string {
	return a.callAI(prompt)
}

// ProcessContent transforms existing text (format, highlight, etc.)
func (a *App) ProcessContent(text string, instruction string) string {
	prompt := fmt.Sprintf("%s\n\nContent:\n%s", instruction, text)
	return a.callAI(prompt)
}

// callAI tries Gemini first, falls back to Ollama on error
func (a *App) callAI(prompt string) string {
	// Try Gemini first
	result, err := a.callGemini(prompt)
	if err == nil && result != "" {
		return result
	}
	fmt.Printf("Gemini failed (%v), falling back to Ollama...\n", err)

	// Fallback to Ollama
	result, err = a.callOllama(prompt)
	if err != nil {
		return "Error: Both AI providers failed. " + err.Error()
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
	return map[string]interface{}{
		"gemini_configured": hasGemini,
		"ollama_model":      OllamaModel,
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
