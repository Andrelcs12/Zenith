// src/app/page.js
'use client'; // Indica que este é um Client Component

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../app/contexts/AuthContext'; // Hook para acessar o contexto de autenticação
import toast from 'react-hot-toast'; // Para mensagens de feedback

const HomePage = () => {
  const { user, loading: authLoading } = useAuth(); // Obtém o usuário e o estado de carregamento do AuthContext
  const router = useRouter();

  // Efeito para lidar com a proteção da rota e redirecionamento
  useEffect(() => {
    // Se o estado de autenticação ainda está carregando, não faça nada ainda
    if (authLoading) {
      return;
    }

    // Se não houver usuário logado (user é null), redireciona para a página de cadastro
    if (!user) {
      toast.error('Você precisa estar logado para acessar esta página.');
      router.push('/auth/cadastro'); // Redireciona para a página de cadastro
      return; // Importante para parar a execução após o redirecionamento
    }

    // Se houver um usuário logado, redireciona para a página de perfil
    if (user) {
      router.push(`/profile/${user.uid}`); // Redireciona para a página de perfil do usuário
      // Não adicione um toast.success aqui, pois o redirecionamento já implicou sucesso.
      return; // Importante para parar a execução após o redirecionamento
    }

  }, [user, authLoading, router]); // Dependências: user, authLoading e router

  // Exibe um spinner de carregamento enquanto o estado de autenticação está sendo verificado
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-white text-lg">Carregando...</p>
      </div>
    );
  }

  // Se o usuário não estiver logado (e authLoading já terminou), não renderiza nada aqui,
  // pois o useEffect já cuidou do redirecionamento.
  if (!user) {
    return null;
  }

  // Este return só será alcançado se houver um erro na lógica de redirecionamento acima
  // ou se você decidir que esta página deve ter algum conteúdo padrão antes do redirecionamento.
  // Para o comportamento atual de redirecionar para o perfil, este bloco não será renderizado.
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4 text-center">Redirecionando...</h1>
      <p className="text-lg text-center mb-8">Você será redirecionado para o seu perfil.</p>
    </div>
  );
};

export default HomePage;
