
import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../../../i18n/config';
import { useAppStore } from '../../../stores/useAppStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { updateUserPreferences } from '../../../services/userService';
import { ArrowUp, ArrowDown, Trash2, Plus, Info, Globe, Layout, Check } from 'lucide-react';
import { LanguageCode } from '../../../types';

export const LanguagePreferences: React.FC = () => {
    const { currentLanguage, setLanguage } = useAppStore();
    const { currentUser } = useAuthStore();
    
    // Content Languages State (Array)
    const [priorityList, setPriorityList] = useState<LanguageCode[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (currentUser?.preferences?.contentLanguages) {
            setPriorityList(currentUser.preferences.contentLanguages);
        } else if ((currentUser?.preferences as any)?.contentLanguage) {
            // Legacy Migration
            setPriorityList([(currentUser?.preferences as any).contentLanguage as LanguageCode]);
        } else {
            // Default
            setPriorityList([currentLanguage]);
        }
    }, [currentUser]);

    // --- APP LANGUAGE ACTIONS ---
    const handleAppLangChange = async (code: LanguageCode) => {
        setLanguage(code);
        if (currentUser) {
            await updateUserPreferences(currentUser.id, { appLanguage: code });
        }
    };

    // --- CONTENT PRIORITY ACTIONS ---
    const updatePriorityList = async (newList: LanguageCode[]) => {
        setPriorityList(newList);
        if (currentUser) {
            await updateUserPreferences(currentUser.id, { contentLanguages: newList });
        }
    };

    const handleAddLang = (code: LanguageCode) => {
        if (!priorityList.includes(code)) {
            const newList = [...priorityList, code];
            updatePriorityList(newList);
        }
        setIsAdding(false);
    };

    const handleRemoveLang = (code: LanguageCode) => {
        const newList = priorityList.filter(l => l !== code);
        updatePriorityList(newList);
    };

    const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
        if (direction === 'UP' && index === 0) return;
        if (direction === 'DOWN' && index === priorityList.length - 1) return;

        const newList = [...priorityList];
        const swapIndex = direction === 'UP' ? index - 1 : index + 1;
        [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
        
        updatePriorityList(newList);
    };

    const availableLangs = SUPPORTED_LANGUAGES.filter(l => !priorityList.includes(l.code));

    return (
        <div className="space-y-8">
            
            {/* 1. APP LANGUAGE */}
            <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Arayüz Dili
                </h3>
                <div className="bg-white rounded-2xl border border-gray-100 p-2 grid grid-cols-3 gap-2">
                    {SUPPORTED_LANGUAGES.filter(l => ['tr','en','ru','ar'].includes(l.code)).map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => handleAppLangChange(lang.code)}
                            className={`py-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                                currentLanguage === lang.code 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <span className="text-xl">{lang.flag}</span>
                            {lang.nativeName}
                        </button>
                    ))}
                </div>
            </section>

            {/* 2. CONTENT LANGUAGE PRIORITY */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Eğitim İçeriği Önceliği
                    </h3>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="text-xs text-primary font-bold hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Ekle
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {priorityList.map((code, idx) => {
                        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === code);
                        return (
                            <div key={code} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm animate-in slide-in-from-left-2 duration-300">
                                <div className="text-xs font-bold text-gray-400 w-4 text-center">{idx + 1}</div>
                                <div className="text-2xl">{langObj?.flag}</div>
                                <div className="flex-1 font-bold text-gray-800 text-sm">{langObj?.nativeName}</div>
                                
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => handleMove(idx, 'UP')} 
                                        disabled={idx === 0}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30 transition-colors"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleMove(idx, 'DOWN')} 
                                        disabled={idx === priorityList.length - 1}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30 transition-colors"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveLang(code)}
                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors ml-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* ADD NEW DROPDOWN */}
                    {isAdding && (
                        <div className="p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl animate-in fade-in">
                            <div className="grid grid-cols-2 gap-2">
                                {availableLangs.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleAddLang(lang.code)}
                                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-all text-sm font-bold text-gray-600"
                                    >
                                        <span>{lang.flag}</span>
                                        {lang.nativeName}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsAdding(false)} className="w-full mt-2 text-xs text-gray-500 hover:text-gray-800 font-medium py-1">İptal</button>
                        </div>
                    )}
                </div>

                {/* Base Language Info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800">
                        <span className="font-bold block mb-1">İçerik Çözümleme Mantığı:</span>
                        Sistem listeyi yukarıdan aşağıya tarar. Seçili dillerde içerik bulamazsa, varsayılan olarak <b>İngilizce (Base)</b> gösterilir.
                    </div>
                </div>
            </section>
        </div>
    );
};
