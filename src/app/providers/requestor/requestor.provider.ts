import { Requestor } from '@openid/appauth';
import { HTTP, HTTPResponse } from '@ionic-native/http/ngx';
import { Injectable } from '@angular/core';

export interface XhrSettings {
    url: string;
    dataType?: string;
    method?: string;
    data?: any;
    headers?: any;
}

// REQUIRES CORDOVA PLUGINS
// cordova-plugin-advanced-http

@Injectable()
export class RequestorProvider extends Requestor {

    constructor(private http: HTTP) {
        super();
    }

    public async xhr<T>(settings: XhrSettings): Promise<T> {
        if (!settings.method) {
            settings.method = 'GET';
        }

        switch (settings.method) {
            case 'GET':
                return this.get(settings.url, settings.headers);
            case 'POST':
                return this.post(settings.url, settings.data, settings.headers);
            case 'PUT':
                return this.put(settings.url, settings.data, settings.headers);
            case 'DELETE':
                return this.delete(settings.url, settings.headers);
        }
    }

    private async get<T>(url: string, headers: any) {
        this.http.setDataSerializer('utf8');
        return this.http.get(url, undefined, headers).then((response: HTTPResponse) => JSON.parse(response.data) as T);
    }

    private async post<T>(url: string, data: any, headers: any) {
        this.http.setDataSerializer('utf8');
        return this.http.post(url, data, headers).then((response: HTTPResponse) => JSON.parse(response.data) as T);
    }

    private async put<T>(url: string, data: any, headers: any) {
        this.http.setDataSerializer('utf8');
        return this.http.put(url, data, headers).then((response: HTTPResponse) => JSON.parse(response.data) as T);
    }

    private async delete<T>(url: string, headers: any) {
        this.http.setDataSerializer('utf8');
        return this.http.delete(url, undefined, headers).then((response: HTTPResponse) => JSON.parse(response.data) as T);
    }
}
