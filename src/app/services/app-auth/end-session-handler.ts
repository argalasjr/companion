import { EndSessionRequest } from './end-session-request';
import { AuthorizationServiceConfiguration, StringMap, BasicQueryStringUtils } from '@openid/appauth';
import { BrowserProvider } from '../../providers/browser/browser.provider';

export class MyEndSessionHandler {

    constructor(
        private ionicBrowserView: BrowserProvider,
        private utils = new BasicQueryStringUtils()
        ) {}

    public async performEndSessionRequest(configuration: AuthorizationServiceConfiguration, request: EndSessionRequest): Promise<any> {

        // Build the request
        const url = this.buildRequestUrl(configuration, request);

        // Show in Browser Window
        await this.ionicBrowserView.ShowWindow(url);
    }

    private buildRequestUrl(
        configuration: AuthorizationServiceConfiguration,
        request: EndSessionRequest) {
      // build the query string
      // coerce to any type for convenience
      const requestMap: StringMap = {
        id_token_hint: request.idTokenHint,
        post_logout_redirect_uri: request.postLogoutRedirectURI,
        state: request.state,
      };
      const query = this.utils.stringify(requestMap);
      const baseUrl = configuration.endSessionEndpoint;
      const url = `${baseUrl}?${query}`;
      return url;
    }
}
