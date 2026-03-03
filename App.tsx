import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Download, Image as ImageIcon, Sparkles, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

const TARGET_SIZE = 700 * 1024; // 700 KB
const TOLERANCE = 50 * 1024; // +/- 50 KB

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [outputFormat, setOutputFormat] = useState<string>('image/jpeg');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [previewUrl, resultUrl]);

  const processImage = async (inputFile: File, targetFormat: string = outputFormat) => {
    setIsProcessing(true);
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

    try {
      const imgUrl = URL.createObjectURL(inputFile);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      let minScale = 0.1;
      let maxScale = inputFile.size < 500 * 1024 ? 4.0 : 2.0; // Allow more upscaling if small
      let currentScale = 1.0;
      let currentQuality = 0.92;
      let bestBlob: Blob | null = null;
      let bestDiff = Infinity;

      // Binary search for the right scale to hit ~700KB
      for (let i = 0; i < 15; i++) {
        currentScale = (minScale + maxScale) / 2;
        canvas.width = img.width * currentScale;
        canvas.height = img.height * currentScale;
        
        // Fill white background in case of transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, targetFormat, currentQuality);
        });

        if (!blob) continue;

        const diff = Math.abs(blob.size - TARGET_SIZE);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBlob = blob;
        }

        if (blob.size > TARGET_SIZE) {
          maxScale = currentScale;
        } else {
          minScale = currentScale;
        }

        if (diff < TOLERANCE) break;
      }

      // If still too small and we were upscaling, try adding some invisible metadata or just accept the best we got
      // For a true "Gen Z" instant feel, we just give them the best optimized version.
      
      if (bestBlob) {
        setResultBlob(bestBlob);
        setResultUrl(URL.createObjectURL(bestBlob));
      } else {
        setResultBlob(inputFile);
        setResultUrl(imgUrl);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Oops! Something went wrong processing your image. 😭');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please upload an image file! 📸');
      return;
    }
    setFile(selectedFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    processImage(selectedFile);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative selection:bg-purple-500/30">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative z-10 max-w-5xl min-h-screen flex flex-col items-center justify-center">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 mb-6 shadow-2xl shadow-purple-500/10">
            <Sparkles className="w-8 h-8 text-purple-400 mr-3" />
            <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 tracking-tight">
              OptiPic
            </h1>
          </div>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Compress heavy pics or upscale tiny ones to the perfect ~700KB size. 
            <br className="hidden md:block" /> Fast, private, and aesthetic af. ✨
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl"
            >
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ease-out flex flex-col items-center justify-center p-12 md:p-24 text-center
                  ${isDragging 
                    ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' 
                    : 'border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/10'
                  }
                  backdrop-blur-xl shadow-2xl
                `}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <motion.div
                  animate={{ y: isDragging ? -10 : 0 }}
                  className="bg-white/10 p-6 rounded-full mb-6 shadow-lg border border-white/5 group-hover:scale-110 transition-transform duration-300"
                >
                  <UploadCloud className="w-12 h-12 text-purple-300" />
                </motion.div>
                
                <h3 className="text-2xl font-bold mb-3 text-white">
                  Drop your pic here
                </h3>
                <p className="text-gray-400 font-medium">
                  or click to browse files
                </p>
                
                <div className="mt-8 flex items-center gap-4 text-sm text-gray-500 font-medium">
                  <span className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <ImageIcon className="w-4 h-4 mr-2" /> JPG, PNG, WEBP
                  </span>
                  <span className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <Sparkles className="w-4 h-4 mr-2" /> Auto Magic
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Original */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-300 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-gray-500 mr-3" />
                      Original
                    </h3>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-mono text-gray-300">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <div className="relative flex-1 rounded-2xl overflow-hidden bg-black/50 border border-white/5 min-h-[300px] flex items-center justify-center">
                    {previewUrl && (
                      <img src={previewUrl} alt="Original" className="max-w-full max-h-[400px] object-contain" />
                    )}
                  </div>
                </div>

                {/* Result */}
                <div className="bg-white/5 rounded-3xl p-6 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 flex flex-col relative overflow-hidden">
                  {isProcessing && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <RefreshCw className="w-10 h-10 text-purple-400 mb-4" />
                      </motion.div>
                      <p className="text-purple-300 font-medium animate-pulse">Doing magic... ✨</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="text-xl font-semibold text-purple-300 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-3 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      Optimized
                    </h3>
                    {resultBlob && (
                      <motion.span 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-mono border border-purple-500/30 flex items-center"
                      >
                        {formatBytes(resultBlob.size)}
                        {Math.abs(resultBlob.size - TARGET_SIZE) < 100 * 1024 && (
                          <CheckCircle2 className="w-4 h-4 ml-2 text-green-400" />
                        )}
                      </motion.span>
                    )}
                  </div>
                  
                  {/* Format Selector */}
                  <div className="flex gap-2 mb-4 relative z-10">
                    {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => {
                          if (isProcessing) return;
                          setOutputFormat(fmt);
                          if (file) processImage(file, fmt);
                        }}
                        disabled={isProcessing}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          outputFormat === fmt 
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {fmt.split('/')[1].toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 rounded-2xl overflow-hidden bg-black/50 border border-white/5 min-h-[300px] flex items-center justify-center z-10">
                    {resultUrl && (
                      <img src={resultUrl} alt="Optimized" className="max-w-full max-h-[400px] object-contain" />
                    )}
                  </div>

                  {resultUrl && resultBlob && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-6 flex gap-4 relative z-10"
                    >
                      <a
                        href={resultUrl}
                        download={`optipic_${file.name.split('.')[0]}.${outputFormat.split('/')[1]}`}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-1"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download Pic
                      </a>
                      <button
                        onClick={reset}
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold transition-all hover:-translate-y-1"
                      >
                        Start Over
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

