// /components/inside/DrawingCanvas.jsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import UndoIcon from '@/components/ui/icons/UndoIcon';
import RedoIcon from '@/components/ui/icons/RedoIcon';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import SubmitIcon from '@/components/ui/icons/SubmitIcon';

// --- 상수 정의 ---
const CANVAS_INTERNAL_WIDTH = 384;  // 캔버스의 내부 해상도 너비 (드로잉 품질)
const CANVAS_INTERNAL_HEIGHT = 320; // 캔버스의 내부 해상도 높이
const CANVAS_EXPORT_SIZE = 28;      // AI 모델 입력에 맞게 리사이즈될 최종 이미지 크기
const LINE_WIDTH = 10;              // 그리기 선의 굵기
const PEN_COLOR = 'black';          // 펜 색상
const BACKGROUND_COLOR = 'white';   // 캔버스 배경색

/**
 * 사용자가 숫자를 그릴 수 있는 캔버스 컴포넌트.
 * 그리기, 되돌리기, 다시 실행, 지우기, 서버로 이미지 제출 기능을 제공함.
 * @param {{ onUploadSuccess: () => void }} props - 이미지 업로드 성공 시 호출될 콜백 함수
 */
const DrawingCanvas = ({ onUploadSuccess }) => {
  // --- 상태 및 Ref 관리 ---
  const canvasRef = useRef(null); // 실제 <canvas> DOM 요소에 접근하기 위한 ref
  const [context, setContext] = useState(null); // 2D 드로잉 컨텍스트 객체
  const [isDrawing, setIsDrawing] = useState(false); // 현재 그리고 있는 중인지 여부
  const [history, setHistory] = useState([]); // 되돌리기/다시실행을 위한 캔버스 상태 스냅샷 배열
  const [historyIndex, setHistoryIndex] = useState(-1); // history 배열에서의 현재 위치

  // 1. 컴포넌트 마운트 시 캔버스 초기 설정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 캔버스 해상도 및 2D 컨텍스트 설정
    canvas.width = CANVAS_INTERNAL_WIDTH;
    canvas.height = CANVAS_INTERNAL_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 초기 배경 및 그리기 스타일 정의
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round'; // 선의 끝을 둥글게 처리
    ctx.lineJoin = 'round'; // 선이 꺾이는 부분을 둥글게 처리
    setContext(ctx);

    // 초기 상태(흰 배경)를 히스토리의 첫 번째 스냅샷으로 저장
    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  }, []);

  // 화면상의 좌표(마우스/터치)를 캔버스 내부의 실제 좌표로 변환하는 함수
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const touch = event.touches ? event.touches[0] : event; // 터치와 마우스 이벤트 모두 처리
    const rect = canvas.getBoundingClientRect(); // 뷰포트 기준 캔버스 위치와 크기
    // CSS 크기와 실제 해상도 사이의 비율을 계산하여 정확한 좌표를 구함
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  // --- 그리기 로직 (useCallback으로 불필요한 함수 재생성 방지) ---
  const startDrawing = useCallback((x, y) => {
    if (!context) return;
    setIsDrawing(true);
    context.beginPath(); // 새로운 경로 시작
    context.moveTo(x, y); // 펜을 지정된 좌표로 이동
  }, [context]);

  const draw = useCallback((x, y) => {
    if (!isDrawing || !context) return;
    context.lineTo(x, y); // 현재 위치에서 지정된 좌표까지 선을 추가
    context.stroke(); // 경로에 따라 선을 그림
  }, [isDrawing, context]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !context) return;
    setIsDrawing(false);
    context.closePath(); // 현재 경로 닫기

    // 그리기가 끝난 후의 캔버스 상태를 새로운 히스토리로 추가
    const newHistory = history.slice(0, historyIndex + 1); // '다시 실행'으로 되돌려진 상태는 잘라냄
    const newImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    setHistory([...newHistory, newImageData]);
    setHistoryIndex(newHistory.length);
  }, [isDrawing, context, history, historyIndex]);

  // --- 네이티브 이벤트 핸들러 (마우스/터치) ---
  const handleNativeMouseDown = useCallback((e) => { const { x, y } = getCoordinates(e); startDrawing(x, y); }, [startDrawing]);
  const handleNativeMouseMove = useCallback((e) => { const { x, y } = getCoordinates(e); draw(x, y); }, [draw]);
  const handleNativeTouchStart = useCallback((e) => { e.preventDefault(); const { x, y } = getCoordinates(e); startDrawing(x, y); }, [startDrawing]);
  const handleNativeTouchMove = useCallback((e) => { e.preventDefault(); const { x, y } = getCoordinates(e); draw(x, y); }, [draw]);

  // 2. 캔버스에 네이티브 DOM 이벤트 리스너 등록 및 해제
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 이벤트 리스너 등록. passive: false는 e.preventDefault()를 사용하기 위함.
    canvas.addEventListener('mousedown', handleNativeMouseDown);
    canvas.addEventListener('mousemove', handleNativeMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing); // 캔버스 밖으로 나가도 드로잉 중지
    canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    // 컴포넌트 언마운트 시(정리 함수), 메모리 누수 방지를 위해 이벤트 리스너를 반드시 제거.
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

  // --- 기능 함수 (되돌리기, 다시실행, 지우기, 제출) ---
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
    // 히스토리를 초기 상태로 리셋.
    const initialImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    setHistory([initialImageData]);
    setHistoryIndex(0);
  };
  
  const handlePost = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. 임시 캔버스를 메모리에 생성하여 28x28 크기로 리사이징.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_EXPORT_SIZE;
    tempCanvas.height = CANVAS_EXPORT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);

    // 2. 리사이징된 이미지를 표준 JPG 형식('image/jpeg')의 Blob 데이터로 변환.
    tempCanvas.toBlob(async (blob) => {
      if (!blob) return;
      // 3. Blob 데이터를 FormData에 담아 서버로 전송 준비.
      const formData = new FormData();
      // 파일명도 .jpeg로 통일하여 명확성을 높입니다.
      formData.append('image', blob, 'image.jpeg');
      
      try {
        // 4. API 라우트로 POST 요청 전송.
        const response = await fetch('/api/inside', { method: 'POST', body: formData });
        if (response.status === 204 && onUploadSuccess) {
          onUploadSuccess(); // 성공 시 부모 컴포넌트의 콜백 함수 실행
        } else {
          // 서버로부터 받은 오류 응답을 좀 더 자세히 확인
          const errorText = await response.text();
          throw new Error(`Server response error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }, 'image/jpeg'); // 'image/jpg' 대신 표준인 'image/jpeg'를 사용해야 합니다.
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* 툴바 영역 */}
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
      
      {/* 캔버스 렌더링 영역 */}
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