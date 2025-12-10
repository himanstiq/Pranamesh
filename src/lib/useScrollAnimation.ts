'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

/**
 * Custom hook for scroll-triggered animations using Intersection Observer.
 * Returns a ref to attach to the element and a boolean indicating if it's in view.
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
    options: UseScrollAnimationOptions = {}
) {
    const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // If triggerOnce and already animated, don't observe again
        if (triggerOnce && hasAnimated) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        if (triggerOnce) {
                            setHasAnimated(true);
                            observer.unobserve(element);
                        }
                    } else if (!triggerOnce) {
                        setIsInView(false);
                    }
                });
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, rootMargin, triggerOnce, hasAnimated]);

    return { ref, isInView };
}

/**
 * Hook for staggered scroll animations with index-based delays.
 */
export function useStaggeredScrollAnimation<T extends HTMLElement = HTMLDivElement>(
    index: number,
    baseDelay: number = 100,
    options: UseScrollAnimationOptions = {}
) {
    const { ref, isInView } = useScrollAnimation<T>(options);
    const delay = index * baseDelay;

    return { ref, isInView, delay };
}

/**
 * Hook for parallax scroll effect.
 * Returns a ref and the current transform value based on scroll position.
 */
export function useParallax(speed: number = 0.5) {
    const ref = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);

    const handleScroll = useCallback(() => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.scrollY;
        const elementTop = rect.top + scrolled;
        const viewportHeight = window.innerHeight;

        // Calculate parallax offset
        const relativeScroll = scrolled - elementTop + viewportHeight;
        const parallaxOffset = relativeScroll * speed * 0.1;

        setOffset(parallaxOffset);
    }, [speed]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial calculation

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);

    return { ref, offset };
}

/**
 * Hook for mouse-based tilt effect on cards.
 */
export function useTiltEffect(maxTilt: number = 10) {
    const ref = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('');

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    }, [maxTilt]);

    const handleMouseLeave = useCallback(() => {
        setTransform('');
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [handleMouseMove, handleMouseLeave]);

    return { ref, transform };
}

export default useScrollAnimation;
