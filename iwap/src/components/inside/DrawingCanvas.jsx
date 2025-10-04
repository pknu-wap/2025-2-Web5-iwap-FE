'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// --- 컴포넌트 상수 정의 ---
const CANVAS_INTERNAL_WIDTH = 384;
const CANVAS_INTERNAL_HEIGHT = 320;
const CANVAS_EXPORT_SIZE = 28;
const LINE_WIDTH = 10;

const DrawingCanvas = ({ onUploadSuccess }) => {
  // --- React Hooks: State 및 Ref 관리 ---
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- 1. 캔버스 초기 설정 useEffect ---
  // 이 useEffect는 컴포넌트가 처음 마운트될 때 *단 한 번만* 실행됩니다. (의존성 배열: [])
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_INTERNAL_WIDTH;
    canvas.height = CANVAS_INTERNAL_HEIGHT;
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
  }, []); // 의존성 배열이 비어있어, 리렌더링 시 다시 실행되지 않습니다.

  // --- 실제 드로잉 좌표 계산 함수 ---
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const touch = event.touches ? event.touches[0] : event;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  // --- 그리기 함수들 ---
  const startDrawing = useCallback((x, y) => {
    if (!context) return;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  }, [context]);

  const draw = useCallback((x, y) => {
    if (!isDrawing || !context) return;
    context.lineTo(x, y);
    context.stroke();
  }, [isDrawing, context]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    context?.closePath();

    const newHistory = history.slice(0, historyIndex + 1);
    const newImageData = context?.getImageData(0, 0, context.canvas.width, context.canvas.height);
    if (newImageData) {
      setHistory([...newHistory, newImageData]);
      setHistoryIndex(newHistory.length);
    }
  }, [isDrawing, context, history, historyIndex]);

  // --- 네이티브 이벤트 핸들러들 ---
  const handleNativeMouseDown = useCallback((e) => {
    const { x, y } = getCoordinates(e);
    startDrawing(x, y);
  }, [startDrawing]);

  const handleNativeMouseMove = useCallback((e) => {
    const { x, y } = getCoordinates(e);
    draw(x, y);
  }, [draw]);
  
  const handleNativeTouchStart = useCallback((e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    startDrawing(x, y);
  }, [startDrawing]);
  
  const handleNativeTouchMove = useCallback((e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    draw(x, y);
  }, [draw]);
  
  // --- 2. 네이티브 이벤트 리스너 등록/해제 useEffect ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 마우스 이벤트
    canvas.addEventListener('mousedown', handleNativeMouseDown);
    canvas.addEventListener('mousemove', handleNativeMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // 터치 이벤트 (passive: false로 스크롤 방지)
    canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      // 클린업 함수: 컴포넌트 언마운트 시 모든 이벤트 리스너 제거
      canvas.removeEventListener('mousedown', handleNativeMouseDown);
      canvas.removeEventListener('mousemove', handleNativeMouseMove);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', handleNativeTouchStart);
      canvas.removeEventListener('touchmove', handleNativeTouchMove);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [handleNativeMouseDown, handleNativeMouseMove, handleNativeTouchStart, handleNativeTouchMove, stopDrawing]);

  
  // --- 기능 함수들 (Undo, Redo, Clear, Post) ---
  const restoreCanvasState = useCallback((state) => {
    if (context && state) {
      context.putImageData(state, 0, 0);
    }
  }, [context]);

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
    // ... (이전과 동일)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_EXPORT_SIZE;
    tempCanvas.height = CANVAS_EXPORT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);
    tempCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('image', blob, 'drawing.png');
      try {
        const response = await fetch('/api/inside', { method: 'POST', body: formData });
        if (response.status === 204 && onUploadSuccess) onUploadSuccess();
        else throw new Error(`Server response error: ${response.status}`);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Image upload failed.');
      }
    }, 'image/png');
  };

  // --- 렌더링 ---
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="w-full h-9 bg-stone-300 flex justify-between items-center mb-[-1px] flex-shrink-0">
        <div className="flex gap-3 pl-3">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="disabled:opacity-40"><UndoIcon /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="disabled:opacity-40"><RedoIcon /></button>
        </div>
        <div className="flex gap-3 pr-3">
          <button onClick={clearCanvas}><TrashIcon /></button>
          <button onClick={handlePost}><SubmitIcon /></button>
        </div>
      </div>
      <div className="w-full flex-grow relative">
        {/* JSX에서 모든 on... 이벤트 핸들러를 제거하고 useEffect에서 관리합니다. */}
        <canvas
          ref={canvasRef}
          className="bg-white touch-action-none absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;

// --- 아이콘 컴포넌트들 ---
const UndoIcon = () => <Image src="/icons/undo.svg" alt="Undo" width={20} height={20} />;
const RedoIcon = () => <Image src="/icons/redo.svg" alt="Redo" width={20} height={20} />;
const TrashIcon = () => <Image src="/icons/trash.svg" alt="Clear" width={20} height={20} />;
const SubmitIcon = () => <Image src="/icons/submit.svg" alt="Submit" width={24} height={24} />;