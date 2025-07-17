"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let profileData = {};
        if (userDocSnap.exists()) {
          profileData = userDocSnap.data();
        } else {
          // If profile doesn't exist, create it with initial values
          const initialProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            handle: firebaseUser.email ? firebaseUser.email.split('@')[0] : '', // Default handle from email
            photoURL: firebaseUser.photoURL || '',
            bio: '',
            githubProfile: '',
            linkedinProfile: '',
            skills: [],
            followers: 0,
            following: 0,
            createdAt: Date.now(),
          };
          await setDoc(userDocRef, initialProfile);
          profileData = initialProfile;
        }

        // Merge Firebase Auth user data with Firestore profile data
        // Explicitly prioritize Firestore data for display-related fields
        setUser({
          ...firebaseUser, // Basic Firebase Auth data
          ...profileData,  // Custom fields from Firestore
          // Override default Firebase Auth fields with Firestore data if available
          photoURL: profileData.photoURL || firebaseUser.photoURL || '/default-avatar.png',
          displayName: profileData.displayName || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Seu Nome'),
          // AQUI ESTÁ A LINHA CRÍTICA: Garanta que o handle do Firestore seja usado se existir
          handle: profileData.handle || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'usuario'),
        });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user?.uid) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        setUser(prevUser => ({
          ...prevUser,
          ...profileData,
          photoURL: profileData.photoURL || prevUser.photoURL || '/default-avatar.png',
          displayName: profileData.displayName || prevUser.displayName || (prevUser.email ? prevUser.email.split('@')[0] : 'Seu Nome'),
          // AQUI ESTÁ A LINHA CRÍTICA NO REFRESH: Garanta que o handle do Firestore seja usado
          handle: profileData.handle || (prevUser.email ? prevUser.email.split('@')[0] : 'usuario'),
        }));
      }
    }
  };

  const value = { user, loading, login, logout, refreshUserProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
