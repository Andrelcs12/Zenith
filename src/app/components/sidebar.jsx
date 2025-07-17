'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageSquare, Users, User as UserIcon, LogOut, PlusSquare, Rss, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadNotificationsCount(0);
      return;
    }

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      console.error('Error fetching unread notifications count:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const isActive = (path) => pathname === path;

  return (
    <div className='w-72 sticky p-4 h-screen bg-gray-900 border-r border-gray-700 flex flex-col top-0'>
      {/* Logo/Brand */}
      <div className="mb-10 mt-4">
        <h1 className='font-extrabold text-5xl text-purple-500 text-center'>Zenith</h1>
      </div>

      {/* User Profile Section (clickable to profile page) */}
      {user && (
        <Link href={`/profile/${user?.uid}`} className='cursor-pointer block'>
          <div className="mb-10 p-4 bg-gray-800 hover:bg-gray-700 transition duration-200 rounded-lg shadow-inner flex items-center space-x-3">
            <img
              src={user.photoURL || '/default-avatar.png'}
              alt="User Avatar"
              className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white leading-tight">{user.displayName || 'Seu Nome'}</span>
              <span className="text-sm text-gray-400">
                @{user.handle || (user.email ? user.email.split('@')[0] : 'usuario')}
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Main Navigation */}
      <nav className="flex-grow">
        <ul className="space-y-3">
          <li>
            <Link href="/pages/feed" className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors duration-200 ${isActive('/feed') ? 'bg-gray-700 text-purple-400' : 'text-gray-300 hover:bg-gray-700 hover:text-purple-400'}`}>
              <Home size={20} /> Feed
            </Link>
          </li>
          <li>
            <Link href="/pages/conversations" className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors duration-200 ${isActive('/conversations') ? 'bg-gray-700 text-purple-400' : 'text-gray-300 hover:bg-gray-700 hover:text-purple-400'}`}>
              <MessageSquare size={20} /> Conversas
            </Link>
          </li>
          <li>
            <Link href="/communities" className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors duration-200 ${isActive('/communities') ? 'bg-gray-700 text-purple-400' : 'text-gray-300 hover:bg-gray-700 hover:text-purple-400'}`}>
              <Users size={20} /> Comunidades
            </Link>
          </li>
          <li>
            <Link href="/notifications" className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors duration-200 ${isActive('/notifications') ? 'bg-gray-700 text-purple-400' : 'text-gray-300 hover:bg-gray-700 hover:text-purple-400'}`}>
              <Bell size={20} /> Notificações
              {unreadNotificationsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      {/* Botão Criar Post */}
      <div className="mt-8 mb-4">
        <button
          onClick={() => router.push('/create-post')}
          className="w-full cursor-pointer flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-md"
        >
          <PlusSquare size={20} /> Criar Post
        </button>
      </div>

      {/* Botão Sair */}
      <div className="mt-auto pt-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center cursor-pointer justify-center gap-3 p-3 rounded-lg text-red-400 hover:bg-gray-700 hover:text-red-500 transition-colors duration-200 font-medium"
        >
          <LogOut size={20} /> Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;