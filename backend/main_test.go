package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/handlers"
	"live-polling-backend/models"
	"live-polling-backend/routes"
	"live-polling-backend/services"
	"live-polling-backend/utils"
	"live-polling-backend/websocket"
)

// Mock implementations for unit testing handler and routing layers without external dependencies

type mockAuthService struct {
	users map[string]*models.User
}

func (m *mockAuthService) Signup(ctx context.Context, req *models.SignupRequest) (*models.AuthResponse, error) {
	if req.Email == "exists@example.com" {
		return nil, errors.New("user with this email already exists")
	}
	user := models.User{
		ID:        "usr_test_1",
		Name:      req.Name,
		Email:     req.Email,
		CreatedAt: time.Now(),
	}
	return &models.AuthResponse{Token: "test_jwt_token", User: user}, nil
}

func (m *mockAuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	if req.Email == "valid@example.com" && req.Password == "password123" {
		user := models.User{
			ID:    "usr_test_1",
			Name:  "Test User",
			Email: req.Email,
		}
		return &models.AuthResponse{Token: "test_jwt_token", User: user}, nil
	}
	return nil, errors.New("invalid email or password")
}

func (m *mockAuthService) GetProfile(ctx context.Context, userID string) (*models.User, error) {
	return &models.User{ID: userID, Name: "Test User", Email: "valid@example.com"}, nil
}

type mockPollService struct {
	polls map[string]*models.Poll
}

func (m *mockPollService) CreatePoll(ctx context.Context, creatorID string, req *models.CreatePollRequest) (*models.Poll, error) {
	if len(req.Options) < 2 {
		return nil, errors.New("poll must have at least 2 options")
	}
	if len(req.Options) > 10 {
		return nil, errors.New("poll cannot have more than 10 options")
	}
	seen := make(map[string]bool)
	var options []models.Option
	for i, opt := range req.Options {
		if opt == "" {
			return nil, errors.New("option text cannot be empty")
		}
		if seen[opt] {
			return nil, errors.New("duplicate options are not allowed")
		}
		seen[opt] = true
		options = append(options, models.Option{OptionID: "opt_" + string(rune('0'+i)), Text: opt})
	}
	poll := &models.Poll{
		ID:        "poll_123",
		CreatorID: creatorID,
		Question:  req.Question,
		Options:   options,
		Status:    "active",
		CreatedAt: time.Now(),
	}
	return poll, nil
}

func (m *mockPollService) GetPoll(ctx context.Context, id string) (*models.Poll, error) {
	if id == "poll_closed" {
		return &models.Poll{ID: id, Status: "closed"}, nil
	}
	return &models.Poll{
		ID:        id,
		Question:  "Favorite Language?",
		Status:    "active",
		Options:   []models.Option{{OptionID: "opt_go", Text: "Go"}, {OptionID: "opt_rust", Text: "Rust"}},
		CreatorID: "usr_creator_1",
	}, nil
}

func (m *mockPollService) GetCreatorPolls(ctx context.Context, creatorID string) ([]models.Poll, error) {
	return []models.Poll{}, nil
}

func (m *mockPollService) GetActivePolls(ctx context.Context) ([]models.Poll, error) {
	return []models.Poll{}, nil
}

func (m *mockPollService) GetResults(ctx context.Context, id string) (*models.PollResults, error) {
	return &models.PollResults{
		PollID:     id,
		Question:   "Favorite Language?",
		Status:     "active",
		TotalVotes: 10,
		Results: []models.OptionResult{
			{OptionID: "opt_go", Text: "Go", Count: 7, Percentage: 70},
			{OptionID: "opt_rust", Text: "Rust", Count: 3, Percentage: 30},
		},
	}, nil
}

func (m *mockPollService) Vote(ctx context.Context, pollID, optionID, voterID, ip string) (*models.PollResults, error) {
	if pollID == "poll_closed" {
		return nil, errors.New("poll is closed")
	}
	if optionID == "invalid_option" {
		return nil, errors.New("invalid option selected")
	}
	if voterID == "already_voted_user" {
		return nil, errors.New("user has already voted in this poll")
	}
	return &models.PollResults{
		PollID:     pollID,
		Question:   "Favorite Language?",
		TotalVotes: 1,
		Results:    []models.OptionResult{{OptionID: optionID, Count: 1, Percentage: 100}},
	}, nil
}

func (m *mockPollService) ClosePoll(ctx context.Context, pollID, creatorID string) (*models.Poll, error) {
	if creatorID != "usr_creator_1" {
		return nil, errors.New("unauthorized: only the creator can close this poll")
	}
	return &models.Poll{ID: pollID, Status: "closed"}, nil
}

func (m *mockPollService) DeletePoll(ctx context.Context, pollID, creatorID string) error {
	if creatorID != "usr_creator_1" {
		return errors.New("unauthorized: only the creator can delete this poll")
	}
	return nil
}

func setupTestApp() (*routes.SetupRouterParams, *http.Server) {
	return nil, nil
}

