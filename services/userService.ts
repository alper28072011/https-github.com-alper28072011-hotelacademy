
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, writeBatch, runTransaction, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth'; // Client SDK
import { db, auth } from './firebase';
import { User, Organization } from '../types';
import { detachUserFromAllOrgs } from './organizationService';

/**
 * SENARYO 2 & 3B: Smart Delete Protocol
 * Kullanıcıyı silerken hiyerarşiyi korur ve verileri anonimleştirir.
 */
export const deleteUserSmart = async (user: User): Promise<boolean> => {
    try {
        // --- ADIM 1: Hierarchy Roll-up (Yönetici Kontrolü) ---
        if (user.role === 'manager' && user.currentOrganizationId) {
            await handleManagerExit(user);
        }

        // --- ADIM 2: Anonymization (İçerik Temizliği) ---
        await anonymizeUserContent(user.id);

        // --- ADIM 3: Detach Assets (İlişki Kesme) ---
        await detachUserFromAllOrgs(user.id);

        // --- ADIM 4: Hard Delete Profile ---
        await deleteDoc(doc(db, 'users', user.id));

        // --- ADIM 5: Auth Delete (Client Side) ---
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === user.id) {
            await deleteUser(currentUser);
        }

        return true;
    } catch (error) {
        console.error("Smart Delete Failed:", error);
        return false;
    }
};

/**
 * Yardımcı: Yönetici Ayrılma Protokolü
 */
const handleManagerExit = async (manager: User) => {
    if (!manager.currentOrganizationId) return;

    try {
        // 1. Find Organization Owner
        const orgRef = doc(db, 'organizations', manager.currentOrganizationId);
        const orgSnap = await getDoc(orgRef);
        
        if (orgSnap.exists()) {
            const org = orgSnap.data() as Organization;
            
            // Eğer silinen kişi ZATEN mal sahibi ise -> Archive Protocol çalışmalıydı. 
            // Buraya düştüyse ve mal sahibi ise bu bir hatadır veya Super Admin siliyordur.
            if (org.ownerId === manager.id) {
                console.warn("Owner deletion intercepted in Manager Handler. Use archiveOrganization instead.");
                return;
            }

            // 2. Notify Owner (Department orphaned)
            await addDoc(collection(db, `users/${org.ownerId}/notifications`), {
                title: 'Kritik: Yönetici Ayrıldı',
                message: `${manager.name} (${manager.department}) görevden ayrıldı. İlgili departmanın yetkisi geçici olarak size devredildi.`,
                type: 'alert',
                isRead: false,
                createdAt: serverTimestamp()
            });

            // 3. Reassign active tasks/issues (Optional depth)
            // Bu örnekte sadece bildirim atıyoruz. Daha derin bir sistemde
            // 'Department' objesi güncellenirdi.
        }
    } catch (e) {
        console.error("Manager Exit Protocol Error:", e);
    }
};

/**
 * Yardımcı: İçerik Anonimleştirme
 */
const anonymizeUserContent = async (userId: string) => {
    const batch = writeBatch(db);
    const MAX_BATCH_SIZE = 400; // Safety limit
    
    // 1. Feed Posts
    const postsQ = query(collection(db, 'posts'), where('authorId', '==', userId));
    const postsSnap = await getDocs(postsQ);
    
    let count = 0;
    postsSnap.docs.forEach(d => {
        if (count < MAX_BATCH_SIZE) {
            batch.update(d.ref, {
                authorName: 'Eski Personel',
                authorAvatar: 'https://ui-avatars.com/api/?name=Deleted&background=random',
                authorId: 'deleted_user'
            });
            count++;
        }
    });

    // 2. Issues (Reports)
    const issuesQ = query(collection(db, 'issues'), where('userId', '==', userId));
    const issuesSnap = await getDocs(issuesQ);
    
    issuesSnap.docs.forEach(d => {
        if (count < MAX_BATCH_SIZE) {
            batch.update(d.ref, {
                userName: 'Eski Personel'
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
    }
};
