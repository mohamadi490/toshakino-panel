import { HttpContextToken } from '@angular/common/http';

/** Requests that must not get a bearer token nor trigger the 401->refresh cycle. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
/** Marks a request already retried after a refresh (prevents loops). */
export const RETRIED = new HttpContextToken<boolean>(() => false);
