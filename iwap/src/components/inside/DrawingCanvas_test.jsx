'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';


// 스타일 (이전과 동일)
const canvasStyle = {
  backgroundColor: 'white',
  border: '2px solid black',
  borderRadius: '8px',
  cursor: 'crosshair',
  touchAction: 'none',
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '15px',
  padding: '20px',
  fontFamily: 'sans-serif',
};

const buttonContainerStyle = {
  display: 'flex',
  gap: '10px',
};

const buttonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '5px',
  backgroundColor: '#007bff',
  color: 'white',
  fontWeight: 'bold',
};

const disabledButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#aaa',
  cursor: 'not-allowed',
};


const DrawingCanvas = () => {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // --- 추가된 State ---
  // history: 캔버스의 상태(ImageData)를 저장하는 배열
  const [history, setHistory] = useState([]);
  // historyIndex: 현재 history 배열의 어느 위치에 있는지 가리키는 인덱스
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 캔버스 초기 설정 및 첫 history 저장
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setContext(ctx);

      // 초기 빈 캔버스 상태를 history에 저장
      const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialImageData]);
      setHistoryIndex(0);
    }
  }, []);

  // 캔버스에 특정 상태를 복원하는 함수
  const restoreCanvasState = useCallback((state) => {
    if (context && state) {
      context.putImageData(state, 0, 0);
    }
  }, [context]);

  // 그리기 시작
  const startDrawing = (x, y) => {
    if (!context) return;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  };

  // 그리기
  const draw = (x, y) => {
    if (!isDrawing || !context) return;
    context.lineTo(x, y);
    context.stroke();
  };

  // 그리기 종료 및 history 업데이트
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    context.closePath();
    
    // 현재 캔버스 상태를 ImageData로 가져옴
    const newImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    
    // 만약 되돌리기를 한 상태에서 새로운 그림을 그리면, 이후의 기록은 삭제
    const newHistory = history.slice(0, historyIndex + 1);
    
    setHistory([...newHistory, newImageData]);
    setHistoryIndex(historyIndex + 1);
  };

  // --- 되돌리기 (Undo) ---
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  // --- 다시 실행 (Redo) ---
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  // --- 단축키(Ctrl+Z, Ctrl+Y) 핸들러 ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // 컴포넌트가 언마운트될 때 이벤트 리스너 제거
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // --- 이벤트 핸들러들 (마우스/터치) ---
  const handleMouseDown = ({ nativeEvent }) => startDrawing(nativeEvent.offsetX, nativeEvent.offsetY);
  const handleMouseMove = ({ nativeEvent }) => draw(nativeEvent.offsetX, nativeEvent.offsetY);
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { left, top } = canvasRef.current.getBoundingClientRect();
    startDrawing(touch.clientX - left, touch.clientY - top);
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { left, top } = canvasRef.current.getBoundingClientRect();
    draw(touch.clientX - left, touch.clientY - top);
  };

  // 이미지 저장
  const saveImage = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'my-drawing.png';
    link.click();
  };
  
  // 이미지 POST
  const handlePost = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create blob');
        return;
    }

    const formData = new FormData();
    formData.append('image', blob, 'drawing.png');

    try {
      const response = await fetch('/api/inside', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
          throw new Error('서버 응답이 올바르지 않습니다.');
        }

        const result = await response.json();
        console.log('업로드 성공:', result);
        alert(`이미지 업로드 성공! 파일 경로: ${result.filePath}`);
      } catch (error) {
        console.error('업로드 중 오류 발생:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }, 'image/png');
  };

  return (
    <div style={containerStyle}>
      <h2>그림판 🎨 (Undo/Redo 지원)</h2>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        style={canvasStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrawing}
      />
      <div style={buttonContainerStyle}>
        <button
          onClick={handleUndo}
          style={historyIndex <= 0 ? disabledButtonStyle : buttonStyle}
          disabled={historyIndex <= 0}
        >
          되돌리기 (Undo)
        </button>
        <button
          onClick={handleRedo}
          style={historyIndex >= history.length - 1 ? disabledButtonStyle : buttonStyle}
          disabled={historyIndex >= history.length - 1}
        >
          다시 실행 (Redo)
        </button>
      </div>
      <button onClick={handlePost} style={buttonStyle}>
        이미지로 저장
      </button>
    </div>
  );
};

export default DrawingCanvas;