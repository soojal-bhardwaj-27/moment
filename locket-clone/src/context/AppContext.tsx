import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// Interfaces mapping to database schema and API outputs
export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  plan: 'FREE' | 'PREMIUM';
  pushToken?: string;
  createdAt: string;
}

export interface Friend {
  friendshipId: string;
  friendId: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  isOutgoing: boolean;
}

export interface CircleMember {
  id: string;
  circleId: string;
  userId: string;
  user: User;
}

export interface Circle {
  id: string;
  ownerId: string;
  circleName: string;
  createdAt: string;
  owner: User;
  members: CircleMember[];
}

export interface Reaction {
  id: string;
  momentId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

export interface Moment {
  id: string;
  photoUrl: string;
  caption?: string;
  senderId: string;
  circleId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  circle: Circle;
  reactions: Reaction[];
}

interface AppContextType {
  user: User | null;
  friends: Friend[];
  circles: Circle[];
  feed: Moment[];
  isLoading: boolean;
  isSessionLoaded: boolean;
  error: string | null;
  apiUrl: string;
  register: (username: string, name: string, email: string, phone: string, avatarUrl?: string) => Promise<User>;
  login: (loginIdentifier: string) => Promise<{ user: User; otpCode: string }>;
  verify: (userId: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  updatePushToken: (pushToken: string) => Promise<void>;
  sendFriendRequest: (receiverUsername: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  createCircle: (circleName: string) => Promise<Circle>;
  addCircleMember: (circleId: string, userId: string) => Promise<void>;
  uploadMoment: (photoUrl: string, circleId: string, caption?: string) => Promise<Moment>;
  reactToMoment: (momentId: string, emoji: string) => Promise<void>;
  deleteMoment: (momentId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  createInvite: (platform?: string) => Promise<{ inviteCode: string; inviteLink: string }>;
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getApiUrl = () => {
  // Use the live deployed Render backend URL so the app works on all devices anywhere
  return 'https://moment-x8we.onrender.com';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [feed, setFeed] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const apiUrl = getApiUrl();

  // Load saved session on startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('moments_user_session');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error('Failed to load persisted session:', err);
      } finally {
        setIsSessionLoaded(true);
      }
    };
    loadSession();
  }, []);

  // Listen for deep links
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      console.log('[Deep Linking] Received URL:', url);
      try {
        const parsed = Linking.parse(url);
        console.log('[Deep Linking] Parsed URL:', parsed);
        
        let inviteCode = '';
        const inviteMatch = url.match(/\/invite\/([a-zA-Z0-9]+)/);
        if (inviteMatch && inviteMatch[1]) {
          inviteCode = inviteMatch[1];
        } else if (parsed.path && parsed.path.includes('invite/')) {
          inviteCode = parsed.path.split('invite/')[1];
        } else if (parsed.path && parsed.path.startsWith('invite')) {
          inviteCode = parsed.queryParams?.code as string || '';
        }
        
        if (inviteCode) {
          console.log('[Deep Linking] Detected invite code:', inviteCode);
          setPendingInviteCode(inviteCode);
          
          // Trigger API call to register click in the background
          fetch(`${apiUrl}/api/invites/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteCode })
          })
          .then(res => res.json())
          .then(data => console.log('[Deep Linking] Tracked click successfully:', data))
          .catch(err => console.error('[Deep Linking] Error tracking click:', err));
        }
      } catch (err) {
        console.error('[Deep Linking] Error parsing deep link URL:', err);
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [apiUrl]);

  console.log(`[Moments AppContext] API URL resolved to: ${apiUrl}`);

  const refreshAll = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Load friends
      const friendsRes = await fetch(`${apiUrl}/api/friends?userId=${user.id}`);
      const friendsData = await friendsRes.json();
      if (friendsRes.ok) setFriends(friendsData.friends || []);

      // Load circles
      const circlesRes = await fetch(`${apiUrl}/api/circles?userId=${user.id}`);
      const circlesData = await circlesRes.json();
      if (circlesRes.ok) setCircles(circlesData.circles || []);

      // Load feed
      const feedRes = await fetch(`${apiUrl}/api/moments/feed?userId=${user.id}`);
      const feedData = await feedRes.json();
      if (feedRes.ok) setFeed(feedData.moments || []);

    } catch (err: any) {
      console.error('Error refreshing app state:', err);
      setError('Failed to refresh data from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    } else {
      setFriends([]);
      setCircles([]);
      setFeed([]);
    }
  }, [user]);

  const register = async (username: string, name: string, email: string, phone: string, avatarUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          name: name.trim(), 
          email: email.trim(), 
          phone: phone.trim(), 
          avatarUrl, 
          inviteCode: pendingInviteCode 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setUser(data.user);
      await AsyncStorage.setItem('moments_user_session', JSON.stringify(data.user));
      setPendingInviteCode(null);
      return data.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginIdentifier: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier: loginIdentifier.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return { user: data.user, otpCode: data.otpCode };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verify = async (userId: string, code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, inviteCode: pendingInviteCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setUser(data.user);
      await AsyncStorage.setItem('moments_user_session', JSON.stringify(data.user));
      setPendingInviteCode(null);
      return data.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('moments_user_session');
  };

  const updatePushToken = async (pushToken: string) => {
    if (!user) return;
    try {
      await fetch(`${apiUrl}/api/auth/update-push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, pushToken })
      });
    } catch (err) {
      console.error('Failed to update push token on server:', err);
    }
  };

  const sendFriendRequest = async (receiverUsername: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${apiUrl}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: user.id, receiverUsername: receiverUsername.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Friend request failed');
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept friend request');
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const createCircle = async (circleName: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await fetch(`${apiUrl}/api/circles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: user.id, circleName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create circle');
      await refreshAll();
      return data.circle;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addCircleMember = async (circleId: string, memberUserId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/circles/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circleId, userId: memberUserId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member to circle');
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const uploadMoment = async (photoUrl: string, circleId: string, caption?: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await fetch(`${apiUrl}/api/moments/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: user.id, circleId, photoUrl, caption })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload moment');
      await refreshAll();
      return data.moment;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const reactToMoment = async (momentId: string, emoji: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${apiUrl}/api/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momentId, userId: user.id, emoji })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to react to moment');
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteMoment = async (momentId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${apiUrl}/api/moments/${momentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete moment');
      await refreshAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const createInvite = async (platform?: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await fetch(`${apiUrl}/api/invites/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviterId: user.id, platform })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invitation');
      return {
        inviteCode: data.inviteCode,
        inviteLink: data.inviteLink
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        friends,
        circles,
        feed,
        isLoading,
        isSessionLoaded,
        error,
        apiUrl,
        register,
        login,
        verify,
        logout,
        updatePushToken,
        sendFriendRequest,
        acceptFriendRequest,
        createCircle,
        addCircleMember,
        uploadMoment,
        reactToMoment,
        deleteMoment,
        refreshAll,
        createInvite,
        pendingInviteCode,
        setPendingInviteCode
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
