import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { HoursMinutesSecondsPipeModule } from './services/pipes/time/hours-minutes-seconds.module';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RoundProgressModule } from 'angular-svg-round-progressbar';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { Network } from '@ionic-native/network/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { BrowserTab } from '@ionic-native/browser-tab/ngx';
import { SafariViewController } from '@ionic-native/safari-view-controller/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { FingerprintAIO } from '@ionic-native/fingerprint-aio/ngx';
import { SecureStorage } from '@ionic-native/secure-storage/ngx';

import { RequestorProvider } from './providers/requestor/requestor.provider';
import { BrowserProvider } from './providers/browser/browser.provider';
import { AuthProvider } from './providers/auth/auth.provider';
import { SessionProvider } from './providers/session/session.provider';
import { AuthModalComponent } from './providers/session/auth-modal/auth-modal.component';

@NgModule({
  declarations: [AppComponent, AuthModalComponent],
  entryComponents: [ AuthModalComponent],
  imports: [BrowserModule,
    HttpClientModule,
    RoundProgressModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HoursMinutesSecondsPipeModule],
  providers: [
    StatusBar,
    SplashScreen,
    BrowserTab,
    Network,
    HTTP,
    Device,
    Geolocation,
    SecureStorage,
    InAppBrowser,
    SafariViewController,
    AuthProvider,
    RequestorProvider,
    BrowserProvider,
    SessionProvider,
    FingerprintAIO,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
