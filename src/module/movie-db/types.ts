export enum HttpMethod {
  Get = 'get',
  Post = 'post',
  Put = 'put',
  Delete = 'delete'
}

export interface Endpoint {
  readonly path: string;
  readonly verb: HttpMethod;
  readonly name?: string;
}

export interface EndpointGroup {
  readonly prefix: string;
  readonly endpoints: Array<Endpoint>;
}

export interface Request {
  id?: string | number;
  language?: string;
  request_token?: string;
}

export interface Response {
}

export interface AuthenticationToken extends Response {
  success?: boolean;
  expires_at?: string;
  request_token?: string;
}

export interface RequestParams {
  id?: string | number;
  language?: string;
}

export interface SessionRequestParams extends RequestParams {
  request_token: string;
}

export interface SessionResponse extends Response {
  session_id?: string;
}

export interface RequestOptions {
  appendToResponse?: string;
  timeout?: number;
}

export interface Genre {
  id?: number;
  name?: string;
}

export interface ProductionCompany {
  name?: string;
  id?: number;
  logo_path?: string;
  origin_country?: string;
}

export interface ProductionCountry {
  name?: string;
  iso_3166_1?: string;
}

export interface SpokenLanguage {
  iso_639_1?: string;
  name?: string;
}