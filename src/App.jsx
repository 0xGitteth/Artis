import React, { useEffect, useMemo, useState } from 'react';
import {
  initAuth,
  observeAuth,
  registerWithEmail,
  loginWithEmail,
  logout,
  createUserProfile,
  fetchUserProfile,
  subscribeToProfile,
  updateUserProfile,
  addPost,
  subscribeToPosts,
  toggleLike,
  subscribeToLikes,
  subscribeToComments,
} from './firebase';
import {
  Image as ImageIcon,
  Settings as SettingsIcon,
  Plus,
  User,
  Edit3,
  Moon,
  Sun,
  LogOut,
  Search,
  Users,
  Hand,
  Cloud,
  Shield,
  Camera,
  AlertOctagon,
  ExternalLink,
  ChevronLeft,
  Star,
} from 'lucide-react';
import { Badge, Button } from './components/ui';
import AuthPanel from './components/AuthPanel';
import UploadModal from './components/UploadModal';
import EditProfileModal from './components/EditProfileModal';
import SettingsModal from './components/SettingsModal';
import PhotoDetailModal from './components/PhotoDetailModal';
import './App.css';
import './index.css';

const ROLES = [
  { id: 'photographer', label: 'Fotograaf' },
  { id: 'model', label: 'Model' },
  { id: 'artist', label: 'Artist' },
  { id: 'stylist', label: 'Stylist' },
  { id: 'mua', label: 'MUA' },
  { id: 'agency', label: 'Agency' },
  { id: 'company', label: 'Company' },
  { id: 'fan', label: 'Fan' },
];

