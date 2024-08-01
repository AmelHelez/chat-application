import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  socket: Socket | undefined;
  private roomCreatedSub = new Subject<void>();
  roomCreated$ = this.roomCreatedSub.asObservable();

  constructor(private storageService: StorageService) {}

  setupSocketConnection(): void {
    this.socket = io(environment.SOCKET_ENDPOINT, {
      auth: {
        user: this.storageService.getUser() ?? '',
      },
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinChat(username: string) {
    this.socket?.emit('join', username);
  }

  sendMessage(chatId: string, message: string, sender: string) {
    this.socket?.emit('send-message', { chatId, content: message, sender });
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new-message', callback);
  }

  onUserStatusChange(callback: (status: any) => void) {
    this.socket?.on('user-status', callback);
  }

  markMessageAsRead(messageId: string, chatId: string, readerId: string) {
    this.socket?.emit('message-read', messageId, chatId, readerId);
  }

  onMessageStatusChange(callback: (status: any) => void) {
    this.socket?.on('message-status', callback);
  }

  createRoom(
    roomName: string,
    users: string[],
    roomCreator: string,
    isPrivate: boolean
  ) {
    this.socket?.emit('createRoom', roomName, users, roomCreator, isPrivate);
  }

  getCreatedRoom(callback: (room: string, roomTitle: string) => void): void {
    this.socket?.on('room-created', callback);
  }

  hideUsers(): void {
    this.roomCreatedSub.next();
  }

  onRoomCreated(): Observable<any> {
    return new Observable((observer) => {
      this.socket!.on(
        'room-created',
        (roomId: string, roomName: string, roomTitle: string) => {
          const data = { roomId, roomName, roomTitle };
          observer.next(data);
        }
      );
    });
  }

  onRoomCreatedNotifyUsers(): Observable<any> {
    return new Observable((observer) => {
      this.socket!.on(
        'room-created-notify',
        (roomId: string, roomName: string, roomTitle: string) => {
          const data = { roomId, roomName, roomTitle };
          observer.next(data);
        }
      );
    });
  }

  onRoomJoinedNotifyUsers(): Observable<any> {
    return new Observable((observer) => {
      this.socket!.on(
        'new-user-joined-room',
        (roomId: string, roomName: string, roomTitle: string) => {
          const data = { roomId, roomName, roomTitle };
          observer.next(data);
        }
      );
    });
  }

  joinRoom(roomId: string, user: string) {
    this.socket?.emit('join-room', roomId, user);
  }

  sendMessagee(user: string, roomId: string, message: string) {
    this.socket?.emit('send-message', user, roomId, message);
  }

  getNewMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket!.on('message-sent', (data: any) => {
        observer.next(data);
      });
    });
  }

  onRoomJoined(): Observable<any> {
    return new Observable((observer) => {
      this.socket!.on(
        'room-joined',
        (
          room: string,
          roomTitle: string,
          messages: any[],
          activeUser: string
        ) => {
          const data = { room, roomTitle, messages, activeUser };
          observer.next(data);
        }
      );
    });
  }

  onRateLimitExceeded(): Observable<string> {
    return new Observable((observer) => {
      this.socket?.on('rateLimitExceeded', (message: string) => {
        observer.next(message);
      });
    });
  }

  register(username: string): void {
    this.socket?.emit('on-register', username);
  }

  login(username: string): void {
    this.socket?.emit('login', username);
  }

  onUserActiveInRoom(): Observable<string> {
    return new Observable((observer) => {
      this.socket?.on('active-user', (username: string) => {
        observer.next(username);
      });
    });
  }

  onUserLeftRoom(): Observable<string> {
    return new Observable((observer) => {
      this.socket?.on('user-left-room', (username: string) => {
        observer.next(username);
      });
    });
  }

  logout(username: string): void {
    this.socket?.emit('logout-user', username);
  }
}
