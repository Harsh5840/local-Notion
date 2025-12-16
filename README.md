# Local Notion

A local-first, AI-powered Notion clone built with **Start** (Go) and **Next.js**.

## Features

- **Local Storage**: Notes are saved to `~/notes.db` using SQLite. No cloud required.
- **AI Integration**: Powered by Ollama. Ask AI to write, summarize, or fix grammar.
- **Rich Text Editor**: Slash commands, markdown support, and "Magic Format".
- **Aesthetic UI**: Premium design with Inter font and dark mode support.

## Prerequisites

### 1. Install Ollama (Required for AI)
To use the AI features ("Ask AI", "Magic Format"), you need Ollama running locally.

1.  **Download**: Visit [ollama.com](https://ollama.com) and download the installer for your OS.
2.  **Install**: Run the installer.
3.  **Run Model**: Open your terminal (PowerShell or CMD) and run:
    ```powershell
    ollama run llama3.2
    ```
    *This will download the Llama 3.2 model (approx 2GB) and start the API server on `localhost:11434`.*
4.  **Keep it running**: Leave Ollama running in the background while using the app.

### 2. Install Wails (For Development)
If you want to build the app from source:
```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Running the App

### Development Mode
```powershell
wails dev
```

### Build for Production
```powershell
wails build
```
The binary will be in `build/bin/local-notion.exe`.
# local-Notion
