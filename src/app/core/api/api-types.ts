/** Shared API wire types (camelCase JSON, ISO-8601 UTC, money as integer Rial). */
export interface ApiEnvelope<T> {
  data: T;
  meta?: { requestId?: string };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  requestId?: string;
}

export interface ApiPage<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  [filter: string]: string | number | boolean | undefined;
}

/** application/problem+json with the extensions agreed in the backend requirements. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  traceId?: string;
}
