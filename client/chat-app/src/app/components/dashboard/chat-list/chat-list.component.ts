import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatType } from 'src/app/models/chat';
import { SocketIoService } from 'src/app/services/socketio.service';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
})
export class ChatListComponent implements OnInit {
  showUsers: boolean = false;
  chatTypes = ChatType;
  chatType: ChatType = this.chatTypes.None;

  @Input() user: any;
  @Input() privateUsers: any[] = [];
  @Input() users: any[] = [];
  selectedItems: any[] = [];
  roomCreatedSub: Subscription;

  constructor(private socketService: SocketIoService) {}

  ngOnInit(): void {
    this.roomCreatedSub = this.socketService.roomCreated$.subscribe(
      () => (this.showUsers = false)
    );
  }

  prepareForPrivateChat(): void {
    this.showUsers = true;
    this.chatType = this.chatTypes.Private;
  }

  prepareForGroupChat(): void {
    this.showUsers = true;
    this.chatType = this.chatTypes.Public;
  }

  closePreparation(): void {
    this.showUsers = false;
    this.chatType = this.chatTypes.None;
  }

  selectChat(chat: any): void {
    this.socketService.joinRoom(chat, this.user.username);
  }

  selectUser(user: any): void {
    this.socketService.createRoom(
      `room-${user}-${this.user.username}`,
      [user, this.user.username],
      '',
      this.chatType === this.chatTypes.Private ? true : false
    );
  }

  toggleSelection(username: string): void {
    const user = this.selectedItems.find((u: any) => u === username);
    if (user == null) {
      this.selectedItems.push(username);
    } else {
      this.selectedItems = this.selectedItems.filter(
        (i: any) => i !== username
      );
    }
  }

  isSelected(username: string): boolean {
    return this.selectedItems.indexOf(username) !== -1;
  }

  addNewGroup(): void {
    const userNames = this.selectedItems.join('-');
    this.socketService.createRoom(
      `room-${userNames}-${this.user.username}`,
      [...this.selectedItems, this.user.username],
      this.user.username,
      this.chatType === this.chatTypes.Private ? true : false
    );
  }
}
