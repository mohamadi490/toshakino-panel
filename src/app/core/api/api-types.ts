import { Pagination } from './schemas';

/** Wire types shared by every module (camelCase JSON, ISO-8601 UTC, money in integer Toman). */
export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiPage<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  [filter: string]: string | number | boolean | undefined;
}