const THEME_STYLES = {
  Nature: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  Fashion: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  Street: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-200 dark:border-cyan-700',
  Portrait: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-200 dark:border-indigo-700',
  Minimalist: 'bg-white text-blue-900 border-blue-200 dark:bg-slate-950 dark:text-blue-100 dark:border-blue-900',
  Conceptual: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const THEMES = Object.keys(THEME_STYLES);
const getThemeStyle = (theme) => THEME_STYLES[theme] || 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';

const COMMUNITIES = [
  { id: 'safety', title: 'Veiligheid & Consent', icon: Shield, members: 1240, desc: 'Over grenzen, afspraken en veilig werken.' },
  { id: 'network', title: 'Netwerk & Collabs', icon: Hand, members: 3500, desc: 'Vind je team voor de volgende shoot.' },
  { id: 'tech', title: 'Techniek & Gear', icon: Camera, members: 2100, desc: "Alles over licht, camera's en lenzen." },
];

const DEMO_USERS = [
  {
    uid: 'demo_model',
    displayName: 'Sophie de Vries',
    bio: 'Vintage model & stylist.',
    roles: ['model'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    themes: ['Vintage', 'Fashion'],
  },
  {
    uid: 'demo_photo',
    displayName: 'Marcus Lens',
    bio: 'Conceptueel fotograaf.',
    roles: ['photographer'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    themes: ['Street', 'Urban'],
  },
  {
    uid: 'demo_artist',
    displayName: 'Elena Visuals',
    bio: 'Fine art kunstenaar.',
    roles: ['artist'],
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400',
    themes: ['Black & White', 'Abstract'],
  },
  {
    uid: 'demo_mua',
    displayName: 'Nina Artistry',
    bio: 'Editorial MUA.',
    roles: ['mua'],
    avatar: 'https://images.unsplash.com/photo-1512413914633-b5043f4041ea?auto=format&fit=crop&q=80&w=400',
    themes: ['Beauty', 'Editorial'],
  },
];

const initialProfile = (user) => ({
  displayName: user?.displayName || 'Nieuw lid',
  bio: '',
  roles: ['fan'],
  website: '',
  darkMode: false,
  sensitivePreference: 'cover',
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likesMap, setLikesMap] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState('gallery');

  useEffect(() => {
    let unsub = null;
    const bootstrap = async () => {
      try {
        await initAuth();
        unsub = observeAuth(async (firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
            const profileSnap = await fetchUserProfile(firebaseUser.uid);
            if (!profileSnap.exists()) {
              await createUserProfile(firebaseUser.uid, initialProfile(firebaseUser));
            }
            subscribeToProfile(firebaseUser.uid, (docSnap) => {
              const data = docSnap.data();
              setProfile(data);
              const storedDark = data?.darkMode ?? JSON.parse(localStorage.getItem('darkMode') || 'false');
              setDarkMode(storedDark);
            });
          } else {
            setProfile(null);
          }
        });
      } finally {
        setReady(true);
      }
    };

    bootstrap();
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (user?.uid) updateUserProfile(user.uid, { darkMode });
  }, [darkMode, user?.uid]);

  useEffect(() => {
    const unsubPosts = subscribeToPosts((snapshot) => {
      const nextPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(nextPosts);
    });
    return () => unsubPosts();
  }, []);

  useEffect(() => {
    if (!posts.length) return undefined;
    const unsubs = posts.map((post) =>
      subscribeToLikes(post.id, (snap) => {
        setLikesMap((prev) => ({
          ...prev,
          [post.id]: {
            count: snap.size,
            liked: !!snap.docs.find((d) => d.id === user?.uid),
          },
        }));
      })
    );
    const commentUnsubs = posts.map((post) =>
      subscribeToComments(post.id, (snap) => {
        setCommentCounts((prev) => ({ ...prev, [post.id]: snap.size }));
      })
    );
    return () => {
      unsubs.forEach((fn) => fn && fn());
      commentUnsubs.forEach((fn) => fn && fn());
    };
  }, [posts, user?.uid]);

  const filteredPosts = useMemo(() => {
    const preference = profile?.sensitivePreference || 'cover';
    return posts
      .filter((p) => (preference === 'block' && p.sensitive ? false : true))
      .map((p) => ({
        ...p,
        likes: likesMap[p.id]?.count || 0,
        liked: likesMap[p.id]?.liked || false,
        commentsCount: commentCounts[p.id] || 0,
        sensitive: preference === 'show' ? false : p.sensitive,
      }));
  }, [posts, likesMap, commentCounts, profile?.sensitivePreference]);

  const handleRegister = async (email, password, displayName) => {
    try {
      setError(null);
      const newUser = await registerWithEmail(email, password, displayName);
      await createUserProfile(newUser.uid, initialProfile({ ...newUser, displayName }));
    } catch (err) {
      setError(err.message || 'Registreren mislukt');
      throw err;
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setError(null);
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Inloggen mislukt');
      throw err;
    }
  };

  const handlePublish = async (payload) => {
    if (!user) throw new Error('Je moet ingelogd zijn');
    await addPost({
      ...payload,
      authorId: user.uid,
      authorName: profile?.displayName || user.email,
      createdBy: user.uid,
    });
  };

  const handleLike = async (postId) => {
    if (!user) return;
    await toggleLike(postId, user.uid);
  };

  const toggleDark = () => setDarkMode((d) => !d);

  const updatePreference = async (pref) => {
    if (!user) return;
    await updateUserProfile(user.uid, { sensitivePreference: pref });
  };

  const saveProfile = async (data) => {
    if (!user) return;
    await updateUserProfile(user.uid, data);
  };

  if (!ready) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <AuthPanel onLogin={handleLogin} onRegister={handleRegister} error={error} />
      </div>
    );
  }

  const preference = profile?.sensitivePreference || 'cover';
  const userPosts = useMemo(() => filteredPosts.filter((p) => p.authorId === user?.uid), [filteredPosts, user?.uid]);

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <NavBar
        view={view}
        setView={setView}
        profile={profile}
        onOpenSettings={() => setShowSettings(true)}
        onUpload={() => setShowUpload(true)}
        onToggleDark={toggleDark}
        darkMode={darkMode}
        onLogout={logout}
      />

      <div className="pt-20 pb-16">
        {view === 'gallery' && (
          <GallerySection
            posts={filteredPosts}
            preference={preference}
            onPostClick={setSelectedPost}
            onUpload={() => setShowUpload(true)}
          />
        )}

        {view === 'discover' && (
          <DiscoverSection posts={filteredPosts} users={DEMO_USERS} onPostClick={setSelectedPost} setView={setView} />
        )}

        {view === 'community' && <CommunitySection setView={setView} />}
        {view.startsWith('community_') && <CommunityDetail id={view.replace('community_', '')} setView={setView} />}
        {view === 'challenge_detail' && (
          <ChallengeDetail setView={setView} posts={filteredPosts} onPostClick={setSelectedPost} />
        )}

        {view === 'profile' && (
          <ImmersiveProfile
            profile={profile}
            isOwn
            posts={userPosts}
            onOpenSettings={() => setShowSettings(true)}
            onPostClick={setSelectedPost}
          />
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onPublish={handlePublish} />}
      {showEditProfile && (
        <EditProfileModal profile={profile} onSave={saveProfile} onClose={() => setShowEditProfile(false)} />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
          onToggleDark={toggleDark}
          preference={preference}
          onPreferenceChange={updatePreference}
          onLogout={logout}
        />
      )}
      {selectedPost && (
        <PhotoDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} currentUser={user} />
      )}
    </div>
  );
}

