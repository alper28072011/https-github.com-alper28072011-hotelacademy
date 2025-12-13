import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Film, Image as ImageIcon, CheckCircle2, Loader2, Play } from 'lucide-react';
import { DepartmentType, Course } from '../../types';
import { uploadFile } from '../../services/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const ContentStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('cat_guest'); // Default
  const [targetDepts, setTargetDepts] = useState<DepartmentType[]>([]);
  
  // Media State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const toggleDept = (dept: DepartmentType) => {
      setTargetDepts(prev => 
        prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
      );
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        setVideoFile(e.target.files[0]);
    }
  };

  const handlePublish = async () => {
    if (!title || !coverFile) return; // Video optional for demo
    setLoading(true);
    setUploadProgress(0);

    try {
        // 1. Upload Cover
        const coverUrl = await uploadFile(coverFile, 'course_covers');
        
        // 2. Upload Video (if exists)
        let videoUrl = '';
        if (videoFile) {
            videoUrl = await uploadFile(videoFile, 'course_videos', (progress) => {
                setUploadProgress(progress);
            });
        }

        // 3. Save Course Data
        const newCourse: Omit<Course, 'id'> = {
            categoryId: category,
            title,
            description,
            thumbnailUrl: coverUrl,
            videoUrl,
            duration: 15, // Mock default
            xpReward: 100, // Mock default
            isFeatured: false,
            targetDepartments: targetDepts.length > 0 ? targetDepts : undefined,
            steps: [
                {
                    id: 'step1',
                    type: 'video',
                    title: 'Giriş',
                    description: 'Eğitime giriş videosu.',
                    videoUrl: videoUrl,
                    posterUrl: coverUrl
                }
            ]
        };

        await addDoc(collection(db, 'courses'), newCourse);
        
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            // Reset form could go here
        }, 3000);

    } catch (error) {
        console.error("Publish error", error);
        alert("Yükleme sırasında hata oluştu.");
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"
              >
                  <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-800">Yayında!</h2>
              <p className="text-gray-500 mt-2">İçerik başarıyla yüklendi ve personele bildirildi.</p>
              <button 
                onClick={() => setSuccess(false)}
                className="mt-8 bg-gray-800 text-white px-8 py-3 rounded-xl font-bold"
              >
                  Yeni İçerik Ekle
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">İçerik Stüdyosu</h1>
        <p className="text-gray-500">Yeni bir eğitim içeriği oluşturun.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: MEDIA */}
          <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Cover Upload */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Kapak Görseli (Dikey)</label>
                  <label className="relative aspect-[2/3] bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden group">
                      {coverPreview ? (
                          <>
                            <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">Değiştir</div>
                          </>
                      ) : (
                          <>
                             <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                             <span className="text-xs text-gray-500 font-bold uppercase">Görsel Seç</span>
                          </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                  </label>
              </div>

              {/* Video Upload */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Eğitim Videosu</label>
                  <label className="relative h-32 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors px-4 text-center">
                      {videoFile ? (
                          <div className="flex items-center gap-2 text-primary font-bold">
                              <Film className="w-5 h-5" />
                              <span className="truncate max-w-[150px]">{videoFile.name}</span>
                          </div>
                      ) : (
                          <>
                             <Upload className="w-8 h-8 text-gray-400 mb-2" />
                             <span className="text-xs text-gray-500">Video Yükle (MP4)</span>
                          </>
                      )}
                      <input type="file" accept="video/mp4" className="hidden" onChange={handleVideoSelect} />
                  </label>
              </div>

          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              
              {/* Title & Desc */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Eğitim Başlığı</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                    placeholder="Örn: Latte Art Teknikleri"
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Kısa Açıklama</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="Eğitimin içeriği hakkında kısa bilgi..."
                  />
              </div>

              {/* Targeting */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hedef Kitle (Opsiyonel)</label>
                  <p className="text-xs text-gray-400 mb-3">Seçim yapmazsanız tüm personele görünür.</p>
                  <div className="flex flex-wrap gap-2">
                      {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                          <button
                            key={d}
                            onClick={() => toggleDept(d as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors border ${
                                targetDepts.includes(d as any)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-primary'
                            }`}
                          >
                              {d.replace('_', ' ')}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="h-px bg-gray-100 my-2" />

              {/* Progress Bar (if uploading) */}
              {loading && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary">
                          %{Math.round(uploadProgress)}
                      </span>
                  </div>
              )}

              {/* Publish Button */}
              <button 
                onClick={handlePublish}
                disabled={loading || !title || !coverFile}
                className="w-full bg-primary disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
              >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {loading ? 'Yükleniyor...' : 'Yayına Al'}
              </button>

          </div>
      </div>
    </div>
  );
};