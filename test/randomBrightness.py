import random

FILE_PATH = "layers.txt"

WIDTH = 256
HEIGHT = 256
LOOP = 5

def rand_brightness(range=256):
    rand_num = random.randint(0,range-1)
    return rand_num

def BrightnessArray():
    main_array = []
    for h in range(HEIGHT):
        temp_array = []
        for w in range(WIDTH):
            temp_array.append(rand_brightness())
        main_array.append(temp_array)
    return main_array

AllBrightnessArray = []
for _ in range(LOOP):
    AllBrightnessArray.append(BrightnessArray())

text = str(AllBrightnessArray)
with open (FILE_PATH, 'w') as file:
    file.write(text)