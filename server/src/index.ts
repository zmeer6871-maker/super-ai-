import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import chatRouter from './routes/chat'
import uploadRouter from './routes/upload'
import historyRouter from './routes/history'
import authRouter from './routes/auth'
import paymentsRouter from './routes/payments'
import adminRouter from './routes/admin'
import { errorHandler } from './middleware/errorHandler'
import { runMigrations } from './db'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '20mb' }))
app.use(cookieParser())

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 200 })
app.use('/api/', apiLimiter)

// Run migrations if configured
if (process.env.RUN_MIGRATIONS === 'true') {
  runMigrations().catch(err => console.error('Migration error', err))
} else {
  console.log('RUN_MIGRATIONS !== true — skipping DB migrations at startup')
}

app.use('/uploads', express.static(__dirname + '/../data/uploads'))

app.use('/api/chat', chatRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/history', historyRouter)
app.use('/api/auth', authRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/admin', adminRouter)

app.use(errorHandler)

app.listen(port, () => console.log(`Server listening on ${port}`))
