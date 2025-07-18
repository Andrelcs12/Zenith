'use client';
import Sidebar from "../../components/sidebar.jsx";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, deleteDoc, writeBatch, updateDoc, increment, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Camera, Save, Loader2, User as UserIcon, Github, Linkedin, Users, Rss, Image as ImageIcon, MapPin, Heart, MessageCircle, Share2, Trash2, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';
import PostCard from "../../components/posts/PostCard.jsx"
const ConfirmationModal = ({ show, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 max-w-sm w-full">
        <p className="text-white text-lg mb-6 text-center">{message}</p>
        <div className="flex justify-center gap-4">
          <button onClick={onConfirm} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
            {confirmText}
          </button>
          <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

<PostCard />


const ProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const profileUid = params.uid;

  const { user: currentUser, loading: authLoading, refreshUserProfile } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [githubProfile, setGithubProfile] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [skills, setSkills] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [userPosts, setUserPosts] = useState([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalActionCallback, setModalActionCallback] = useState(null);
  const [lastHandleChangeAt, setLastHandleChangeAt] = useState(null); 

  const fetchUserPosts = async (uid) => {
    setLoadingUserPosts(true);
    try {
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const postsSnapshot = await getDocs(postsQuery);
      const fetchedPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      toast.error('Erro ao carregar posts do usuário.');
    } finally {
      setLoadingUserPosts(false);
    }
  };

  useEffect(() => {
    if (authLoading || !profileUid) {
      return;
    }

    if (!currentUser) {
      toast.error('Você precisa estar logado para ver esta página.');
      router.push('/auth/login');
      return;
    }

    const fetchUserProfileAndStatus = async () => {
      const userDocRef = doc(db, 'users', profileUid);

      try {
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setProfileUser(userData);
          setDisplayName(userData.displayName || '');
          setHandle(userData.handle || '');
          setBio(userData.bio || '');
          setGithubProfile(userData.githubProfile || '');
          setLinkedinProfile(userData.linkedinProfile || '');
          setSkills(Array.isArray(userData.skills) ? userData.skills.join(', ') : userData.skills || '');
          setFollowers(userData.followers || 0);
          setFollowing(userData.following || 0);
          setLastHandleChangeAt(userData.lastHandleChangeAt || null);

          if (currentUser && currentUser.uid !== profileUid) {
            const followDocRef = doc(db, 'users', currentUser.uid, 'following', profileUid);
            const followDocSnap = await getDoc(followDocRef);
            setIsFollowing(followDocSnap.exists());
          } else {
            setIsFollowing(false);
          }

          fetchUserPosts(profileUid);
        } else {
          if (currentUser && profileUid === currentUser.uid) {
            const initialProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              handle: currentUser.email ? currentUser.email.split('@')[0] : '',
              photoURL: currentUser.photoURL || '',
              bio: '',
              githubProfile: '',
              linkedinProfile: '',
              skills: [],
              followers: 0,
              following: 0,
              createdAt: Date.now(),
              lastHandleChangeAt: Timestamp.now(), 
            };
            await setDoc(userDocRef, initialProfile);
            setProfileUser(initialProfile);
            setDisplayName(initialProfile.displayName || '');
            setHandle(initialProfile.handle || '');
            setBio(initialProfile.bio || '');
            setGithubProfile(initialProfile.githubProfile || '');
            setLinkedinProfile(initialProfile.linkedinProfile || '');
            setSkills(initialProfile.skills.join(', ') || '');
            setLastHandleChangeAt(initialProfile.lastHandleChangeAt); 
            toast.success('Your profile was created on Firestore!');
            refreshUserProfile();
            fetchUserPosts(profileUid);
          } else {
            toast.error('User profile not found.');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error fetching profile from Firestore:', error);
        toast.error('Error loading profile. Check your connection and Firestore rules.');
      }
    };

    fetchUserProfileAndStatus();
  }, [profileUid, currentUser, authLoading, router, refreshUserProfile]);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      toast.success('Image selected! Click "Save Profile" to upload.');
    }
  };

  const performSaveProfile = async () => {
    setSavingProfile(true);
    let newPhotoURL = profileUser?.photoURL;
    const oldHandle = profileUser?.handle;
    const oldDisplayName = profileUser?.displayName;
    let updateHandleTimestamp = false;

    try {
      if (imageFile) {
        setUploading(true);
        const storageRef = ref(storage, `profile_pictures/${currentUser.uid}/${imageFile.name}`);
        const uploadTask = await uploadBytes(storageRef, imageFile);
        newPhotoURL = await getDownloadURL(uploadTask.ref);
        setUploading(false);
        toast.success('Profile picture updated!');
      }

      const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill !== '');

      const profileUpdateData = {
        displayName: displayName,
        handle: handle,
        bio: bio,
        photoURL: newPhotoURL,
        githubProfile: githubProfile,
        linkedinProfile: linkedinProfile,
        skills: skillsArray,
      };

      if (handle !== oldHandle) {
        profileUpdateData.lastHandleChangeAt = Timestamp.now();
        updateHandleTimestamp = true;
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, profileUpdateData, { merge: true });

      setProfileUser(prev => prev ? {
        ...prev,
        displayName,
        handle,
        bio,
        photoURL: newPhotoURL,
        githubProfile,
        linkedinProfile,
        skills: skillsArray,
        ...(updateHandleTimestamp && { lastHandleChangeAt: profileUpdateData.lastHandleChangeAt }) 
      } : null);

      setIsEditing(false);
      toast.success('Profile saved successfully!');
      refreshUserProfile();

      if (handle !== oldHandle || displayName !== oldDisplayName) {
        const batch = writeBatch(db);
        const userPostsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", currentUser.uid)
        );
        const userPostsSnapshot = await getDocs(userPostsQuery);

        userPostsSnapshot.forEach((postDoc) => {
          const postRef = doc(db, 'posts', postDoc.id);
          batch.update(postRef, {
            authorHandle: handle,
            authorDisplayName: displayName
          });
        });
        await batch.commit();
        if (handle !== oldHandle && displayName !== oldDisplayName) {
          toast.success('Handle e Nome de Exibição atualizados em seus posts antigos!');
        } else if (handle !== oldHandle) {
          toast.success('Handle atualizado em seus posts antigos!');
        } else if (displayName !== oldDisplayName) {
          toast.success('Nome de Exibição atualizado em seus posts antigos!');
        }
      }

      fetchUserPosts(profileUid); 
    } catch (error) {
      console.error('Error saving profile or updating old posts:', error);
      toast.error('Erro ao salvar perfil ou atualizar posts. Tente novamente.');
    } finally {
      setSavingProfile(false);
      setUploading(false);
      setShowConfirmModal(false); 
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser || profileUid !== currentUser.uid) {
      toast.error('Você não tem permissão para editar este perfil.');
      return;
    }

    const oldHandle = profileUser?.handle;

    if (handle !== oldHandle) {
      const now = Timestamp.now().toDate();
      const lastChange = lastHandleChangeAt ? lastHandleChangeAt.toDate() : null;
      const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000; // 15 dias em milissegundos

      if (lastChange && (now.getTime() - lastChange.getTime() < fifteenDaysInMs)) {
        const remainingTimeMs = fifteenDaysInMs - (now.getTime() - lastChange.getTime());
        const remainingDays = Math.ceil(remainingTimeMs / (1000 * 60 * 60 * 24));
        toast.error(`Você só pode mudar seu @handle a cada 15 dias. Tente novamente em ${remainingDays} dia(s).`);
        return;
      }

      setModalMessage(`Você está prestes a mudar seu @handle de "@${oldHandle}" para "@${handle}". Esta ação só poderá ser feita novamente após 15 dias. Deseja continuar?`);
      setModalActionCallback(() => performSaveProfile); 
      setShowConfirmModal(true); 
    } else {
      performSaveProfile();
    }
  };

  const handleConfirmDeletePost = (postId) => {
    setModalMessage('Tem certeza que deseja deletar este post? Esta ação é irreversível.');
    setModalActionCallback(() => async () => {
      try {
        await deleteDoc(doc(db, 'posts', postId)); 
        toast.success('Post deletado com sucesso!');
        fetchUserPosts(profileUid); 
      } catch (error) {
        console.error('Erro ao deletar post:', error);
        toast.error('Erro ao deletar post. Tente novamente.');
      } finally {
        setShowConfirmModal(false); 
      }
    });
    setShowConfirmModal(true);
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('Você precisa estar logado para seguir/deixar de seguir.');
      return;
    }
    if (currentUser.uid === profileUid) {
      toast.error('Você não pode seguir a si mesmo.');
      return;
    }

    setFollowLoading(true);
    const batch = writeBatch(db);

    const currentUserFollowingDocRef = doc(db, 'users', currentUser.uid, 'following', profileUid);
    const targetProfileFollowersDocRef = doc(db, 'users', profileUid, 'followers', currentUser.uid);

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetProfileRef = doc(db, 'users', profileUid);

    try {
      if (isFollowing) {

        batch.delete(currentUserFollowingDocRef);
        batch.delete(targetProfileFollowersDocRef);
        batch.update(currentUserRef, { following: increment(-1) });
        batch.update(targetProfileRef, { followers: increment(-1) });
        await batch.commit();
        setIsFollowing(false);
        setFollowers(prev => Math.max(0, prev - 1));
        toast.success(`Você deixou de seguir @${profileUser.handle}`);
      } else {
        batch.set(currentUserFollowingDocRef, {
          followedAt: new Date(),
          userId: profileUid,
          userDisplayName: profileUser.displayName,
          userHandle: profileUser.handle,
          userPhotoURL: profileUser.photoURL
        });
        batch.set(targetProfileFollowersDocRef, {
          followedAt: new Date(),
          userId: currentUser.uid,
          userDisplayName: currentUser.displayName,
          userHandle: currentUser.handle,
          userPhotoURL: currentUser.photoURL
        });
        batch.update(currentUserRef, { following: increment(1) });
        batch.update(targetProfileRef, { followers: increment(1) });
        await batch.commit();
        setIsFollowing(true);
        setFollowers(prev => prev + 1);
        toast.success(`Você está seguindo @${profileUser.handle}`);

        await addDoc(collection(db, 'users', profileUid, 'notifications'), {
          type: 'follow',
          fromUserId: currentUser.uid,
          fromDisplayName: currentUser.displayName,
          fromHandle: currentUser.handle,
          fromPhotoURL: currentUser.photoURL,
          toUserId: profileUid,
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error toggling follow status or creating notification:', error);
      toast.error('Erro ao seguir/deixar de seguir. Tente novamente.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (authLoading || !profileUser || loadingUserPosts) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-white text-lg">Carregando perfil e posts...</p>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.uid === profileUid;

  return (
    <div className='flex md:pl-72 flex-col lg:flex-row w-full min-h-screen bg-gray-950 text-white'>
      <Sidebar />

      <div className='flex flex-grow flex-col lg:flex-row gap-4 lg:gap-8 p-4 md:p-8'>
        <div className='w-full lg:w-2/3 bg-gray-900 my-4 rounded-2xl p-6 shadow-lg'>

          <div className='relative'>
            <div className='w-full rounded-xl bg-gradient-to-r from-purple-700 to-indigo-800 h-52 overflow-hidden flex items-center justify-center'>
              <ImageIcon size={64} className="text-purple-300 opacity-30" />
            </div>

            <div className='absolute -bottom-20 left-6'>
              <div className='relative w-40 h-40 rounded-full border-4 border-gray-900 bg-gray-700 overflow-hidden shadow-lg'>
                <img src={profileUser.photoURL || '/default-avatar.png'} alt="Profile" className="w-full h-full object-cover"/>
                {isOwner && isEditing && (
                  <label htmlFor="profile-image-upload" className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer text-white text-sm transition-opacity duration-200 hover:opacity-75">
                    <Camera size={24} />
                    <input id="profile-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading || savingProfile}/>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className='mt-24 ml-6 md:ml-8 lg:ml-10 pr-6 space-y-6'>
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-6">
    
                <div>
                  <label htmlFor="displayName" className="block text-gray-400 text-sm font-semibold mb-1">Nome</label>
                  <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    disabled={savingProfile || uploading} />
                </div>
               
                <div>
                  <label htmlFor="handle" className="block text-gray-400 text-sm font-semibold mb-1">Handle (@)</label>
                  <input type="text" id="handle" value={handle} onChange={(e) => setHandle(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    disabled={savingProfile || uploading} />
                  {isOwner && profileUser && (handle !== profileUser.handle) && (
                    <p className="text-sm text-gray-500 mt-1">Seu @handle pode ser alterado apenas a cada 15 dias.
                      {lastHandleChangeAt && (
                        ` Última alteração: ${lastHandleChangeAt.toDate().toLocaleDateString()}.`
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="bio" className="block text-gray-400 text-sm font-semibold mb-1">Bio</label>
                  <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows="3"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    disabled={savingProfile || uploading}></textarea>
                </div>
      
                <div>
                  <label htmlFor="skills" className="block text-gray-400 text-sm font-semibold mb-1">Habilidades (separadas por vírgula)</label>
                  <input type="text" id="skills" value={skills} onChange={(e) => setSkills(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    disabled={savingProfile || uploading} />
                </div>

                <div className="flex gap-4 mt-6">
                  <button type="submit"
                    className="flex items-center justify-center cursor-pointer gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                    disabled={savingProfile || uploading} >
                    {savingProfile ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)}
                    className="flex items-center cursor-pointer justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                    disabled={savingProfile || uploading} > Cancelar </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="text-4xl font-extrabold text-white mb-2">{profileUser.displayName}</h1>
                <h2 className="text-xl text-gray-400">@{profileUser.handle}</h2>
                <p className="text-gray-300 mt-4 leading-relaxed">{profileUser.bio || 'Nenhuma biografia disponível.'}</p>

                {profileUser.skills && profileUser.skills.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {profileUser.skills.map((skill, index) => (
                      <span key={index} className="bg-purple-800 text-purple-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-6 mt-6">
                  <div className="text-center flex gap-1 items-center">
                    <Users size={16} className="text-gray-400" />
                    <p className="text-white font-bold">{followers}</p>
                    <p className="text-gray-400 text-sm">Seguidores</p>
                  </div>
                  <div className="text-center flex gap-1 items-center">
                    <Rss size={16} className="text-gray-400" />
                    <p className="text-white font-bold">{following}</p>
                    <p className="text-400 text-sm">Seguindo</p>
                  </div>
                </div>

                <div className="mt-6">
                  {isOwner ? (
                    <button onClick={() => setIsEditing(true)}
                      className="flex cursor-pointer items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                      <UserIcon size={20} /> Editar Perfil
                    </button>
                  ) : (
                    <button onClick={handleFollowToggle}
                      className={`flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50
                        ${isFollowing ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      disabled={followLoading}
                    >
                      {followLoading ? <Loader2 className="animate-spin" size={20} /> : (isFollowing ? <UserMinus size={20} /> : <UserPlus size={20} />)}
                      {followLoading ? (isFollowing ? 'Deixando de Seguir...' : 'Seguindo...') : (isFollowing ? 'Deixar de Seguir' : 'Seguir')}
                    </button>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  {profileUser.githubProfile && (
                    <a href={profileUser.githubProfile} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition duration-200">
                      <Github size={24} />
                    </a>
                  )}
                  {profileUser.linkedinProfile && (
                    <a href={profileUser.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition duration-200">
                      <Linkedin size={24} />
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin size={20} />
                    <span>Aracaju, Sergipe</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Postagens de {profileUser.displayName}</h3>
            {userPosts.length === 0 ? (
              <p className="text-gray-400">Nenhuma postagem ainda.</p>
            ) : (
              <div>
                {userPosts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUser?.uid} onDelete={handleConfirmDeletePost} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='hidden lg:block lg:w-1/3 bg-gray-900 my-4 rounded-2xl p-6 shadow-lg'>
          <h3 className="text-xl font-bold text-white mb-6">Informações Adicionais</h3>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="githubProfile" className="block text-gray-400 text-sm font-semibold mb-1">Perfil do GitHub</label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="url"
                    id="githubProfile"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="https://github.com/seuusuario"
                    value={githubProfile}
                    onChange={(e) => setGithubProfile(e.target.value)}
                    disabled={savingProfile || uploading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="linkedinProfile" className="block text-gray-400 text-sm font-semibold mb-1">Perfil do LinkedIn</label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="url" id="linkedinProfile" 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="https://linkedin.com/in/seuusuario" value={linkedinProfile} onChange={(e) => setLinkedinProfile(e.target.value)} disabled={savingProfile || uploading}/>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profileUser.githubProfile && (
                <div className="flex items-center gap-2">
                  <Github size={20} className="text-gray-400" />
                  <a href={profileUser.githubProfile} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline"> Perfil do GitHub</a>
                </div>
              )}
              {profileUser.linkedinProfile && (
                <div className="flex items-center gap-2">
                  <Linkedin size={20} className="text-gray-400" />
                  <a href={profileUser.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline"> Perfil do LinkedIn </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin size={20} />
                <span>Aracaju, Sergipe</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        show={showConfirmModal}
        message={modalMessage}
        onConfirm={() => {
          if (modalActionCallback) {
            modalActionCallback();
          }
        }}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};

export default ProfilePage;
