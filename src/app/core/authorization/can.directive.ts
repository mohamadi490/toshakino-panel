import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { PermissionRequirement } from './permissions';

/** Structural directive: `<button *appCan="{ all: [Permissions.ProductsCreate] }">`. UX only. */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  readonly appCan = input.required<PermissionRequirement>();
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.store.can(this.appCan());
      if (allowed && !this.shown) {
        this.vcr.createEmbeddedView(this.tpl);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.vcr.clear();
        this.shown = false;
      }
    });
  }
}
