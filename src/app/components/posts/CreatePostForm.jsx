'use client';
import React, { useState } from 'react';
import { PlusSquare, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';

const CreatePostForm = ({ onPostCreated }) => {
  const { user } = useAuth(); // Get the current authenticated user
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      toast.success('Image selected!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a post.');
      return;
    }

    if (!content.trim() && !imageFile) {
      toast.error('Post cannot be empty. Please write something or add an image.');
      return;
    }

    setLoading(true);
    let imageUrl = null;

    try {
      // 1. Upload image to Firebase Storage if exists
      if (imageFile) {
        const imageRef = ref(storage, `posts/${user.uid}/${imageFile.name}_${Date.now()}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
        toast.success('Image uploaded successfully!');
      }

      // 2. Create post document in Firestore
      const newPost = {
        authorId: user.uid,
        authorDisplayName: user.displayName || user.email.split('@')[0],
        authorHandle: user.handle || (user.email ? user.email.split('@')[0] : 'usuario'),
        authorPhotoURL: user.photoURL || '/default-avatar.png',
        content: content.trim(),
        imageUrl: imageUrl,
        likes: 0,
        comments: 0,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'posts'), newPost);
      toast.success('Post created successfully!');

      // Clear form
      setContent('');
      setImageFile(null);

      // Notify parent component (FeedPage) that a new post was created
      if (onPostCreated) {
        onPostCreated();
      }

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8 border border-gray-700">
      <h2 className=" text-base md:text-lg font-semibold text-white mb-4">O que você está pensando?</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-3 rounded-lg text-sm md:text-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 transition duration-200 resize-y"
          rows="3"
          placeholder="Compartilhe suas ideias, projetos ou perguntas..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        ></textarea>

        {imageFile && (
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded-lg">
            <span className="text-gray-300 text-sm">{imageFile.name}</span>
            <button
              type="button"
              onClick={() => setImageFile(null)}
              className="text-red-400 hover:text-red-500 text-sm"
              disabled={loading}
            >
              Remover
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <label htmlFor="image-upload" className="flex items-center gap-2 px-4 text-sm md:text-lg py-2 bg-gray-700 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600 transition duration-200">
            <ImageIcon size={20} />
            Adicionar Imagem
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={loading}
            />
          </label>

        

          <button
            type="submit"
            className="flex items-center text-sm md:text-lg justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <PlusSquare size={20} />}
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm;
