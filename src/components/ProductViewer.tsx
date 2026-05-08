import { useState, useRef, useEffect } from 'preact/hooks';

interface Props {
  images: string[];
  productName: string;
}

export default function ProductViewer({ images, productName }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalFrames = images.length;
  const sensitivity = 5; // pixels per frame

  const handlePointerDown = (e: any) => {
    setIsDragging(true);
    setStartX(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    const frameDiff = Math.floor(diff / sensitivity);
    if (frameDiff !== 0) {
      setCurrentIndex((prev) => {
        let next = (prev + frameDiff) % totalFrames;
        if (next < 0) next += totalFrames;
        return next;
      });
      setStartX(e.clientX);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile swipe
  const touchStartX = useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: any) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    const frameDiff = Math.floor(diff / sensitivity);
    if (frameDiff !== 0) {
      setCurrentIndex((prev) => {
        let next = (prev + frameDiff) % totalFrames;
        if (next < 0) next += totalFrames;
        return next;
      });
      touchStartX.current = e.touches[0].clientX;
    }
  };

  // Preload all images
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  return (
    <div class="space-y-4">
      {/* Main viewer */}
      <div
        ref={containerRef}
        class="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <img
          src={images[currentIndex]}
          alt={`${productName} - angle ${currentIndex + 1} of ${totalFrames}`}
          class="w-full h-full object-cover"
          draggable={false}
        />

        {/* 360° indicator */}
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm">
          <svg class="w-3.5 h-3.5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Drag to rotate • {currentIndex + 1}/{totalFrames}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div class="flex gap-2 overflow-x-auto pb-2">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            class={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              i === currentIndex ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={img} alt={`Angle ${i + 1}`} class="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
