import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmHostComponent } from './shared/ui/confirm';
import { LoadingBarComponent } from './layouts/chrome/loading-bar';
import { ToastContainerComponent } from './layouts/chrome/toast-container';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastContainerComponent, LoadingBarComponent, ConfirmHostComponent],
  template: `<app-loading-bar /><router-outlet /><app-toast-container /><app-confirm-host />`,
})
export class App {}
