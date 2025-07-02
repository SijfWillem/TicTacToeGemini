
// app.js

/**
 * @fileoverview This file contains the React components for the multi-player Tic-Tac-Toe game.
 * It manages the game state, player profiles with custom image symbols, and match scoring.
 */

const { useState, useEffect, useRef } = React;

// WebSocket connection setup
const ws = new WebSocket(`ws://${window.location.host}`);

// Square component: Renders a square that can display an image symbol or text
const Square = ({ value, onClick }) => (
  <button className="square" onClick={onClick}>
    {value && value.startsWith('data:image') ? (
      <img src={value} alt="player symbol" />
    ) : (
      value
    )}
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

// PlayerSetup component: Form for entering name and uploading a symbol or choosing from dropdown
const PlayerSetup = ({ gameId, playerId, onSetupComplete }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState(null);
  const [selectionType, setSelectionType] = useState('image'); // 'image' or 'dropdown'
  const fileInputRef = useRef(null);

  const defaultSymbols = ['X', 'O', '▲', '■', '●', '♦'];

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
      alert('Please enter your name and select a symbol.');
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
      <div className="symbol-selection-toggle">
        <label>
          <input
            type="radio"
            value="image"
            checked={selectionType === 'image'}
            onChange={() => setSelectionType('image')}
          />
          Upload Image
        </label>
        <label>
          <input
            type="radio"
            value="dropdown"
            checked={selectionType === 'dropdown'}
            onChange={() => setSelectionType('dropdown')}
          />
          Choose from List
        </label>
      </div>

      {selectionType === 'image' ? (
        <React.Fragment>
          <input
            type="file"
            accept="image/png,image/jpeg"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          {symbol && <img src={symbol} alt="Selected Symbol" className="symbol-preview" />}
        </React.Fragment>
      ) : (
        <select onChange={(e) => setSymbol(e.target.value)} value={symbol || ''}>
          <option value="" disabled>Select a symbol</option>
          {defaultSymbols.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      <button onClick={handleSubmit}>Join Game</button>
    </div>
  );
};

// MemeOverlay component: Displays a meme when a specific player wins
const MemeOverlay = ({ memeUrl, onclose }) => {
  if (!memeUrl) return null;

  return (
    <div className="meme-overlay" onClick={onclose}>
      <img src={memeUrl} alt="Lord of the Rings Meme" />
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
  const [memeUrl, setMemeUrl] = useState(null);

  useEffect(() => {
    console.log('Game component mounted or gameState/winner changed');
    if (gameState && gameState.winner) {
      console.log('Winner detected, triggering confetti and checking for Bram');
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
    }
  }, [gameState && gameState.winner]);

  useEffect(() => {
    console.log('WebSocket effect running');
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, payload } = message;
      console.log('Received WebSocket message:', type, payload);

      switch (type) {
        case 'GAME_CREATED':
          setGameId(payload.gameId);
          setPlayerId(payload.playerId);
          setNeedsSetup(true);
          setError('');
          console.log('GAME_CREATED: needsSetup set to true');
          break;
        case 'JOIN_ACCEPTED':
          setGameId(payload.gameId);
          setPlayerId(payload.playerId);
          setGameState(payload.gameState);
          setNeedsSetup(true);
          setError('');
          console.log('JOIN_ACCEPTED: needsSetup set to true');
          break;
        case 'UPDATE_STATE':
          setGameState(payload.gameState);
          if (payload.memeUrl) {
            setMemeUrl(payload.memeUrl);
            setShowMeme(true);
            console.log('UPDATE_STATE: memeUrl received, showMeme set to true', payload.memeUrl);
          } else {
            setShowMeme(false); // Reset meme visibility if no memeUrl
            setMemeUrl(null);
            console.log('UPDATE_STATE: no memeUrl, showMeme set to false');
          }
          setNeedsSetup(false);
          setError('');
          console.log('UPDATE_STATE: needsSetup set to false');
          break;
        case 'ERROR':
          setError(payload.message);
          console.error('ERROR from server:', payload.message);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => console.log('WebSocket connection closed');
    ws.onerror = (err) => console.error('WebSocket error:', err);

    return () => { ws.onmessage = null; };
  }, []);

  console.log('Rendering Game component. needsSetup:', needsSetup, 'gameState:', gameState, 'error:', error);

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

  const nextRound = () => {
    setShowMeme(false); // Hide meme on next round
    setMemeUrl(null);
    ws.send(JSON.stringify({ type: 'NEXT_ROUND', payload: { gameId } }));
  };
  const resetMatch = () => {
    setShowMeme(false); // Hide meme on reset match
    setMemeUrl(null);
    ws.send(JSON.stringify({ type: 'RESET_MATCH', payload: { gameId } }));
  };

  if (needsSetup) {
    console.log('Returning PlayerSetup component');
    return <PlayerSetup gameId={gameId} playerId={playerId} onSetupComplete={handlePlayerSetup} />;
  }

  if (!gameState) {
    console.log('Returning Lobby component');
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

  console.log('Returning Game UI');
  return (
    <div className="game-container">
      {showMeme && <MemeOverlay memeUrl={memeUrl} onclose={() => { setShowMeme(false); setMemeUrl(null); }} />}
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
      {error && <p className="error">{error}</p>}
    </div>
  );
};

// Render the Game component to the DOM
ReactDOM.render(<Game />, document.getElementById('root'));
