// ReturnBy's local launcher embeds the reviewed browser build.
// It never reads or writes purchase data; that belongs to the browser.
package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

//go:embed web
var bundled embed.FS

var version = "development"
var source = "unknown"

type release struct {
	App     string `json:"app"`
	Version string `json:"version"`
	Source  string `json:"source"`
}

func currentRelease() release { return release{"ReturnBy", version, source} }

func existingRelease(address string) (release, error) {
	client := http.Client{Timeout: time.Second}
	response, err := client.Get("http://" + address + "/__returnby/release")
	if err != nil {
		return release{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return release{}, fmt.Errorf("not a ReturnBy launcher")
	}
	var found release
	err = json.NewDecoder(io.LimitReader(response.Body, 2048)).Decode(&found)
	return found, err
}

func openBrowser(url string) error {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		command = exec.Command("/usr/bin/open", url)
	default:
		command = exec.Command("xdg-open", url)
	}
	if err := command.Start(); err != nil {
		return err
	}
	go command.Wait()
	return nil
}

func handler(files fs.FS, address string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "This local app only serves its built-in pages.", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-cache")
		if r.URL.Path == "/__returnby/release" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(currentRelease())
			return
		}
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		// Read only the embedded release: never serve the process's working directory.
		data, err := fs.ReadFile(files, path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		http.ServeContent(w, r, path, time.Time{}, bytes.NewReader(data))
	})
}

func run() int {
	defaultPort := 8769
	if value := os.Getenv("RETURNBY_PORT"); value != "" {
		port, err := strconv.Atoi(value)
		if err != nil || port < 1 || port > 65535 {
			fmt.Fprintln(os.Stderr, "RETURNBY_PORT must be a number between 1 and 65535.")
			return 2
		}
		defaultPort = port
	}
	port := flag.Int("port", defaultPort, "local port; keep the same address for saved purchases")
	noOpen := flag.Bool("no-open", false, "print the address without opening a browser")
	showVersion := flag.Bool("version", false, "show the exact release version and source")
	flag.Parse()
	if *showVersion {
		fmt.Printf("ReturnBy %s\nSource %s\n", version, source)
		return 0
	}
	if *port < 1 || *port > 65535 {
		fmt.Fprintln(os.Stderr, "Choose a port between 1 and 65535.")
		return 2
	}
	address := net.JoinHostPort("127.0.0.1", strconv.Itoa(*port))
	url := "http://" + address
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		found, checkErr := existingRelease(address)
		if checkErr == nil && found == currentRelease() {
			fmt.Printf("This ReturnBy release is already running at %s\n", url)
			if !*noOpen {
				if err := openBrowser(url); err != nil {
					fmt.Println("Open that address in your browser.")
				}
			}
			return 0
		}
		fmt.Fprintf(os.Stderr, "ReturnBy cannot use %s because the port is occupied or unavailable.\n", url)
		fmt.Fprintln(os.Stderr, "Close the other local server and try again. ReturnBy has not switched addresses.")
		fmt.Fprintln(os.Stderr, "Changing the port creates a separate browser storage location. Use a backup to transfer saved work.")
		return 2
	}
	files, err := fs.Sub(bundled, "web")
	if err != nil {
		listener.Close()
		fmt.Fprintln(os.Stderr, "This release is missing its pages:", err)
		return 1
	}
	server := &http.Server{Handler: handler(files, address), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 30 * time.Second}
	stopped := make(chan os.Signal, 1)
	signal.Notify(stopped, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(stopped)
	go func() {
		<-stopped
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		server.Shutdown(ctx)
	}()
	fmt.Printf("ReturnBy %s\n\nOpen %s in your browser.\n", version, url)
	fmt.Println("Keep this window open while using ReturnBy. Press Ctrl+C to close it.")
	fmt.Println("Your saved purchases remain in the same browser at this address.")
	if !*noOpen {
		if err := openBrowser(url); err != nil {
			fmt.Println("The browser could not open automatically; open the address above.")
		}
	}
	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	return 0
}

func main() { os.Exit(run()) }
