/**
 * @file app/components/inside/LoadingIndicator.jsx
 * 화면 중앙에 로딩 텍스트를 표시하는 간단한 UI 컴포넌트입니다.
 */

/**
 * 로딩 상태를 나타내는 텍스트 메시지를 화면 중앙에 렌더링합니다.
 * @param {object} props - 컴포넌트 프롭스.
 * @param {string} props.text - 화면에 표시할 로딩 메시지 문자열.
 * @returns {JSX.Element} 로딩 인디케이터 UI.
 */
const LoadingIndicator = ({ text }) => {
  // 컴포넌트에 적용될 인라인 스타일 객체입니다.
  const containerStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    fontSize: '1.2rem',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    zIndex: 10, // 다른 UI 요소들 위에 표시되도록 z-index 설정
  };

  return (
    <div style={containerStyle}>
      <p>{text}</p>
    </div>
  );
};

export default LoadingIndicator;
