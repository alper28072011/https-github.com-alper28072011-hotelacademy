import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, User as UserIcon, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { DepartmentType, User } from '../../types';
import { getUsersByDepartment } from '../../services/db';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { uploadFile } from '../../services/storage';

export const StaffManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Filter State
  const [selectedDept, setSelectedDept] = useState<DepartmentType | 'all'>('all');

  // Wizard State
  const [step, setStep] = useState(1);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<DepartmentType>('housekeeping');
  const [generatedPin, setGeneratedPin] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Users
  useEffect(() => {
    const fetchAll = async () => {
        setLoading(true);
        // Simple fetch strategy: fetch all departments and merge
        const depts: DepartmentType[] = ['housekeeping', 'kitchen', 'front_office', 'management'];
        let allUsers: User[] = [];
        for (const d of depts) {
            const u = await getUsersByDepartment(d);
            allUsers = [...allUsers, ...u];
        }
        setUsers(allUsers);
        setLoading(false);
    };
    fetchAll();
  }, [isAdding]); // Refetch after adding

  // Filter Logic
  const filteredUsers = selectedDept === 'all' ? users : users.filter(u => u.department === selectedDept);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setNewAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveUser = async () => {
     if (!newName || !newAvatar) return;
     setIsSaving(true);

     try {
         // 1. Upload Image
         const downloadUrl = await uploadFile(newAvatar, 'staff_photos');

         // 2. Generate Random 4-digit PIN
         const pin = Math.floor(1000 + Math.random() * 9000).toString();
         setGeneratedPin(pin);

         // 3. Save to Firestore
         const newUser: Omit<User, 'id'> = {
             name: newName,
             avatar: downloadUrl, // Using URL now, but type def says string so it's fine
             department: newDept,
             role: 'staff',
             pin: pin,
             xp: 0,
             completedCourses: [],
             completedTasks: []
         };

         await addDoc(collection(db, 'users'), newUser);
         
         setStep(3); // Go to Success Step
     } catch (error) {
         console.error("Error saving user", error);
         alert("Hata oluştu.");
     } finally {
         setIsSaving(false);
     }
  };

  const resetWizard = () => {
      setIsAdding(false);
      setStep(1);
      setNewName('');
      setNewAvatar(null);
      setAvatarPreview(null);
      setGeneratedPin('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Personel Yönetimi</h1>
            <p className="text-gray-500">Ekip üyelerini ekle, düzenle veya kaldır.</p>
        </div>
        <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary-light transition-all active:scale-95"
        >
            <Plus className="w-5 h-5" />
            Yeni Personel
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
         {['all', 'housekeeping', 'kitchen', 'front_office', 'management'].map((d) => (
             <button
                key={d}
                onClick={() => setSelectedDept(d as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedDept === d 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
             >
                 {d.charAt(0).toUpperCase() + d.slice(1).replace('_', ' ')}
             </button>
         ))}
      </div>

      {/* User Grid */}
      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                        {user.avatar.length > 5 ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-gray-400">{user.avatar}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 leading-tight">{user.name}</h3>
                        <div className="text-xs text-gray-500 capitalize">{user.department.replace('_', ' ')}</div>
                        <div className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded mt-1 w-max">PIN: ***{user.pin.slice(-1)}</div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* ADD USER WIZARD MODAL */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-primary">Yeni Personel Ekle</h2>
                      <button onClick={resetWizard} className="text-gray-400 hover:text-gray-600 font-medium">İptal</button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-8 flex-1 overflow-y-auto">
                      
                      {/* STEP 1: PHOTO */}
                      {step === 1 && (
                          <div className="flex flex-col items-center gap-6">
                              <label className="relative w-48 h-48 rounded-full bg-gray-50 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group overflow-hidden">
                                  {avatarPreview ? (
                                      <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
                                  ) : (
                                      <>
                                        <Camera className="w-12 h-12 text-gray-300 group-hover:text-primary transition-colors" />
                                        <span className="text-sm text-gray-400 mt-2 font-medium">Fotoğraf Seç</span>
                                      </>
                                  )}
                                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                              </label>
                              <p className="text-center text-gray-500 text-sm">
                                  Lütfen personelin net bir yüz fotoğrafını yükleyin. Bu fotoğraf kimlik kartı olarak kullanılacak.
                              </p>
                              <button 
                                disabled={!newAvatar}
                                onClick={() => setStep(2)}
                                className="w-full bg-primary disabled:bg-gray-300 text-white py-4 rounded-xl font-bold mt-4"
                              >
                                  Devam Et
                              </button>
                          </div>
                      )}

                      {/* STEP 2: INFO */}
                      {step === 2 && (
                          <div className="flex flex-col gap-4">
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Ad Soyad</label>
                                  <input 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Örn: Ahmet Yılmaz"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Departman</label>
                                  <div className="grid grid-cols-2 gap-2">
                                      {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                                          <button
                                            key={d}
                                            onClick={() => setNewDept(d as any)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                                newDept === d 
                                                ? 'bg-primary text-white border-primary' 
                                                : 'bg-white border-gray-200 text-gray-600'
                                            }`}
                                          >
                                              {d.replace('_', ' ').toUpperCase()}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <button 
                                disabled={!newName || isSaving}
                                onClick={handleSaveUser}
                                className="w-full bg-primary disabled:bg-gray-300 text-white py-4 rounded-xl font-bold mt-4 flex items-center justify-center gap-2"
                              >
                                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kaydet ve PIN Oluştur'}
                              </button>
                          </div>
                      )}

                      {/* STEP 3: SUCCESS */}
                      {step === 3 && (
                          <div className="flex flex-col items-center justify-center py-8">
                               <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                   <CheckCircle2 className="w-10 h-10" />
                               </div>
                               <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">Personel Eklendi!</h3>
                               <p className="text-gray-500 text-center mb-8">Aşağıdaki giriş kodunu personele iletin.</p>
                               
                               <div className="bg-gray-100 px-8 py-6 rounded-2xl text-4xl font-mono font-bold text-gray-800 tracking-widest border border-gray-200 mb-8">
                                   {generatedPin}
                               </div>

                               <button 
                                onClick={resetWizard}
                                className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold"
                              >
                                  Tamamla
                              </button>
                          </div>
                      )}

                  </div>
              </motion.div>
          </div>
      )}
    </div>
  );
};