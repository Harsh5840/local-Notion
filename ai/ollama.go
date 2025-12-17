package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Ollama API configuration
const (
	OllamaEndpoint = "http://localhost:11434/api/generate"
	OllamaModel    = "llama3.1:8b"
)

// OllamaRequest represents the request body for Ollama API
type OllamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// OllamaResponse represents the response from Ollama API
type OllamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// CallOllama calls the local Ollama API
func CallOllama(prompt string) (string, error) {
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

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
