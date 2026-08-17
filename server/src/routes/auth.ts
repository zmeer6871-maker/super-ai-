import express from 'express'
import { pool } from '../db'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

const SESSION_COOKIE = 'sa_sid'
const SESSION_TTL_DAYS = 30

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const host = process.env.SMTP_HOST
  if (!host) {
    console.log('SMTP not configured — skipping email send to', to)
    return false
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html })
  return true
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Signup with email + password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'invalid_request', message: 'email and password are required' })
    const hash = await bcrypt.hash(password, 12)
    const client = await pool.connect()
    try {
      const r = await client.query('INSERT INTO users(email, password_hash, name) VALUES($1,$2,$3) RETURNING id,email,email_verified', [email, hash, name || null])
      const user = r.rows[0]
      // create email verification token
      const vtoken = generateToken()
      await client.query('INSERT INTO otp_requests(phone,email,code,expires_at) VALUES($1,$2,$3,$4)', [null, email, vtoken, new Date(Date.now() + 24*3600*1000)])
      // send verification email
      const link = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${vtoken}&email=${encodeURIComponent(email)}`
      await sendEmail(email, 'Verify your Super AI email', `Click to verify: ${link}`, `<p>Click to verify: <a href="${link}">${link}</a></p>`)
      res.json({ ok: true, message: 'Account created. Verification email sent if SMTP configured.' })
    } finally { client.release() }
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error', message: e.message }) }
})

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token as string
    const email = req.query.email as string
    if (!token || !email) return res.status(400).send('Missing token/email')
    const client = await pool.connect()
    try {
      const r = await client.query('SELECT id,expires_at,used FROM otp_requests WHERE email=$1 AND code=$2 ORDER BY id DESC LIMIT 1', [email, token])
      if (r.rowCount === 0) return res.status(400).send('Invalid token')
      const row = r.rows[0]
      if (row.used) return res.status(400).send('Token already used')
      if (new Date(row.expires_at) < new Date()) return res.status(400).send('Token expired')
      await client.query('UPDATE users SET email_verified=true WHERE email=$1', [email])
      await client.query('UPDATE otp_requests SET used=true WHERE email=$1 AND code=$2', [email, token])
      res.send('Email verified. You can now login.')
    } finally { client.release() }
  } catch (e:any) { console.error(e); res.status(500).send('Server error') }
})

// Login with email + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'invalid_request', message: 'email and password are required' })
    const client = await pool.connect()
    try {
      const r = await client.query('SELECT id,password_hash,email_verified FROM users WHERE email=$1', [email])
      if (r.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' })
      const user = r.rows[0]
      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
      // create session
      const token = generateToken()
      const expires = new Date(Date.now() + SESSION_TTL_DAYS*24*3600*1000)
      await client.query('INSERT INTO sessions(user_id,token,ip,user_agent,expires_at) VALUES($1,$2,$3,$4,$5)', [user.id, token, req.ip, req.get('user-agent') || null, expires])
      res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
      res.json({ ok: true, email_verified: user.email_verified })
    } finally { client.release() }
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error', message: e.message }) }
})

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies && req.cookies[SESSION_COOKIE]
    if (token) {
      await pool.query('DELETE FROM sessions WHERE token=$1', [token])
      res.clearCookie(SESSION_COOKIE)
    }
    res.json({ ok: true })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies && req.cookies[SESSION_COOKIE]
    if (!token) return res.status(401).json({ error: 'unauthenticated' })
    const r = await pool.query('SELECT u.id,u.email,u.name,u.avatar,u.email_verified FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=$1', [token])
    if (r.rowCount === 0) return res.status(401).json({ error: 'unauthenticated' })
    res.json({ user: r.rows[0] })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// Forgot password
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'invalid_request' })
    const token = generateToken()
    const client = await pool.connect()
    try {
      await client.query('INSERT INTO otp_requests(phone,email,code,expires_at) VALUES($1,$2,$3,$4)', [null, email, token, new Date(Date.now() + 3600*1000)])
      const link = `${req.protocol}://${req.get('host')}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
      await sendEmail(email, 'Reset your Super AI password', `Click to reset: ${link}`, `<p>Click to reset: <a href="${link}">${link}</a></p>`)
      res.json({ ok: true, message: 'If SMTP is configured, you will receive a reset email' })
    } finally { client.release() }
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { email, token, password } = req.body
    if (!email || !token || !password) return res.status(400).json({ error: 'invalid_request' })
    const client = await pool.connect()
    try {
      const r = await client.query('SELECT id,expires_at,used FROM otp_requests WHERE email=$1 AND code=$2 ORDER BY id DESC LIMIT 1', [email, token])
      if (r.rowCount === 0) return res.status(400).json({ error: 'invalid_token' })
      const row = r.rows[0]
      if (row.used) return res.status(400).json({ error: 'invalid_token' })
      if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'expired' })
      const hash = await bcrypt.hash(password, 12)
      await client.query('UPDATE users SET password_hash=$1 WHERE email=$2', [hash, email])
      await client.query('UPDATE otp_requests SET used=true WHERE email=$1 AND code=$2', [email, token])
      res.json({ ok: true })
    } finally { client.release() }
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// OTP via phone (request)
router.post('/otp/request', async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'invalid_request' })
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 5*60*1000)
    await pool.query('INSERT INTO otp_requests(phone,code,expires_at) VALUES($1,$2,$3)', [phone, code, expires])
    // send SMS via Twilio if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // do not import twilio unless configured to avoid hard dependency errors
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_FROM
      try {
        const Twilio = require('twilio')
        const client = new Twilio(accountSid, authToken)
        await client.messages.create({ body: `Your Super AI OTP code: ${code}`, from, to: phone })
      } catch (e:any) { console.error('Twilio send failed', e) }
    } else {
      console.log('TWILIO not configured — OTP code for', phone, 'is', code)
    }
    res.json({ ok: true })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// OTP verify
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) return res.status(400).json({ error: 'invalid_request' })
    const r = await pool.query('SELECT id,used,expires_at FROM otp_requests WHERE phone=$1 AND code=$2 ORDER BY id DESC LIMIT 1', [phone, code])
    if (r.rowCount === 0) return res.status(400).json({ error: 'invalid_code' })
    const row = r.rows[0]
    if (row.used) return res.status(400).json({ error: 'invalid_code' })
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'expired' })
    // mark used
    await pool.query('UPDATE otp_requests SET used=true WHERE id=$1', [row.id])
    // create or find user by phone and create session
    const u = await pool.query('SELECT id FROM users WHERE phone=$1', [phone])
    let userId: number
    if (u.rowCount === 0) {
      const created = await pool.query('INSERT INTO users(phone,phone,email_verified,created_at) VALUES($1,$2,$3) RETURNING id', [phone, null, true])
      userId = created.rows[0].id
    } else {
      userId = u.rows[0].id
    }
    const token = generateToken()
    const expires = new Date(Date.now() + SESSION_TTL_DAYS*24*3600*1000)
    await pool.query('INSERT INTO sessions(user_id,token,ip,user_agent,expires_at) VALUES($1,$2,$3,$4,$5)', [userId, token, req.ip, req.get('user-agent') || null, expires])
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
    res.json({ ok: true })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'server_error' }) }
})

// Placeholder OAuth routes — only enabled if env vars set. Use passport strategies in future.
router.get('/oauth/setup-status', (req, res) => {
  const providers: any = {}
  providers.google = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  providers.facebook = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET)
  providers.twitter = !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET)
  providers.apple = !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET)
  res.json({ providers })
})

export default router
