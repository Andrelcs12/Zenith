
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Lock, LogIn, Github, Chrome, UserPlus } from 'lucide-react'; 

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/'); 
      toast.success('Login realizado com sucesso!');
    }
  }, [user, authLoading, router]);

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
    } catch (error) {
      console.error('Erro ao fazer login com e-mail/senha:', error);
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Formato de e-mail inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerName) => {
    setLoading(true);
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'github') {
        provider = new GithubAuthProvider();
      } else {
        throw new Error('Provedor de autenticação inválido.');
      }

      await signInWithPopup(auth, provider);
      
    } catch (error) {
      console.error(`Erro ao fazer login com ${providerName}:`, error);
      let errorMessage = `Erro ao fazer login com ${providerName}.`;
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelado pelo usuário.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Já existe uma conta com este e-mail usando outro método de login.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Requisição de popup cancelada. Tente novamente.";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex gap-4 items-center justify-center min-h-screen bg-gray-900">
        <h1 className="text-white font-semibold">AGUARDE...</h1>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-black p-4 font-sans antialiased">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
        <h1 className="text-4xl font-extrabold text-white text-center mb-8">
          Bem-vindo de volta à <span className="text-purple-600">Zenith</span>
        </h1>

        <form onSubmit={handleEmailPasswordLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="email" id="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="shadow-sm appearance-none border border-gray-700 rounded-lg w-full py-3 pl-10 pr-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-200"
                disabled={loading} />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="password" id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="shadow-sm appearance-none border border-gray-700 rounded-lg w-full py-3 pl-10 pr-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-200"
                disabled={loading}
              />
            </div>
          </div>
          <button type="submit" className="w-full cursor-pointer bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg" disabled={loading}>
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn size={20} /> Entrar
              </>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">Ou continue com</span>
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => handleSocialLogin('google')} className="w-full cursor-pointer bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            disabled={loading}>
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Chrome size={20} /> Entrar com Google
              </>
            )}
          </button>
          <button onClick={() => handleSocialLogin('github')} className="w-full cursor-pointer bg-gray-700 hover:bg-gray-600 active:bg-gray-900 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            disabled={loading} >
            {loading ? (
              <div className="animate-spin flex rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Github size={20} /> 
                Entrar com GitHub
              </>
            )}
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8"> Não tem uma conta?{' '}
          <Link href="/auth/cadastro"
            className="text-purple-500 cursor-pointer hover:text-purple-400 font-bold focus:outline-none flex items-center justify-center gap-1 mx-auto mt-2">
            <UserPlus size={16} /> Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
