'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { Github, Chrome, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, createUserWithEmailAndPassword,} from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from '../../lib/firebase';
import Link from "next/link"; 

const CadastroPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/'); 
      toast.success("Login realizados com sucesso!");
    }
  }, [user, authLoading, router]);

  const validarSenha = (password) => {
    if (password.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    return null; 
  };

  const handleCadastro = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const passwordError = validarSenha(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Erro ao criar conta:", error);

      let errorMessage = 'Erro ao criar conta.';
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este e-mail já está em uso.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "O formato do e-mail é inválido.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "A senha é muito fraca.";
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
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 text-center">Junte-se à <span className="text-purple-600">Zenith</span> </h1>
        <p className="text-gray-400 text-sm md:text-base text-center mb-8"> Crie sua conta e comece sua jornada agora mesmo. </p>

        <form onSubmit={handleCadastro} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 pl-10 rounded-lg bg-gray-700 text-white text-sm md:text-base border border-gray-700 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 transition duration-200" 
            aria-label="Email" required disabled={loading}
              />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pl-10 rounded-lg bg-gray-700 text-white text-sm md:text-base border border-gray-700 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 transition duration-200"
              aria-label="Password"  required  disabled={loading}
              />
          </div>

          <button type="submit"  disabled={loading} className="w-full cursor-pointer bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold py-3 px-4 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2">
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Cadastrando...
              </div>
            ) : (
              <>
                <UserPlus size={20} /> Cadastrar
              </>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400 text-sm md:text-base">Ou entre com</span>
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => handleSocialLogin("google")} className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 cursor-pointer text-white font-bold py-3 px-4 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            disabled={loading} >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Chrome size={20} /> Entrar com Google
              </>
            )}
          </button>
          <button onClick={() => handleSocialLogin("github")} className="w-full bg-gray-700 hover:bg-gray-600 active:bg-gray-900 cursor-pointer text-white font-bold py-3 px-4 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg" disabled={loading} >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Github size={20} /> Entrar com GitHub
              </>
            )}
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Já tem uma conta?{' '}
          <Link href="/auth/login" className="text-purple-500 cursor-pointer hover:text-purple-400 font-bold focus:outline-none flex items-center justify-center gap-1 mx-auto mt-2 text-sm md:text-base">
            <LogIn size={16} /> Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CadastroPage;