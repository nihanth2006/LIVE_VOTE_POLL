package models

import "time"

type Option struct {
	OptionID string `json:"optionId" bson:"optionId"`
	Text     string `json:"text" bson:"text"`
}

type Poll struct {
	ID        string    `json:"pollId" bson:"_id,omitempty"`
	CreatorID string    `json:"creatorId" bson:"creatorId"`
	Question  string    `json:"question" bson:"question"`
	Options   []Option  `json:"options" bson:"options"`
	Status    string    `json:"status" bson:"status"` // "active" or "closed"
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}

type CreatePollRequest struct {
	Question string   `json:"question" binding:"required,min=5,max=300"`
	Options  []string `json:"options" binding:"required,min=2,max=10"`
}

type OptionResult struct {
	OptionID   string  `json:"optionId"`
	Text       string  `json:"text"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

type PollResults struct {
	PollID     string         `json:"pollId"`
	Question   string         `json:"question"`
	Status     string         `json:"status"`
	TotalVotes int64          `json:"totalVotes"`
	Results    []OptionResult `json:"results"`
	UpdatedAt  time.Time      `json:"updatedAt"`
}
