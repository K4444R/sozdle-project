import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [board, setBoard] = useState(Array(6).fill('').map(() => Array(5).fill('')));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [wordToGuess, setWordToGuess] = useState('');
  const [notification, setNotification] = useState({ message: '', visible: false });
  const [attempts, setAttempts] = useState(1);
  const [letterStatus, setLetterStatus] = useState(Array(6).fill('').map(() => Array(5).fill('')));
  const [keyStatus, setKeyStatus] = useState({});
  const [gameStatus, setGameStatus] = useState(null);

  const keyboard = ['QWERTYUIOP', 'ASDFGHJKL', '>ZXCVBNM<'];

  useEffect(() => {
    const fetchWord = async () => {
      try {
        const response = await axios.get('http://localhost:3000/current');
        setWordToGuess(response.data.message.split(': ')[1]);
      } catch (error) {
        console.error('Ошибка при получении слова:', error);
      }
    };
    fetchWord();
  }, []);

  const showNotification = (message) => {
    setNotification({ message, visible: true });
    setTimeout(() => setNotification({ message: '', visible: false }), 2000);
  };

  const resetGame = async () => {
    try {
      await axios.get('http://localhost:3000/new_game'); // Запрос на сервер для старта новой игры
      setBoard(Array(6).fill('').map(() => Array(5).fill('')));
      setCurrentRow(0);
      setCurrentCol(0);
      setGameStatus(null);
      setAttempts(1);
      setLetterStatus(Array(6).fill('').map(() => Array(5).fill('')));
      setKeyStatus({});
      setWordToGuess('');
      const response = await axios.get('http://localhost:3000/current');
      setWordToGuess(response.data.message.split(': ')[1]);
    } catch (error) {
      console.error('Ошибка при запуске новой игры:', error);
    }
  };

  const handleKeyPress = async (key) => {
    if (key === 'Enter') {
      if (gameStatus) {
        resetGame(); // Сбрасываем игру, если она завершена
        return;
      }

      if (currentCol < 5) {
        showNotification('Too short');
        return;
      }

      const currentGuess = board[currentRow].join('');
      try {
        const response = await axios.get(`http://localhost:3000/?word=${currentGuess}`);
        if (response.status === 404) {
          showNotification('Word not found');
          return;
        }

        const newLetterStatus = [...letterStatus];
        const newKeyStatus = { ...keyStatus };
        const guessStatus = currentGuess.split('').map((letter, index) => {
          if (letter === wordToGuess[index]) {
            newKeyStatus[letter] = '#6aaa64';
            return 'green';
          } else if (wordToGuess.includes(letter)) {
            if (newKeyStatus[letter] !== '#6aaa64') {
              newKeyStatus[letter] = '#c9b458';
            }
            return 'yellow';
          } else {
            if (!newKeyStatus[letter]) {
              newKeyStatus[letter] = '#787c7e';
            }
            return 'gray';
          }
        });

        newLetterStatus[currentRow] = guessStatus;
        setLetterStatus(newLetterStatus);
        setKeyStatus(newKeyStatus);

        if (currentGuess === wordToGuess) {
          setGameStatus('won');
        } else if (currentRow === 5) {
          setGameStatus('failed');
        } else {
          setCurrentRow((prev) => prev + 1);
          setCurrentCol(0);
          setAttempts((prev) => prev + 1);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          showNotification('Word not found');
        } else {
          console.error('Ошибка при отправке слова:', error);
        }
      }
    } else if (key === 'Backspace' || key === '←') {
      if (currentCol > 0) {
        const newBoard = board.map((row, rowIndex) =>
          rowIndex === currentRow
            ? row.map((cell, colIndex) => (colIndex === currentCol - 1 ? '' : cell))
            : row
        );
        setBoard(newBoard);
        setCurrentCol((prevCol) => prevCol - 1);
      }
    } else if (/^[A-Za-z]$/.test(key)) {
      if (currentCol < 5) {
        const newBoard = board.map((row, rowIndex) =>
          rowIndex === currentRow
            ? row.map((cell, colIndex) => (colIndex === currentCol ? key.toUpperCase() : cell))
            : row
        );
        setBoard(newBoard);
        setCurrentCol((prevCol) => prevCol + 1);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => handleKeyPress(event.key);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, currentRow, currentCol, gameStatus]);

  return (
    <div className="background">
      <div className="app">
        <h1 className="title">Sozdle</h1>

        {/* Всплывающая нотификация */}
        {notification.visible && (
          <div className="notification">
            {notification.message}
          </div>
        )}

        {/* Игровое поле */}
        <div className="board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="row">
              {row.map((cell, colIndex) => (
                <div
                  key={colIndex}
                  className="cell"
                  style={{
                    backgroundColor:
                      letterStatus[rowIndex][colIndex] === 'green'
                        ? '#6aaa64'
                        : letterStatus[rowIndex][colIndex] === 'yellow'
                        ? '#c9b458'
                        : letterStatus[rowIndex][colIndex] === 'gray'
                        ? '#787c7e'
                        : 'white',
                  }}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Клавиатура */}
        <div className="keyboard">
          {keyboard.map((line, lineIndex) => (
            <div key={lineIndex} className="keyboard-line">
              {line.split('').map((key) => (
                <button
                  key={key}
                  className={`key ${key === '>' ? 'large-key' : ''}`}
                  onClick={() => handleKeyPress(key === '>' ? 'Enter' : key === '<' ? '←' : key)}
                  style={{
                    backgroundColor: keyStatus[key] || 'white',
                  }}
                >
                  {key === '>' ? 'Enter' : key === '<' ? '←' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Окно результата */}
        {gameStatus && (
          <div className="overlay">
            <div className="dialog">
              <h2>{gameStatus === 'won' ? 'You Won!' : 'You Failed!'}</h2>
              {gameStatus === 'failed' && <p>The word was: {wordToGuess}</p>}
              {gameStatus === 'won' && <p>Attempts: {attempts}</p>}
              <button onClick={resetGame}>New Game</button>
              <p className="small-text">Press Enter to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
