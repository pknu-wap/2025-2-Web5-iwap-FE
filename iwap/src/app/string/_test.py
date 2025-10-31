import json
import math
import os

def create_dummy_string_art_data(num_points=500, radius=200, center_x=250, center_y=250):
    """
    원의 둘레를 따라 점들의 좌표를 생성하여 스트링 아트 더미 데이터를 만듭니다.
    """
    coordinates = []
    angle_step = 2 * math.pi / num_points

    for i in range(num_points):
        angle = i * angle_step
        # 점들을 약간 무작위로 연결하여 복잡한 패턴처럼 보이게 함
        next_point_index = (i * 137) % num_points  # 137은 임의의 소수
        next_angle = next_point_index * angle_step

        x1 = int(center_x + radius * math.cos(angle))
        y1 = int(center_y + radius * math.sin(angle))
        
        x2 = int(center_x + radius * math.cos(next_angle))
        y2 = int(center_y + radius * math.sin(next_angle))

        if i == 0:
            coordinates.append([x1, y1])
        coordinates.append([x2, y2])

    return {"coordinates": coordinates}

def main():
    """
    더미 데이터를 생성하고 JSON 파일로 저장합니다.
    """
    # [수정] 스크립트의 현재 위치(src/app/string)를 기준으로 프로젝트 루트를 찾습니다.
    try:
        # __file__은 현재 스크립트의 절대 경로입니다.
        # '.../src/app/string/create_dummy_string_art.py'
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # '.../src/app/string' -> '.../src/app' -> '.../src' -> '...' (프로젝트 루트)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
        
        public_dir = os.path.join(project_root, 'public')
        
        # public 폴더가 없으면 생성
        if not os.path.exists(public_dir):
            os.makedirs(public_dir)
            
        output_path = os.path.join(public_dir, 'dummy_string_art.json')
        
        print(f"Generating dummy string art data...")
        dummy_data = create_dummy_string_art_data()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(dummy_data, f, indent=2)
        print(f"Successfully created dummy data at: {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
        print("Please ensure you run this script from the project's root directory.")


if __name__ == "__main__":
    main()