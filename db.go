package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

type Note struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	Icon            string    `json:"icon"`
	BackgroundImage string    `json:"background_image"`
	IsFavorite      bool      `json:"is_favorite"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type NoteMeta struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Icon       string `json:"icon"`
	IsFavorite bool   `json:"is_favorite"`
}

func InitDB() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	dbPath := filepath.Join(homeDir, "notes.db")

	// Create database connection
	var dbErr error
	db, dbErr = sql.Open("sqlite", dbPath)
	if dbErr != nil {
		return dbErr
	}

	// Create table
	query := `
	CREATE TABLE IF NOT EXISTS notes (
		id TEXT PRIMARY KEY,
		title TEXT,
		content TEXT,
		icon TEXT DEFAULT '',
		background_image TEXT DEFAULT '',
		is_favorite INTEGER DEFAULT 0,
		updated_at DATETIME
	);
	`
	_, err = db.Exec(query)

	// Migrations for existing DBs
	db.Exec("ALTER TABLE notes ADD COLUMN background_image TEXT DEFAULT ''")
	db.Exec("ALTER TABLE notes ADD COLUMN icon TEXT DEFAULT ''")
	db.Exec("ALTER TABLE notes ADD COLUMN is_favorite INTEGER DEFAULT 0")

	return err
}

func (a *App) SaveNote(id string, title string, content string) error {
	query := `
	INSERT INTO notes (id, title, content, updated_at) 
	VALUES (?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		title = excluded.title,
		content = excluded.content,
		updated_at = excluded.updated_at;
	`
	_, err := db.Exec(query, id, title, content, time.Now())
	return err
}

func (a *App) LoadNote(id string) (Note, error) {
	var note Note
	var isFav int
	query := `SELECT id, title, content, COALESCE(icon, '') as icon, 
	          COALESCE(background_image, '') as background_image, 
	          COALESCE(is_favorite, 0) as is_favorite, updated_at 
	          FROM notes WHERE id = ?`
	err := db.QueryRow(query, id).Scan(&note.ID, &note.Title, &note.Content, &note.Icon, &note.BackgroundImage, &isFav, &note.UpdatedAt)
	note.IsFavorite = isFav == 1
	if err != nil {
		return Note{}, err
	}
	return note, nil
}

func (a *App) ListNotes() ([]NoteMeta, error) {
	rows, err := db.Query(`SELECT id, title, COALESCE(icon, '') as icon, COALESCE(is_favorite, 0) as is_favorite 
	                       FROM notes ORDER BY is_favorite DESC, updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []NoteMeta
	for rows.Next() {
		var note NoteMeta
		var isFav int
		if err := rows.Scan(&note.ID, &note.Title, &note.Icon, &isFav); err != nil {
			return nil, err
		}
		note.IsFavorite = isFav == 1
		notes = append(notes, note)
	}
	return notes, nil
}

// SetNoteBackground updates the background image for a note
func (a *App) SetNoteBackground(id string, backgroundImage string) error {
	query := "UPDATE notes SET background_image = ? WHERE id = ?"
	_, err := db.Exec(query, backgroundImage, id)
	return err
}

// SetNoteIcon updates the icon emoji for a note
func (a *App) SetNoteIcon(id string, icon string) error {
	query := "UPDATE notes SET icon = ? WHERE id = ?"
	_, err := db.Exec(query, icon, id)
	return err
}

// ToggleNoteFavorite toggles the favorite status of a note
func (a *App) ToggleNoteFavorite(id string) error {
	query := "UPDATE notes SET is_favorite = NOT is_favorite WHERE id = ?"
	_, err := db.Exec(query, id)
	return err
}

// DeleteNote removes a note from the database
func (a *App) DeleteNote(id string) error {
	query := "DELETE FROM notes WHERE id = ?"
	_, err := db.Exec(query, id)
	return err
}
