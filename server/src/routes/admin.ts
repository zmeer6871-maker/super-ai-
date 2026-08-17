import express from 'express'
import { requireAuth } from '../middleware/auth'
import { pool } from '../db'

const router = express.Router()

// Admin check placeholder: in production, check user role
async function isAdmin(req:any) {
  // TODO: implement real role checks
  const user = req.user
  return !!user && user.email === process.env.ADMIN_EMAIL
}

router.use(requireAuth)

router.get('/stats', async (req, res) => {
  try {
    if (!await isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
    const users = await pool.query('SELECT count(*) FROM users')
    const payments = await pool.query('SELECT count(*) FROM payments')
    res.json({ users: users.rows[0].count, payments: payments.rows[0].count })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

export default router
