import postgres from 'postgres'

const sql = postgres({
  host: process.env.HOST_POSTGRE,
  port: Number(process.env.PORT_POSTGRE),
  db: process.env.DB,
  user: process.env.USER_POSTGRE,
  password: process.env.PASSWORD_POSTGRE,
})

/* string literal
async function getUsersOver() {
  const users = await sql`
    select *
    from dia_phan_tinh
  `
  return users
}
*/
export default sql