
// server.js

/**
 * @fileoverview This file contains the server-side logic for the multi-player Tic-Tac-Toe game.
 * It manages multiple game rooms, player profiles with custom image symbols, and match scoring.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const games = {};
const connections = {};

const memeDatabase = [
  'https://i.imgflip.com/1j2oed.jpg',
  'https://i.imgflip.com/2x2l5.jpg',
  'https://i.imgflip.com/152a0.jpg',
  'https://i.imgflip.com/1b6t.jpg',
  'https://i.imgflip.com/csw6.jpg',
  'https://i.imgflip.com/1og9.jpg',
  'https://i.imgflip.com/2k9v.jpg',
  'https://i.imgflip.com/1bh8.jpg',
  'https://i.imgflip.com/265s.jpg',
  'https://i.imgflip.com/275t.jpg',
];

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function broadcast(gameId, message) {
  if (connections[gameId]) {
    connections[gameId].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const { type, payload } = data;
    let game;

    switch (type) {
      case 'CREATE_GAME': {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const playerId = Math.random().toString(36).substring(2, 12);

        games[gameId] = {
          players: [],
          board: Array(9).fill(null),
          currentPlayerIndex: 0,
          winner: null,
          isDraw: false,
          scores: {},
        };

        connections[gameId] = new Set([ws]);
        ws.gameId = gameId;
        ws.playerId = playerId;

        ws.send(JSON.stringify({ type: 'GAME_CREATED', payload: { gameId, playerId } }));
        break;
      }

      case 'JOIN_GAME': {
        const { gameId } = payload;
        if (games[gameId]) {
          const playerId = Math.random().toString(36).substring(2, 12);
          connections[gameId].add(ws);
          ws.gameId = gameId;
          ws.playerId = playerId;

          ws.send(JSON.stringify({ type: 'JOIN_ACCEPTED', payload: { gameId, playerId, gameState: games[gameId] } }));
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Game not found.' } }));
        }
        break;
      }

      case 'SET_PLAYER_INFO': {
        const { gameId, playerId, name, symbol } = payload;
        game = games[gameId];
        if (game) {
          const isSymbolTaken = game.players.some(p => p.symbol === symbol);
          if (isSymbolTaken) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Symbol already taken. Please choose another.' } }));
          } else if (!game.players.find(p => p.id === playerId)) {
            game.players.push({ id: playerId, name, symbol });
            game.scores[playerId] = 0;
            broadcast(gameId, { type: 'UPDATE_STATE', payload: { gameState: game } });
          }
        }
        break;
      }

      case 'MAKE_MOVE': {
        const { gameId, playerId, index } = payload;
        game = games[gameId];
        if (game) {
          const player = game.players.find(p => p.id === playerId);
          const currentPlayer = game.players[game.currentPlayerIndex];

          if (player && player.id === currentPlayer.id && !game.board[index] && !game.winner) {
            game.board[index] = player.symbol;
            const winnerSymbol = calculateWinner(game.board);
            if (winnerSymbol) {
              const winnerPlayer = game.players.find(p => p.symbol === winnerSymbol);
              game.winner = winnerPlayer;
              game.scores[winnerPlayer.id]++;

              let memeUrl = null;
              if (winnerPlayer.name.toLowerCase() === 'bram') {
                memeUrl = memeDatabase[Math.floor(Math.random() * memeDatabase.length)];
              }
              broadcast(gameId, { type: 'UPDATE_STATE', payload: { gameState: game, memeUrl } });
            } else if (game.board.every(square => square !== null)) {
              game.isDraw = true;
            } else {
              game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            }
            broadcast(gameId, { type: 'UPDATE_STATE', payload: { gameState: game } });
          }
        }
        break;
      }

      case 'NEXT_ROUND': {
        game = games[payload.gameId];
        if (game) {
          game.board = Array(9).fill(null);
          game.winner = null;
          game.isDraw = false;
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length; // Rotate starting player
          broadcast(payload.gameId, { type: 'UPDATE_STATE', payload: { gameState: game } });
        }
        break;
      }

      case 'RESET_MATCH': {
        game = games[payload.gameId];
        if (game) {
          game.board = Array(9).fill(null);
          game.winner = null;
          game.isDraw = false;
          game.currentPlayerIndex = 0;
          Object.keys(game.scores).forEach(playerId => game.scores[playerId] = 0);
          broadcast(payload.gameId, { type: 'UPDATE_STATE', payload: { gameState: game } });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    const { gameId, playerId } = ws;
    if (gameId && connections[gameId]) {
      connections[gameId].delete(ws);
      if (connections[gameId].size === 0) {
        delete games[gameId];
        delete connections[gameId];
      } else {
        game = games[gameId];
        if (game) {
          game.players = game.players.filter(p => p.id !== playerId);
          if (game.players.length > 0) {
            game.currentPlayerIndex = game.currentPlayerIndex % game.players.length;
            broadcast(gameId, { type: 'UPDATE_STATE', payload: { gameState: game } });
          }
        }
      }
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
