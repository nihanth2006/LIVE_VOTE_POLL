package services

import (
	"context"
	"errors"
	"fmt"
	"live-polling-backend/models"
	"live-polling-backend/repository"
	"math"
	"strings"
	"time"
)

type PollService interface {
	CreatePoll(ctx context.Context, creatorID string, req *models.CreatePollRequest) (*models.Poll, error)
	GetPoll(ctx context.Context, id string) (*models.Poll, error)
	GetCreatorPolls(ctx context.Context, creatorID string) ([]models.Poll, error)
	GetActivePolls(ctx context.Context) ([]models.Poll, error)
	GetResults(ctx context.Context, id string) (*models.PollResults, error)
	Vote(ctx context.Context, pollID, optionID, voterID, ip string) (*models.PollResults, error)
	ClosePoll(ctx context.Context, pollID, creatorID string) (*models.Poll, error)
	DeletePoll(ctx context.Context, pollID, creatorID string) error
}

type pollServiceImpl struct {
	pollRepo repository.PollRepository
	redisSvc RedisService
}

func NewPollService(pollRepo repository.PollRepository, redisSvc RedisService) PollService {
	return &pollServiceImpl{pollRepo: pollRepo, redisSvc: redisSvc}
}

func (s *pollServiceImpl) CreatePoll(ctx context.Context, creatorID string, req *models.CreatePollRequest) (*models.Poll, error) {
	q := strings.TrimSpace(req.Question)
	if len(q) < 5 || len(q) > 300 {
		return nil, errors.New("question must be between 5 and 300 characters")
	}

	seen := make(map[string]bool)
	var options []models.Option
	var optionIDs []string

	for i, optText := range req.Options {
		clean := strings.TrimSpace(optText)
		if clean == "" {
			return nil, errors.New("option text cannot be empty")
		}
		lower := strings.ToLower(clean)
		if seen[lower] {
			return nil, errors.New("duplicate options are not allowed")
		}
		seen[lower] = true

		optID := fmt.Sprintf("opt_%d_%d", i+1, time.Now().UnixNano()%100000)
		options = append(options, models.Option{
			OptionID: optID,
			Text:     clean,
		})
		optionIDs = append(optionIDs, optID)
	}

	if len(options) < 2 || len(options) > 10 {
		return nil, errors.New("poll must have between 2 and 10 options")
	}

	poll := &models.Poll{
		CreatorID: creatorID,
		Question:  q,
		Options:   options,
	}

	if err := s.pollRepo.CreatePoll(ctx, poll); err != nil {
		return nil, err
	}

	// Initialize Redis Hash for atomic voting
	_ = s.redisSvc.InitializePollVotes(ctx, poll.ID, optionIDs)

	return poll, nil
}

func (s *pollServiceImpl) GetPoll(ctx context.Context, id string) (*models.Poll, error) {
	return s.pollRepo.GetPollByID(ctx, id)
}

func (s *pollServiceImpl) GetCreatorPolls(ctx context.Context, creatorID string) ([]models.Poll, error) {
	return s.pollRepo.GetPollsByCreator(ctx, creatorID)
}

func (s *pollServiceImpl) GetActivePolls(ctx context.Context) ([]models.Poll, error) {
	return s.pollRepo.GetAllActivePolls(ctx)
}

func (s *pollServiceImpl) GetResults(ctx context.Context, id string) (*models.PollResults, error) {
	poll, err := s.pollRepo.GetPollByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	counts, err := s.redisSvc.GetPollCounts(ctx, id)
	if err != nil {
		counts = make(map[string]int64)
	}

	var totalVotes int64
	for _, opt := range poll.Options {
		totalVotes += counts[opt.OptionID]
	}

	var results []models.OptionResult
	for _, opt := range poll.Options {
		cnt := counts[opt.OptionID]
		pct := 0.0
		if totalVotes > 0 {
			pct = math.Round((float64(cnt)/float64(totalVotes))*1000) / 10
		}
		results = append(results, models.OptionResult{
			OptionID:   opt.OptionID,
			Text:       opt.Text,
			Count:      cnt,
			Percentage: pct,
		})
	}

	return &models.PollResults{
		PollID:     poll.ID,
		Question:   poll.Question,
		Status:     poll.Status,
		TotalVotes: totalVotes,
		Results:    results,
		UpdatedAt:  time.Now(),
	}, nil
}

func (s *pollServiceImpl) Vote(ctx context.Context, pollID, optionID, voterID, ip string) (*models.PollResults, error) {
	poll, err := s.pollRepo.GetPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}
	if poll.Status != "active" {
		return nil, errors.New("poll is closed")
	}

	validOpt := false
	for _, opt := range poll.Options {
		if opt.OptionID == optionID {
			validOpt = true
			break
		}
	}
	if !validOpt {
		return nil, errors.New("invalid option selected")
	}

	// Check duplicate vote
	if voterID != "" {
		hasVoted, err := s.pollRepo.HasUserVoted(ctx, pollID, voterID)
		if err == nil && hasVoted {
			return nil, errors.New("user has already voted in this poll")
		}
	}

	// 1. Atomic Redis HINCRBY
	newCount, err := s.redisSvc.IncrementVote(ctx, pollID, optionID)
	if err != nil {
		return nil, fmt.Errorf("failed to increment vote in Redis: %w", err)
	}

	// 2. Persistent record in MongoDB
	_ = s.pollRepo.RecordVote(ctx, &models.VoteRecord{
		PollID:   pollID,
		OptionID: optionID,
		VoterID:  voterID,
		IP:       ip,
	})

	// 3. Compute updated results
	results, err := s.GetResults(ctx, pollID)
	if err != nil {
		return nil, err
	}

	// 4. Publish real-time event to Redis Pub/Sub: poll:{pollId}:updates
	_ = s.redisSvc.PublishVoteEvent(ctx, &models.VoteEvent{
		PollID:     pollID,
		OptionID:   optionID,
		Count:      newCount,
		TotalVotes: results.TotalVotes,
		Timestamp:  time.Now(),
	})

	return results, nil
}

func (s *pollServiceImpl) ClosePoll(ctx context.Context, pollID, creatorID string) (*models.Poll, error) {
	poll, err := s.pollRepo.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		return nil, errors.New("poll not found")
	}
	if poll.CreatorID != creatorID {
		return nil, errors.New("unauthorized: only the creator can close this poll")
	}

	if err := s.pollRepo.UpdateStatus(ctx, pollID, "closed"); err != nil {
		return nil, err
	}
	poll.Status = "closed"
	return poll, nil
}

func (s *pollServiceImpl) DeletePoll(ctx context.Context, pollID, creatorID string) error {
	poll, err := s.pollRepo.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		return errors.New("poll not found")
	}
	if poll.CreatorID != creatorID {
		return errors.New("unauthorized: only the creator can delete this poll")
	}

	_ = s.redisSvc.DeletePollVotes(ctx, pollID)
	return s.pollRepo.DeletePoll(ctx, pollID)
}
