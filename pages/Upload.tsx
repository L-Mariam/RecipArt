import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ImageUploader from '../components/ImageUploader';
import BlurEditor, { BlurEditorHandle } from '../components/BlurEditor';
import ItemsEditor from '../components/ItemsEditor';
import { ReceiptFormData } from '../types';
import { uploadReceipt } from '../services/receiptService';
import { performLocalOCR, isLikelyReceipt } from '../services/ocrService';

const Upload: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const blurEditorRef = useRef<BlurEditorHandle>(null);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); }
  }, [currentUser, navigate]);
  
  const [formData, setFormData] = useState<ReceiptFormData>({
    title: '',
    description: '',
    artist: '',
    year: new Date().getFullYear().toString(),
    medium: '',
    location: '',
    isLocationPrivate: false,
    artFile: null,
    billFile: null,
    billSensitiveBlob: null,
    billBlurredBlob: null,
    items: [],
    total: 0
  });

  const handleArtSelect = (file: File) => setFormData(prev => ({ ...prev, artFile: file }));
  const handleBillSelect = (file: File) => {
    setValidationError(null);
    setFormData(prev => ({ ...prev, billFile: file }));
  };

  const handleBillValidation = async () => {
     if (!formData.billFile) return;
     setValidating(true);
     setValidationError(null);
     setOcrProgress(0);
     try {
       // Using local OCR for validation too
       const result = await performLocalOCR(formData.billFile, (p) => setOcrProgress(p * 100));
       const isValid = isLikelyReceipt(result.rawText);
       
       if (isValid) {
         // Auto-fill some data already found during validation
         setFormData(prev => ({
           ...prev,
           location: result.location,
           total: result.total,
           items: result.items
         }));
         setStep(3);
       } else {
         setValidationError("Local Scan Failed: We couldn't find typical receipt keywords (Total, Amount, etc.). Please ensure the text is clear.");
       }
     } catch(e) {
       if (window.confirm("OCR failed to initialize. Skip validation and enter manually?")) setStep(3);
     } finally {
       setValidating(false);
     }
  };

  const handleAnalyze = async () => {
    if (!formData.billFile) return;
    setAnalyzing(true);
    setOcrProgress(0);
    try {
        const result = await performLocalOCR(formData.billFile, (p) => setOcrProgress(p * 100));
        setFormData(prev => ({
            ...prev,
            items: result.items.length > 0 ? result.items : prev.items,
            total: result.total || prev.total,
            location: result.location || prev.location
        }));
    } catch (e) {
        alert("Local OCR Scan failed. Please enter details manually.");
    } finally {
        setAnalyzing(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    let sensitiveBlob: Blob | null = formData.billSensitiveBlob;
    let fullBlob: Blob | null = formData.billBlurredBlob;

    if (blurEditorRef.current) {
        try {
            const blobs = await blurEditorRef.current.getBlobs();
            sensitiveBlob = blobs.sensitiveBlob;
            fullBlob = blobs.fullBlob;
        } catch(e) {
            alert("Privacy processing failed.");
            setLoading(false);
            return;
        }
    }
    
    if (!formData.title || !formData.artFile) { alert("Missing Art or Title."); setLoading(false); return; }
    
    const finalData = { ...formData, billSensitiveBlob: sensitiveBlob, billBlurredBlob: fullBlob, creatorId: currentUser?.uid };
    try {
        const id = await uploadReceipt(finalData);
        navigate(`/view/${id}`);
    } catch (e) {
        alert("Upload failed. Try again.");
        setLoading(false);
    }
  };

  const buttonClass = "w-full bg-primary text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl disabled:opacity-50 flex justify-center items-center gap-2";
  const secondaryButtonClass = "w-full bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all flex justify-center items-center gap-2";
  const inputClass = "w-full px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2";
  
  if (!currentUser) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
         <button onClick={() => navigate('/')} className="text-gray-400 hover:text-black font-black flex items-center gap-2 transition-colors uppercase text-xs tracking-widest">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Exit
         </button>
         <div className="flex gap-4">
            {[1, 2, 3].map(s => (
                <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-primary' : 'bg-gray-200'}`}></div>
            ))}
         </div>
      </div>

      {step === 1 && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-4xl font-black text-gray-900 mb-2 text-center">Step 1: The Art</h1>
            <p className="text-gray-400 text-center mb-10 font-bold">Upload your masterpiece created on a receipt.</p>
            
            <div className="space-y-8">
                <ImageUploader 
                    label="Drop Art Image Here"
                    onFileSelect={handleArtSelect}
                    previewUrl={formData.artFile ? URL.createObjectURL(formData.artFile) : undefined}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="Piece Title" />
                    </div>
                    <div>
                        <label className={labelClass}>Artist Display Name</label>
                        <input type="text" value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className={inputClass} placeholder={currentUser.displayName || "Anonymous"} />
                    </div>
                    <div>
                        <label className={labelClass}>Medium</label>
                        <input type="text" value={formData.medium} onChange={e => setFormData({...formData, medium: e.target.value})} className={inputClass} placeholder="Ink on Receipt" />
                    </div>
                    <div>
                        <label className={labelClass}>Year</label>
                        <input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className={inputClass} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Description / Context</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={3} placeholder="The story behind this drawing..." />
                </div>

                {formData.artFile && formData.title && (
                    <button onClick={() => setStep(2)} className={buttonClass}>Next: Link Source Bill</button>
                )}
            </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-6 duration-700">
            <h2 className="text-4xl font-black text-gray-900 mb-2 text-center">Step 2: The Source</h2>
            <p className="text-gray-400 text-center mb-10 font-bold">Upload a clear photo of the original bill for local OCR verification.</p>
            <div className="bg-white border-2 border-gray-100 p-8 rounded-3xl shadow-sm mb-10">
               <ImageUploader label="Original Receipt Text" onFileSelect={handleBillSelect} previewUrl={formData.billFile ? URL.createObjectURL(formData.billFile) : undefined} />
            </div>

            {validating && (
              <div className="mb-6 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
              </div>
            )}

            {validationError && (
              <div className="mb-8 bg-red-50 border border-red-100 p-5 rounded-3xl text-red-600 text-sm font-bold flex gap-3 items-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {validationError}
              </div>
            )}
            
            <div className="flex flex-col gap-4">
                {formData.billFile && (
                    <button onClick={handleBillValidation} disabled={validating} className={buttonClass}>
                        {validating ? `Processing Text (${ocrProgress.toFixed(0)}%)...` : 'Verify & Continue'}
                    </button>
                )}
                <button onClick={() => setStep(1)} className={secondaryButtonClass}>Back to Step 1</button>
            </div>
        </div>
      )}

      {step === 3 && formData.billFile && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-700 pb-32">
             <div className="flex flex-col xl:flex-row gap-12">
                 <div className="flex-1 order-2 xl:order-1 space-y-8">
                     <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900">Receipt Data</h2>
                            <button onClick={handleAnalyze} disabled={analyzing} className="bg-primary/5 text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-colors">
                                {analyzing ? `Scanning (${ocrProgress.toFixed(0)}%)...` : 'Re-run Local Scan'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mb-8">
                             <div>
                                 <label className={labelClass}>Total ($)</label>
                                 <input type="number" value={formData.total} onChange={e => setFormData({...formData, total: parseFloat(e.target.value)})} className={inputClass} step="0.01" />
                             </div>
                             <div>
                                 <label className={labelClass}>Merchant / Location</label>
                                 <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className={inputClass} placeholder="Store Name" />
                             </div>
                        </div>

                        <div className="mb-10 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Private Location</h4>
                                <p className="text-xs text-gray-400 font-medium">Store name will be hidden until a user guesses correctly.</p>
                            </div>
                            <button 
                                onClick={() => setFormData(prev => ({ ...prev, isLocationPrivate: !prev.isLocationPrivate }))}
                                className={`w-14 h-8 rounded-full transition-all relative p-1 ${formData.isLocationPrivate ? 'bg-primary' : 'bg-gray-200'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${formData.isLocationPrivate ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <ItemsEditor items={formData.items} onChange={(items) => setFormData({...formData, items})} />
                     </div>
                 </div>

                 <div className="flex-1 order-1 xl:order-2">
                     <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Privacy Editor</h2>
                        <p className="text-sm text-gray-400 mb-8 font-medium">Use Red for permanent blurring (personal info). Use Green for hidden prices (guessing info).</p>
                        <BlurEditor ref={blurEditorRef} imageFile={formData.billFile} />
                     </div>
                 </div>
             </div>

             <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-50 shadow-2xl">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button onClick={() => setStep(2)} className="font-black text-gray-400 hover:text-black transition-colors uppercase text-xs tracking-widest">← Back</button>
                    <button onClick={handleFinalSubmit} disabled={loading} className="px-12 py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        {loading ? 'Publishing...' : 'Publish Masterpiece'}
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Upload;