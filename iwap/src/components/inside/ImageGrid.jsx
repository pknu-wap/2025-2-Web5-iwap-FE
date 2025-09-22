/**
 * @file ImageGrid.jsx
 * 한 레이어(layer)에 속한 여러 개의 이미지 데이터를 3D 공간에 그리드 형태로 배치하는 컴포넌트입니다.
 * 각 이미지는 BrightnessDataPlane 컴포넌트를 통해 렌더링됩니다.
 */

import BrightnessDataPlane from './BrightnessDataPlane';

/**
 * 한 층의 이미지 데이터 배열을 받아 그리드 형태로 렌더링합니다.
 * @param {object} props - 컴포넌트 프롭스.
 * @param {Array<object>} props.layerData - 해당 레이어의 이미지 데이터 배열. 각 객체는 { id, brightnessArray } 형태를 가집니다.
 * @param {object} props.gridConfig - 그리드 레이아웃 설정 객체.
 * @param {number} props.gridConfig.columns - 그리드의 열 개수.
 * @param {number} props.gridConfig.planeWidth - 각 이미지 평면의 너비.
 * @param {number} props.gridConfig.spacing - 평면 사이의 간격.
 * @returns {JSX.Element} 3D 그리드 객체.
 */
const ImageGrid = ({ layerData, gridConfig }) => {
  // 프롭으로부터 그리드 설정 값을 추출합니다.
  const { columns, planeWidth, spacing } = gridConfig;

  return (
    // <group>은 three.js에서 여러 객체를 묶는 컨테이너 역할을 합니다.
    // 이 그룹의 위치는 부모 컴포넌트(ImageGridLayers)에서 레이어별로 제어됩니다.
    <group>
      {/* layerData 배열을 순회하며 각 이미지 데이터에 대해 BrightnessDataPlane을 렌더링합니다. */}
      {layerData.map((item, index) => {
        // 1. 그리드 내에서 각 평면의 X, Y 좌표를 계산합니다.
        // 인덱스와 열(column) 개수를 사용하여 2D 그리드 위치를 결정합니다.
        const x = (index % columns - (columns - 1) / 2) * (planeWidth + spacing);
        const y = (Math.floor(index / columns) - (columns - 1) / 2) * (planeWidth + spacing);

        return (
          // BrightnessDataPlane 컴포넌트에 계산된 위치와 필요한 데이터를 전달합니다.
          <BrightnessDataPlane
            key={item.id} // React가 각 요소를 효율적으로 식별하고 업데이트하기 위한 key
            brightnessArray={item.brightnessArray} // 실제 텍스처를 생성할 데이터
            position={[x, y, 0]} // 계산된 2D 위치. Z축은 부모에서 제어하므로 0입니다.
            size={planeWidth} // 평면의 크기
          />
        );
      })}
    </group>
  );
};

export default ImageGrid;
