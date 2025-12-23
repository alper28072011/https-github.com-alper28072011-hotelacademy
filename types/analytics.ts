
export type InteractionType = 
  | 'APP_SESSION_START' // Uygulama açıldı
  | 'APP_SESSION_END'   // Uygulama kapandı
  | 'PAGE_VIEW'         // Sayfa ziyareti
  | 'CLICK'             // Tıklama
  | 'SCROLL_DEPTH'      // Sayfanın % kaçına indi
  | 'VIDEO_PLAY'        // Video başladı
  | 'VIDEO_PAUSE'       // Video durakladı
  | 'VIDEO_SEEK'        // İleri/Geri sarma
  | 'VIDEO_COMPLETE'    // Video bitti
  | 'SLIDE_VIEW'        // Slayt görüntülendi (Süre ölçümü için)
  | 'QUIZ_VIEW'         // Soru ekrana geldi
  | 'QUIZ_ATTEMPT'      // Soruya cevap verildi (Süre ve doğruluk ile)
  | 'MODAL_OPEN'        // Modal açıldı
  | 'MODAL_CLOSE'       // Modal kapandı
  | 'ERROR';            // Hata oluştu

export interface AnalyticsEvent {
  id: string; // UUID
  userId: string | 'anonymous';
  sessionId: string; // Tarayıcı oturum ID'si
  timestamp: number;
  type: InteractionType;
  
  // BAĞLAM (Nerede oldu?)
  context: {
    pageUrl: string;
    pageTitle?: string;
    component?: string;   // Örn: 'CoursePlayer', 'Navbar'
    organizationId?: string;
    courseId?: string;
    moduleId?: string;
    targetId?: string;    // Tıklanan öğenin ID'si (varsa)
  };

  // DETAYLAR (Ne oldu?)
  payload?: {
    duration?: number;       // Harcanan süre (ms cinsinden)
    percentage?: number;     // Tamamlanma oranı
    videoTime?: number;      // Videonun o anki saniyesi
    seekFrom?: number;       // Videoda şuradan...
    seekTo?: number;         // ...şuraya atladı
    quizAnswer?: string | number; // Verilen cevap
    isSuccess?: boolean;     // Doğru/Yanlış
    errorMessage?: string;   // Hata mesajı
    meta?: any;              // Diğer özel veriler
  };
  
  // TEKNİK BİLGİ
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    language: string;
    platform: string;
  };
}
