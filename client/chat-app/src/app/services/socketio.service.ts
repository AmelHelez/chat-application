import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  socket: Socket | undefined;

  constructor() {}

  setupSocketConnection(): void {
    this.socket = io(environment.SOCKET_ENDPOINT, {
      auth: {
        token: 'cde',
      },
    });
    this.socket.emit('my message', 'Hello there from Angular.');
    this.socket.on('my broadcast', (data: string) => {
      console.log(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