func TestCompleteBackendSuite(t *testing.T) {
	jwtSecret := "super-secure-test-jwt-key-2026-polling"
	cfg := &config.Config{JWTSecret: jwtSecret}

	authSvc := &mockAuthService{}
	pollSvc := &mockPollService{}

	authHandler := handlers.NewAuthHandler(authSvc)
	pollHandler := handlers.NewPollHandler(pollSvc)
	wsHandler := handlers.NewWSHandler(websocket.NewHub(nil))

	router := routes.SetupRouter(cfg, authHandler, pollHandler, wsHandler)

	// 1. Health check
	t.Run("HealthCheck", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", w.Code)
		}
	})

	// 2. Signup Validation
	t.Run("Signup_EmptyFields", func(t *testing.T) {
		payload, _ := json.Marshal(models.SignupRequest{Name: "", Email: "invalid", Password: "123"})
		req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for empty signup fields, got %d", w.Code)
		}
	})

	t.Run("Signup_Valid", func(t *testing.T) {
		payload, _ := json.Marshal(models.SignupRequest{Name: "Alice", Email: "alice@example.com", Password: "password123"})
		req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Errorf("Expected 201 for valid signup, got %d", w.Code)
		}
	})

	// 3. Login
	t.Run("Login_InvalidPassword", func(t *testing.T) {
		payload, _ := json.Marshal(models.LoginRequest{Email: "valid@example.com", Password: "wrong"})
		req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401 for wrong password, got %d", w.Code)
		}
	})

	t.Run("Login_Success", func(t *testing.T) {
		payload, _ := json.Marshal(models.LoginRequest{Email: "valid@example.com", Password: "password123"})
		req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 for valid login, got %d", w.Code)
		}
	})

	// 4. Poll Creation & Authorization
	t.Run("PollCreate_Unauthorized", func(t *testing.T) {
		pollReq := models.CreatePollRequest{Question: "Valid Question Here?", Options: []string{"A", "B"}}
		data, _ := json.Marshal(pollReq)
		req, _ := http.NewRequest("POST", "/api/polls", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401 Unauthorized for poll creation without JWT, got %d", w.Code)
		}
	})

	// Generate valid test JWT token
	validToken, _ := utils.GenerateJWT("usr_creator_1", "creator@example.com", jwtSecret)

	t.Run("PollCreate_InvalidOptions_LessThanTwo", func(t *testing.T) {
		pollReq := models.CreatePollRequest{Question: "Only one option?", Options: []string{"A"}}
		data, _ := json.Marshal(pollReq)
		req, _ := http.NewRequest("POST", "/api/polls", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+validToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for <2 options, got %d", w.Code)
		}
	})

	t.Run("PollCreate_Success", func(t *testing.T) {
		pollReq := models.CreatePollRequest{Question: "Which backend do you prefer?", Options: []string{"Go/Gin", "Node.js"}}
		data, _ := json.Marshal(pollReq)
		req, _ := http.NewRequest("POST", "/api/polls", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+validToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Errorf("Expected 201 for poll creation, got %d", w.Code)
		}
	})

	// 5. Public Poll & Results Fetching
	t.Run("GetPoll_Public", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/polls/poll_123", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 for public poll view, got %d", w.Code)
		}
	})

	t.Run("GetResults_Public", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/polls/poll_123/results", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 for public results, got %d", w.Code)
		}
	})

	// 6. Voting Validation
	t.Run("Vote_Valid", func(t *testing.T) {
		voteReq := models.VoteRequest{OptionID: "opt_go", VoterID: "voter_99"}
		data, _ := json.Marshal(voteReq)
		req, _ := http.NewRequest("POST", "/api/polls/poll_123/vote", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 for valid vote, got %d", w.Code)
		}
	})

	t.Run("Vote_InvalidOption", func(t *testing.T) {
		voteReq := models.VoteRequest{OptionID: "invalid_option", VoterID: "voter_99"}
		data, _ := json.Marshal(voteReq)
		req, _ := http.NewRequest("POST", "/api/polls/poll_123/vote", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for invalid option, got %d", w.Code)
		}
	})

	t.Run("Vote_DuplicatePrevention", func(t *testing.T) {
		voteReq := models.VoteRequest{OptionID: "opt_go", VoterID: "already_voted_user"}
		data, _ := json.Marshal(voteReq)
		req, _ := http.NewRequest("POST", "/api/polls/poll_123/vote", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 Conflict/Duplicate for re-voting, got %d", w.Code)
		}
	})

	t.Run("Vote_ClosedPoll", func(t *testing.T) {
		voteReq := models.VoteRequest{OptionID: "opt_go", VoterID: "voter_99"}
		data, _ := json.Marshal(voteReq)
		req, _ := http.NewRequest("POST", "/api/polls/poll_closed/vote", bytes.NewBuffer(data))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for closed poll vote, got %d", w.Code)
		}
	})

	// 7. Authorization & Close/Delete Poll
	t.Run("ClosePoll_NonCreator_Forbidden", func(t *testing.T) {
		otherUserToken, _ := utils.GenerateJWT("usr_other_hacker", "hacker@example.com", jwtSecret)
		req, _ := http.NewRequest("POST", "/api/polls/poll_123/close", nil)
		req.Header.Set("Authorization", "Bearer "+otherUserToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Errorf("Expected 403 Forbidden for non-creator closing poll, got %d", w.Code)
		}
	})

	t.Run("ClosePoll_Creator_Success", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/polls/poll_123/close", nil)
		req.Header.Set("Authorization", "Bearer "+validToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 for creator closing poll, got %d", w.Code)
		}
	})
}