function NavBar({ view, setView, profile, onOpenSettings, onUpload, onToggleDark, darkMode, onLogout }) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('gallery')}>
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold">
            EX
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Exhibit</p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Collaborative gallery</h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {['gallery', 'discover', 'community'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`capitalize font-medium transition-colors ${view === v ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              {v === 'discover' ? 'Ontdekken' : v === 'gallery' ? 'Galerij' : 'Community'}
            </button>
          ))}
          <button
            onClick={() => setView('profile')}
            className={`capitalize font-medium transition-colors ${view === 'profile' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Mijn Portfolio
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onUpload} className="hidden md:flex">
            <Plus size={16} /> Upload
          </Button>
          <button onClick={onToggleDark} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onOpenSettings} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <SettingsIcon size={18} />
          </button>
          <button onClick={onLogout} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <LogOut size={18} />
          </button>
          <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">{profile?.displayName || 'Maker'}</p>
              <p className="text-[11px] text-slate-500">{profile?.roles?.join(', ') || 'community'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-around">
        <button onClick={() => setView('gallery')} className={view === 'gallery' ? 'text-blue-600' : 'text-slate-400'}>
          <ImageIcon />
        </button>
        <button onClick={() => setView('discover')} className={view === 'discover' ? 'text-blue-600' : 'text-slate-400'}>
          <Search />
        </button>
        <button onClick={() => setView('community')} className={view === 'community' ? 'text-blue-600' : 'text-slate-400'}>
          <Users />
        </button>
        <button onClick={() => setView('profile')} className={view === 'profile' ? 'text-blue-600' : 'text-slate-400'}>
          <User />
        </button>
      </div>
    </>
  );
}

