import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable().pipe(distinctUntilChanged());

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService, private router: Router) {
    this.populate();
  }

  populate() {
    const token = this.getToken();
    if (token) {
      // For now, assume valid if token exists. 
      // Ideally we would validate it or decode it.
      this.isAuthenticatedSubject.next(true);
      this.currentUserSubject.next({ token }); // We don't have user details without another call usually
    } else {
      this.purgeAuth();
    }
  }

  setAuth(user: any) {
    this.saveToken(user.token);
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  purgeAuth() {
    this.destroyToken();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  login(credentials: any): Observable<any> {
    return this.apiService.post('/auth/login', credentials).pipe(map(data => {
      this.setAuth(data);
      return data;
    }));
  }

  register(credentials: any): Observable<any> {
    return this.apiService.post('/auth/register', credentials).pipe(map(data => {
      this.setAuth(data);
      return data;
    }));
  }

  logout() {
    this.purgeAuth();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return window.localStorage.getItem('jwtToken');
  }

  saveToken(token: string) {
    window.localStorage.setItem('jwtToken', token);
  }

  destroyToken() {
    window.localStorage.removeItem('jwtToken');
  }
}
