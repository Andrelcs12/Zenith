'use client';
import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Bell } from 'lucide-react';
import Link from 'next/link';

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const notificationDate = notification.createdAt?.seconds ? new Date(notification.createdAt.seconds * 1000) : new Date();

  let message = '';
  let linkHref = '#';
  let icon = <Bell size={18} className="text-purple-400" />;

  switch (notification.type) {
    case 'like_post':
      message = (
        <>
          <span className="font-semibold text-white">@{notification.fromHandle}</span> curtiu seu post: "{notification.postContent}"
        </>
      );
      linkHref = `/profile/${notification.toUserId}`;
      if (notification.postId) linkHref = `/post/${notification.postId}`; 
      icon = <Heart size={18} className="text-red-400 fill-red-400" />;
      break;
    case 'comment_post':
      message = (
        <>
          <span className="font-semibold text-white">@{notification.fromHandle}</span> comentou no seu post: "{notification.commentContent}"
        </>
      );
      linkHref = `/profile/${notification.toUserId}`;
      if (notification.postId) linkHref = `/post/${notification.postId}`;
      icon = <MessageCircle size={18} className="text-blue-400 fill-blue-400" />;
      break;
    case 'reply_comment':
      message = (
        <>
          <span className="font-semibold text-white">@{notification.fromHandle}</span> respondeu ao seu comentário: "{notification.commentContent}"
        </>
      );
      linkHref = `/profile/${notification.toUserId}`;
      if (notification.postId) linkHref = `/post/${notification.postId}`;
      icon = <MessageCircle size={18} className="text-green-400 fill-green-400" />;
      break;
    case 'follow':
      message = (
        <>
          <span className="font-semibold text-white">@{notification.fromHandle}</span> começou a te seguir.
        </>
      );
      linkHref = `/profile/${notification.fromUserId}`; 
      icon = <Bell size={18} className="text-yellow-400" />; 
      break;
    case 'like_comment':
      message = (
        <>
          <span className="font-semibold text-white">@{notification.fromHandle}</span> curtiu seu comentário: "{notification.commentContent}"
        </>
      );
      linkHref = `/profile/${notification.toUserId}`;
      if (notification.postId) linkHref = `/post/${notification.postId}`;
      icon = <Heart size={18} className="text-red-400 fill-red-400" />;
      break;
    default:
      message = `Nova notificação: ${notification.type}`;
      break;
  }

  const handleNotificationClick = async () => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
  };

  return (
    <div className={`flex items-start p-4 rounded-lg shadow-sm transition-all duration-200
        ${notification.read ? 'bg-gray-800 text-gray-400' : 'bg-gray-700 text-white border border-purple-600'}`}>
      <div className="flex-shrink-0 mr-3">
        <img src={notification.fromPhotoURL || '/default-avatar.png'} alt={notification.fromDisplayName} 
        className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"/>
      </div>
      <div className="flex-grow">
        <div className="flex items-center mb-1">
          {icon}
          <span className="ml-2 text-sm text-gray-400">{notificationDate.toLocaleString()}</span>
        </div>
        <p className="text-sm leading-snug">
          {message}
        </p>
        <button onClick={handleNotificationClick} className="mt-2 text-purple-400 hover:underline text-xs">
          {notification.read ? 'Visualizado' : 'Marcar como lido'}
        </button>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para ver suas notificações.');
      router.push('/auth/login');
      return;
    }

    setLoadingNotifications(true);
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(fetchedNotifications);
      setLoadingNotifications(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações.');
      setLoadingNotifications(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);

  const handleMarkAsRead = async (notificationId) => {
    if (!user) return;
    try {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      toast.success('Notificação marcada como lida!');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erro ao marcar notificação como lida.');
    }
  };

  if (authLoading || loadingNotifications) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-white text-lg">Carregando notificações...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col lg:flex-row w-full min-h-screen bg-gray-950 text-white'>
      <Sidebar />
      <main className='flex-grow p-4 md:p-8 lg:ml-72'>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Suas Notificações</h1>

          {notifications.length === 0 ? (
            <p className="text-gray-400 text-center p-8 bg-gray-800 rounded-lg shadow-md">
              Você não tem nenhuma notificação ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;