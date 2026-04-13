import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { SupportMessage, MessageReply, SupportMessageFormData } from '../types';

class MessageService {
  private messagesCollection = collection(db, 'supportMessages');

  // Create a new support message
  async createMessage(
    userId: string,
    userName: string,
    userPhone: string,
    data: SupportMessageFormData
  ): Promise<string> {
    const messageData = {
      userId,
      userName,
      userPhone,
      title: data.title,
      message: data.message,
      status: 'OPEN',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      replies: [],
    };

    const docRef = await addDoc(this.messagesCollection, messageData);
    return docRef.id;
  }

  // Get all messages (admin only)
  async getAllMessages(): Promise<SupportMessage[]> {
    const q = query(this.messagesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userPhone: data.userPhone,
        title: data.title,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        replies: data.replies?.map((reply: any) => ({
          id: reply.id,
          adminId: reply.adminId,
          adminName: reply.adminName,
          message: reply.message,
          createdAt: reply.createdAt.toDate(),
        })) || [],
      } as SupportMessage;
    });
  }

  // Get messages by user
  async getMessagesByUser(userId: string): Promise<SupportMessage[]> {
    const q = query(
      this.messagesCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userPhone: data.userPhone,
        title: data.title,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        replies: data.replies?.map((reply: any) => ({
          id: reply.id,
          adminId: reply.adminId,
          adminName: reply.adminName,
          message: reply.message,
          createdAt: reply.createdAt.toDate(),
        })) || [],
      } as SupportMessage;
    });
  }

  // Get a single message by ID
  async getMessageById(messageId: string): Promise<SupportMessage | null> {
    const docRef = doc(this.messagesCollection, messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      userName: data.userName,
      userPhone: data.userPhone,
      title: data.title,
      message: data.message,
      status: data.status,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      replies: data.replies?.map((reply: any) => ({
        id: reply.id,
        adminId: reply.adminId,
        adminName: reply.adminName,
        message: reply.message,
        createdAt: reply.createdAt.toDate(),
      })) || [],
    } as SupportMessage;
  }

  // Add a reply to a message (admin only)
  async addReply(
    messageId: string,
    adminId: string,
    adminName: string,
    replyMessage: string
  ): Promise<void> {
    const messageRef = doc(this.messagesCollection, messageId);

    const reply: MessageReply = {
      id: `reply_${Date.now()}`,
      adminId,
      adminName,
      message: replyMessage,
      createdAt: new Date(),
    };

    await updateDoc(messageRef, {
      replies: arrayUnion({
        ...reply,
        createdAt: Timestamp.now(),
      }),
      status: 'REPLIED',
      updatedAt: Timestamp.now(),
    });
  }

  // Update message status
  async updateMessageStatus(messageId: string, status: 'OPEN' | 'REPLIED' | 'CLOSED'): Promise<void> {
    const messageRef = doc(this.messagesCollection, messageId);
    await updateDoc(messageRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  }
}

const messageService = new MessageService();
export default messageService;
