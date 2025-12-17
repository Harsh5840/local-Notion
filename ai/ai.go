package ai

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// GetGeminiAPIKey returns the Gemini API key from environment or config
func GetGeminiAPIKey() string {
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		return key
	}
	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".apostrophe", "gemini_key.txt")
	if data, err := os.ReadFile(configPath); err == nil {
		return strings.TrimSpace(string(data))
	}
	return ""
}

// GetHuggingFaceAPIKey returns the HF API key from environment or config
func GetHuggingFaceAPIKey() string {
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

// SetGeminiAPIKey saves the Gemini API key to config
func SetGeminiAPIKey(apiKey string) error {
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

// SetHuggingFaceAPIKey saves the HF API key to config
func SetHuggingFaceAPIKey(apiKey string) error {
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

// CallAI tries providers in order: Gemini -> HuggingFace -> Ollama
func CallAI(prompt string) string {
	geminiKey := GetGeminiAPIKey()
	hfKey := GetHuggingFaceAPIKey()

	// Try Gemini first
	if geminiKey != "" {
		result, err := CallGemini(prompt, geminiKey)
		if err == nil && result != "" {
			return result
		}
		fmt.Printf("Gemini failed (%v), trying Hugging Face...\n", err)
	}

	// Try Hugging Face second
	if hfKey != "" {
		result, err := CallHuggingFaceText(prompt, hfKey)
		if err == nil && result != "" {
			return result
		}
		fmt.Printf("Hugging Face failed (%v), falling back to Ollama...\n", err)
	}

	// Fallback to Ollama
	result, err := CallOllama(prompt)
	if err != nil {
		return "Error: All AI providers failed. " + err.Error()
	}
	return result
}

// GetProviderStatus returns the current configuration status
func GetProviderStatus() map[string]interface{} {
	hasGemini := GetGeminiAPIKey() != ""
	hasHuggingFace := GetHuggingFaceAPIKey() != ""
	return map[string]interface{}{
		"gemini_configured":      hasGemini,
		"huggingface_configured": hasHuggingFace,
		"ollama_model":           OllamaModel,
		"hf_text_model":          HFTextModel,
		"hf_image_model":         HFImageModel,
		"hf_whisper_model":       HFWhisperModel,
	}
}
