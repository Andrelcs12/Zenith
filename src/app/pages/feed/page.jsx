'use client';
import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/sidebar';
import CreatePostForm from '../../components/posts/CreatePostForm';
import PostCard from '../../components/posts/PostCard';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc as firestoreDoc, where } from 'firebase/firestore';

const FeedPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedType, setFeedType] = useState('following'); // 'following' ou 'forYou'
  const [hasFollowedUsers, setHasFollowedUsers] = useState(false); // Indica se o usuário segue alguém (para o feed 'Seguindo')

  // Função para buscar posts do Firestore com base no tipo de feed
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      if (!user) { // Garante que o usuário esteja disponível antes de buscar
        setLoadingPosts(false);
        return;
      }

      let q;
      if (feedType === 'following') {
        // 1. Obter a lista de usuários que o usuário atual está seguindo
        const followingRef = collection(db, 'users', user.uid, 'following');
        const followingSnapshot = await getDocs(followingRef);
        const followedUserIds = followingSnapshot.docs.map(doc => doc.id);

        if (followedUserIds.length === 0) {
          setPosts([]); // Nenhum post se não estiver seguindo ninguém
          setHasFollowedUsers(false); // Define que não segue ninguém
          setLoadingPosts(false);
          return;
        }

        setHasFollowedUsers(true); // O usuário segue pelo menos uma pessoa

        // A consulta 'in' do Firestore tem um limite de 10 itens.
        // Se precisar seguir mais de 10 usuários e mostrar todos os posts,
        // seria necessária uma estratégia mais complexa (ex: múltiplas consultas e fusão,
        // ou uma geração de "feed" no lado do servidor).
        const maxFollowedUsersForQuery = 10;
        const usersToQuery = followedUserIds.slice(0, maxFollowedUsersForQuery);

        // 2. Consultar posts dos usuários seguidos
        q = query(
          collection(db, "posts"),
          where("authorId", "in", usersToQuery), // Filtrar por autores que o usuário segue
          orderBy("createdAt", "desc")
        );
      } else { // feedType === 'forYou'
        setHasFollowedUsers(true); // Não relevante para 'Para Você', assume que sempre há posts
        // Consultar todos os posts para o feed "Para Você"
        q = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc")
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetchedPosts);

    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Erro ao carregar o feed. Tente novamente.");
    } finally {
      setLoadingPosts(false);
    }
  };

  // Função para lidar com a exclusão de posts
  const handleDeletePost = async (postId) => {
    try {
      await deleteDoc(firestoreDoc(db, 'posts', postId));
      toast.success('Post deletado com sucesso!');
      fetchPosts(); // Buscar posts novamente após a exclusão
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      toast.error('Erro ao deletar post. Tente novamente.');
    }
  };

  // Efeito para buscar posts sempre que o usuário ou o tipo de feed mudar
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para ver o feed.');
      router.push('/auth/login');
      return;
    }

    fetchPosts();
  }, [user, authLoading, router, feedType]); // Re-executa quando o usuário ou o tipo de feed muda

  if (authLoading || loadingPosts) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-white text-lg">Carregando feed...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col lg:flex-row w-full min-h-screen bg-gray-950 text-white'>
      <Sidebar />
      <main className='flex-grow p-4 md:p-8 lg:ml-72'>
        <div className="max-w-4xl mx-auto">
          {/* Título do Feed */}
          <h1 className="text-3xl font-bold text-white mb-8">
            {feedType === 'following' ? 'Seu Feed (Seguindo)' : 'Feed Para Você'}
          </h1>

          {/* Seletor de Feed */}
          <div className="mb-8 flex justify-center space-x-4">
            <button
              onClick={() => setFeedType('following')}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200
                ${feedType === 'following' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Seguindo
            </button>
            <button
              onClick={() => setFeedType('forYou')}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200
                ${feedType === 'forYou' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Para Você
            </button>
          </div>

          <CreatePostForm onPostCreated={fetchPosts} />

          {/* Renderização Condicional do Feed */}
          {feedType === 'following' && !hasFollowedUsers ? (
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-md">
              <p className="text-gray-300 text-lg mb-4">
                Seu feed "Seguindo" está vazio porque você ainda não segue ninguém.
              </p>
              <p className="text-gray-400 mb-6">
                Comece a seguir outros usuários para ver as postagens deles aqui!
              </p>
              <button
                onClick={() => router.push('/communities')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                Descobrir Usuários
              </button>
            </div>
          ) : (
            posts.length === 0 ? (
              <p className="text-gray-400 text-center">
                {feedType === 'following' ? 'Nenhuma postagem dos usuários que você segue ainda.' : 'Nenhuma postagem disponível no momento.'}
              </p>
            ) : (
              <div>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.uid}
                    onDelete={handleDeletePost}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default FeedPage;
