# Windows 로컬 PostgreSQL 설정 가이드

## 1. PostgreSQL 설치

### 다운로드 및 설치
1. **PostgreSQL 다운로드**: https://www.postgresql.org/download/windows/
2. **EDB 인스톨러** 사용 (권장)
   - 최신 버전 (PostgreSQL 16 권장)
   - 설치 중 다음을 선택:
     - ✅ PostgreSQL Server
     - ✅ pgAdmin 4 (관리 도구)
     - ✅ Command Line Tools
3. **설치 설정**:
   - Port: `5432` (기본값)
   - Superuser password: 기억할 수 있는 비밀번호 설정
   - Locale: `Korean, Korea` 또는 `Default locale`

## 2. 데이터베이스 및 사용자 생성

### 방법 1: SQL Shell (psql) 사용

1. **SQL Shell (psql)** 실행 (시작 메뉴에서 검색)
2. 연결 정보 입력 (Enter로 기본값 사용):
   ```
   Server [localhost]:
   Database [postgres]:
   Port [5432]:
   Username [postgres]:
   Password: <설치 시 설정한 비밀번호>
   ```

3. **데이터베이스 생성 SQL 실행**:
   ```sql
   -- 사용자 생성
   CREATE USER quantboard WITH PASSWORD 'quantboard_dev';
   
   -- 데이터베이스 생성
   CREATE DATABASE quantboard OWNER quantboard;
   
   -- 권한 부여
   GRANT ALL PRIVILEGES ON DATABASE quantboard TO quantboard;
   
   -- 확인
   \l
   \q
   ```

### 방법 2: pgAdmin 4 사용 (GUI)

1. **pgAdmin 4** 실행
2. **서버** 연결 (기본 postgres)
3. **데이터베이스** 우클릭 → **Create** → **Database...**
   - Database name: `quantboard`
   - Owner: (새로 만들기)
4. **Login/Group Roles** 우클릭 → **Create** → **Login/Group Role...**
   - General 탭: Name: `quantboard`
   - Definition 탭: Password: `quantboard_dev`
   - Privileges 탭: Can login? `Yes`

## 3. 환경 변수 설정

### .env 파일 생성

`backend/.env` 파일 생성:

```env
# PostgreSQL 설정 (로컬)
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis 설정
# 옵션 1: Docker Redis 사용
REDIS_HOST=localhost
REDIS_PORT=6379

# 옵션 2: Redis 없이 테스트 (Binance WebSocket은 Redis 필요)
# REDIS_HOST=localhost
# REDIS_PORT=6379

# API 설정
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# CORS 설정
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

## 4. 연결 테스트

### Python 스크립트로 테스트

`test_db_connection.py` 파일 생성:

```python
import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def test_connection():
    try:
        conn = await asyncpg.connect(
            user=os.getenv('POSTGRES_USER', 'quantboard'),
            password=os.getenv('POSTGRES_PASSWORD', 'quantboard_dev'),
            database=os.getenv('POSTGRES_DB', 'quantboard'),
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=os.getenv('POSTGRES_PORT', 5432)
        )
        
        version = await conn.fetchval('SELECT version();')
        print("✅ PostgreSQL 연결 성공!")
        print(f"버전: {version}")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ PostgreSQL 연결 실패: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
```

실행:
```powershell
cd backend
python test_db_connection.py
```

## 5. Redis 설정 (옵션)

뉴스 수집기는 Redis가 필수는 아니지만, Binance WebSocket 기능에는 필요합니다.

### 옵션 1: Docker로 Redis만 실행 (권장)

```powershell
docker run -d -p 6379:6379 --name quantboard-redis redis:7-alpine
```

### 옵션 2: Memurai (Windows용 Redis)

1. **Memurai 다운로드**: https://www.memurai.com/
2. 설치 및 실행
3. 기본 포트: 6379

### 옵션 3: Redis 없이 테스트

뉴스 수집기만 테스트하려면 Redis 없이도 가능하지만, `main.py`를 수정해야 합니다.

## 6. 서버 실행

```powershell
cd backend

# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 실행
python main.py
```

성공하면 다음 로그가 표시됩니다:
```
INFO - 애플리케이션 시작 중...
INFO - 데이터베이스 테이블 생성 완료
INFO - Binance 데이터 수집기 백그라운드 태스크 시작됨
INFO - 뉴스 수집기 백그라운드 태스크 시작됨
```

## 7. 데이터베이스 확인

### psql로 확인
```powershell
# psql 접속
psql -U quantboard -d quantboard -h localhost

# 테이블 확인
\dt

# 뉴스 데이터 확인
SELECT COUNT(*) FROM news;
SELECT * FROM news ORDER BY created_at DESC LIMIT 5;

# 종료
\q
```

### pgAdmin으로 확인
1. pgAdmin 4 실행
2. quantboard 데이터베이스 선택
3. Schemas → Tables → news 확인

## 문제 해결

### 문제 1: "psql: FATAL: password authentication failed"

**원인**: 비밀번호가 틀림

**해결**:
```sql
-- postgres 사용자로 접속 후
ALTER USER quantboard WITH PASSWORD 'quantboard_dev';
```

### 문제 2: "could not connect to server"

**원인**: PostgreSQL 서비스가 실행 중이 아님

**해결**:
1. `services.msc` 실행 (Windows + R)
2. `postgresql-x64-16` 검색
3. 서비스 시작

또는 PowerShell:
```powershell
# 서비스 상태 확인
Get-Service -Name postgresql*

# 서비스 시작
Start-Service postgresql-x64-16
```

### 문제 3: "pg_hba.conf" 인증 오류

**원인**: PostgreSQL 인증 설정 문제

**해결**:
1. `pg_hba.conf` 파일 찾기 (보통 `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`)
2. 다음 라인을 찾아서 수정:
   ```
   # 변경 전
   host    all             all             127.0.0.1/32            scram-sha-256
   
   # 변경 후 (로컬 개발 용도)
   host    all             all             127.0.0.1/32            md5
   ```
3. PostgreSQL 서비스 재시작

### 문제 4: 포트 충돌

**해결**:
```powershell
# 5432 포트 사용 확인
netstat -ano | findstr :5432

# 다른 포트로 변경 (postgresql.conf)
port = 5433

# .env 파일도 수정
POSTGRES_PORT=5433
```

## 전체 검증 체크리스트

✅ PostgreSQL 서비스가 실행 중
✅ `quantboard` 데이터베이스 생성됨
✅ `quantboard` 사용자 생성됨
✅ `.env` 파일이 올바르게 설정됨
✅ `test_db_connection.py` 실행 성공
✅ `python main.py` 실행 시 에러 없음
✅ `news` 테이블이 자동 생성됨

## 유용한 SQL 명령어

```sql
-- 모든 테이블 조회
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- news 테이블 구조 확인
\d news

-- 최근 뉴스 조회
SELECT id, title, title_kr, source, created_at 
FROM news 
ORDER BY created_at DESC 
LIMIT 10;

-- 소스별 뉴스 개수
SELECT source, COUNT(*) as count 
FROM news 
GROUP BY source;

-- 테이블 삭제 (재생성 필요 시)
DROP TABLE news;
```

## 다음 단계

1. ✅ PostgreSQL 설치 및 설정 완료
2. ✅ 데이터베이스 연결 테스트
3. ✅ FastAPI 서버 실행
4. ✅ 뉴스 API 테스트: http://localhost:8000/api/news
5. ✅ API 문서 확인: http://localhost:8000/docs
