/**
 * @file app/components/inside/DrawingCanvas.jsx
 * 사용자가 숫자를 그릴 수 있는 캔버스 UI를 제공하는 컴포넌트입니다.
 * 그리기, 되돌리기/다시 실행, 서버 전송 기능을 포함합니다.
 */
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

// --- 컴포넌트 상수 정의 ---
const CANVAS_DISPLAY_SIZE = 280; // 사용자에게 보여질 캔버스의 크기
const CANVAS_EXPORT_SIZE = 28;   // 서버로 전송될 이미지의 크기 (28x28)
const LINE_WIDTH = 15;           // 숫자 인식을 위해 굵은 펜 설정

// --- UI 스타일 객체 ---
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    fontFamily: 'sans-serif',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  canvas: {
    backgroundColor: 'white',
    border: '2px solid black',
    borderRadius: '8px',
    cursor: 'crosshair',
    touchAction: 'none', // 모바일에서 스크롤 대신 그리기가 되도록 설정
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#007bff',
    color: 'white',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  disabledButton: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'not-allowed',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#aaa',
    color: 'white',
    fontWeight: 'bold',
  },
};

/**
 * 그림판 기능을 수행하는 메인 컴포넌트입니다.
 * @param {object} props - 컴포넌트 프롭스.
 * @param {() => void} props.onUploadSuccess - 이미지 업로드 성공 시 호출될 콜백 함수.
 * @returns {JSX.Element} 그림판 UI.
 */
const DrawingCanvas = ({ onUploadSuccess }) => {
  // --- React Hooks: State 및 Ref 관리 ---
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- 캔버스 초기 설정 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);

    // 초기 빈 캔버스 상태를 히스토리의 첫 항목으로 저장합니다.
    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  }, []);

  // --- 그리기 및 히스토리 관리 함수 ---

  /** 캔버스 상태를 특정 히스토리 시점으로 복원합니다. */
  const restoreCanvasState = useCallback((state) => {
    if (context && state) {
      context.putImageData(state, 0, 0);
    }
  }, [context]);

  /** 그리기를 시작하는 함수. 마우스/터치 시작 시 호출됩니다. */
  const startDrawing = (x, y) => {
    if (!context) return;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  };

  /** 실제 선을 그리는 함수. 마우스/터치 이동 시 호출됩니다. */
  const draw = (x, y) => {
    if (!isDrawing || !context) return;
    context.lineTo(x, y);
    context.stroke();
  };

  /** 그리기를 멈추고 현재 상태를 히스토리에 저장하는 함수. */
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    context.closePath();

    // 되돌리기를 한 상태에서 새로 그리면, 이후의 히스토리는 잘라냅니다.
    const newHistory = history.slice(0, historyIndex + 1);
    const newImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    
    setHistory([...newHistory, newImageData]);
    setHistoryIndex(newHistory.length);
  };

  // --- Undo/Redo 기능 ---

  /** 이전 그림 상태로 되돌립니다. */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  /** 되돌렸던 작업을 다시 실행합니다. */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  // --- 이벤트 핸들러 ---

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

  /** 그린 이미지를 28x28로 리사이즈하여 서버에 POST 요청으로 전송합니다. */
  const handlePost = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. 임시 캔버스를 생성하여 이미지를 리사이즈합니다.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_EXPORT_SIZE;
    tempCanvas.height = CANVAS_EXPORT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);

    // 2. 리사이즈된 캔버스를 Blob 객체로 변환합니다.
    tempCanvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Blob 생성에 실패했습니다.');
        alert('이미지 파일 변환에 실패했습니다.');
        return;
      }
      
      // 3. FormData를 사용하여 파일을 서버에 전송합니다.
      const formData = new FormData();
      formData.append('image', blob, 'drawing.png');
      
      try {
        const response = await fetch('/api/inside', { method: 'POST', body: formData });
        if (response.status === 204) {
          console.log('이미지 업로드 성공. 콜백 함수 호출.');
          if (onUploadSuccess) onUploadSuccess(); // 부모 컴포넌트에 성공을 알립니다.
        } else {
          throw new Error(`서버 응답 에러: ${response.status}`);
        }
      } catch (error) {
        console.error('업로드 중 오류 발생:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }, 'image/png');
  };

  // --- 렌더링 ---
  return (
    <div style={styles.container}>
      <h2 className="text-gray-800 text-xl font-bold mb-4">숫자를 그려주세요</h2>
      <canvas
        ref={canvasRef}
        width={CANVAS_DISPLAY_SIZE}
        height={CANVAS_DISPLAY_SIZE}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrawing}
      />
      <div style={styles.buttonContainer}>
        <button onClick={handleUndo} style={historyIndex <= 0 ? styles.disabledButton : styles.button} disabled={historyIndex <= 0}>되돌리기</button>
        <button onClick={handleRedo} style={historyIndex >= history.length - 1 ? styles.disabledButton : styles.button} disabled={historyIndex >= history.length - 1}>다시 실행</button>
      </div>
      <button onClick={handlePost} style={styles.button}>
        결과 확인하기
      </button>
    </div>
  );
};

export default DrawingCanvas;
