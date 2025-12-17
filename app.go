package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"local-notion/ai"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	err := InitDB()
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
	}
}

// =============================================================================
// AI Methods - Thin wrappers around ai package
// =============================================================================

// GenerateContent generates text based on a prompt
func (a *App) GenerateContent(prompt string) string {
	return ai.CallAI(prompt)
}

// AskAI generates an answer to a question based on provided context
func (a *App) AskAI(question string, context string) string {
	prompt := fmt.Sprintf("Context:\n%s\n\nQuestion: %s\n\nAnswer the question based on the context above.", context, question)
	return ai.CallAI(prompt)
}

// ProcessContent transforms existing text
func (a *App) ProcessContent(text string, instruction string) string {
	prompt := fmt.Sprintf("%s\n\nContent:\n%s", instruction, text)
	return ai.CallAI(prompt)
}

// GenerateCoverImage generates an image for a note cover
func (a *App) GenerateCoverImage(prompt string, noteId string) (string, error) {
	return ai.GenerateCoverImage(prompt, noteId, ai.GetHuggingFaceAPIKey())
}

// TranscribeAudio transcribes audio to text using Whisper
func (a *App) TranscribeAudio(audioBase64 string) (string, error) {
	return ai.TranscribeAudio(audioBase64, ai.GetHuggingFaceAPIKey())
}

// GetEmbeddings returns vector embeddings for semantic search
func (a *App) GetEmbeddings(texts []string) ([][]float32, error) {
	return ai.GetEmbeddings(texts, ai.GetHuggingFaceAPIKey())
}

// SummarizeText generates a summary of the provided text
func (a *App) SummarizeText(text string) (string, error) {
	return ai.SummarizeText(text, ai.GetHuggingFaceAPIKey())
}

// ClassifyText performs zero-shot classification on text
func (a *App) ClassifyText(text string, labels []string) (map[string]interface{}, error) {
	return ai.ClassifyText(text, labels, ai.GetHuggingFaceAPIKey())
}

// AnalyzeSentiment returns sentiment analysis for text
func (a *App) AnalyzeSentiment(text string) (map[string]interface{}, error) {
	return ai.AnalyzeSentiment(text, ai.GetHuggingFaceAPIKey())
}

// SetHuggingFaceAPIKey saves the HF API key to config
func (a *App) SetHuggingFaceAPIKey(apiKey string) error {
	return ai.SetHuggingFaceAPIKey(apiKey)
}

// SetGeminiAPIKey saves the Gemini API key to config
func (a *App) SetGeminiAPIKey(apiKey string) error {
	return ai.SetGeminiAPIKey(apiKey)
}

// GetAIProvider returns the current active provider status
func (a *App) GetAIProvider() map[string]interface{} {
	return ai.GetProviderStatus()
}

// =============================================================================
// Utility Methods
// =============================================================================

// SaveImage saves a base64-encoded image to local storage
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
