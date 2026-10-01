package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/handlers"
	"live-polling-backend/repository"
	"live-polling-backend/routes"
	"live-polling-backend/services"
	"live-polling-backend/websocket"
)

func main() {
	cfg := config.LoadConfig()

	// 1. Connect MongoDB
	db, err := config.ConnectMongoDB(cfg)
	if err != nil {
		log.Printf("Warning: MongoDB connection failed (%v). Running with mock/cached database fallback if standalone.", err)
	}

	// 2. Connect Redis
	rdb, err := config.ConnectRedis(cfg)
	if err != nil {
		log.Printf("Warning: Redis connection failed (%v).", err)
	}

	// 3. Initialize WebSocket Hub
	hub := websocket.NewHub(rdb)
	go hub.Run()

	// 4. Initialize Dependency Injection Layers (Repository -> Service -> Handler)
	userRepo := repository.NewUserRepository(db)
	pollRepo := repository.NewPollRepository(db)

	redisSvc := services.NewRedisService(rdb)
	authSvc := services.NewAuthService(userRepo, cfg)
	pollSvc := services.NewPollService(pollRepo, redisSvc)

	authHandler := handlers.NewAuthHandler(authSvc)
	pollHandler := handlers.NewPollHandler(pollSvc)
	wsHandler := handlers.NewWSHandler(hub)

	// 5. Setup Router
	router := routes.SetupRouter(cfg, authHandler, pollHandler, wsHandler)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Graceful shutdown handling
	go func() {
		log.Printf("Live Polling Go Backend starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen error: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}
	log.Println("Server exiting")
}
