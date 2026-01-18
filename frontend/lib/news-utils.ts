/**
 * 뉴스 관련 공통 유틸리티 함수
 */

export type NewsCategory = 'market' | 'tech' | 'regulation';

/**
 * 카테고리 코드를 한글 라벨로 변환
 */
export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'market':
      return '시장';
    case 'tech':
      return '기술';
    case 'regulation':
      return '규제';
    default:
      return category;
  }
}

/**
 * 카테고리별 스타일 클래스 반환
 */
export function getCategoryStyle(category: string): string {
  switch (category) {
    case 'market':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'tech':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'regulation':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
