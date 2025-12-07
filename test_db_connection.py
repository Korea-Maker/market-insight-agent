"""
PostgreSQL 연결 테스트 스크립트
Windows 로컬 PostgreSQL 연결 확인용
"""
import asyncio
import asyncpg
from dotenv import load_dotenv
import os
import sys

# .env 파일 로드
load_dotenv()


async def test_connection():
    """PostgreSQL 연결 테스트"""
    print("=" * 60)
    print("PostgreSQL 연결 테스트")
    print("=" * 60)
    
    # 환경 변수 읽기
    user = os.getenv('POSTGRES_USER', 'quantboard')
    password = os.getenv('POSTGRES_PASSWORD', 'quantboard_dev')
    database = os.getenv('POSTGRES_DB', 'quantboard')
    host = os.getenv('POSTGRES_HOST', 'localhost')
    port = int(os.getenv('POSTGRES_PORT', 5432))
    
    print(f"\n연결 정보:")
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Database: {database}")
    print(f"  User: {user}")
    print(f"  Password: {'*' * len(password)}")
    print()
    
    try:
        print("PostgreSQL 연결 시도 중...")
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=database,
            host=host,
            port=port,
            timeout=10
        )
        
        print("✅ PostgreSQL 연결 성공!\n")
        
        # 버전 확인
        version = await conn.fetchval('SELECT version();')
        print(f"PostgreSQL 버전:")
        print(f"  {version}\n")
        
        # 현재 데이터베이스 확인
        current_db = await conn.fetchval('SELECT current_database();')
        print(f"현재 데이터베이스: {current_db}\n")
        
        # 테이블 목록 확인
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        if tables:
            print(f"테이블 목록 ({len(tables)}개):")
            for table in tables:
                print(f"  - {table['table_name']}")
        else:
            print("테이블이 아직 생성되지 않았습니다.")
            print("서버를 실행하면 자동으로 생성됩니다: python main.py")
        
        print()
        
        # 연결 종료
        await conn.close()
        print("=" * 60)
        print("✅ 연결 테스트 완료!")
        print("=" * 60)
        return True
        
    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ 연결 실패: 비밀번호가 틀렸습니다.\n")
        print("해결 방법:")
        print("1. .env 파일의 POSTGRES_PASSWORD 확인")
        print("2. psql로 비밀번호 재설정:")
        print("   ALTER USER quantboard WITH PASSWORD 'quantboard_dev';")
        return False
        
    except asyncpg.exceptions.InvalidCatalogNameError:
        print(f"❌ 연결 실패: '{database}' 데이터베이스가 존재하지 않습니다.\n")
        print("해결 방법:")
        print("1. psql로 postgres 사용자로 접속")
        print("2. 다음 명령 실행:")
        print(f"   CREATE DATABASE {database} OWNER {user};")
        return False
        
    except asyncpg.exceptions.InvalidAuthorizationSpecificationError:
        print(f"❌ 연결 실패: '{user}' 사용자가 존재하지 않습니다.\n")
        print("해결 방법:")
        print("1. psql로 postgres 사용자로 접속")
        print("2. 다음 명령 실행:")
        print(f"   CREATE USER {user} WITH PASSWORD '{password}';")
        print(f"   CREATE DATABASE {database} OWNER {user};")
        return False
        
    except asyncio.TimeoutError:
        print("❌ 연결 실패: 연결 시간 초과\n")
        print("해결 방법:")
        print("1. PostgreSQL 서비스가 실행 중인지 확인:")
        print("   Get-Service -Name postgresql*")
        print("2. 방화벽이 5432 포트를 차단하는지 확인")
        print(f"3. {host}:{port}가 올바른지 확인")
        return False
        
    except OSError as e:
        print(f"❌ 연결 실패: {e}\n")
        print("해결 방법:")
        print("1. PostgreSQL이 설치되어 있는지 확인")
        print("2. PostgreSQL 서비스가 실행 중인지 확인:")
        print("   services.msc 실행 후 postgresql 검색")
        print(f"3. 포트 {port}가 사용 가능한지 확인:")
        print(f"   netstat -ano | findstr :{port}")
        return False
        
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {type(e).__name__}: {e}\n")
        print("자세한 오류:")
        import traceback
        traceback.print_exc()
        return False


async def test_tables():
    """테이블 존재 여부 확인"""
    try:
        user = os.getenv('POSTGRES_USER', 'quantboard')
        password = os.getenv('POSTGRES_PASSWORD', 'quantboard_dev')
        database = os.getenv('POSTGRES_DB', 'quantboard')
        host = os.getenv('POSTGRES_HOST', 'localhost')
        port = int(os.getenv('POSTGRES_PORT', 5432))
        
        conn = await asyncpg.connect(
            user=user, password=password, database=database,
            host=host, port=port, timeout=5
        )
        
        # news 테이블 확인
        news_count = await conn.fetchval("SELECT COUNT(*) FROM news")
        print(f"\n📰 news 테이블: {news_count}개의 뉴스")
        
        if news_count > 0:
            # 최근 뉴스 5개 조회
            recent_news = await conn.fetch("""
                SELECT id, title, source, created_at
                FROM news
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            print("\n최근 뉴스:")
            for news in recent_news:
                print(f"  [{news['source']}] {news['title'][:60]}...")
        
        await conn.close()
        
    except asyncpg.exceptions.UndefinedTableError:
        print("\n📰 news 테이블이 아직 생성되지 않았습니다.")
        print("   서버를 실행하면 자동으로 생성됩니다.")
    except Exception as e:
        print(f"\n테이블 확인 중 오류: {e}")


if __name__ == "__main__":
    try:
        success = asyncio.run(test_connection())
        
        if success:
            # 테이블 확인
            asyncio.run(test_tables())
            
            print("\n다음 단계:")
            print("  1. 서버 실행: python main.py")
            print("  2. API 테스트: http://localhost:8000/api/news")
            print("  3. API 문서: http://localhost:8000/docs")
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n테스트가 취소되었습니다.")
        sys.exit(1)
