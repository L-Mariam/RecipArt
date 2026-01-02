import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface Props {
  imageFile: File;
}

export interface BlurEditorHandle {
  getBlobs: () => Promise<{ sensitiveBlob: Blob; fullBlob: Blob }>;
}

type Tool = 'brush' | 'rect';
type Layer = 'sensitive' | 'price';

// History state interface
interface HistoryState {
  sensitive: ImageData;
  price: ImageData;
}

const BlurEditor = forwardRef<BlurEditorHandle, Props>(({ imageFile }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Two masks: One for permanent sensitive info, one for temporary price hiding
  const sensitiveMaskRef = useRef<HTMLCanvasElement | null>(null);
  const priceMaskRef = useRef<HTMLCanvasElement | null>(null);

  // Undo/Redo State
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeLayer, setActiveLayer] = useState<Layer>('sensitive');
  const [tool, setTool] = useState<Tool>('rect');
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getBlobs: async () => {
        const sensitiveBlob = await generateBlob(false);
        const fullBlob = await generateBlob(true);
        return { sensitiveBlob, fullBlob };
    }
  }));

  // Load Image
  useEffect(() => {
    const load = async () => {
      const bitmap = await createImageBitmap(imageFile);
      setImageBitmap(bitmap);
      
      if (canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        
        // Initialize Mask Canvases
        const initMask = () => {
          const c = document.createElement('canvas');
          c.width = bitmap.width;
          c.height = bitmap.height;
          // Canvas starts transparent by default
          return c;
        };

        sensitiveMaskRef.current = initMask();
        priceMaskRef.current = initMask();

        // Save initial blank state
        setTimeout(() => saveToHistory(), 0);
        
        // Pass bitmap directly because state update is async
        renderEditor(bitmap);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  // Save current state of both masks to history
  const saveToHistory = () => {
    if (!sensitiveMaskRef.current || !priceMaskRef.current) return;

    const sCtx = sensitiveMaskRef.current.getContext('2d');
    const pCtx = priceMaskRef.current.getContext('2d');
    if (!sCtx || !pCtx) return;

    const w = sensitiveMaskRef.current.width;
    const h = sensitiveMaskRef.current.height;

    const newState: HistoryState = {
      sensitive: sCtx.getImageData(0, 0, w, h),
      price: pCtx.getImageData(0, 0, w, h)
    };

    const currentHistory = history.slice(0, historyStep + 1);
    const nextHistory = [...currentHistory, newState];
    
    setHistory(nextHistory);
    setHistoryStep(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;
    restoreState(historyStep - 1);
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return;
    restoreState(historyStep + 1);
  };

  const restoreState = (stepIndex: number) => {
    const state = history[stepIndex];
    if (!state || !sensitiveMaskRef.current || !priceMaskRef.current) return;

    const sCtx = sensitiveMaskRef.current.getContext('2d');
    const pCtx = priceMaskRef.current.getContext('2d');
    
    if (sCtx) sCtx.putImageData(state.sensitive, 0, 0);
    if (pCtx) pCtx.putImageData(state.price, 0, 0);

    setHistoryStep(stepIndex);
    renderEditor();
  };

  // Main Render Function
  const renderEditor = (specificBitmap?: ImageBitmap) => {
    const canvas = canvasRef.current;
    const sensitiveMask = sensitiveMaskRef.current;
    const priceMask = priceMaskRef.current;
    const bitmap = specificBitmap || imageBitmap;

    if (!canvas || !sensitiveMask || !priceMask || !bitmap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Clean Image Base
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(bitmap, 0, 0);

    // Helper to draw blurred regions
    const drawBlurLayer = (mask: HTMLCanvasElement, tintColor: string | null) => {
       const tempCanvas = document.createElement('canvas');
       tempCanvas.width = canvas.width;
       tempCanvas.height = canvas.height;
       const tempCtx = tempCanvas.getContext('2d');
       
       if (tempCtx) {
           // Create blurred version
           tempCtx.filter = 'blur(15px)';
           tempCtx.drawImage(bitmap, 0, 0);
           
           // Mask it
           tempCtx.globalCompositeOperation = 'destination-in';
           tempCtx.filter = 'none';
           tempCtx.drawImage(mask, 0, 0);
           
           // Draw onto main canvas
           ctx.drawImage(tempCanvas, 0, 0);

           if (tintColor) {
              const overlayCanvas = document.createElement('canvas');
              overlayCanvas.width = canvas.width;
              overlayCanvas.height = canvas.height;
              const oCtx = overlayCanvas.getContext('2d');
              if (oCtx) {
                  oCtx.fillStyle = tintColor;
                  oCtx.fillRect(0,0, canvas.width, canvas.height);
                  oCtx.globalCompositeOperation = 'destination-in';
                  oCtx.drawImage(mask, 0, 0);
                  
                  ctx.save();
                  ctx.globalAlpha = 0.2; 
                  ctx.drawImage(overlayCanvas, 0, 0);
                  ctx.restore();
              }
           }
       }
    };

    drawBlurLayer(sensitiveMask, 'red');
    drawBlurLayer(priceMask, 'green');

    // Draw Guide Box
    if (isDrawing && tool === 'rect' && startPos && currentPos) {
        const w = currentPos.x - startPos.x;
        const h = currentPos.y - startPos.y;
        
        ctx.save();
        ctx.strokeStyle = activeLayer === 'sensitive' ? '#ef4444' : '#22c55e';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(startPos.x, startPos.y, w, h);
        ctx.restore();
    }
  };
  
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
    } else {
       clientX = (e as React.MouseEvent).clientX;
       clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setStartPos(pos);
    setCurrentPos(pos);
    
    if (tool === 'brush') {
       drawBrush(pos);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);
    setCurrentPos(pos);

    if (!isDrawing) return;
    
    if (tool === 'brush') {
      drawBrush(pos);
    } else if (tool === 'rect') {
      renderEditor();
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    if (tool === 'rect' && startPos) {
       const w = pos.x - startPos.x;
       const h = pos.y - startPos.y;
       
       const mask = activeLayer === 'sensitive' ? sensitiveMaskRef.current : priceMaskRef.current;
       const ctx = mask?.getContext('2d');
       if (ctx) {
           ctx.fillStyle = 'white';
           ctx.fillRect(startPos.x, startPos.y, w, h);
       }
    }
    
    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
    
    saveToHistory();
    renderEditor();
  };

  const drawBrush = (pos: {x: number, y: number}) => {
    const mask = activeLayer === 'sensitive' ? sensitiveMaskRef.current : priceMaskRef.current;
    const ctx = mask?.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    renderEditor();
  };

  const applyAutoBlur = () => {
    if (!canvasRef.current || !sensitiveMaskRef.current) return;
    const h = canvasRef.current.height;
    const w = canvasRef.current.width;
    const zoneHeight = h * 0.15;
    
    const ctx = sensitiveMaskRef.current.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, zoneHeight);
        ctx.fillRect(0, h - zoneHeight, w, zoneHeight);
    }
    saveToHistory();
    renderEditor();
  };

  const clearLayer = () => {
    const mask = activeLayer === 'sensitive' ? sensitiveMaskRef.current : priceMaskRef.current;
    if (mask) {
        const ctx = mask.getContext('2d');
        if (ctx) ctx.clearRect(0,0, mask.width, mask.height);
        saveToHistory();
        renderEditor();
    }
  };

  const generateBlob = (includePriceBlur: boolean): Promise<Blob> => {
     return new Promise((resolve) => {
        if (!canvasRef.current || !imageBitmap) return;
        const outCanvas = document.createElement('canvas');
        outCanvas.width = canvasRef.current.width;
        outCanvas.height = canvasRef.current.height;
        const ctx = outCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Base
        ctx.drawImage(imageBitmap, 0, 0);

        // 2. Helper to blur
        const applyMask = (mask: HTMLCanvasElement) => {
            const temp = document.createElement('canvas');
            temp.width = outCanvas.width;
            temp.height = outCanvas.height;
            const tCtx = temp.getContext('2d');
            if (!tCtx) return;

            tCtx.filter = 'blur(15px)';
            tCtx.drawImage(imageBitmap, 0, 0);
            
            tCtx.globalCompositeOperation = 'destination-in';
            tCtx.filter = 'none';
            tCtx.drawImage(mask, 0, 0);

            ctx.drawImage(temp, 0, 0);
        };

        if (sensitiveMaskRef.current) applyMask(sensitiveMaskRef.current);
        if (includePriceBlur && priceMaskRef.current) applyMask(priceMaskRef.current);

        outCanvas.toBlob(blob => {
            if(blob) resolve(blob);
        }, 'image/png');
     });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Layer Toggles */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg self-start">
         <button 
            onClick={() => setActiveLayer('sensitive')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeLayer === 'sensitive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
         >
            1. Sensitive Info (Red)
         </button>
         <button 
            onClick={() => setActiveLayer('price')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeLayer === 'price' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
         >
            2. Prices (Green)
         </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold uppercase text-gray-400 mr-2">Tools:</span>
        <button 
            onClick={() => setTool('rect')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors border ${tool === 'rect' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
            Rectangle
        </button>
        <button 
            onClick={() => setTool('brush')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors border ${tool === 'brush' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
            Brush
        </button>
        
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 mx-2">
            <button 
                onClick={handleUndo}
                disabled={historyStep <= 0}
                className="p-1 text-gray-600 hover:text-black disabled:text-gray-300 hover:bg-gray-200 rounded"
                title="Undo"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <button 
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                className="p-1 text-gray-600 hover:text-black disabled:text-gray-300 hover:bg-gray-200 rounded"
                title="Redo"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        {activeLayer === 'sensitive' && (
             <button 
                onClick={applyAutoBlur}
                className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm font-medium"
            >
                Auto Blur Header/Footer
            </button>
        )}
        <button 
            onClick={clearLayer}
            className="px-3 py-1 text-gray-500 hover:text-red-600 rounded text-sm ml-auto font-medium hover:bg-red-50"
        >
            Clear Layer
        </button>
      </div>

      <div className="text-xs text-gray-500 italic">
        {activeLayer === 'sensitive' ? 'Blur personal details like Name, Card Number, Phone.' : 'Blur the prices and totals. These will be revealed when users guess!'}
      </div>

      <div 
        ref={containerRef} 
        className={`relative border-2 border-dashed rounded-lg bg-gray-100 overflow-hidden select-none ${activeLayer === 'sensitive' ? 'border-red-300' : 'border-green-300'}`}
        style={{ minHeight: '300px' }}
      >
        <canvas
            ref={canvasRef}
            className={`w-full h-auto touch-none ${tool === 'brush' ? 'cursor-none' : 'cursor-crosshair'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />
        
        {tool === 'brush' && !isDrawing && currentPos && (
             <div 
                className="pointer-events-none absolute border-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-50"
                style={{ 
                    left: currentPos.x / (canvasRef.current?.width || 1) * (containerRef.current?.clientWidth || 1),
                    top: currentPos.y / (canvasRef.current?.height || 1) * (containerRef.current?.clientHeight || 1),
                    width: '50px', 
                    height: '50px',
                    borderColor: activeLayer === 'sensitive' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)',
                    backgroundColor: activeLayer === 'sensitive' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                }}
             />
        )}
        
        {!imageBitmap && <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading Image...</div>}
      </div>
    </div>
  );
});

export default BlurEditor;