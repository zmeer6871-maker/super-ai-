import { runMigrations } from './index'

runMigrations().then(() => {
  console.log('Migrations complete')
}).catch(err => {
  console.error('Migration error', err)
  process.exit(1)
})
