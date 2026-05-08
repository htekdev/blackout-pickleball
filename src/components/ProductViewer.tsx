import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

interface Props {
  images: string[];
  productName: string;
}

export default function ProductViewer({ images, productName }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const startXRef = useRef(0);
  const accumulatorRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalFrames = images.length;
  const sensitivity = 40; // pixels per frame — higher for 4-frame rotation

  const advanceFrame = useCallback((delta: number) => {
    accumulatorRef.current += delta;
    const frameDiff = Math.trunc(accumulatorRef.current / sensitivity);
    if (frameDiff !== 0) {
      accumulatorRef.current -= frameDiff * sensitivity;
      setCurrentIndex((prev) => {
        let next = (prev + frameDiff) % totalFrames;
        if (next < 0) next += totalFrames;
        return next;
      });
    }
  }, [totalFrames]);

  const handlePointerDown = (e: any) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    accumulatorRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    startXRef.current = e.clientX;
    advanceFrame(diff);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    accumulatorRef.current = 0;
  };

  // Touch support for mobile swipe
  const touchStartX = useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX;
    accumulatorRef.current = 0;
  };

  const handleTouchMove = (e: any) => {
    e.preventDefault(); // prevent page scroll while rotating
    const diff = e.touches[0].clientX - touchStartX.current;
    touchStartX.current = e.touches[0].clientX;
    advanceFrame(diff);
  };

  // Preload all images
  useEffect(() => {
    let loaded = 0;
    images.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === images.length) setIsLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === images.length) setIsLoaded(true);
      };
      img.src = src;
    });
  }, [images]);

  return (
    <div class="space-y-4">
      {/* Main viewer */}
      <div
        ref={containerRef}
        class="relative aspect-[4/5] rounded-2xl overflow-hidden bg-white cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* All images stacked, only current one visible — no flash between angles */}
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={i === currentIndex ? `${productName} - angle ${currentIndex + 1} of ${totalFrames}` : ''}
            class={`absolute inset-0 w-full h-full object-contain transition-opacity duration-100 ${
              i === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Loading shimmer */}
        {!isLoaded && (
          <div class="absolute inset-0 flex items-center justify-center bg-white">
            <div class="flex flex-col items-center gap-3">
              <div class="w-8 h-8 border-2 border-gray-300 border-t-blackout rounded-full animate-spin" />
              <span class="text-xs text-gray-400 font-medium">Loading views...</span>
            </div>
          </div>
        )}

        {/* Drag indicator overlay (fades after first interaction) */}
        {!isDragging && currentIndex === 0 && (
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div class="bg-black/5 rounded-full p-4 animate-pulse">
              <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18M8 17l4 4m0 0l4-4" transform="rotate(90 12 12)" />
              </svg>
            </div>
          </div>
        )}

        {/* 360° indicator */}
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm border border-gray-200 shadow-sm">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
          {isDragging ? 'Rotating...' : 'Drag to rotate'} • {currentIndex + 1}/{totalFrames}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div class="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            class={`aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all bg-white ${
              i === currentIndex ? 'border-blackout ring-2 ring-blackout/10 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300'
            }`}
          >
            <img src={img} alt={`Angle ${i + 1}`} class="w-full h-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}
