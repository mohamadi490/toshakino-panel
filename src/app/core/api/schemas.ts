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

export type UserCreate = S['UserCreate'];
export type UserUpdate = S['UserUpdate'];
export type RoleRead = S['RoleRead'];
export type RoleCreate = S['RoleCreate'];
export type RoleUpdate = S['RoleUpdate'];
export type PermissionRead = S['PermissionRead'];

export type PublishStatus = S['PublishStatus'];
export type CategoryRead = S['CategoryRead'];
export type CategoryCreate = S['CategoryCreate'];
export type CategoryUpdate = S['CategoryUpdate'];
export type BrandAdminRead = S['BrandAdminRead'];
export type BrandCreate = S['BrandCreate'];
export type BrandUpdate = S['BrandUpdate'];
export type AttributeRead = S['AttributeRead'];
export type AttributeCreate = S['AttributeCreate'];
export type AttributeUpdate = S['AttributeUpdate'];
export type AttributeValueInput = S['AttributeValueInput'];
export type AttributeValueUpdate = S['AttributeValueUpdate'];
export type AttributeValueRead = S['AttributeValueRead'];
