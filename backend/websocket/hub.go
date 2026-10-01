package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type Hub struct {
	// Rooms maps pollID -> map of client pointers
	rooms      map[string]map[*Client]bool
	register   chan *Subscription
	unregister chan *Subscription
	broadcast  chan *BroadcastMessage
	redis      *redis.Client
	mu         sync.RWMutex
}

type Subscription struct {
	PollID string
	Client *Client
}

type BroadcastMessage struct {
	PollID  string
	Payload []byte
}

func NewHub(redisClient *redis.Client) *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Subscription),
		unregister: make(chan *Subscription),
		broadcast:  make(chan *BroadcastMessage),
		redis:      redisClient,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case sub := <-h.register:
			h.mu.Lock()
			if h.rooms[sub.PollID] == nil {
				h.rooms[sub.PollID] = make(map[*Client]bool)
				// Start redis subscriber goroutine for this poll room
				go h.listenRedisPubSub(sub.PollID)
			}
			h.rooms[sub.PollID][sub.Client] = true
			h.mu.Unlock()
			log.Printf("Client registered to poll room %s (total: %d)", sub.PollID, len(h.rooms[sub.PollID]))

		case sub := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[sub.PollID]; ok {
				if _, exists := clients[sub.Client]; exists {
					delete(clients, sub.Client)
					close(sub.Client.Send)
					if len(clients) == 0 {
						delete(h.rooms, sub.PollID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered from poll room %s", sub.PollID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			clients := h.rooms[msg.PollID]
			for client := range clients {
				select {
				case client.Send <- msg.Payload:
				default:
					close(client.Send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) listenRedisPubSub(pollID string) {
	channel := "poll:" + pollID + ":updates"
	pubsub := h.redis.Subscribe(context.Background(), channel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast <- &BroadcastMessage{
			PollID:  pollID,
			Payload: []byte(msg.Payload),
		}
	}
}

func (h *Hub) Register(pollID string, client *Client) {
	h.register <- &Subscription{PollID: pollID, Client: client}
}

func (h *Hub) Unregister(pollID string, client *Client) {
	h.unregister <- &Subscription{PollID: pollID, Client: client}
}
