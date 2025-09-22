"""
@file generate_test_data.py
3D 시각화에 사용될 테스트용 행렬 데이터(layers.txt)를 생성하는 Python 스크립트입니다.
API 명세에 정의된 JSON 구조에 맞춰 파일을 생성합니다.
"""

import random
import json
import os

# --- 설정 변수 ---

# 생성될 파일이 저장될 경로입니다. 'data' 폴더가 미리 생성되어 있어야 합니다.
FILE_PATH = os.path.join("data", "layers.txt")

# 각 행렬(이미지)의 너비와 높이입니다.
WIDTH = 28
HEIGHT = 28

# API 명세에 따라 생성할 레이어의 이름 목록입니다.
# 이 리스트의 각 항목에 대해 하나의 행렬 데이터가 생성됩니다.
LAYER_NAMES = [
    'conv1', 'layer1.0.conv1', 'layer1.0.conv2', 'layer1.1.conv1', 'layer1.1.conv2',
    'layer2.0.conv1', 'layer2.0.conv2', 'layer2.0.downsample.0', 'layer2.1.conv1',
    'layer2.1.conv2', 'layer3.0.conv1', 'layer3.0.conv2', 'layer3.0.downsample.0',
    'layer3.1.conv1', 'layer3.1.conv2', 'layer4.0.conv1', 'layer4.0.conv2',
    'layer4.0.downsample.0', 'layer4.1.conv1', 'layer4.1.conv2', 'fc'
]

# --- 함수 정의 ---

def create_brightness_matrix(width, height):
    """
    지정된 너비와 높이를 가진 2차원 행렬을 생성하고,
    각 요소를 0-255 사이의 랜덤한 밝기 값으로 채웁니다.

    Args:
        width (int): 행렬의 너비.
        height (int): 행렬의 높이.

    Returns:
        list[list[int]]: 랜덤 밝기 값으로 채워진 2차원 리스트(행렬).
    """
    matrix = []
    for _ in range(height):
        row = [random.randint(0, 255) for _ in range(width)]
        matrix.append(row)
    return matrix

# --- 메인 실행 로직 ---

def main():
    """
    스크립트의 메인 실행 함수입니다.
    """
    print("테스트 데이터 생성을 시작합니다...")

    # API 명세에 맞는 최종 데이터 구조를 초기화합니다.
    # 최종 JSON 형태: { "layers": [ { "레이어이름": [[...]] }, ... ] }
    output_data = {
        "layers": []
    }

    # 정의된 각 레이어 이름에 대해 행렬 데이터를 생성하고 리스트에 추가합니다.
    for name in LAYER_NAMES:
        layer_object = {
            name: create_brightness_matrix(WIDTH, HEIGHT)
        }
        output_data["layers"].append(layer_object)

    # json 모듈을 사용하여 딕셔너리를 JSON 파일로 저장합니다.
    # str() 대신 json.dump()를 사용하여 웹에서 파싱 가능한 유효한 JSON 파일을 생성합니다.
    try:
        # 파일 경로의 디렉터리가 없으면 생성합니다.
        os.makedirs(os.path.dirname(FILE_PATH), exist_ok=True)

        with open(FILE_PATH, 'w', encoding='utf-8') as file:
            # indent=4 옵션은 JSON 파일을 사람이 읽기 쉽게 들여쓰기합니다.
            json.dump(output_data, file, indent=4)

        print(f"✅ '{FILE_PATH}' 테스트 파일이 생성되었습니다.")
        print(f"   - 총 {len(LAYER_NAMES)}개의 레이어가 생성되었습니다.")
    
    except IOError as e:
        print(f"❌ 파일 쓰기 오류: {e}")
        print("   - 파일 경로 또는 권한을 확인해주세요.")

# 이 스크립트가 직접 실행될 때만 main() 함수를 호출합니다.
if __name__ == "__main__":
    main()
