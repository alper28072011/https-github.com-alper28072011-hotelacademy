
import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES } from '../../../i18n/config';
import { useAppStore } from '../../../stores/useAppStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { updateUserPreferences } from '../../../services/userService';
import { 
    ArrowUp, ArrowDown, Trash2, Plus, HelpCircle, 
    Globe, Layout, Save, X, Check, Loader2, ChevronDown, ChevronUp, Languages
} from 'lucide-react';
import { LanguageCode } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const LanguagePreferences: React.FC = () => {
    const { currentLanguage, setLanguage } = useAppStore();
    const { currentUser } = useAuthStore();
    
    // --- STATE MANAGEMENT ---
    
    // 1. App Language State (Immediate Action)
    const [isAppLangOpen, setIsAppLangOpen] = useState(false);
    const [isAppLangSaving, setIsAppLangSaving] = useState(false);

    // 2. Content Language State (Transactional Action)
    const [isContentLangOpen, setIsContentLangOpen] = useState(false);
    const [draftContentLangs, setDraftContentLangs] = useState<LanguageCode[]>([]);
    const [isContentAdding, setIsContentAdding] = useState(false);
    const [isContentSaving, setIsContentSaving] = useState(false);
    
    // 3. Stability Refs (The Source of Truth)
    // We use refs to store the "Original" state to compare against. 
    // This prevents "Changes Detected" on initial load.
    const originalContentLangs = useRef<LanguageCode[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (currentUser) {
            let initialList: LanguageCode[] = [currentLanguage];
            
            if (currentUser.preferences?.contentLanguages && currentUser.preferences.contentLanguages.length > 0) {
                initialList = [...currentUser.preferences.contentLanguages];
            } else if ((currentUser.preferences as any)?.contentLanguage) {
                initialList = [(currentUser.preferences as any).contentLanguage as LanguageCode];
            }
            
            // Set State & Lock Reference
            setDraftContentLangs(initialList);
            originalContentLangs.current = initialList;
        }
    }, [currentUser]); // Run once when user data arrives

    // --- DIRTY CHECK ENGINE ---
    useEffect(() => {
        // Strict array comparison
        const isDifferent = JSON.stringify(draftContentLangs) !== JSON.stringify(originalContentLangs.current);
        setIsDirty(isDifferent);
    }, [draftContentLangs]);

    // --- HANDLERS: APP LANGUAGE (Immediate) ---
    const handleAppLangChange = async (code: LanguageCode) => {
        if (!currentUser) return;
        if (code === currentLanguage) {
            setIsAppLangOpen(false);
            return;
        }

        setIsAppLangSaving(true);
        try {
            // 1. Update UI Instantly
            setLanguage(code);
            
            // 2. Save to DB in background
            await updateUserPreferences(currentUser.id, { appLanguage: code });
            
            // 3. Close menu after short delay for visual feedback
            setTimeout(() => {
                setIsAppLangOpen(false);
                setIsAppLangSaving(false);
            }, 500);
        } catch (e) {
            console.error(e);
            setIsAppLangSaving(false);
        }
    };

    // --- HANDLERS: CONTENT LANGUAGE (Transactional) ---
    const handleSaveContentPrefs = async () => {
        if (!currentUser) return;
        setIsContentSaving(true);
        try {
            await updateUserPreferences(currentUser.id, { contentLanguages: draftContentLangs });
            
            // Sync Reference to new state
            originalContentLangs.current = draftContentLangs;
            setIsDirty(false);
            setIsContentLangOpen(false); // Optional: close on save
        } catch (e) {
            alert("Kaydedilemedi");
        } finally {
            setIsContentSaving(false);
        }
    };

    const handleCancelContentPrefs = () => {
        // Revert to original reference
        setDraftContentLangs(originalContentLangs.current);
        setIsDirty(false);
        setIsContentAdding(false);
    };

    const handleAddContentLang = (code: LanguageCode) => {
        if (!draftContentLangs.includes(code)) {
            setDraftContentLangs([...draftContentLangs, code]);
        }
        setIsContentAdding(false);
    };

    const handleRemoveContentLang = (code: LanguageCode) => {
        setDraftContentLangs(draftContentLangs.filter(l => l !== code));
    };

    const handleMoveContentLang = (index: number, direction: 'UP' | 'DOWN') => {
        if (direction === 'UP' && index === 0) return;
        if (direction === 'DOWN' && index === draftContentLangs.length - 1) return;

        const newList = [...draftContentLangs];
        const swapIndex = direction === 'UP' ? index - 1 : index + 1;
        [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
        
        setDraftContentLangs(newList);
    };

    // Data for dropdowns
    const availableLangsToAdd = SUPPORTED_LANGUAGES.filter(l => !draftContentLangs.includes(l.code));
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);

    return (
        <div className="space-y-6">
            
            {/* SECTION 1: APP INTERFACE LANGUAGE */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                <button 
                    onClick={() => setIsAppLangOpen(!isAppLangOpen)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Layout className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold text-gray-900">Uygulama Dili</div>
                            <div className="text-xs text-gray-500">Menüler ve butonlar için</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAppLangSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            {currentLangObj?.flag} {currentLangObj?.nativeName}
                        </span>
                        {isAppLangOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                </button>

                <AnimatePresence>
                    {isAppLangOpen && (
                        <motion.div 
                            initial={{ height: 0 }} 
                            animate={{ height: 'auto' }} 
                            exit={{ height: 0 }} 
                            className="overflow-hidden bg-gray-50 border-t border-gray-100"
                        >
                            <div className="p-2 space-y-1">
                                {SUPPORTED_LANGUAGES.filter(l => ['tr','en','ru','ar'].includes(l.code)).map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleAppLangChange(lang.code)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                            currentLanguage === lang.code 
                                            ? 'bg-white text-primary shadow-sm border border-gray-200' 
                                            : 'text-gray-600 hover:bg-gray-200/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{lang.flag}</span>
                                            <span>{lang.nativeName}</span>
                                        </div>
                                        {currentLanguage === lang.code && <Check className="w-4 h-4 text-green-500" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* SECTION 2: CONTENT LANGUAGES (PRIORITY) */}
            <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-all ${isDirty ? 'ring-2 ring-primary/20 border-primary' : 'hover:shadow-md'}`}>
                <button 
                    onClick={() => setIsContentLangOpen(!isContentLangOpen)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold text-gray-900">Eğitim İçeriği Dili</div>
                            <div className="text-xs text-gray-500">Öncelik sırasına göre gösterilir</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 mr-1">
                            {draftContentLangs.slice(0,3).map(c => (
                                <div key={c} className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] shadow-sm">
                                    {SUPPORTED_LANGUAGES.find(l => l.code === c)?.flag}
                                </div>
                            ))}
                        </div>
                        {isContentLangOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                </button>

                <AnimatePresence>
                    {isContentLangOpen && (
                        <motion.div 
                            initial={{ height: 0 }} 
                            animate={{ height: 'auto' }} 
                            exit={{ height: 0 }} 
                            className="overflow-hidden bg-gray-50 border-t border-gray-100"
                        >
                            <div className="p-4">
                                {/* TOOLTIP */}
                                <div className="mb-4 bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex gap-3 text-xs text-blue-800">
                                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>Sistem, eğitimleri burada belirlediğiniz sıraya göre arar. İlk dilde bulamazsa ikinciye geçer.</p>
                                </div>

                                {/* LIST */}
                                <div className="space-y-2 mb-4">
                                    {draftContentLangs.map((code, idx) => {
                                        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === code);
                                        return (
                                            <motion.div 
                                                layout
                                                key={code} 
                                                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm group"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-[10px] flex items-center justify-center border border-gray-200 shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="text-xl shrink-0">{langObj?.flag}</div>
                                                <div className="flex-1 font-bold text-gray-800 text-sm">{langObj?.nativeName}</div>
                                                
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleMoveContentLang(idx, 'UP')} disabled={idx === 0} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                                                    <button onClick={() => handleMoveContentLang(idx, 'DOWN')} disabled={idx === draftContentLangs.length - 1} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                                                    <div className="w-px h-6 bg-gray-200 mx-1" />
                                                    <button onClick={() => handleRemoveContentLang(code)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* ADD BUTTON */}
                                {!isContentAdding ? (
                                    <button 
                                        onClick={() => setIsContentAdding(true)}
                                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Dil Ekle
                                    </button>
                                ) : (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Seçiniz</span>
                                            <button onClick={() => setIsContentAdding(false)}><X className="w-4 h-4 text-gray-400" /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableLangsToAdd.map(l => (
                                                <button key={l.code} onClick={() => handleAddContentLang(l.code)} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 transition-colors">
                                                    <span>{l.flag}</span> {l.nativeName}
                                                </button>
                                            ))}
                                            {availableLangsToAdd.length === 0 && <span className="col-span-2 text-center text-xs text-gray-400 py-2">Tüm diller eklendi.</span>}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ACTION BAR (Only Visible when Dirty) */}
                                <AnimatePresence>
                                    {isDirty && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-6 pt-4 border-t border-gray-200 flex gap-3 overflow-hidden"
                                        >
                                            <button 
                                                onClick={handleCancelContentPrefs}
                                                disabled={isContentSaving}
                                                className="flex-1 py-3 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                            >
                                                Vazgeç
                                            </button>
                                            <button 
                                                onClick={handleSaveContentPrefs}
                                                disabled={isContentSaving}
                                                className="flex-[2] py-3 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary-light shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                                            >
                                                {isContentSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Değişiklikleri Kaydet
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
