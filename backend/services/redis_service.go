package services

import (
	"context"
	"encoding/json"
	"fmt"
	"live-polling-backend/models"
	"strconv"

	"github.com/redis/go-redis/v9"
)

type RedisService interface {
	IncrementVote(ctx context.Context, pollID, optionID string) (int64, error)
	GetPollCounts(ctx context.Context, pollID string) (map[string]int64, error)
	InitializePollVotes(ctx context.Context, pollID string, optionIDs []string) error
	PublishVoteEvent(ctx context.Context, event *models.VoteEvent) error
	SubscribePollUpdates(ctx context.Context, pollID string) *redis.PubSub
	DeletePollVotes(ctx context.Context, pollID string) error
}

type redisServiceImpl struct {
	client *redis.Client
}

func NewRedisService(client *redis.Client) RedisService {
	return &redisServiceImpl{client: client}
}

func (s *redisServiceImpl) pollVotesKey(pollID string) string {
	return fmt.Sprintf("poll:%s:votes", pollID)
}

func (s *redisServiceImpl) pollUpdatesChannel(pollID string) string {
	return fmt.Sprintf("poll:%s:updates", pollID)
}

// IncrementVote uses atomic HINCRBY to avoid concurrency race conditions
func (s *redisServiceImpl) IncrementVote(ctx context.Context, pollID, optionID string) (int64, error) {
	key := s.pollVotesKey(pollID)
	return s.client.HIncrBy(ctx, key, optionID, 1).Result()
}

func (s *redisServiceImpl) GetPollCounts(ctx context.Context, pollID string) (map[string]int64, error) {
	key := s.pollVotesKey(pollID)
	raw, err := s.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	result := make(map[string]int64)
	for optID, countStr := range raw {
		val, _ := strconv.ParseInt(countStr, 10, 64)
		result[optID] = val
	}
	return result, nil
}

func (s *redisServiceImpl) InitializePollVotes(ctx context.Context, pollID string, optionIDs []string) error {
	key := s.pollVotesKey(pollID)
	pipe := s.client.Pipeline()
	for _, optID := range optionIDs {
		pipe.HSetNX(ctx, key, optID, 0)
	}
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisServiceImpl) PublishVoteEvent(ctx context.Context, event *models.VoteEvent) error {
	channel := s.pollUpdatesChannel(event.PollID)
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return s.client.Publish(ctx, channel, data).Err()
}

func (s *redisServiceImpl) SubscribePollUpdates(ctx context.Context, pollID string) *redis.PubSub {
	channel := s.pollUpdatesChannel(pollID)
	return s.client.Subscribe(ctx, channel)
}

func (s *redisServiceImpl) DeletePollVotes(ctx context.Context, pollID string) error {
	key := s.pollVotesKey(pollID)
	return s.client.Del(ctx, key).Err()
}
