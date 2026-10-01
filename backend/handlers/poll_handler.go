package handlers

import (
	"live-polling-backend/models"
	"live-polling-backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PollHandler struct {
	pollService services.PollService
}

func NewPollHandler(pollService services.PollService) *PollHandler {
	return &PollHandler{pollService: pollService}
}

func (h *PollHandler) CreatePoll(c *gin.Context) {
	creatorID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	poll, err := h.pollService.CreatePoll(c.Request.Context(), creatorID.(string), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"pollId":   poll.ID,
		"shareUrl": "/poll/" + poll.ID,
		"data":     poll,
	})
}

func (h *PollHandler) GetPoll(c *gin.Context) {
	id := c.Param("id")
	poll, err := h.pollService.GetPoll(c.Request.Context(), id)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Poll not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": poll})
}

func (h *PollHandler) GetActivePolls(c *gin.Context) {
	polls, err := h.pollService.GetActivePolls(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch polls"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": polls})
}

func (h *PollHandler) GetMyPolls(c *gin.Context) {
	creatorID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	polls, err := h.pollService.GetCreatorPolls(c.Request.Context(), creatorID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch polls"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": polls})
}

func (h *PollHandler) GetResults(c *gin.Context) {
	id := c.Param("id")
	results, err := h.pollService.GetResults(c.Request.Context(), id)
	if err != nil || results == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Poll not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func (h *PollHandler) Vote(c *gin.Context) {
	pollID := c.Param("id")
	var req models.VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "optionId is required"})
		return
	}

	voterID := req.VoterID
	if voterID == "" {
		if uid, exists := c.Get("userId"); exists {
			voterID = uid.(string)
		} else {
			voterID = c.ClientIP()
		}
	}

	results, err := h.pollService.Vote(c.Request.Context(), pollID, req.OptionID, voterID, c.ClientIP())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results, "message": "Vote counted"})
}

func (h *PollHandler) ClosePoll(c *gin.Context) {
	pollID := c.Param("id")
	creatorID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	poll, err := h.pollService.ClosePoll(c.Request.Context(), pollID, creatorID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": poll, "message": "Poll closed"})
}

func (h *PollHandler) DeletePoll(c *gin.Context) {
	pollID := c.Param("id")
	creatorID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err := h.pollService.DeletePoll(c.Request.Context(), pollID, creatorID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Poll deleted"})
}
