# Tic-Tac-Toe Game

This is a real-time, multi-player Tic-Tac-Toe game with custom player symbols and score tracking!

## Features

*   **Multi-Player:** Play with multiple players in real-time using WebSockets.
*   **Custom Symbols:** Upload your own PNG or JPG image as your game symbol, or choose from a predefined list.
*   **Score Tracking:** Keep track of scores across multiple rounds within a match.
*   **Confetti Celebration:** Enjoy a spectacular confetti show when you win a game.
*   **Bram's Meme:** If a player named "Bram" wins, a random Lord of the Rings meme will appear!

## Setup and Run

To set up and run the game locally, follow these steps:

1.  **Navigate to the project directory:**

    ```bash
    cd tic-tac-toe
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the server:**

    ```bash
    node server.js
    ```

    The server will start on `http://localhost:3000` (or another available port).

4.  **Open in browser:**

    Open your web browser and go to `http://localhost:3000`.

5.  **Play the game:**

    *   You can create a new game or join an existing one using the Game ID.
    *   Enter your name and choose your symbol (upload an image or select from the dropdown).
    *   Share the Game ID with others on the same network to play together!

## Technologies Used

*   **Backend:** Node.js, Express.js, `ws` (WebSockets)
*   **Frontend:** React (via CDN), HTML, CSS, `canvas-confetti`
