import type { ComponentSize } from '../../types';

export type PaginationLayoutKey =
  | 'prev'
  | 'pager'
  | 'next'
  | 'jumper'
  | 'total'
  | 'sizes'
  | 'slot';

export type PaginationPageSize = number;

export interface PaginationProps {
  total?: number;
  pageSize?: number;
  defaultPageSize?: number;
  currentPage?: number;
  defaultCurrentPage?: number;
  pageCount?: number;
  pagerCount?: number;
  layout?: string;
  pageSizes?: PaginationPageSize[];
  size?: ComponentSize;
  background?: boolean;
  disabled?: boolean;
  hideOnSinglePage?: boolean;
  prevText?: string;
  nextText?: string;
  prevIcon?: string;
  nextIcon?: string;
}
