/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-rust': 'var(--accent-rust)',
        'accent-rust-light': 'var(--accent-rust-light)',
        'accent-rust-dark': 'var(--accent-rust-dark)',
        'accent-rust-glow': 'var(--accent-rust-glow)',
        'text-cream': 'var(--text-cream)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-elevated': 'var(--bg-elevated)',
        'border-subtle': 'var(--border-subtle)',
        'border-accent': 'var(--border-accent)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error': 'var(--error)',
      },
      fontFamily: {
        'display': ['Bebas Neue', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
      },
      animation: {
        'bracket-pulse': 'bracketPulse 3s ease-in-out infinite',
        'scan-down': 'scanDown 4s linear infinite',
        'feedback-in': 'feedbackIn 0.3s ease',
        'wave-pulse': 'wavePulse 1s ease-in-out infinite',
        'pulse-box': 'pulseBox 0.5s ease-out',
        'blink': 'blink 1s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'slide-in-left': 'slideInLeft 0.3s ease',
        'fill-bar': 'fillBar 3s ease-out forwards',
        'float1': 'float1 20s ease-in-out infinite',
        'float2': 'float2 25s ease-in-out infinite',
        'float3': 'float3 15s ease-in-out infinite',
        'float4': 'float4 18s ease-in-out infinite',
        'pulseRing': 'pulseRing 4s ease-out infinite',
        'dnaWave': 'dnaWave 2s ease-in-out infinite',
        'dnaNodeLeft': 'dnaNodeLeft 2s ease-in-out infinite',
        'dnaNodeRight': 'dnaNodeRight 2s ease-in-out infinite',
        'ekgPulse': 'ekgPulse 2s linear infinite',
        'neuralPulse': 'neuralPulse 3s ease-in-out infinite',
        'neuralFire': 'neuralFire 4s ease-in-out infinite',
        'dataBitFall': 'dataBitFall 1.5s ease-in-out infinite',
        'dataStreamFloat': 'dataStreamFloat 15s linear infinite',
        'dataStreamFloatReverse': 'dataStreamFloat 12s linear infinite reverse',
        'hexPulse': 'hexPulse 4s ease-in-out infinite',
        'particleRise': 'particleRise linear infinite',
        'lineFloat1': 'lineFloat1 8s linear infinite',
        'lineFloat2': 'lineFloat2 12s linear infinite',
        'lineFloat3': 'lineFloat3 10s linear infinite',
      },
      keyframes: {
        bracketPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        scanDown: {
          '0%': { top: '0' },
          '100%': { top: '100%' },
        },
        feedbackIn: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        wavePulse: {
          'from': { transform: 'scaleY(0.4)', opacity: '0.5' },
          'to': { transform: 'scaleY(1)', opacity: '1' },
        },
        pulseBox: {
          '0%': { opacity: '0', transform: 'scale(1.1)' },
          '50%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        slideInLeft: {
          'from': { opacity: '0', transform: 'translateX(-10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        fillBar: {
          'to': { width: '100%' },
        },
        float1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-50px, 100px) scale(1.1)' },
          '50%': { transform: 'translate(-100px, 50px) scale(0.95)' },
          '75%': { transform: 'translate(-30px, -50px) scale(1.05)' },
        },
        float2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(80px, -60px) scale(1.15)' },
          '66%': { transform: 'translate(40px, -100px) scale(0.9)' },
        },
        float3: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.1' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.3)', opacity: '0.2' },
        },
        float4: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-80px, -60px) scale(1.2)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.5)', opacity: '0.5' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        dnaWave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(15px)' },
        },
        dnaNodeLeft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.6)', opacity: '0.5' },
        },
        dnaNodeRight: {
          '0%, 100%': { transform: 'scale(0.6)', opacity: '0.5' },
          '50%': { transform: 'scale(1)', opacity: '1' },
        },
        ekgPulse: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        neuralPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.5)', opacity: '1' },
        },
        neuralFire: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.8' },
        },
        dataBitFall: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '50%': { opacity: '0.6' },
          '100%': { opacity: '0', transform: 'translateY(30px)' },
        },
        dataStreamFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-30px)' },
        },
        hexPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        particleRise: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.5)' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { opacity: '0', transform: 'translateY(-100vh) scale(1)' },
        },
        lineFloat1: {
          '0%': { left: '-200px', opacity: '0' },
          '10%': { opacity: '0.4' },
          '90%': { opacity: '0.4' },
          '100%': { left: '100%', opacity: '0' },
        },
        lineFloat2: {
          '0%': { left: '-150px', opacity: '0' },
          '10%': { opacity: '0.3' },
          '90%': { opacity: '0.3' },
          '100%': { left: '100%', opacity: '0' },
        },
        lineFloat3: {
          '0%': { left: '-100px', opacity: '0' },
          '10%': { opacity: '0.25' },
          '90%': { opacity: '0.25' },
          '100%': { left: '100%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

