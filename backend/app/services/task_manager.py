"""
백그라운드 태스크 모니터링 및 자동 재시작 시스템
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Callable, Awaitable, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TaskInfo:
    """태스크 정보"""
    name: str
    task: asyncio.Task
    last_heartbeat: datetime = field(default_factory=datetime.utcnow)
    restart_count: int = 0
    max_restarts: int = 5
    is_healthy: bool = True
    last_error: Optional[str] = None


class BackgroundTaskManager:
    """백그라운드 태스크 관리자"""

    def __init__(self):
        self.tasks: Dict[str, TaskInfo] = {}
        self.health_check_interval = 30  # 30초마다 헬스 체크
        self._monitor_task: Optional[asyncio.Task] = None

    async def register_task(
        self,
        name: str,
        coro_func: Callable[[], Awaitable[None]],
        max_restarts: int = 5
    ):
        """
        백그라운드 태스크 등록 및 모니터링 시작

        Args:
            name: 태스크 이름
            coro_func: 실행할 코루틴 함수
            max_restarts: 최대 재시작 횟수
        """
        if name in self.tasks:
            logger.warning(f"태스크 '{name}'이 이미 등록되어 있습니다")
            return

        task = asyncio.create_task(self._monitored_task(name, coro_func, max_restarts))
        self.tasks[name] = TaskInfo(
            name=name,
            task=task,
            max_restarts=max_restarts
        )

        logger.info(f"태스크 '{name}' 등록 완료")

        # 헬스 체크 모니터가 실행 중이 아니면 시작
        if self._monitor_task is None or self._monitor_task.done():
            self._monitor_task = asyncio.create_task(self._health_check_loop())

    async def _monitored_task(
        self,
        name: str,
        coro_func: Callable[[], Awaitable[None]],
        max_restarts: int
    ):
        """
        태스크 실행 및 실패 시 재시작

        Args:
            name: 태스크 이름
            coro_func: 실행할 코루틴 함수
            max_restarts: 최대 재시작 횟수
        """
        while True:
            task_info = self.tasks.get(name)
            if not task_info:
                break

            if task_info.restart_count >= max_restarts:
                logger.error(
                    f"태스크 '{name}'이 최대 재시작 횟수({max_restarts})에 도달했습니다"
                )
                task_info.is_healthy = False
                break

            try:
                logger.info(f"태스크 '{name}' 시작 (재시작 {task_info.restart_count}회)")
                await coro_func()

            except asyncio.CancelledError:
                logger.info(f"태스크 '{name}' 취소됨")
                break

            except Exception as e:
                logger.error(f"태스크 '{name}' 실패: {e}", exc_info=True)
                task_info.last_error = str(e)
                task_info.restart_count += 1
                task_info.is_healthy = False

                # 지수 백오프 재시작 (1초 → 2초 → 4초 → 8초 → 16초)
                wait_time = min(2 ** task_info.restart_count, 32)
                logger.info(f"태스크 '{name}' {wait_time}초 후 재시작 시도...")
                await asyncio.sleep(wait_time)

                task_info.is_healthy = True

    async def _health_check_loop(self):
        """헬스 체크 루프"""
        logger.info("태스크 헬스 체크 시작")

        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._check_all_tasks()

            except asyncio.CancelledError:
                logger.info("헬스 체크 루프 종료")
                break

            except Exception as e:
                logger.error(f"헬스 체크 오류: {e}")

    async def _check_all_tasks(self):
        """모든 태스크 헬스 체크"""
        for name, task_info in self.tasks.items():
            # 태스크가 완료되었는지 확인
            if task_info.task.done():
                if task_info.is_healthy:
                    logger.warning(f"태스크 '{name}'이 예기치 않게 종료됨")
                    task_info.is_healthy = False

            # 하트비트 업데이트
            task_info.last_heartbeat = datetime.utcnow()

    def get_status(self) -> Dict[str, dict]:
        """
        모든 태스크의 상태 조회

        Returns:
            태스크별 상태 정보
        """
        status = {}
        for name, task_info in self.tasks.items():
            status[name] = {
                "is_running": not task_info.task.done(),
                "is_healthy": task_info.is_healthy,
                "restart_count": task_info.restart_count,
                "last_heartbeat": task_info.last_heartbeat.isoformat(),
                "last_error": task_info.last_error
            }
        return status

    async def cancel_all(self):
        """모든 태스크 취소"""
        logger.info("모든 백그라운드 태스크 취소 중...")

        # 헬스 체크 모니터 취소
        if self._monitor_task and not self._monitor_task.done():
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

        # 모든 태스크 취소
        for name, task_info in self.tasks.items():
            if not task_info.task.done():
                logger.info(f"태스크 '{name}' 취소 중...")
                task_info.task.cancel()

        # 모든 태스크가 종료될 때까지 대기
        await asyncio.gather(
            *[task_info.task for task_info in self.tasks.values()],
            return_exceptions=True
        )

        logger.info("모든 백그라운드 태스크 종료 완료")


# 전역 태스크 매니저 인스턴스
task_manager = BackgroundTaskManager()
