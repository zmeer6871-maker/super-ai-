declare namespace Express {
  export interface Request {
    cookies?: { [key: string]: any }
    user?: any
  }
}
