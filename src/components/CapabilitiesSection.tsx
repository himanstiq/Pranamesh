'use client';

import { useRef, useEffect, useState } from 'react';

// Type for stat data
interface StatData {
  label: string;
  numericValue: number;
  suffix: string;
  description?: string;
  status?: string;
  icon: string;
  color: string;
  decimals?: number;
}

// 3D Card with mouse tracking for tilt effect using CSS
function Card3D({
  children,
  icon,
  iconColor = 'text-primary-light-theme dark:text-primary',
  delay = 0
}: {
  children: React.ReactNode;
  icon: string;
  iconColor?: string;
  delay?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex flex-1 gap-4 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-6 flex-col cursor-pointer group card-shimmer hover-border-glow"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? transform : 'perspective(1000px) translateY(40px) scale(0.95)',
        transformStyle: 'preserve-3d',
        transition: visible
          ? 'transform 0.15s ease-out, box-shadow 0.3s ease, opacity 0.8s ease-out'
          : 'transform 0.8s ease-out, opacity 0.8s ease-out',
        boxShadow: transform.includes('translateZ(10px)')
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className={`${iconColor}`} style={{ transformStyle: 'preserve-3d' }}>
        <span
          className="material-symbols-outlined animate-float-3d"
          style={{
            fontSize: '32px',
            display: 'inline-block',
            transform: transform.includes('translateZ(10px)') ? 'translateZ(30px) scale(1.15)' : 'translateZ(0)',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {icon}
        </span>
      </div>
      <div
        className="flex flex-col gap-1"
        style={{
          transform: transform.includes('translateZ(10px)') ? 'translateZ(15px)' : 'translateZ(0)',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function CapabilitiesSection() {
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    setHeaderVisible(true);
  }, []);

  return (
    <div className="flex flex-col gap-10 px-4 sm:px-6 md:px-8 lg:px-12 py-16 @container">
      <div className="flex flex-col items-start text-left gap-6">
        <div className="flex flex-col gap-4">
          <h1
            className="text-text-dark dark:text-white tracking-tight text-[32px] font-bold leading-tight @[480px]:text-4xl @[480px]:font-black @[480px]:leading-tight @[480px]:tracking-[-0.033em] max-w-full"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.8s ease-out'
            }}
          >
            Key Capabilities
          </h1>
          <p
            className="text-text-muted-light dark:text-text-muted text-base font-normal leading-normal max-w-full"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s ease-out 0.15s'
            }}
          >
            PranaMesh provides a comprehensive suite of tools to monitor and analyze air quality data in real-time.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 p-0">
        <Card3D icon="map" iconColor="text-primary-light-theme dark:text-primary" delay={0}>
          <h2 className="text-text-dark dark:text-white text-lg font-bold leading-tight">Live Geospatial Mapping</h2>
          <p className="text-text-muted-light dark:text-text-muted text-sm font-normal leading-normal">Visualizing AQI data across locations in real-time.</p>
        </Card3D>
        <Card3D icon="traffic" iconColor="text-primary-light-theme dark:text-warm-orange" delay={100}>
          <h2 className="text-text-dark dark:text-white text-lg font-bold leading-tight">Traffic Correlation</h2>
          <p className="text-text-muted-light dark:text-text-muted text-sm font-normal leading-normal">Analyzing the impact of traffic patterns on air quality.</p>
        </Card3D>
        <Card3D icon="history" iconColor="text-primary-light-theme dark:text-primary-light" delay={200}>
          <h2 className="text-text-dark dark:text-white text-lg font-bold leading-tight">Historical Data Analysis</h2>
          <p className="text-text-muted-light dark:text-text-muted text-sm font-normal leading-normal">Understanding air quality trends and patterns over time.</p>
        </Card3D>
      </div>
    </div>
  );
}
