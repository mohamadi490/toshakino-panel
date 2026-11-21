import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { errorInterceptor } from './core/api/error.interceptor';
import { loadingInterceptor } from './core/api/loading.interceptor';
import { requestIdInterceptor } from './core/api/request-id.interceptor';
import { AuthService } from './core/auth/auth.service';
import { AppConfig } from './core/config/app-config';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes, withComponentInputBinding()),
    // errorInterceptor is listed first => it is the outermost wrapper and sees the final outcome
    // (after authInterceptor has already refreshed/retried a 401).
    provideHttpClient(
      withFetch(),
      withInterceptors([
        loadingInterceptor,
        requestIdInterceptor,
        errorInterceptor,
        authInterceptor,
      ]),
    ),
    provideAppInitializer(async () => {
      inject(ThemeService); // apply appearance immediately
      await inject(AppConfig).load();
      const auth = inject(AuthService);
      // Restore session through the HttpOnly refresh cookie; failure => anonymous, never a crash.
      await firstValueFrom(auth.restoreSession());
    }),
  ],
};
