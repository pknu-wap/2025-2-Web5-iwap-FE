/**
 * @file /inside 경로에 대한 로딩 UI를 정의합니다.
 * Next.js App Router는 이 파일을 사용하여 해당 경로의 page.js 및 
 * 그 자식 컴포넌트들의 로딩이 완료될 때까지 자동으로 이 UI를 보여줍니다.
 * 이 기능은 React Suspense를 기반으로 동작합니다.
 */

/**
 * 페이지 콘텐츠가 로드되는 동안 표시될 로딩 스크린 컴포넌트입니다.
 * @returns {JSX.Element} 중앙에 "데이터 로딩중..." 텍스트가 표시되는 UI 요소.
 */
export default function Loading() {
  // 컴포넌트의 전체적인 레이아웃과 디자인을 위한 인라인 스타일 객체입니다.
  const containerStyle = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center', // 자식 요소를 수평 중앙에 배치
    alignItems: 'center',     // 자식 요소를 수직 중앙에 배치
    background: '#111827',    // 어두운 배경색
    color: 'white',           // 텍스트 색상
    fontSize: '1.2rem',       // 폰트 크기
    fontFamily: 'sans-serif', // 기본 폰트
    textAlign: 'center',      // 텍스트 정렬
  };

  return (
    <div style={containerStyle}>
      <p>데이터 로딩중...</p>
    </div>
  );
}
