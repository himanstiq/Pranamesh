'use client';

import { ReactNode, CSSProperties } from 'react';
import { useScrollAnimation } from '@/lib/useScrollAnimation';

type AnimationType = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur' | 'none';

interface AnimatedSectionProps {
    children: ReactNode;
    animation?: AnimationType;
    delay?: number;
    duration?: number;
    className?: string;
    threshold?: number;
    triggerOnce?: boolean;
}

/**
 * Reusable wrapper component for scroll-triggered animations.
 * Wraps children with animated container that reveals on scroll.
 */
export default function AnimatedSection({
    children,
    animation = 'fade-up',
    delay = 0,
    duration = 700,
    className = '',
    threshold = 0.1,
    triggerOnce = true,
}: AnimatedSectionProps) {
    const { ref, isInView } = useScrollAnimation<HTMLDivElement>({
        threshold,
        triggerOnce,
    });

    const getInitialStyles = (): CSSProperties => {
        const baseStyles: CSSProperties = {
            opacity: 0,
            transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            transitionDelay: `${delay}ms`,
        };

        switch (animation) {
            case 'fade-up':
                return { ...baseStyles, transform: 'translateY(40px)' };
            case 'fade-down':
                return { ...baseStyles, transform: 'translateY(-40px)' };
            case 'fade-left':
                return { ...baseStyles, transform: 'translateX(-40px)' };
            case 'fade-right':
                return { ...baseStyles, transform: 'translateX(40px)' };
            case 'scale':
                return { ...baseStyles, transform: 'scale(0.95)' };
            case 'blur':
                return { ...baseStyles, filter: 'blur(10px)' };
            case 'none':
                return {};
            default:
                return baseStyles;
        }
    };

    const getAnimatedStyles = (): CSSProperties => {
        const baseStyles: CSSProperties = {
            opacity: 1,
            transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            transitionDelay: `${delay}ms`,
        };

        switch (animation) {
            case 'fade-up':
            case 'fade-down':
            case 'fade-left':
            case 'fade-right':
                return { ...baseStyles, transform: 'translate(0, 0)' };
            case 'scale':
                return { ...baseStyles, transform: 'scale(1)' };
            case 'blur':
                return { ...baseStyles, filter: 'blur(0)' };
            case 'none':
                return {};
            default:
                return baseStyles;
        }
    };

    const currentStyles = isInView ? getAnimatedStyles() : getInitialStyles();

    return (
        <div
            ref={ref}
            className={className}
            style={currentStyles}
        >
            {children}
        </div>
    );
}

/**
 * Pre-configured animated section variants for common use cases.
 */
export function FadeInUp({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <AnimatedSection animation="fade-up" delay={delay} className={className}>
            {children}
        </AnimatedSection>
    );
}

export function FadeInScale({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <AnimatedSection animation="scale" delay={delay} className={className}>
            {children}
        </AnimatedSection>
    );
}

export function FadeInBlur({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <AnimatedSection animation="blur" delay={delay} className={className}>
            {children}
        </AnimatedSection>
    );
}
