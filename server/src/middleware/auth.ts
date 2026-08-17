import { Request, Response, NextFunction } from 'express'
import { pool } from '../db'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies && (req.cookies['sa_sid'] || req.headers['authorization'] && (req.headers['authorization'] as string).replace('Bearer ','') )
    if (!token) return res.status(401).json({ error: 'unauthenticated' })
    const r = await pool.query('SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=$1', [token])
    if (r.rowCount === 0) return res.status(401).json({ error: 'unauthenticated' })
    ;(req as any).user = r.rows[0]
    next()
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
}
