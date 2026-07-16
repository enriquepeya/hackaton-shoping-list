package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/adapters/right/memdb"
	leftHTTP "backend/internal/adapters/left/http"
	"backend/internal/services"
)

func main() {
	// 1. Initialize DB Adapter (outbound)
	repo := memdb.New()

	// 2. Initialize Service Layer (core business logic)
	svc := services.NewListService(repo)

	// 3. Initialize HTTP Server Router (inbound)
	serverAdapter := leftHTTP.NewHTTPServer(svc)

	// 4. Retrieve Network Port from Environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: serverAdapter.Router,
	}

	// 5. Start Server in a separate goroutine
	go func() {
		log.Printf("Starting List-Builder REST API on port %s...", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server ListenAndServe failed: %v", err)
		}
	}()

	// 6. Graceful Shutdown Configuration
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	// Block until signal is received
	sig := <-shutdownChan
	log.Printf("Received signal %v. Initiating graceful shutdown...", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Graceful shutdown failed: %v", err)
	}

	log.Println("Server successfully stopped. Goodbye!")
}
