'use client';
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc, increment, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Send, Loader2, Heart, MessageCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Novo sub-componente para item de comentário individual para gerenciar seu próprio estado de like
const CommentItem = ({ comment, postId, currentUserId, postAuthorId, onDelete, onLike, onReply }) => {
  const [isCommentLiked, setIsCommentLiked] = useState(false);
  const [localCommentLikesCount, setLocalCommentLikesCount] = useState(comment.likes || 0);

  const isCommentAuthor = currentUserId === comment.authorId;
  const isPostAuthor = currentUserId === postAuthorId;
  const canDelete = isCommentAuthor || isPostAuthor;

  useEffect(() => {
    const checkCommentLikeStatus = async () => {
      if (!currentUserId || !comment.id || !postId) return;

      const likeDocRef = doc(db, 'posts', postId, 'comments', comment.id, 'likes', currentUserId);
      try {
        const likeDocSnap = await getDoc(likeDocRef);
        setIsCommentLiked(likeDocSnap.exists());
      } catch (error) {
        console.error('Error checking comment like status:', error);
      }
    };
    checkCommentLikeStatus();
    setLocalCommentLikesCount(comment.likes || 0);
  }, [comment.id, postId, currentUserId, comment.likes]);

  const handleLikeClick = async () => {
    await onLike(comment, postId);
    setLocalCommentLikesCount(prev => isCommentLiked ? prev - 1 : prev + 1);
    setIsCommentLiked(prev => !prev);
  };

  return (
    <div className="bg-gray-700 p-3 rounded-lg flex items-start space-x-3">
      <Link href={`/profile/${comment.authorId}`}>
        <img
          src={comment.authorPhotoURL || '/default-avatar.png'}
          alt={comment.authorDisplayName}
          className="w-8 h-8 rounded-full object-cover border border-purple-500"
        />
      </Link>
      <div className="flex-1">
        <div className="flex items-baseline space-x-1">
          <Link href={`/profile/${comment.authorId}`} className="font-bold text-white hover:text-purple-400 text-sm">
            {comment.authorDisplayName}
          </Link>
          <span className="text-gray-400 text-xs">@{comment.authorHandle}</span>
          <span className="text-gray-500 text-xs">&bull; {comment.createdAt.toLocaleString()}</span>
        </div>
        {comment.replyToAuthorHandle && (
          <p className="text-gray-400 text-xs mt-1">
            Respondendo a <Link href={`/profile/${comment.replyToCommentId ? comment.replyToCommentId.split('_')[0] : '#'}`} className="text-purple-300 hover:underline">@{comment.replyToAuthorHandle}</Link>
          </p>
        )}
        <p className="text-gray-300 text-sm mt-1 leading-snug">{comment.content}</p>
        <div className="flex items-center text-gray-400 text-xs mt-2 space-x-3">
          <button
            onClick={handleLikeClick}
            className={`flex items-center transition-colors duration-200 ${isCommentLiked ? 'text-red-400' : 'hover:text-red-300'}`}
          >
            <Heart size={14} className={`mr-1 ${isCommentLiked ? 'fill-current' : ''}`} /> {localCommentLikesCount}
          </button>
          <button
            onClick={() => onReply(comment.id, comment.authorHandle)}
            className="flex items-center hover:text-blue-300 transition-colors duration-200"
          >
            <MessageCircle size={14} className="mr-1" /> Responder
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center hover:text-red-500 transition-colors duration-200 ml-auto"
            >
              <Trash2 size={14} className="mr-1" /> Deletar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentSection = ({ postId, postAuthorId, onCommentAdded }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (!postId) return;

    setLoadingComments(true);
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000) : new Date(),
      }));
      setComments(fetchedComments);
      setLoadingComments(false);
    }, (error) => {
      console.error('Error fetching comments:', error);
      toast.error('Erro ao carregar comentários.');
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para comentar.');
      return;
    }
    if (!newCommentText.trim()) {
      toast.error('O comentário não pode estar vazio.');
      return;
    }

    setSubmittingComment(true);
    try {
      const commentData = {
        authorId: user.uid,
        authorDisplayName: user.displayName || user.email.split('@')[0],
        authorHandle: user.handle || (user.email ? user.email.split('@')[0] : 'usuario'),
        authorPhotoURL: user.photoURL || '/default-avatar.png',
        content: newCommentText.trim(),
        createdAt: Timestamp.now(),
        likes: 0,
      };

      if (replyingTo) {
        commentData.replyToCommentId = replyingTo.commentId;
        commentData.replyToAuthorHandle = replyingTo.authorHandle;
      }

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: increment(1)
      });

      setNewCommentText('');
      setReplyingTo(null);
      toast.success('Comentário adicionado!');
      if (onCommentAdded) {
        onCommentAdded();
      }

      // Gerar Notificação de Comentário
      // Notificar o autor do post
      if (user.uid !== postAuthorId) { // Não notificar se o comentador é o próprio autor do post
        await addDoc(collection(db, 'users', postAuthorId, 'notifications'), {
          type: 'comment_post',
          fromUserId: user.uid,
          fromDisplayName: user.displayName,
          fromHandle: user.handle,
          fromPhotoURL: user.photoURL,
          toUserId: postAuthorId,
          postId: postId,
          commentContent: commentData.content.substring(0, 50) + (commentData.content.length > 50 ? '...' : ''), // Snippet do comentário
          read: false,
          createdAt: Timestamp.now(),
        });
      }
      // Se for uma resposta, notificar o autor do comentário original
      if (replyingTo && user.uid !== replyingTo.authorId) {
        // Você precisaria do UID do autor do comentário original.
        // Para simplificar, vou assumir que replyingTo.commentId pode ser usado para buscar
        // o UID do autor do comentário original, ou que ele já está em replyingTo.authorId
        // Se replyingTo.authorId é apenas o handle, você precisaria do UID real.
        // Por agora, vamos usar o replyingTo.commentId para inferir o UID do autor do comentário original.
        // Uma solução mais robusta seria passar o UID do autor do comentário para replyingTo.authorId.
        const originalCommentDoc = await getDoc(doc(db, 'posts', postId, 'comments', replyingTo.commentId));
        if (originalCommentDoc.exists()) {
          const originalCommentAuthorId = originalCommentDoc.data().authorId;
          if (user.uid !== originalCommentAuthorId) { // Não notificar se o respondente é o próprio autor do comentário original
            await addDoc(collection(db, 'users', originalCommentAuthorId, 'notifications'), {
              type: 'reply_comment',
              fromUserId: user.uid,
              fromDisplayName: user.displayName,
              fromHandle: user.handle,
              fromPhotoURL: user.photoURL,
              toUserId: originalCommentAuthorId,
              postId: postId,
              commentId: replyingTo.commentId,
              commentContent: commentData.content.substring(0, 50) + (commentData.content.length > 50 ? '...' : ''),
              read: false,
              createdAt: Timestamp.now(),
            });
          }
        }
      }

    } catch (error) {
      console.error('Error adding comment or creating notification:', error);
      toast.error('Erro ao adicionar comentário. Tente novamente.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) {
      toast.error('Você precisa estar logado para deletar comentários.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja deletar este comentário?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: increment(-1)
      });

      toast.success('Comentário deletado!');
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Erro ao deletar comentário. Tente novamente.');
    }
  };

  const handleLikeComment = async (comment, currentPostId) => {
    if (!user) {
      toast.error('Você precisa estar logado para curtir comentários.');
      return;
    }

    const commentRef = doc(db, 'posts', currentPostId, 'comments', comment.id);
    const likeDocRef = doc(db, 'posts', currentPostId, 'comments', comment.id, 'likes', user.uid);

    try {
      if (comment.id === 'undefined') { // Safety check for comment.id
        console.error("Comment ID is undefined, cannot process like.");
        toast.error("Erro: ID do comentário ausente.");
        return;
      }

      const likeDocSnap = await getDoc(likeDocRef);
      if (likeDocSnap.exists()) {
        // Descurtir o comentário
        await deleteDoc(likeDocRef);
        await updateDoc(commentRef, {
          likes: increment(-1)
        });
        toast.success('Você descurtiu o comentário.');
      } else {
        // Curtir o comentário
        await setDoc(likeDocRef, {
          userId: user.uid,
          timestamp: new Date()
        });
        await updateDoc(commentRef, {
          likes: increment(1)
        });
        toast.success('Você curtiu o comentário!');

        // Gerar Notificação de Curtida de Comentário
        // Não notificar se o autor do like é o próprio autor do comentário
        if (user.uid !== comment.authorId) {
          await addDoc(collection(db, 'users', comment.authorId, 'notifications'), {
            type: 'like_comment',
            fromUserId: user.uid,
            fromDisplayName: user.displayName,
            fromHandle: user.handle,
            fromPhotoURL: user.photoURL,
            toUserId: comment.authorId,
            postId: currentPostId,
            commentId: comment.id,
            commentContent: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error toggling comment like or creating notification:', error);
      toast.error('Erro ao curtir/descurtir o comentário. Tente novamente.');
    }
  };

  const handleReplyClick = (commentId, authorHandle) => {
    setReplyingTo({ commentId, authorHandle });
    setNewCommentText(`@${authorHandle} `);
    document.getElementById('comment-input-textarea')?.focus();
  };

  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <h4 className="text-lg font-semibold text-white mb-4">Comentários ({comments.length})</h4>

      {loadingComments ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-purple-400 mr-2" size={20} />
          <span className="text-gray-400">Carregando comentários...</span>
        </div>
      ) : (
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                currentUserId={user?.uid}
                postAuthorId={postAuthorId}
                onDelete={handleDeleteComment}
                onLike={handleLikeComment}
                onReply={handleReplyClick}
              />
            ))
          )}
        </div>
      )}

      {user && (
        <form onSubmit={handleAddComment} className="mt-4 flex items-center space-x-3">
          <textarea
            id="comment-input-textarea"
            className="flex-1 p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 transition duration-200 resize-none"
            rows="1"
            placeholder={replyingTo ? `Respondendo a @${replyingTo.authorHandle}...` : "Escreva um comentário..."}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={submittingComment}
            style={{ minHeight: '40px', maxHeight: '100px' }}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold p-2 rounded-full transition duration-200 disabled:opacity-50 flex items-center justify-center"
            disabled={submittingComment}
          >
            {submittingComment ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      )}
    </div>
  );
};

export default CommentSection;