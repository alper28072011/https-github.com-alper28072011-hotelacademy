import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { DepartmentType } from '../types';

export const notifyDepartment = async (
  department: DepartmentType | 'all',
  title: string,
  message: string,
  link?: string
) => {
  try {
    // 1. Find Target Users
    const usersRef = collection(db, 'users');
    let q;
    
    if (department === 'all') {
      q = query(usersRef); // Select all
    } else {
      q = query(usersRef, where('department', '==', department));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    // 2. Create Notifications Batch
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((userDoc) => {
       const notifRef = doc(collection(db, `users/${userDoc.id}/notifications`));
       batch.set(notifRef, {
           title,
           message,
           link,
           isRead: false,
           createdAt: serverTimestamp(),
           type: 'system'
       });
    });

    await batch.commit();
    console.log(`Notification sent to ${snapshot.size} users in ${department}.`);

  } catch (error) {
    console.error("Notification Error:", error);
  }
};
