import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { NotifierService } from 'angular-notifier';

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.component.html',
  styleUrls: ['../form.scss'],
})
export class UserRegistrationComponent implements OnInit {
  registerForm = new FormGroup({
    username: new FormControl(),
    password: new FormControl(),
    confirmPassword: new FormControl(),
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private readonly notifier: NotifierService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) this.router.navigate(['/']);
    this.registerForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      },
      { validators: this.passwordMatchValidator() }
    );
  }

  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');

      if (!password || !confirmPassword) {
        return null;
      }

      const passwordsMatch = password.value === confirmPassword.value;

      return passwordsMatch ? null : { passwordsMismatch: true };
    };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      let userData = new User();
      userData.username = this.registerForm.value.username;
      userData.password = this.registerForm.value.password;
      this.authService.register(userData).subscribe({
        next: (response) => {
          this.notifier.notify('success', response.message);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.notifier.notify('error', error.error.message);
        }
      });
    }
  }

  get username(): FormControl {
    return this.registerForm.get('username') as FormControl;
  }

  get password(): FormControl {
    return this.registerForm.get('password') as FormControl;
  }

  get confirmPassword(): FormControl {
    return this.registerForm.get('confirmPassword') as FormControl;
  }
}
