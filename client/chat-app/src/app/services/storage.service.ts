import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

const USER_KEY = environment.USER_KEY;

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private isOnlineSubject: Subject<boolean> = new Subject<boolean>();
  isOnlineSubject$ = this.isOnlineSubject.asObservable();

  constructor() {}

  clean(): void {
    window.sessionStorage.clear();
  }

  saveUser(user: any): void {
    window.sessionStorage.removeItem(USER_KEY);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser(): any {
    const user = window.sessionStorage.getItem(USER_KEY);
    if (user) {
      return JSON.parse(user);
    }

    return {};
  }

  isLoggedIn(): boolean {
    const user = window.sessionStorage.getItem(USER_KEY);
    if (user) {
      this.isOnlineSubject.next(true);
      return true;
    }

    this.isOnlineSubject.next(false);
    return false;
  }
}
