package repository

import (
	"context"
	"errors"
	"live-polling-backend/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type PollRepository interface {
	CreatePoll(ctx context.Context, poll *models.Poll) error
	GetPollByID(ctx context.Context, id string) (*models.Poll, error)
	GetPollsByCreator(ctx context.Context, creatorID string) ([]models.Poll, error)
	GetAllActivePolls(ctx context.Context) ([]models.Poll, error)
	UpdateStatus(ctx context.Context, id, status string) error
	DeletePoll(ctx context.Context, id string) error
	RecordVote(ctx context.Context, vote *models.VoteRecord) error
	HasUserVoted(ctx context.Context, pollID, voterID string) (bool, error)
}

type mongoPollRepo struct {
	pollsCollection *mongo.Collection
	votesCollection *mongo.Collection
}

func NewPollRepository(db *mongo.Database) PollRepository {
	return &mongoPollRepo{
		pollsCollection: db.Collection("polls"),
		votesCollection: db.Collection("votes"),
	}
}

func (r *mongoPollRepo) CreatePoll(ctx context.Context, poll *models.Poll) error {
	poll.CreatedAt = time.Now()
	poll.UpdatedAt = time.Now()
	poll.Status = "active"
	res, err := r.pollsCollection.InsertOne(ctx, poll)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		poll.ID = oid.Hex()
	}
	return nil
}

func (r *mongoPollRepo) GetPollByID(ctx context.Context, id string) (*models.Poll, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var poll models.Poll
	err = r.pollsCollection.FindOne(ctx, bson.M{"_id": oid}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *mongoPollRepo) GetPollsByCreator(ctx context.Context, creatorID string) ([]models.Poll, error) {
	cursor, err := r.pollsCollection.Find(ctx, bson.M{"creatorId": creatorID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err = cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (r *mongoPollRepo) GetAllActivePolls(ctx context.Context) ([]models.Poll, error) {
	cursor, err := r.pollsCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err = cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (r *mongoPollRepo) UpdateStatus(ctx context.Context, id, status string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.pollsCollection.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{
		"$set": bson.M{
			"status":    status,
			"updatedAt": time.Now(),
		},
	})
	return err
}

func (r *mongoPollRepo) DeletePoll(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.pollsCollection.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *mongoPollRepo) RecordVote(ctx context.Context, vote *models.VoteRecord) error {
	vote.CreatedAt = time.Now()
	_, err := r.votesCollection.InsertOne(ctx, vote)
	return err
}

func (r *mongoPollRepo) HasUserVoted(ctx context.Context, pollID, voterID string) (bool, error) {
	count, err := r.votesCollection.CountDocuments(ctx, bson.M{
		"pollId":  pollID,
		"voterId": voterID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
