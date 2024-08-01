import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { Chat, ChatType } from 'src/app/models/chat';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SocketIoService } from 'src/app/services/socketio.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  user: any;
  showUsers: boolean = false;
  selectedChat: Chat | null = null;
  inputMessage: string = '';
  allUsers: User[] = [];
  isLoading: boolean = false;
  userMessage: string = '';
  newMessageSubscription: Subscription;
  newRoomJoinedSubscription: Subscription;
  roomCreatedSubscription: Subscription;
  roomCreatedNotifySub: Subscription;
  activeUserSubscription: Subscription;
  rateLimitExceededSub: Subscription;
  activeUserSub: Subscription;
  userLeftRoomSub: Subscription;
  userJoinedNotifyRoomSub: Subscription;
  chatTypes = ChatType;
  chatType: ChatType = this.chatTypes.None;
  allPrivateUsers: any[] = [];
  activeUsers: string[] = [];

  constructor(
    private authService: AuthService,
    private socketService: SocketIoService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.initialize();

    this.newMessageSubscription = this.socketService
      .getNewMessage()
      .subscribe((data: any) => {
        this.selectedChat!.messages = data;
      });

    this.newRoomJoinedSubscription = this.socketService
      .onRoomJoined()
      .subscribe((data: any) => {
        const { room, roomTitle, messages, username } = data;
        const createdRoom = {
          id: room,
          name: roomTitle,
          messages: messages,
        } as Chat;

        this.selectedChat = createdRoom;
      });

    this.roomCreatedSubscription = this.socketService
      .onRoomCreated()
      .subscribe((data: any) => {
        const { roomId, roomName, roomTitle } = data;
        const createdRoom = {
          id: roomId,
          name: roomTitle,
          messages: [],
        } as Chat;

        this.selectedChat = createdRoom;
        this.socketService.hideUsers();
      });

    this.rateLimitExceededSub = this.socketService
      .onRateLimitExceeded()
      .subscribe((message: string) => {
        alert(message);
      });

    this.activeUserSub = this.socketService
      .onUserActiveInRoom()
      .subscribe((user: string) => {
        if (!this.activeUsers.includes(user)) {
          this.activeUsers.push(user);
        }
      });

    this.userLeftRoomSub = this.socketService
      .onUserLeftRoom()
      .subscribe((user: string) => {
        const index = this.activeUsers.indexOf(user);
        if (index > -1) {
          this.activeUsers.splice(index, 1);
        }
      });

    this.roomCreatedNotifySub = this.socketService
      .onRoomCreatedNotifyUsers()
      .subscribe((data: any) => {
        const { roomId, roomName, roomTitle } = data;
        this.user.rooms.push({ id: roomId, name: roomName, title: roomTitle });
      });

    this.userJoinedNotifyRoomSub = this.socketService
      .onRoomJoinedNotifyUsers()
      .subscribe((data: any) => {
        const { roomId, roomName, roomTitle } = data;
        this.user.rooms.map((room: any) => {
          if (+room.id == +roomId) {
            room.name = roomName;
            room.title = roomTitle;
          }
        });
      });
  }

  private initialize(): void {
    this.isLoading = true;
    this.authService
      .getUsers()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe((res: any) => {
        this.user = res.currentUser;
        this.allUsers.push(...res.users);

        const userPrivateRoomNames = this.user.rooms
          .filter((r: any) => r.type === this.chatTypes.Private)
          .map((r: any) => r.name);

        if (userPrivateRoomNames && userPrivateRoomNames.length > 0) {
          this.allPrivateUsers = this.allUsers.filter(
            (u: any) =>
              !userPrivateRoomNames.some((room: string) =>
                room.includes(u.username)
              )
          );
        } else this.allPrivateUsers = this.allUsers;
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      const chatMessages =
        this.elRef.nativeElement.querySelector('#chatMessages');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {}
  }

  logout(): void {
    this.authService.logout();
  }

  getUserRooms(rooms: any[]): any[] {
    return this.chatType === this.chatTypes.Private
      ? rooms.filter((r: any) => r.type === this.chatTypes.Private)
      : rooms.filter((r: any) => r.type === this.chatTypes.Public);
  }

  sendMessage(): void {
    this.socketService.sendMessagee(
      this.user.username,
      this.selectedChat!.id,
      this.userMessage
    );
    this.userMessage = '';
  }

  ngOnDestroy(): void {
    this.newMessageSubscription?.unsubscribe();
    this.newRoomJoinedSubscription?.unsubscribe();
  }
}
