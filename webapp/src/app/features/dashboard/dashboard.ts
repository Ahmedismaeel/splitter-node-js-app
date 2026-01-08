import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupService } from '../../core/services/group.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  groups: any[] = [];
  isLoading = true;
  showCreateForm = false;
  showJoinForm = false;
  
  createGroupForm: FormGroup;
  joinGroupForm: FormGroup;

  error: string | null = null;
  currentUser: any;

  constructor(
    private groupService: GroupService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', Validators.required]
    });
    this.joinGroupForm = this.fb.group({
      code: ['', Validators.required]
    });
    this.authService.currentUser.subscribe(u => this.currentUser = u);
  }

  ngOnInit() {
    this.loadGroups();
  }

  loadGroups() {
    this.isLoading = true;
    this.groupService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        // If 401, redirect to login might be handled by interceptor but good to be safe / guard
      }
    });
  }

  toggleCreate() {
    this.showCreateForm = !this.showCreateForm;
    this.showJoinForm = false;
    this.error = null;
  }

  toggleJoin() {
    this.showJoinForm = !this.showJoinForm;
    this.showCreateForm = false;
    this.error = null;
  }

  onCreateSubmit() {
    if (this.createGroupForm.invalid) return;
    this.groupService.createGroup(this.createGroupForm.value).subscribe({
      next: (group) => {
        this.groups.push(group);
        this.showCreateForm = false;
        this.createGroupForm.reset();
        this.router.navigate(['/groups', group.id]);
      },
      error: (err) => this.error = err.message || 'Failed to create group'
    });
  }

  onJoinSubmit() {
    if (this.joinGroupForm.invalid) return;
    this.groupService.joinGroup(this.joinGroupForm.value).subscribe({
      next: (group) => {
        this.groups.push(group); // or reload to get full details if API returns partial
        this.showJoinForm = false;
        this.joinGroupForm.reset();
        this.router.navigate(['/groups', group.id]);
      },
      error: (err) => this.error = err.message || 'Failed to join group. Check the code.'
    });
  }

  logout() {
    this.authService.logout();
  }
}
