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

	db, err := config.ConnectMongoDB(cfg)
	if err != nil {
		log.Printf("Warning: MongoDB connection: %v", err)
	}

	rdb, err := config.ConnectRedis(cfg)
	if err != nil {
		log.Printf("Warning: Redis connection: %v", err)
	}

	hub := websocket.NewHub(rdb)
	go hub.Run()

	userRepo := repository.NewUserRepository(db)
	pollRepo := repository.NewPollRepository(db)

	redisSvc := services.NewRedisService(rdb)
	authSvc := services.NewAuthService(userRepo, cfg)
	pollSvc := services.NewPollService(pollRepo, redisSvc)

	authHandler := handlers.NewAuthHandler(authSvc)
	pollHandler := handlers.NewPollHandler(pollSvc)
	wsHandler := handlers.NewWSHandler(hub)

	router := routes.SetupRouter(cfg, authHandler, pollHandler, wsHandler)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Live Polling Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen error: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}
	log.Println("Server exiting")
}
