import {
  Directive,
  ElementRef,
  HostListener,
  inject
} from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { UnsavedDialogGuardService } from '../services/unsaved-dialog-guard.service';

@Directive({
  selector: '[appConfirmDialogDismiss]',
  standalone: true
})
export class ConfirmDialogDismissDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly guard = inject(UnsavedDialogGuardService);

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const mask = target.closest<HTMLElement>('.p-dialog-mask');
    if (
      !mask ||
      target !== mask ||
      !mask.contains(this.elementRef.nativeElement)
    ) {
      return;
    }

    this.guard.confirmDiscard(this.dialogRef);
  }
}
