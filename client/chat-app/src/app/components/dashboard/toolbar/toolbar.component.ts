import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  @Output() onLogout = new EventEmitter<void>();

  constructor(private readonly authService: AuthService) {}

  logout(): void {
    this.onLogout.emit();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
