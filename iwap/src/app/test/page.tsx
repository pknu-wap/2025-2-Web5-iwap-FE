'use client';

import { useState } from 'react';
import styles from './test.module.css';

const SLIDES = [
  'Performance Simplified',
  'Accessibility Simplified',
  'Cloud Simplified',
  'Data Simplified',
  'Environment Simplified',
  'Security Simplified',
];

const TILE_SIZE = 150;

const calcTranslateZ = (index: number, activeIndex: number) => {
  if (index === activeIndex) return -TILE_SIZE * 2.5;
  return -((TILE_SIZE * 10) / (Math.abs(index - activeIndex) * SLIDES.length));
};

const calcTranslateX = (index: number, activeIndex: number) => {
  if (index === activeIndex) return 0;
  return Math.pow(activeIndex - index, 3) * 10;
};

const calcRotateY = (index: number, activeIndex: number) => {
  return (activeIndex - index) * 30;
};

const shouldHideTile = (index: number, activeIndex: number) => {
  return Math.abs(activeIndex - index) > 2;
};

const TestPage = () => {
  const [activeIndex, setActiveIndex] = useState(2);
  const isEvenCount = SLIDES.length % 2 === 0;
  const centerLeftIndex = isEvenCount ? SLIDES.length / 2 - 1 : null;
  const centerRightIndex = isEvenCount ? SLIDES.length / 2 : null;

  const slideTo = (index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    setActiveIndex(index);
  };

  return (
    <main>
      <div className={styles.coverflowContainer}>
        {SLIDES.map((slide, index) => {
          const tileClassName = [
            styles.coverflowItem,
            index === activeIndex ? styles.active : '',
            shouldHideTile(index, activeIndex) ? styles.hidden : '',
            isEvenCount && index === centerLeftIndex
              ? styles.centerPadRight
              : '',
            isEvenCount && index === centerRightIndex
              ? styles.centerPadLeft
              : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={slide}
              className={tileClassName}
              style={{
                transform: `
                  translateZ(${calcTranslateZ(index, activeIndex)}px)
                  translateX(${calcTranslateX(index, activeIndex)}px)
                  rotateY(${calcRotateY(index, activeIndex)}deg)
                `,
              }}
              onClick={() => slideTo(index)}
            >
              {slide}
            </div>
          );
        })}
      </div>
      <div className={styles.controls}>
        <button
          className={styles.controlButton}
          onClick={() => slideTo(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          &lt;
        </button>
        <button
          className={styles.controlButton}
          onClick={() => slideTo(activeIndex + 1)}
          disabled={activeIndex === SLIDES.length - 1}
        >
          &gt;
        </button>
      </div>
    </main>
  );
};

export default TestPage;
