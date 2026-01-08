import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  constructor(private api: ApiService) {}

  getGroups(): Observable<any[]> {
    return this.api.get('/groups');
  }

  createGroup(data: { name: string }): Observable<any> {
    return this.api.post('/groups', data);
  }

  joinGroup(data: { code: string }): Observable<any> {
    return this.api.post('/groups/join', data);
  }

  getGroup(id: string): Observable<any> {
    return this.api.get(`/groups/${id}`);
  }
}
