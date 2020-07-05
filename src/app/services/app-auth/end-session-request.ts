import { DefaultCrypto } from '@openid/appauth/built/crypto_utils';



export interface EndSessionRequestJson {
  idTokenHint: string;
  postLogoutRedirectURI: string;
  state?: string;
}

const BYTES_LENGTH = 43;
const newState = (): string => {
  const defaultCrypto = new DefaultCrypto();
  return defaultCrypto.generateRandom(BYTES_LENGTH);
};

export class EndSessionRequest {
  state: string;


  constructor(
    public idTokenHint: string,
    public postLogoutRedirectURI: string,
    state?: string) {
      this.state = state || newState();
    }



  static fromJson(input: EndSessionRequestJson): EndSessionRequest {
    return new EndSessionRequest(
        input.idTokenHint, input.postLogoutRedirectURI, input.state);
  }

  toJson(): EndSessionRequestJson {
    const json: EndSessionRequestJson = {idTokenHint: this.idTokenHint, postLogoutRedirectURI : this.postLogoutRedirectURI };

    if (this.state) {
      json.state = this.state;
    }

    return json;
  }
}
