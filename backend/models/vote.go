package models

import "time"

type VoteRequest struct {
	OptionID string `json:"optionId" binding:"required"`
	VoterID  string `json:"voterId"` // client/fingerprint session ID
}

type VoteRecord struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	PollID    string    `json:"pollId" bson:"pollId"`
	OptionID  string    `json:"optionId" bson:"optionId"`
	VoterID   string    `json:"voterId" bson:"voterId"`
	IP        string    `json:"ip" bson:"ip"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
}

type VoteEvent struct {
	PollID     string    `json:"pollId"`
	OptionID   string    `json:"optionId"`
	Count      int64     `json:"count"`
	TotalVotes int64     `json:"totalVotes"`
	Timestamp  time.Time `json:"timestamp"`
}
