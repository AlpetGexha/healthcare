import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

// Define the spline-viewer element type
declare global {
    namespace JSX {
        interface IntrinsicElements {
            ['spline-viewer']: any;
        }
    }
}

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    // Function to create stars
    const createStars = (containerRef: HTMLDivElement | null) => {
        if (!containerRef) return;

        // Clear previous stars
        containerRef.innerHTML = '';

        // Create 100 stars with random positions, sizes and animations
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';

            // Random position
            const left = Math.random() * 100;
            const top = Math.random() * 100;

            // Random size (1-3px)
            const size = Math.random() * 2 + 1;

            // Random animation duration and delay
            const duration = Math.random() * 3 + 2; // 2-5s
            const delay = Math.random() * 5; // 0-5s
            const intensity = Math.random() * 0.5 + 0.3; // 0.3-0.8 opacity

            // Apply styles
            star.style.left = `${left}%`;
            star.style.top = `${top}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.setProperty('--duration', `${duration}s`);
            star.style.setProperty('--delay', `${delay}s`);
            star.style.setProperty('--intensity', `${intensity}`);

            containerRef.appendChild(star);
        }
    };

    return (
        <>
            <Head title="Welcome to Diagnothink">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
                <script type="module" src="https://unpkg.com/@splinetool/viewer@1.10.27/build/spline-viewer.js"></script>
                <style>
                    {`
                    .stars-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        z-index: 0;
                        pointer-events: none;
                        mix-blend-mode: screen;
                    }

                    .star {
                        position: absolute;
                        background-color: white;
                        border-radius: 50%;
                        opacity: 0;
                        animation: twinkle var(--duration) ease-in-out var(--delay) infinite;
                        box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.4);
                    }

                    .dark .star {
                        box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.6);
                    }

                    @keyframes twinkle {
                        0% { opacity: 0; transform: scale(0.5); }
                        25% { opacity: var(--intensity); }
                        50% { opacity: var(--intensity); transform: scale(1); }
                        75% { opacity: var(--intensity); }
                        100% { opacity: 0; transform: scale(0.5); }
                    }

                    .spline-watermark,
                    a[href*="spline.design"],
                    .spline-viewer a[href*="spline.design"] {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                    `}
                </style>
            </Head>
            <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 text-gray-800 dark:from-gray-900 dark:to-blue-900 dark:text-white">
                {/* Stars container */}
                <div
                    className="stars-container"
                    ref={(el) => {
                        if (el) createStars(el);
                    }}
                />
                <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
                    <div className="flex flex-col items-center justify-center text-center md:w-1/2 md:items-start md:text-left">
                        <h1 className="mb-4 text-5xl font-bold tracking-tight text-blue-800 dark:text-blue-300">Welcome to Diagnothink</h1>
                        <p className="mb-10 max-w-lg text-xl text-gray-600 dark:text-gray-300">
                            Your intelligent healthcare assistant. Empowering better health decisions through AI.
                        </p>
                        <Link
                            href={route(auth.user ? 'chat.index' : 'register')}
                            className="transform rounded-lg bg-blue-600 px-10 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-blue-700 hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-400"
                        >
                            Get Started
                        </Link>
                    </div>
                    <div className="mt-8 h-80 w-full md:mt-0 md:h-96 md:w-1/2">
                        <div
                            className="relative h-full w-full"
                            ref={(el) => {
                                if (el && !el.querySelector('spline-viewer')) {
                                    const splineViewer = document.createElement('spline-viewer');
                                    splineViewer.setAttribute('url', 'https://prod.spline.design/nWd66PGr8ulNeGF3/scene.splinecode');
                                    splineViewer.className = 'w-full h-full';
                                    el.appendChild(splineViewer);

                                    // Attempt to remove the watermark when the viewer loads
                                    setTimeout(() => {
                                        const watermarkElements = document.querySelectorAll('.spline-watermark, a[href*="spline.design"]');
                                        watermarkElements.forEach((el) => el.remove());
                                    }, 1500);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
