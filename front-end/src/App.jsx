import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [board, setBoard] = useState(Array(6).fill('').map(() => Array(5).fill(''))); // Игровое поле 6x5
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [gameStatus, setGameStatus] = useState(null); // Статус игры (победа или поражение)
  const [wordToGuess, setWordToGuess] = useState('HELLO'); // Загаданное слово
  const [isOpen, setIsOpen] = useState(false); // Состояние для диалогового окна
  const [attempts, setAttempts] = useState(1); // Счетчик попыток, начинаем с 1
  const [letterStatus, setLetterStatus] = useState(Array(6).fill('').map(() => Array(5).fill(''))); // Статус букв (зеленый, желтый, серый)
  const [keyStatus, setKeyStatus] = useState({}); // Статус клавиш (зеленый, желтый, серый)

  const keyboard = [
    'QWERTYUIOP',
    'ASDFGHJKL',
    '>ZXCVBNM<',
  ];

  const handleKeyPress = (key) => {
    if (key === 'Enter') {
      if (currentCol === 5) {
        const currentGuess = board[currentRow].join('');
        const newLetterStatus = [...letterStatus];
        const newKeyStatus = { ...keyStatus };

        // Определяем статус каждой буквы
        const guessStatus = currentGuess.split('').map((letter, index) => {
          if (letter === wordToGuess[index]) {
            newKeyStatus[letter] = '#6aaa64'; // Зеленый для правильной буквы
            return 'green';
          } else if (wordToGuess.includes(letter)) {
            if (newKeyStatus[letter] !== '#6aaa64') {
              newKeyStatus[letter] = '#c9b458'; // Желтый для буквы, которая есть, но не на правильной позиции
            }
            return 'yellow';
          } else {
            if (!newKeyStatus[letter]) {
              newKeyStatus[letter] = '#787c7e'; // Серый для отсутствующей буквы
            }
            return 'gray';
          }
        });

        // Обновляем статус букв
        newLetterStatus[currentRow] = guessStatus;
        setLetterStatus(newLetterStatus);
        setKeyStatus(newKeyStatus);

        if (currentGuess === wordToGuess) {
          setGameStatus('won');
        } else if (currentRow === 5) {
          setGameStatus('failed');
        } else {
          setCurrentRow((prevRow) => Math.min(prevRow + 1, 5));
          setCurrentCol(0);
          setAttempts((prevAttempts) => prevAttempts + 1); // Увеличиваем счетчик попыток
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

  const openDialog = () => {
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    resetGame();
  };

  const resetGame = () => {
    setBoard(Array(6).fill('').map(() => Array(5).fill('')));
    setCurrentRow(0);
    setCurrentCol(0);
    setGameStatus(null);
    setAttempts(1); // Сброс счетчика попыток на 1
    setLetterStatus(Array(6).fill('').map(() => Array(5).fill(''))); // Сброс статуса букв
    setKeyStatus({}); // Сброс статуса клавиш
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameStatus) {
        if (event.key === 'Enter') {
          closeDialog(); // Закрыть диалог и начать новую игру
        }
      } else {
        handleKeyPress(event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [board, currentRow, currentCol, gameStatus]);

  useEffect(() => {
    if (gameStatus) {
      openDialog();
    }
  }, [gameStatus]);

  return (
    <div className="background">
      <div className="app">
        <h1 className="title">Sozdle</h1>

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

        {isOpen && (
          <div className="overlay">
            <div className="dialog">
              <h2>{gameStatus === 'won' ? 'You Won!' : 'You Failed!'}</h2>
              {gameStatus === 'failed' && <p>Word: {wordToGuess}</p>}
              {gameStatus === 'won' && <p>Attempts: {attempts}</p>} {/* Показываем attempts только при победе */}
              <button onClick={closeDialog}>New Game</button>
              <p className="small-text">or press Enter to play again</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
  