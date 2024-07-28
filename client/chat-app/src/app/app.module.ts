import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SocketIoService } from './services/socketio.service';
import { UserRegistrationComponent } from './components/user-registration/user-registration.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UserLoginComponent } from './components/user-login/user-login.component';
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { httpInterceptorProviders } from './helpers/http.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    UserRegistrationComponent,
    UserLoginComponent,
    DashboardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [SocketIoService, httpInterceptorProviders],
  bootstrap: [AppComponent],
})
export class AppModule {}
