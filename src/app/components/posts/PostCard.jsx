'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { doc, updateDoc, getDoc, collection, setDoc, deleteDoc, increment, addDoc, Timestamp } from 'firebase/firestore'; // Import addDoc, Timestamp
import CommentSection from './CommentSection';

const PostCard = ({ post, currentUserId, onDelete }) => {
  const postDate = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000) : new Date();
  const isAuthor = currentUserId === post.authorId;

  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes || 0);

  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments || 0);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!currentUserId || !post.id) return;
      const likeDocRef = doc(db, 'posts', post.id, 'likes', currentUserId);
      try {
        const likeDocSnap = await getDoc(likeDocRef);
        setIsLiked(likeDocSnap.exists());
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    checkLikeStatus();
    setLocalLikesCount(post.likes || 0);
    setLocalCommentsCount(post.comments || 0);
  }, [post.id, currentUserId, post.likes, post.comments]);

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado para curtir um post.');
      return;
    }

    const postRef = doc(db, 'posts', post.id);
    const likeDocRef = doc(db, 'posts', post.id, 'likes', currentUserId);

    try {
      if (isLiked) {
        // Descurtir o post
        await deleteDoc(likeDocRef);
        await updateDoc(postRef, {
          likes: increment(-1)
        });
        setIsLiked(false);
        setLocalLikesCount(prevCount => prevCount - 1);
        toast.success('Você descurtiu o post.');
      } else {
        // Curtir o post
        await setDoc(likeDocRef, {
          userId: currentUserId,
          timestamp: new Date()
        });
        await updateDoc(postRef, {
          likes: increment(1)
        });
        setIsLiked(true);
        setLocalLikesCount(prevCount => prevCount + 1);
        toast.success('Você curtiu o post!');

        // Gerar Notificação de Curtida de Post
        // Não notificar se o autor do like é o próprio autor do post
        if (currentUserId !== post.authorId) {
          await addDoc(collection(db, 'users', post.authorId, 'notifications'), {
            type: 'like_post',
            fromUserId: currentUserId,
            fromDisplayName: post.authorDisplayName, // Usar o displayName do autor do post como base para o notificador
            fromHandle: post.authorHandle, // Usar o handle do autor do post como base para o notificador
            fromPhotoURL: post.authorPhotoURL, // Usar a foto do autor do post como base para o notificador
            toUserId: post.authorId,
            postId: post.id,
            postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''), // Snippet do conteúdo
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error toggling like or creating notification:', error);
      toast.error('Erro ao curtir/descurtir o post. Tente novamente.');
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Tem certeza que deseja deletar este post? Esta ação é irreversível.')) {
      onDelete(post.id);
    }
  };

  const handleCommentAdded = () => {
    setLocalCommentsCount(prevCount => prevCount + 1);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <Link href={`/profile/${post.authorId}`} className="flex items-center">
          <img
            src={post.authorPhotoURL || '/default-avatar.png'}
            alt={post.authorDisplayName}
            className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-purple-500"
          />
          <div>
            <span className="font-bold text-white hover:text-purple-400 transition-colors duration-200 block">
              {post.authorDisplayName}
            </span>
            <p className="text-gray-400 text-sm">@{post.authorHandle} &bull; {postDate.toLocaleString()}</p>
          </div>
        </Link>
        {isAuthor && (
          <button
            onClick={handleDeleteClick}
            className="ml-auto text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-full hover:bg-gray-700"
            title="Deletar Post"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      <p className="text-gray-300 mb-4 leading-relaxed">{post.content}</p>
      {post.imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-700">
          <img src={post.imageUrl} alt="Post image" className="w-full h-auto object-cover" />
        </div>
      )}
      <div className="flex items-center text-gray-400 text-sm">
        <button
          onClick={handleLikeToggle}
          className={`flex items-center mr-4 transition-colors duration-200 ${isLiked ? 'text-red-500' : 'hover:text-red-400'}`}
        >
          <Heart size={18} className={`mr-1 ${isLiked ? 'fill-current' : ''}`} /> {localLikesCount}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center mr-4 hover:text-blue-400 transition-colors duration-200"
        >
          <MessageCircle size={18} className="mr-1" /> {localCommentsCount}
        </button>
        <button className="flex items-center hover:text-green-400 transition-colors duration-200">
          <Share2 size={18} className="mr-1" /> Compartilhar
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          postAuthorId={post.authorId}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
};

export default PostCard;
