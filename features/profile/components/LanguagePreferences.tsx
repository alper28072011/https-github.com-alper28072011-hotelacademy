
import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../../../i18n/config';
import { useAppStore } from '../../../stores/useAppStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { updateUserPreferences } from '../../../services/userService';
import { ArrowUp, ArrowDown, Trash2, Plus, HelpCircle, Globe, Layout, Save, X, Check, Loader2, RotateCcw } from 'lucide-react';
import { LanguageCode } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const LanguagePreferences: React.FC = () => {
    const { currentLanguage, setLanguage } = useAppStore();
    const { currentUser } = useAuthStore();
    
    // --- LOCAL DRAFT STATE ---
    // We only commit changes when user clicks "Save"
    const [draftAppLang, setDraftAppLang] = useState<LanguageCode>('en');
    const [draftContentLangs, setDraftContentLangs] = useState<LanguageCode[]>([]);
    
    // UI States
    const [isAdding, setIsAdding] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (currentUser) {
            setDraftAppLang(currentLanguage);
            
            let initialList: LanguageCode[] = [currentLanguage];
            
            if (currentUser.preferences?.contentLanguages && currentUser.preferences.contentLanguages.length > 0) {
                initialList = [...currentUser.preferences.contentLanguages];
            } else if ((currentUser.preferences as any)?.contentLanguage) {
                // Legacy migration support
                initialList = [(currentUser.preferences as any).contentLanguage as LanguageCode];
            }
            
            setDraftContentLangs(initialList);
        }
    }, [currentUser]); // Run once when user loads

    // --- DIRTY CHECK ---
    useEffect(() => {
        if (!currentUser) return;
        
        const currentContentLangs = currentUser.preferences?.contentLanguages || [];
        const isAppLangChanged = draftAppLang !== currentLanguage;
        
        // Simple array comparison
        const isContentChanged = JSON.stringify(draftContentLangs) !== JSON.stringify(currentContentLangs);
        
        // Also check if legacy user with no preferences needs initial save (optional, but cleaner to only show save if explicit change)
        setIsDirty(isAppLangChanged || isContentChanged);
        
    }, [draftAppLang, draftContentLangs, currentLanguage, currentUser]);

    // --- HANDLERS ---

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);

        try {
            // 1. Update App UI Language (Immediate effect)
            if (draftAppLang !== currentLanguage) {
                setLanguage(draftAppLang);
            }

            // 2. Update Database
            await updateUserPreferences(currentUser.id, {
                appLanguage: draftAppLang,
                contentLanguages: draftContentLangs
            });

            setIsDirty(false);
            // Optional: Success toast here
        } catch (error) {
            console.error("Save failed", error);
            alert("Ayarlar kaydedilirken bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Revert to store values
        setDraftAppLang(currentLanguage);
        if (currentUser?.preferences?.contentLanguages) {
            setDraftContentLangs(currentUser.preferences.contentLanguages);
        } else {
            setDraftContentLangs([currentLanguage]);
        }
        setIsDirty(false);
    };

    const handleAddLang = (code: LanguageCode) => {
        if (!draftContentLangs.includes(code)) {
            setDraftContentLangs([...draftContentLangs, code]);
        }
        setIsAdding(false);
    };

    const handleRemoveLang = (code: LanguageCode) => {
        setDraftContentLangs(draftContentLangs.filter(l => l !== code));
    };

    const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
        if (direction === 'UP' && index === 0) return;
        if (direction === 'DOWN' && index === draftContentLangs.length - 1) return;

        const newList = [...draftContentLangs];
        const swapIndex = direction === 'UP' ? index - 1 : index + 1;
        [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
        
        setDraftContentLangs(newList);
    };

    // Filter available languages for adding
    const availableLangs = SUPPORTED_LANGUAGES.filter(l => !draftContentLangs.includes(l.code));

    return (
        <div className="space-y-8 relative">
            
            {/* 1. APP LANGUAGE SECTION */}
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Arayüz Dili
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {SUPPORTED_LANGUAGES.filter(l => ['tr','en','ru','ar'].includes(l.code)).map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => setDraftAppLang(lang.code)}
                            className={`
                                relative py-3 px-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all border-2
                                ${draftAppLang === lang.code 
                                    ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'}
                            `}
                        >
                            <span className="text-xl">{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                            {draftAppLang === lang.code && (
                                <div className="absolute right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <div className="h-px bg-gray-100" />

            {/* 2. CONTENT PRIORITY SECTION */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Eğitim İçeriği Önceliği
                        </h3>
                        <button 
                            onClick={() => setShowTooltip(!showTooltip)}
                            className={`p-1 rounded-full transition-colors ${showTooltip ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="text-xs text-primary font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 bg-blue-50/50"
                        >
                            <Plus className="w-3.5 h-3.5" /> Dil Ekle
                        </button>
                    )}
                </div>

                {/* Tooltip Area */}
                <AnimatePresence>
                    {showTooltip && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 leading-relaxed shadow-sm">
                                <strong className="block mb-1 font-bold text-blue-900">Nasıl Çalışır?</strong>
                                Sistem, eğitim içeriklerini gösterirken bu listeyi yukarıdan aşağıya tarar. 
                                Örneğin listeniz <b>TR, RU</b> ise; sistem önce Türkçe içerik arar. Bulamazsa Rusça'ya bakar. 
                                Hiçbir eşleşme yoksa varsayılan olarak <b>İngilizce (Base)</b> gösterilir.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Priority List */}
                <div className="space-y-2">
                    {draftContentLangs.map((code, idx) => {
                        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === code);
                        return (
                            <motion.div 
                                layout
                                key={code} 
                                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm group"
                            >
                                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-[10px] flex items-center justify-center border border-gray-200">
                                    {idx + 1}
                                </div>
                                <div className="text-xl">{langObj?.flag}</div>
                                <div className="flex-1 font-bold text-gray-800 text-sm">{langObj?.nativeName}</div>
                                
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleMove(idx, 'UP')} 
                                        disabled={idx === 0}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20 transition-colors"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleMove(idx, 'DOWN')} 
                                        disabled={idx === draftContentLangs.length - 1}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20 transition-colors"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-6 bg-gray-200 mx-1" />
                                    <button 
                                        onClick={() => handleRemoveLang(code)}
                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Empty State */}
                    {draftContentLangs.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                            Henüz bir dil seçilmedi. Varsayılan (EN) kullanılacak.
                        </div>
                    )}

                    {/* Add Language Panel */}
                    <AnimatePresence>
                        {isAdding && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl mt-2"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Dil Seçiniz</span>
                                    <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableLangs.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleAddLang(lang.code)}
                                            className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-all text-xs font-bold text-gray-600 shadow-sm"
                                        >
                                            <span className="text-base">{lang.flag}</span>
                                            {lang.nativeName}
                                        </button>
                                    ))}
                                    {availableLangs.length === 0 && (
                                        <div className="col-span-2 text-center text-xs text-gray-400 py-2">
                                            Tüm diller eklendi.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* ACTION BAR (Sticky or Fixed Bottom of Component) */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-6 right-6 z-50 md:absolute md:bottom-0 md:left-0 md:right-0 md:translate-y-full md:pt-4"
                    >
                        <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between pl-5 border border-white/10">
                            <span className="text-sm font-medium text-gray-300">Değişiklikler var</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-white text-primary rounded-xl text-xs font-bold shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
