import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export interface CreateNotificationParams {
  title: string;
  message: string;
  type: 'order' | 'task' | 'system';
  link?: string;
  recipientIds?: string[];
  forRole?: 'admin' | 'manager' | 'staff' | 'all';
}

export const createNotification = async (data: CreateNotificationParams) => {
  try {
    let targetUids: string[] = data.recipientIds || [];

    if (data.forRole && targetUids.length === 0) {
      const usersRef = collection(db, 'users');
      let q;
      if (data.forRole === 'all') {
         q = query(usersRef, where('active', '==', true));
      } else {
         q = query(usersRef, where('role', '==', data.forRole), where('active', '==', true));
      }
      const snapshot = await getDocs(q);
      const userIds = snapshot.docs.map(doc => doc.id);
      targetUids = [...targetUids, ...userIds];
    }

    // Deduplicate
    targetUids = Array.from(new Set(targetUids));

    if (targetUids.length === 0) return;

    await addDoc(collection(db, 'notifications'), {
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link || '',
      recipients: targetUids,
      readBy: [],
      createdAt: serverTimestamp()
    });

  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
