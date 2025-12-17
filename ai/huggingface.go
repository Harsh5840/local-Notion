package ai

import (
	"bytes"
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

// Hugging Face API configuration
const (
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

// HFTextRequest represents a text generation request
type HFTextRequest struct {
	Inputs     string       `json:"inputs"`
	Parameters HFTextParams `json:"parameters,omitempty"`
}

// HFTextParams represents text generation parameters
type HFTextParams struct {
	MaxNewTokens   int     `json:"max_new_tokens,omitempty"`
	Temperature    float64 `json:"temperature,omitempty"`
	ReturnFullText bool    `json:"return_full_text"`
}

// HFImageRequest represents an image generation request
type HFImageRequest struct {
	Inputs string `json:"inputs"`
}

// HFEmbeddingRequest represents an embedding request
type HFEmbeddingRequest struct {
	Inputs  []string `json:"inputs"`
	Options struct {
		WaitForModel bool `json:"wait_for_model"`
	} `json:"options"`
}

// HFSummarizeRequest represents a summarization request
type HFSummarizeRequest struct {
	Inputs     string `json:"inputs"`
	Parameters struct {
		MaxLength int `json:"max_length,omitempty"`
		MinLength int `json:"min_length,omitempty"`
	} `json:"parameters,omitempty"`
}

// HFZeroShotRequest represents a zero-shot classification request
type HFZeroShotRequest struct {
	Inputs     string `json:"inputs"`
	Parameters struct {
		CandidateLabels []string `json:"candidate_labels"`
	} `json:"parameters"`
}

// HFZeroShotResponse represents zero-shot classification response
type HFZeroShotResponse struct {
	Sequence string    `json:"sequence"`
	Labels   []string  `json:"labels"`
	Scores   []float64 `json:"scores"`
}

// HFSentimentResponse represents sentiment analysis response
type HFSentimentResponse struct {
	Label string  `json:"label"`
	Score float64 `json:"score"`
}

// CallHuggingFaceText calls the HF text generation API
func CallHuggingFaceText(prompt string, apiKey string) (string, error) {
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

	return callHuggingFaceAPI(HFTextModel, reqBody, apiKey)
}

// callHuggingFaceAPI is a generic helper for HF API calls
func callHuggingFaceAPI(model string, payload interface{}, apiKey string) (string, error) {
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

	if resp.StatusCode == 503 {
		return "", fmt.Errorf("model loading, try again")
	}
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("rate limited")
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API error: status %d - %s", resp.StatusCode, string(body))
	}

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
func GenerateCoverImage(prompt string, noteId string, apiKey string) (string, error) {
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

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

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
func TranscribeAudio(audioBase64 string, apiKey string) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("no Hugging Face API key configured")
	}

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
func GetEmbeddings(texts []string, apiKey string) ([][]float32, error) {
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
func SummarizeText(text string, apiKey string) (string, error) {
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
func ClassifyText(text string, labels []string, apiKey string) (map[string]interface{}, error) {
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
func AnalyzeSentiment(text string, apiKey string) (map[string]interface{}, error) {
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
