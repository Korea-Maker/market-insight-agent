# Docker 없이 테스트하기

이 가이드는 Docker를 사용하지 않고 로컬 환경에서 QuantBoard 백엔드를 테스트하는 방법을 설명합니다.

## 사전 요구사항

### 1. Python 환경 설정

```bash
# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. Redis 설치

#### Windows

**옵션 1: WSL2 사용 (권장)**
```bash
# WSL2에서 Ubuntu 설치 후
sudo apt update
sudo apt install redis-server -y
sudo service redis-server start
```

**옵션 2: Memurai 사용 (Windows 네이티브)**
1. [Memurai](https://www.memurai.com/get-memurai) 다운로드 및 설치
2. 설치 후 자동으로 서비스로 실행됩니다
3. 기본 포트 6379 사용

**옵션 3: Redis for Windows (비공식)**
- [GitHub Releases](https://github.com/tporadowski/redis/releases)에서 다운로드
- 압축 해제 후 `redis-server.exe` 실행

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

### 3. Redis 연결 확인

```bash
# Redis CLI로 연결 테스트
redis-cli ping
# 응답: PONG

# 또는 Python으로 테스트
python -c "import redis; r = redis.Redis(); print(r.ping())"
```

## 환경 변수 설정

`.env` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:

```bash
# backend/.env 파일 확인
cat .env
```

기본 설정:
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`

## 테스트 실행

### 1. 컴포넌트별 테스트

각 컴포넌트를 개별적으로 테스트합니다:

```bash
python test_components.py
```

이 스크립트는 다음을 테스트합니다:
- ✅ Redis 연결
- ✅ Binance WebSocket 연결
- ✅ Redis Pub/Sub
- ✅ FastAPI 헬스 체크

### 2. 전체 파이프라인 테스트

**터미널 1: FastAPI 서버 시작**
```bash
python main.py
```

**터미널 2: WebSocket 리스너 테스트**
```bash
python test_listener.py
```

### 3. 수집기 단독 테스트

Binance 데이터 수집기를 직접 실행:

```bash
python -m app.services.ingestor
```

## 문제 해결

### Redis 연결 실패

**증상:**
```
❌ Redis 연결 실패: Error 10061
```

**해결 방법:**
1. Redis 서버가 실행 중인지 확인:
   ```bash
   # Windows (서비스 확인)
   sc query Redis
   
   # Linux/Mac
   sudo systemctl status redis-server
   ```

2. 포트가 사용 중인지 확인:
   ```bash
   # Windows
   netstat -an | findstr 6379
   
   # Linux/Mac
   lsof -i :6379
   ```

3. Redis 서버 재시작:
   ```bash
   # Windows (Memurai)
   # 서비스 관리자에서 Redis 서비스 재시작
   
   # Linux
   sudo systemctl restart redis-server
   
   # Mac
   brew services restart redis
   ```

### FastAPI 서버 연결 실패

**증상:**
```
❌ FastAPI 서버에 연결할 수 없습니다
```

**해결 방법:**
1. 서버가 실행 중인지 확인
2. 포트 8000이 사용 중인지 확인:
   ```bash
   # Windows
   netstat -an | findstr 8000
   
   # Linux/Mac
   lsof -i :8000
   ```

### Binance WebSocket 연결 실패

**증상:**
```
❌ Binance WebSocket 연결 실패
```

**해결 방법:**
1. 인터넷 연결 확인
2. 방화벽 설정 확인
3. Binance API 상태 확인: https://www.binance.com/en/support/announcement

## 빠른 시작 체크리스트

- [ ] Python 가상 환경 생성 및 활성화
- [ ] `pip install -r requirements.txt` 실행
- [ ] Redis 설치 및 실행
- [ ] `redis-cli ping`으로 Redis 연결 확인
- [ ] `.env` 파일 확인
- [ ] `python test_components.py` 실행하여 모든 테스트 통과 확인
- [ ] `python main.py`로 서버 시작
- [ ] `python test_listener.py`로 WebSocket 테스트

## 다음 단계

모든 테스트가 통과하면:
1. 프론트엔드와 통합 테스트
2. 프로덕션 배포 준비

