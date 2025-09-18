'use client'

import { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas() {
  const containerRef = useRef(null); // cavas를 감싸는 컨테이너 ref
  const canvasRef = useRef(null); // canvas 엘리먼트에 접근하기 위한 ref
  const contextRef = useRef(null); // canvas의 2D context를 저장하기 위한 ref
  const [isDrawing, setIsDrawing] = useState(false); // 그림을 그리고 있는지 여부를 저장하는 state

  // 1. 캔버스 크기를 조절하는 함수
  const resizeCanvas = () => {
    const container = containerRef.current;
    if (!container) return; 

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    context.strokeStyle = 'black';
    context.lineWidth = 2.5;
    contextRef.current = context;
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // 그리기 시작 (마우스/터치를 누를 때)
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  // 그리기 종료 (마우스/터치를 뗄 때)
  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  // 그리는 중 (마우스/터치를 누른 채 움직일 때)
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  // 📸 이미지 저장 및 API 전송 함수
  const handleSaveAndUpload = () => {
    const canvas = canvasRef.current;
    // 캔버스 내용을 Blob 객체로 변환합니다.
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      // FormData 객체를 생성하여 Blob을 담습니다.
      const formData = new FormData();
      // 'drawing.png'는 서버에서 받을 파일 이름입니다.
      formData.append('drawingImage', blob, 'drawing.png'); 

      try {
        // 🚀 API 엔드포인트로 FormData를 전송합니다.
        const response = await fetch('https://api.example.com/upload', {
          method: 'POST',
          body: formData, // body에 FormData를 그대로 전달
        });

        if (response.ok) {
          alert('그림이 성공적으로 업로드되었습니다!');
          const result = await response.json();
          console.log('Upload success:', result);
        } else {
          alert('업로드에 실패했습니다.');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('업로드 중 오류가 발생했습니다.');
      }
    }, 'image/png'); // 파일 형식을 'image/png'로 지정
  };
  
  // 캔버스 초기화 함수
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        style={{ border: '1px solid black' }}
      />
      <div>
        <button onClick={handleSaveAndUpload}>저장 및 업로드</button>
        <button onClick={clearCanvas}>초기화</button>
      </div>
    </div>
  );
}