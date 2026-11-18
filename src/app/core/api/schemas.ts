/**
 * The only supported way to use contract types. Names map 1:1 to OpenAPI schemas
 * (docs/contracts/openapi.json); feature code never imports `generated/api` directly.
 */
import type { components } from './generated/api';

type S = components['schemas'];

export type SessionRead = S['SessionRead'];
export type AdminLogin = S['AdminLogin'];
export type UserRead = S['UserRead'];
export type RoleBrief = S['RoleBrief'];
export type Pagination = S['Pagination'];
export type FieldError = S['FieldError'];
export type ProblemDetails = S['ProblemDetails'];
