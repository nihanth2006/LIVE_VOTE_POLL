package routes

import (
	"live-polling-backend/config"
	"live-polling-backend/handlers"
	"live-polling-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	pollHandler *handlers.PollHandler,
	wsHandler *handlers.WSHandler,
) *gin.Engine {
	r := gin.Default()

	// Global CORS
	r.Use(middleware.CORSMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "live-polling-backend"})
	})

	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/signup", authHandler.Signup)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)
		}

		// Public Poll routes
		polls := api.Group("/polls")
		{
			polls.GET("", pollHandler.GetActivePolls)
			polls.GET("/:id", pollHandler.GetPoll)
			polls.GET("/:id/results", pollHandler.GetResults)
			polls.POST("/:id/vote", pollHandler.Vote)

			// Authenticated Poll Management
			authorized := polls.Group("")
			authorized.Use(middleware.AuthMiddleware(cfg.JWTSecret))
			{
				authorized.POST("", pollHandler.CreatePoll)
				authorized.GET("/user/mine", pollHandler.GetMyPolls)
				authorized.POST("/:id/close", pollHandler.ClosePoll)
				authorized.DELETE("/:id", pollHandler.DeletePoll)
			}
		}
	}

	// WebSocket endpoint
	r.GET("/ws/polls/:id", wsHandler.ServeWS)

	return r
}
