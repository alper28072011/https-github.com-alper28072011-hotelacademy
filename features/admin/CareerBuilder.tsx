
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Save, Loader2, ArrowRight, Map, GraduationCap } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { createAiCareerPath } from '../../services/careerService';
import { useNavigate } from 'react-router-dom';

export const CareerBuilder: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
      if (!targetRole || !currentOrganization || !currentUser) return;
      setIsGenerating(true);
      
      try {
          await createAiCareerPath(targetRole, currentOrganization.id, currentUser);
          alert("Kariyer yolu ve taslak kurslar oluşturuldu!");
          navigate('/admin/courses'); // Redirect to Level 2
      } catch (e) {
          alert("Bir hata oluştu.");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-[#d8dfea] rounded-lg p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
                <Map className="w-10 h-10 text-[#3b5998]" />
            </div>
            
            <h1 className="text-2xl font-bold text-[#333] mb-2">Kariyer Yolu Planlayıcı</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Yapay zeka ile personeliniz için uçtan uca bir gelişim haritası oluşturun.
                Siz sadece hedefi belirleyin, gerisini bize bırakın.
            </p>

            <div className="max-w-lg mx-auto">
                <label className="block text-left text-xs font-bold text-gray-500 uppercase mb-2">Hedef Pozisyon / Rol</label>
                <div className="flex gap-2">
                    <input 
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="Örn: Baş Aşçı, Ön Büro Müdürü, Sommelier..."
                        className="flex-1 p-4 border border-[#bdc7d8] rounded-xl text-lg outline-none focus:border-[#3b5998] focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={!targetRole || isGenerating}
                        className="bg-[#3b5998] text-white px-8 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2d4373] disabled:opacity-50 shadow-lg shadow-blue-900/20"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                        {isGenerating ? 'Planlanıyor...' : 'Yolu Oluştur'}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-left">
                    *Bu işlem otomatik olarak 5-8 adet taslak kurs oluşturacaktır.
                </p>
            </div>
        </div>

        {/* Examples */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Housekeeping Şefi', 'Dijital Pazarlama Uzmanı', 'Misafir İlişkileri Müdürü'].map(role => (
                <button 
                    key={role}
                    onClick={() => setTargetRole(role)}
                    className="p-4 bg-white border border-[#d8dfea] rounded-lg text-sm text-gray-600 hover:border-[#3b5998] hover:text-[#3b5998] transition-colors flex items-center justify-between group"
                >
                    <span className="font-bold">{role}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            ))}
        </div>
    </div>
  );
};
