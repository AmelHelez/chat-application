import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { User } from '../models/user';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as moment from 'moment';
import { Router } from '@angular/router';
import { SocketIoService } from './socketio.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};
const USER_KEY = environment.USER_KEY;

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private socketService: SocketIoService
  ) {}

  register(user: User): Observable<any> {
    return this.http.post(
      `${environment.SOCKET_ENDPOINT}/register`,
      user,
      httpOptions
    );
  }

  login(credentials: any) {
    return this.http
      .post(`${environment.SOCKET_ENDPOINT}/login`, credentials, httpOptions)
      .pipe(tap((res) => this.setSession((res as any).token)));
  }

  private setSession(authResult: any) {
    const expiresAt = moment().add(authResult.expiresIn, 'second');

    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', JSON.stringify(expiresAt.valueOf()));
  }

  logout(): void {
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');
    const user = window.sessionStorage.getItem(USER_KEY);
    if(user) this.socketService.logout(user);
    this.router.navigate(['/login']);
  }

  public isLoggedIn() {
    return moment().isBefore(this.getExpiration());
  }

  isLoggedOut() {
    return !this.isLoggedIn();
  }

  getExpiration() {
    const expiration = localStorage.getItem('expires_at');
    const expiresAt = JSON.parse(expiration!);

    return moment(expiresAt);
  }

  getUsers(): any {
    return this.http.get<any>(`${environment.SOCKET_ENDPOINT}/`);
  }
}
