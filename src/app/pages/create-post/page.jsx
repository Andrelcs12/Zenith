'use client';
import React from 'react';
import Sidebar from '../../components/sidebar'; // Ajuste o caminho se necessário
import CreatePostForm from '../../components/posts/CreatePostForm'; // Importe o componente de formulário
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CreatePostPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Função de callback para ser executada após o post ser criado
  const handlePostCreated = () => {
    toast.success('Post criado com sucesso! Redirecionando para o Feed...');
    router.push('/pages/feed'); // Redireciona para o feed após a criação do post
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-white text-lg">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    toast.error('Você precisa estar logado para criar um post.');
    router.push('/auth/login');
    return null; // Não renderiza nada se não estiver logado
  }

  return (
    <div className='flex flex-col lg:flex-row w-full min-h-screen bg-gray-950 text-white'>
      <Sidebar />
      <main className='flex-grow p-4 md:p-8 lg:ml-72'>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Criar Nova Postagem</h1>
          <CreatePostForm onPostCreated={handlePostCreated} />
        </div>
      </main>
    </div>
  );
};

export default CreatePostPage;
