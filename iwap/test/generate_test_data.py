"""
@file generate_test_data.py
3D 시각화에 사용될 테스트용 행렬 데이터(layers.txt)를 생성하는 Python 스크립트입니다.
API 명세에 정의된 JSON 구조에 맞춰 파일을 생성합니다.
"""

import random
import json
import os

# --- 설정 변수 ---

# 스크립트 실행 위치와 상관없이 항상 올바른 경로를 찾도록 수정
# 현재 이 스크립트 파일의 절대 경로를 가져옵니다.
script_path = os.path.abspath(__file__)
# 스크립트가 포함된 디렉토리('test')의 경로를 가져옵니다.
script_dir = os.path.dirname(script_path)
# 'test' 디렉토리의 부모 디렉토리('iwap') 경로를 가져옵니다.
project_root = os.path.dirname(script_dir)
# 최종적으로 목표 파일 경로('iwap/data/layers.txt')를 조합합니다.
FILE_PATH = os.path.join(project_root, "data", "layers.txt")


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

    output_data = {
        "layers": []
    }

    for name in LAYER_NAMES:
        layer_object = {
            name: create_brightness_matrix(WIDTH, HEIGHT)
        }
        output_data["layers"].append(layer_object)

    try:
        # 파일 경로의 디렉터리가 없으면 생성합니다.
        os.makedirs(os.path.dirname(FILE_PATH), exist_ok=True)

        with open(FILE_PATH, 'w', encoding='utf-8') as file:
            json.dump(output_data, file, indent=4)

        print(f"✅ '{FILE_PATH}' 테스트 파일이 생성되었습니다.")
        print(f"   - 총 {len(LAYER_NAMES)}개의 레이어가 생성되었습니다.")
    
    except IOError as e:
        print(f"❌ 파일 쓰기 오류: {e}")
        print("   - 파일 경로 또는 권한을 확인해주세요.")

if __name__ == "__main__":
    main()