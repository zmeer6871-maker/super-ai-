declare namespace Express {
  interface Request {
    cookies?: { [key: string]: any }
    user?: any
  }
}
