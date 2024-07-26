import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { User } from '../models/user';
import { Observable } from 'rxjs';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  register(user: User): Observable<any> {
    return this.http.post(
      `${environment.SOCKET_ENDPOINT}/register`,
      user,
      httpOptions
    );
  }

  login(credentials: any) {
    return this.http.post(
      `${environment.SOCKET_ENDPOINT}/login`,
      credentials,
      httpOptions
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.SOCKET_ENDPOINT}/logout`, { }, httpOptions);
  }
}
