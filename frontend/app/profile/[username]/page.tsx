'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { usersApi, postsApi } from '@/lib/api';
import { PostCard } from '@/components/Community';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Calendar,
  FileText,
  MessageSquare,
  Heart,
  Loader2,
  Settings,
} from 'lucide-react';
import { formatDate } from '@/lib/date';
import type { PostListItem } from '@/types/post';

interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface UserStats {
  post_count: number;
  comment_count: number;
  total_likes: number;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const { user: currentUser, checkAuth } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [profileData, statsData, postsData] = await Promise.all([
          usersApi.getProfile(username),
          usersApi.getStats(username),
          postsApi.getList({ author: username, limit: 10 }),
        ]);

        setProfile(profileData);
        setStats(statsData);
        setPosts(postsData.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : '프로필을 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">{error || '사용자를 찾을 수 없습니다'}</p>
        <Link href="/community">
          <Button variant="outline">커뮤니티로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary text-3xl border-4 border-primary/20 flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                profile.display_name.slice(0, 2).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    프로필 수정
                  </Button>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm">{profile.bio}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(profile.created_at)} 가입</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{stats.post_count}</div>
              <div className="text-sm text-muted-foreground">게시글</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{stats.comment_count}</div>
              <div className="text-sm text-muted-foreground">댓글</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{stats.total_likes}</div>
              <div className="text-sm text-muted-foreground">받은 좋아요</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            작성한 게시글
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              아직 작성한 게시글이 없습니다.
            </div>
          )}

          {posts.length >= 10 && (
            <div className="text-center pt-4">
              <Link href={`/community?author=${username}`}>
                <Button variant="outline">더 보기</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
