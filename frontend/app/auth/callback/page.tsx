'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, checkAuth } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const isNewUser = searchParams.get('new_user') === 'true';
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(error);
        return;
      }

      if (!accessToken || !refreshToken) {
        setStatus('error');
        setMessage('인증 정보가 없습니다');
        return;
      }

      try {
        // 토큰 저장
        setTokens(accessToken, refreshToken);

        // 사용자 정보 조회
        await checkAuth();

        setStatus('success');
        setMessage(isNewUser ? '회원가입이 완료되었습니다!' : '로그인되었습니다!');

        // 잠시 후 리다이렉트
        setTimeout(() => {
          router.push('/community');
        }, 1500);
      } catch {
        setStatus('error');
        setMessage('인증 처리 중 오류가 발생했습니다');
      }
    };

    handleCallback();
  }, [searchParams, setTokens, checkAuth, router]);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">인증 처리 중...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">{message}</h2>
                <p className="text-muted-foreground">
                  잠시 후 이동합니다...
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">인증 실패</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
