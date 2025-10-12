'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import UndoIcon from '@/components/ui/icons/UndoIcon';
import RedoIcon from '@/components/ui/icons/RedoIcon';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import SubmitIcon from '@/components/ui/icons/SubmitIcon';

const CANVAS_INTERNAL_WIDTH = 384;
const CANVAS_INTERNAL_HEIGHT = 320;
const CANVAS_EXPORT_SIZE = 28;
const LINE_WIDTH = 10;
const PEN_COLOR = 'black';
const BACKGROUND_COLOR = 'white';

/**
 * @param {{ 
 *   onUploadSuccess: (data: object) => void,
 *   onUploadStart: () => void,
 *   onUploadFail: (error: string) => void
 * }} props
 */
const DrawingCanvas = ({ onUploadSuccess, onUploadStart, onUploadFail }) => {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_INTERNAL_WIDTH;
    canvas.height = CANVAS_INTERNAL_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);

    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  }, []);

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
    if (!isDrawing || !context) return;
    setIsDrawing(false);
    context.closePath();

    const newHistory = history.slice(0, historyIndex + 1);
    const newImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    setHistory([...newHistory, newImageData]);
    setHistoryIndex(newHistory.length);
  }, [isDrawing, context, history, historyIndex]);

  const handleNativeMouseDown = useCallback((e) => { const { x, y } = getCoordinates(e); startDrawing(x, y); }, [startDrawing]);
  const handleNativeMouseMove = useCallback((e) => { const { x, y } = getCoordinates(e); draw(x, y); }, [draw]);
  const handleNativeTouchStart = useCallback((e) => { e.preventDefault(); const { x, y } = getCoordinates(e); startDrawing(x, y); }, [startDrawing]);
  const handleNativeTouchMove = useCallback((e) => { e.preventDefault(); const { x, y } = getCoordinates(e); draw(x, y); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleNativeMouseDown);
    canvas.addEventListener('mousemove', handleNativeMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', handleNativeMouseDown);
      canvas.removeEventListener('mousemove', handleNativeMouseMove);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', handleNativeTouchStart);
      canvas.removeEventListener('touchmove', handleNativeTouchMove);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [handleNativeMouseDown, handleNativeMouseMove, handleNativeTouchStart, handleNativeTouchMove, stopDrawing]);

  const restoreCanvasState = useCallback((state) => {
    if (context && state) context.putImageData(state, 0, 0);
  }, [context]);

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

  const clearCanvas = () => {
    if (!context) return;
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    
    const initialImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  };
  
  const handlePost = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. 부모 컴포넌트에 업로드 시작을 알림
    onUploadStart?.();

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_EXPORT_SIZE;
    tempCanvas.height = CANVAS_EXPORT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 1. 원본 이미지를 28x28 임시 캔버스에 그립니다.
    tempCtx.drawImage(canvas, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);

    // 2. 픽셀 데이터를 가져와 색상을 반전시킵니다. (흰배경/검은글씨 -> 검은배경/흰글씨)
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // Red
      data[i + 1] = 255 - data[i + 1]; // Green
      data[i + 2] = 255 - data[i + 2]; // Blue
      // Alpha 채널 (data[i + 3])은 변경하지 않습니다.
    }

    // 3. 색상이 반전된 픽셀 데이터를 다시 임시 캔버스에 적용합니다.
    tempCtx.putImageData(imageData, 0, 0);

    // 4. 색상이 반전된 이미지를 Blob으로 변환하여 서버에 전송합니다.
    tempCanvas.toBlob(async (blob) => {
      if (!blob) {
        onUploadFail?.('[이미지 처리 오류]: 캔버스 이미지를 파일로 변환할 수 없습니다.');
        return;
      }
      const formData = new FormData();
      formData.append('num_image', blob, 'image.jpeg');
      
      try {
        const response = await fetch('/api/inside', { 
          method: 'POST', 
          body: formData 
        });
        
        if (response.ok) {
          const data = await response.json();
          onUploadSuccess?.(data);
        } else {
          const errorText = await response.text();
          let errorMessage = '';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorText;
          } catch {
            errorMessage = errorText || '응답 없음';
          }
          throw new Error(`[서버 오류 ${response.status}]: ${errorMessage}`);
        }
      } catch (error) {
        console.error('[DrawingCanvas] Error: Image upload failed:', error);
        // 2. 부모 컴포넌트에 업로드 실패를 알림
        onUploadFail?.(error.message || '[업로드 오류]: 이미지 업로드에 실패했습니다.');
      }
    }, 'image/jpeg');
  };

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
        <canvas
          ref={canvasRef}
          className="bg-white touch-action-none absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;