import { Component, OnDestroy, OnInit } from '@angular/core';
import { SocketIoService } from './services/socketio.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'chat-app';

  constructor(
    private authService: AuthService,
    private socketService: SocketIoService
  ) {}

  ngOnInit(): void {
    this.socketService.setupSocketConnection();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  logout(): void {
    this.authService.logout();
  }
}
