import BrightnessDataPlane from './BrightnessDataPlane';

/**
 * 데이터 배열을 받아 3x3 그리드 형태로 배치하는 컴포넌트입니다.
 * @param {object[]} layerData - 각 Plane에 전달될 데이터 객체의 배열.
 * @param {number[]} position - 그리드 그룹 전체의 3D 위치 [x, y, z].
 * @param {object} gridConfig - 그리드 레이아웃 설정 (columns, planeWidth 등).
 */
const ImageGrid = ({ layerData, position, gridConfig }) => {
  const { columns, planeWidth, planeHeight, spacing } = gridConfig;

  // 그리드를 (0, 0) 기준으로 중앙 정렬하기 위한 계산
  const gridWidth = columns * (planeWidth + spacing) - spacing;
  const numRows = Math.ceil(layerData.length / columns);
  const gridHeight = numRows * (planeHeight + spacing) - spacing;

  return (
    <group position={position}>
      {layerData.map((data, index) => {
        // 인덱스를 기반으로 그리드 내 행과 열 위치를 계산
        const row = Math.floor(index / columns);
        const col = index % columns;

        // 중앙 정렬된 각 Plane의 x, y 위치 계산
        const x = col * (planeWidth + spacing) - gridWidth / 2 + planeWidth / 2;
        const y = -(row * (planeHeight + spacing)) + gridHeight / 2 - planeHeight / 2;

        return (
          <BrightnessDataPlane
            key={data.id || index} // 데이터에 고유 id가 있다면 사용하는 것이 더 좋습니다.
            brightnessArray={data.brightnessArray}
            position={[x, y, 0]} // group 내 상대 위치이므로 z는 0
            args={[planeWidth, planeHeight]}
          />
        );
      })}
    </group>
  );
};

export default ImageGrid;