function GallerySection({ posts, preference, onPostClick, onUpload }) {
  const [sensitiveRevealed, setSensitiveRevealed] = useState({});

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Gallery</p>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Recente uploads</h2>
        </div>
        <Button variant="secondary" onClick={onUpload} className="justify-center">
          <ImageIcon size={16} /> Nieuwe post
        </Button>
      </div>

      <div className="space-y-12">
        {posts.map((post) => (
          <div key={post.id} className="relative group">
            <div
              className={`relative overflow-hidden rounded-sm bg-slate-200 dark:bg-slate-800 min-h-[320px] shadow-sm cursor-pointer ${post.isChallenge ? 'ring-4 ring-amber-400' : ''}`}
              onClick={() => onPostClick(post)}
            >
              {post.sensitive && !sensitiveRevealed[post.id] && preference === 'cover' ? (
                <div
                  className="absolute inset-0 z-10 backdrop-blur-3xl bg-slate-900/80 flex flex-col items-center justify-center p-6 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertOctagon className="w-12 h-12 text-orange-500 mb-4" />
                  <h4 className="text-white font-bold text-lg mb-2">Gevoelige inhoud</h4>
                  <Button
                    variant="outline"
                    onClick={() => setSensitiveRevealed((prev) => ({ ...prev, [post.id]: true }))}
                    className="justify-center"
                  >
                    Toch bekijken
                  </Button>
                </div>
              ) : null}
              <img src={post.imageUrl} className="w-full h-full object-cover block" alt={post.title} loading="lazy" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-b-xl shadow-xl p-5 mt-2 border border-slate-100 dark:border-slate-700 flex gap-6 items-start">
              <div className="flex-1 space-y-3">
                <div className="flex gap-4 text-slate-400">
                  <Hand className="w-5 h-5" />
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold dark:text-white">{post.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{post.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.styles?.map((style) => (
                    <Badge key={style} colorClass={getThemeStyle(style)}>
                      {style}
                    </Badge>
                  ))}
                  {post.triggers?.map((trigger) => (
                    <Badge
                      key={trigger}
                      colorClass="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                    >
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right flex flex-col gap-2 min-w-[160px]">
                <div className="cursor-pointer group">
                  <div className="text-xs uppercase font-bold text-slate-400">{ROLES.find((r) => r.id === post.authorRole)?.label || 'Maker'}</div>
                  <div className="text-xs font-medium text-slate-900 group-hover:text-blue-600 dark:text-white transition-colors">
                    {post.authorName || 'Onbekend'}
                  </div>
                </div>
                {post.credits?.map((credit, index) => (
                  <div key={index} className="cursor-pointer group flex flex-col items-end">
                    <div className="text-xs uppercase font-bold text-slate-400">{ROLES.find((r) => r.id === credit.role)?.label || credit.role}</div>
                    <div className="text-xs font-medium text-slate-900 group-hover:text-blue-600 dark:text-white transition-colors flex items-center gap-1">
                      {credit.name} {!credit.uid && <ExternalLink className="w-3 h-3 text-slate-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {!posts.length && (
          <div className="p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 bg-white/60 dark:bg-slate-800/60">
            Nog geen posts. Start met een upload!
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverSection({ users, posts, onPostClick, setView }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [activeThemes, setActiveThemes] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);

  const displayedThemes = showAllThemes ? THEMES : THEMES.slice(0, 5);
  const displayedRoles = showAllRoles ? ROLES : ROLES.slice(0, 5);

  const toggleTheme = (theme) => setActiveThemes((prev) => (prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]));

  const mixedContent = useMemo(() => {
    if (tab !== 'all') return [];
    const res = [];
    const max = Math.max(users.length, posts.length);
    for (let i = 0; i < max; i += 1) {
      if (posts[i]) res.push({ type: 'post', data: posts[i] });
      if (users[i]) res.push({ type: 'user', data: users[i] });
    }
    return res.filter((item) => (item.type === 'post' ? item.data.title : item.data.displayName).toLowerCase().includes(search.toLowerCase()));
  }, [users, posts, search, tab]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) =>
      (activeThemes.length ? p.styles?.some((s) => activeThemes.includes(s)) : true) &&
      p.title?.toLowerCase().includes(search.toLowerCase())
    );
  }, [posts, activeThemes, search]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      (!activeRole || u.roles?.includes(activeRole)) &&
      u.displayName.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, activeRole, search]);

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Ontdekken</p>
          <h2 className="text-3xl font-bold dark:text-white">Zoek ideeën & makers</h2>
        </div>
        <Button variant="secondary" onClick={() => setView('community')} className="justify-center">
          <Users size={16} /> Community
        </Button>
      </div>

      <div className="sticky top-16 bg-[#F0F4F8] dark:bg-slate-900 z-20 pb-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-slate-400" />
          <input
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-none shadow-sm dark:bg-slate-800 dark:text-white"
            placeholder="Zoeken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mb-4">
          {['all', 'ideas', 'people'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                tab === t ? 'bg-white shadow text-blue-600 dark:bg-slate-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              {t === 'all' ? 'Alles' : t === 'ideas' ? 'Ideeën' : 'Mensen'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'all' && (
        <div className="columns-2 md:columns-4 gap-4 space-y-4">
          {mixedContent.map((item, i) => (
            <div
              key={`${item.type}-${i}`}
              onClick={() => (item.type === 'post' ? onPostClick(item.data) : setView('profile'))}
              className="break-inside-avoid bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm cursor-pointer mb-4"
            >
              <img src={item.type === 'post' ? item.data.imageUrl : item.data.avatar} className="w-full h-auto" alt="" />
              <div className="p-2 font-bold text-xs truncate dark:text-white">
                {item.type === 'post' ? item.data.title : item.data.displayName}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ideas' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            {displayedThemes.map((theme) => (
              <button
                key={theme}
                onClick={() => toggleTheme(theme)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  activeThemes.includes(theme) ? `ring-2 ring-blue-500 ${getThemeStyle(theme)}` : 'bg-white dark:bg-slate-800 text-slate-500'
                }`}
              >
                {theme}
              </button>
            ))}
            <button onClick={() => setShowAllThemes(!showAllThemes)} className="text-xs font-bold text-blue-600 px-4">
              Toon meer...
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {filteredPosts.map((p) => (
              <div
                key={p.id}
                onClick={() => onPostClick(p)}
                className="aspect-[4/5] bg-slate-200 rounded-lg overflow-hidden cursor-pointer"
              >
                <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.title} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveRole(null)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white"
            >
              Iedereen
            </button>
            {displayedRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold border ${
                  activeRole === role.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'
                }`}
              >
                {role.label}
              </button>
            ))}
            <button onClick={() => setShowAllRoles(!showAllRoles)} className="text-xs font-bold text-blue-600 px-4">
              Toon meer...
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredUsers.map((u) => (
              <div
                key={u.uid}
                onClick={() => setView('profile')}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm cursor-pointer"
              >
                <div className="aspect-square relative">
                  <img src={u.avatar} className="w-full h-full object-cover" alt={u.displayName} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <span className="text-white font-bold">{u.displayName}</span>
                    <span className="text-white/70 text-xs">{ROLES.find((r) => r.id === u.roles?.[0])?.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunitySection({ setView }) {
  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Community</p>
          <h2 className="text-3xl font-bold dark:text-white">Praat mee & organiseer</h2>
        </div>
        <Button variant="secondary" className="px-4 py-2 text-sm h-10" onClick={() => setView('profile')}>
          Profiel
        </Button>
      </div>

      <div className="mb-8 cursor-pointer" onClick={() => setView('challenge_detail')}>
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-400 text-lg mb-1 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" /> Weekly Challenge
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200/80 mb-0">Thema: "Shadow Play"</p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" asChild>
            Doe mee
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {COMMUNITIES.map((comm) => {
          const Icon = comm.icon;
          return (
            <div
              key={comm.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex gap-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setView(`community_${comm.id}`)}
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg dark:text-white mb-1">{comm.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{comm.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommunityDetail({ id, setView }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => setView('community')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-medium">
        <ChevronLeft className="w-4 h-4 mr-1" /> Terug
      </button>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-2xl font-bold mb-2 dark:text-white">Community detail</h3>
        <p className="text-slate-600 dark:text-slate-400">Meer informatie voor {id} volgt hier.</p>
      </div>
    </div>
  );
}

function ChallengeDetail({ setView, posts, onPostClick }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => setView('community')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-medium">
        <ChevronLeft className="w-4 h-4 mr-1" /> Terug
      </button>
      <div className="bg-amber-100 dark:bg-amber-900/20 p-8 rounded-3xl border border-amber-200 dark:border-amber-800 mb-8 text-center relative overflow-hidden">
        <h1 className="text-4xl font-bold text-amber-900 dark:text-amber-100 mb-2">Shadow Play</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {posts.map((post) => (
          <div key={post.id} onClick={() => onPostClick(post)} className="aspect-square bg-slate-200 rounded-lg overflow-hidden cursor-pointer">
            <img src={post.imageUrl} className="w-full h-full object-cover" alt={post.title} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImmersiveProfile({ profile, isOwn, posts, onOpenSettings, onPostClick }) {
  if (!profile) return null;
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-20">
      <div className="relative h-[420px] w-full overflow-hidden">
        <img src={profile.avatar || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=1200'} className="w-full h-full object-cover" alt={profile.displayName} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-10" />

        {isOwn && (
          <div className="absolute top-4 right-4 z-20">
            <Button onClick={onOpenSettings} className="bg-black/50 text-white hover:bg-black/70 border-none backdrop-blur-md">
              <Edit3 className="w-4 h-4 mr-2" /> Profiel Bewerken
            </Button>
          </div>
        )}

        <div className="relative z-20 h-full flex flex-col justify-end items-center pb-10 px-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">{profile.displayName}</h1>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {profile.roles?.map((r) => (
              <span key={r} className="text-xs font-bold uppercase tracking-widest text-white/80 bg-white/10 px-3 py-1 rounded backdrop-blur">
                {ROLES.find((x) => x.id === r)?.label || r}
              </span>
            ))}
            {profile.linkedAgencyName && <span className="text-xs text-white/80 border-l border-white/30 pl-2 ml-2">Agency: {profile.linkedAgencyName}</span>}
            {profile.linkedCompanyName && <span className="text-xs text-white/80 border-l border-white/30 pl-2 ml-2">Work: {profile.linkedCompanyName}</span>}
          </div>
          <p className="text-slate-200 max-w-xl text-lg">{profile.bio}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {posts.map((p) => (
            <div key={p.id} onClick={() => onPostClick(p)} className="aspect-[4/5] bg-slate-200 rounded-sm overflow-hidden cursor-pointer">
              <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.title} />
            </div>
          ))}
        </div>
        {posts.length === 0 && <p className="text-center text-slate-500 py-10">Nog geen posts.</p>}
      </div>
    </div>
  );
}

