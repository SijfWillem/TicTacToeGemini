// app.js

/**
 * @fileoverview This file contains the React components for the multi-player Tic-Tac-Toe game.
 * It manages the game state, player profiles with custom image symbols, and match scoring.
 */

const { useState, useEffect, useRef } = React;

// WebSocket connection setup
const ws = new WebSocket(`ws://${window.location.host}`);

// Square component: Renders a square that can display an image symbol
const Square = ({ value, onClick }) => (
  <button className="square" onClick={onClick}>
    {value && <img src={value} alt="player symbol" />}
  </button>
);

// Board component: Renders the 3x3 game board
const Board = ({ squares, onClick }) => (
  <div className="game-board">
    {squares.map((square, i) => (
      <Square key={i} value={square} onClick={() => onClick(i)} />
    ))}
  </div>
);

// Scoreboard component: Displays player names and scores
const Scoreboard = ({ players, scores }) => (
  <div className="scoreboard">
    <h2>Scoreboard</h2>
    <ul>
      {players.map(player => (
        <li key={player.id}>
          <span className="player-name">{player.name}</span>
          <span className="player-score">{scores[player.id]}</span>
        </li>
      ))}
    </ul>
  </div>
);

// PlayerSetup component: Form for entering name and uploading a symbol
const PlayerSetup = ({ gameId, playerId, onSetupComplete }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSymbol(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid PNG or JPG image.');
    }
  };

  const handleSubmit = () => {
    if (name && symbol) {
      onSetupComplete({ gameId, playerId, name, symbol });
    } else {
      alert('Please enter your name and upload a symbol.');
    }
  };

  return (
    <div className="player-setup">
      <h2>Player Setup</h2>
      <input
        type="text"
        placeholder="Enter Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="file"
        accept="image/png"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
      {symbol && <img src={symbol} alt="Selected Symbol" className="symbol-preview" />}
      <button onClick={handleSubmit}>Join Game</button>
    </div>
  );
};

  // MemeOverlay component: Displays a meme when a specific player wins
const MemeOverlay = ({ winnerName, onclose }) => {
  if (winnerName.toLowerCase() !== 'bram') return null;

  return (
    <div className="meme-overlay" onClick={onclose}>
      <img src="https://i.imgflip.com/1j2oed.jpg" alt="Lord of the Rings Meme" />
      <p>One does not simply walk into Mordor... but Bram just won Tic-Tac-Toe!</p>
    </div>
  );
};

// Main Game component
const Game = () => {
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [inputGameId, setInputGameId] = useState('');
  const [error, setError] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showMeme, setShowMeme] = useState(false);

  useEffect(() => {
    if (gameState && gameState.winner) {
      // A more spectacular confetti celebration
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      if (gameState.winner.name.toLowerCase() === 'bram') {
        setShowMeme(true);
      }
    }
  }, [gameState ? gameState.winner : null]);

  useEffect(() => {
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, payload } = message;

      switch (type) {
        case 'GAME_CREATED':
          setGameId(payload.gameId);
          setPlayerId(payload.playerId);
          setNeedsSetup(true);
          setError('');
          break;
        case 'JOIN_ACCEPTED':
          setGameId(payload.gameId);
          setPlayerId(payload.playerId);
          setGameState(payload.gameState);
          setNeedsSetup(true);
          setError('');
          break;
        case 'UPDATE_STATE':
          setGameState(payload.gameState);
          setNeedsSetup(false);
          setError('');
          break;
        case 'ERROR':
          setError(payload.message);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => console.log('WebSocket connection closed');
    ws.onerror = (err) => console.error('WebSocket error:', err);

    return () => { ws.onmessage = null; };
  }, []);

  const createGame = () => ws.send(JSON.stringify({ type: 'CREATE_GAME' }));
  const joinGame = () => {
    if (inputGameId) {
      ws.send(JSON.stringify({ type: 'JOIN_GAME', payload: { gameId: inputGameId.toUpperCase() } }));
    }
  };

  const handlePlayerSetup = (playerInfo) => {
    ws.send(JSON.stringify({ type: 'SET_PLAYER_INFO', payload: playerInfo }));
  };

  const makeMove = (index) => {
    if (gameState && !gameState.winner && gameState.board[index] === null) {
      ws.send(JSON.stringify({ type: 'MAKE_MOVE', payload: { gameId, playerId, index } }));
    }
  };

  const nextRound = () => ws.send(JSON.stringify({ type: 'NEXT_ROUND', payload: { gameId } }));
  const resetMatch = () => ws.send(JSON.stringify({ type: 'RESET_MATCH', payload: { gameId } }));

  if (needsSetup) {
    return <PlayerSetup gameId={gameId} playerId={playerId} onSetupComplete={handlePlayerSetup} />;
  }

  if (!gameState) {
    return (
      <div className="lobby">
        <h1>Tic-Tac-Toe</h1>
        <button onClick={createGame}>Create New Game</button>
        <div className="join-game">
          <input
            type="text"
            placeholder="Enter Game ID"
            value={inputGameId}
            onChange={(e) => setInputGameId(e.target.value)}
          />
          <button onClick={joinGame}>Join Game</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const { board, players, scores, currentPlayerIndex, winner, isDraw } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const you = players.find(p => p.id === playerId);

  let status;
  if (winner) {
    status = `Winner: ${winner.name}!`;
  } else if (isDraw) {
    status = "It's a Draw!";
  } else {
    status = `Next player: ${currentPlayer.name}`;
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Game ID: {gameId}</h1>
        {you && <p className="your-name">Welcome, {you.name}</p>}
      </div>
      <div className="game-main">
        <div className="game-area">
          <div className="status">{status}</div>
          <Board squares={board} onClick={makeMove} />
          <div className="game-controls">
            {(winner || isDraw) && <button className="next-round-button" onClick={nextRound}>Next Round</button>}
            <button className="reset-match-button" onClick={resetMatch}>Reset Match</button>
          </div>
        </div>
        <Scoreboard players={players} scores={scores} />
      </div>
      {showMeme && <MemeOverlay winnerName={winner.name} onclose={() => setShowMeme(false)} />}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

// Render the Game component to the DOM
ReactDOM.render(<Game />, document.getElementById('root'))