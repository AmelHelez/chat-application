import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SocketIoService } from 'src/app/services/socketio.service';
import { StorageService } from 'src/app/services/storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss'],
})
export class UserLoginComponent implements OnInit {
  loginForm = new FormGroup({
    username: new FormControl(),
    password: new FormControl(),
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private storageService: StorageService,
    private router: Router,
    private socketService: SocketIoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) this.router.navigate(['/']);
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      let userData = new User();
      userData.username = this.loginForm.value.username;
      userData.password = this.loginForm.value.password;
      this.authService.login(userData).subscribe({
        next: (response: any) => {
          this.storageService.saveUser(response.user);
          this.snackBar.open('User logged in successfully!', 'Close', {
            duration: 3000,
          });
          this.socketService.login(response.user);
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.snackBar.open(error.error.message, 'Close', {
            duration: 3000,
          });
        },
      });
    }
  }

  get username(): FormControl {
    return this.loginForm.get('username') as FormControl;
  }

  get password(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }
}
