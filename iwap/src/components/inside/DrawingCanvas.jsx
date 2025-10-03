'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// --- 컴포넌트 상수 정의 ---
const CANVAS_DISPLAY_SIZE = 384; // w-96 -> 384px
const CANVAS_HEIGHT = 320; // h-80 -> 320px
const CANVAS_EXPORT_SIZE = 28;
const LINE_WIDTH = 10;

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

    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  }, []);

  // --- 그리기 및 히스토리 관리 함수 ---
  const restoreCanvasState = useCallback((state) => {
    if (context && state) {
      context.putImageData(state, 0, 0);
    }
  }, [context]);

  const startDrawing = (x, y) => {
    if (!context) return;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (x, y) => {
    if (!isDrawing || !context) return;
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    context.closePath();

    const newHistory = history.slice(0, historyIndex + 1);
    const newImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

    setHistory([...newHistory, newImageData]);
    setHistoryIndex(newHistory.length);
  };
    
  // --- 기능 함수들 ---
  const clearCanvas = () => {
    if (!context) return;
    context.fillStyle = 'white';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    const initialImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);
    
  const handlePost = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_EXPORT_SIZE;
    tempCanvas.height = CANVAS_EXPORT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);

    tempCanvas.toBlob(async (blob) => {
      if (!blob) {
        alert('이미지 파일 변환에 실패했습니다.');
        return;
      }
      const formData = new FormData();
      formData.append('image', blob, 'drawing.png');
      try {
        const response = await fetch('/api/inside', { method: 'POST', body: formData });
        if (response.status === 204) {
          if (onUploadSuccess) onUploadSuccess();
        } else {
          throw new Error(`서버 응답 에러: ${response.status}`);
        }
      } catch (error) {
        console.error('업로드 중 오류 발생:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }, 'image/png');
  };

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

  // --- 렌더링 ---
  return (
    <>
      <div className="w-96 h-9 bg-stone-300 flex justify-between items-center px-3 mb-[-1px]">
        <div className="flex gap-3">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="disabled:opacity-40"><UndoIcon /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="disabled:opacity-40"><RedoIcon /></button>
        </div>
        <div className="flex gap-3">
          <button onClick={clearCanvas}><TrashIcon /></button>
          <button onClick={handlePost}><SubmitIcon /></button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_DISPLAY_SIZE}
        height={CANVAS_HEIGHT}
        className="bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrawing}
      />
    </>
  );
};

export default DrawingCanvas;

// --- 아이콘 컴포넌트들 ---
const UndoIcon = () => <Image src="/icons/undo.svg" alt="Undo" width={20} height={20} />;
const RedoIcon = () => <Image src="/icons/redo.svg" alt="Redo" width={20} height={20} />;
const TrashIcon = () => <Image src="/icons/trash.svg" alt="Clear" width={20} height={20} />;
const SubmitIcon = () => <Image src="/icons/submit.svg" alt="Submit" width={24} height={24} />;