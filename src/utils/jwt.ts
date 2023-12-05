import jwt from 'jsonwebtoken'

export async function authCheck(token, next) {
  if (!token)
    return 'Token not found!'
  const secret = process.env.SECRET_KEY || String(new Date().getTime())
  let decoded
  try {
    decoded = jwt.verify(token, secret)
  }
  catch (error) {
    next(error)
  }
  return decoded
}

export async function validateAPIkey(apiKey: string) {
  // validate Function, sync with FE
  const key = btoa(new Date().toLocaleDateString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}))
  return apiKey === key
}
