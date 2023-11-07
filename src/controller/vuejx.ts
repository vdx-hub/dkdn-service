import { logger } from '@services/logger'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import type { FetchOptions } from 'ofetch'
import { ofetch } from 'ofetch'

const endpoint = process.env.VUEJX_CORE_URL || 'http://vuejx-core:3000/vuejx/'
const login_endpoint = process.env.VUEJX_CORE_LOGIN_URL || 'http://vuejx-core:3000/login'
const login_user = process.env.VUEJX_ADMIN_USER
const login_password = process.env.VUEJX_ADMIN_PASSWORD

export async function requestVuejx(query, variables, db, site, token) {
  // getToken
  if (!token)
    token = await getToken(db, site)

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('db', db)
  myHeaders.append('site', site)
  myHeaders.append('token', token)

  const graphql = {
    query,
    variables,
  }
  const requestOptions: FetchOptions = {
    method: 'POST',
    headers: myHeaders,
    body: graphql,
    retry: 3,
    retryDelay: 1000, // ms
  }
  const response = await ofetch(endpoint, requestOptions).catch(error => logger('vuejx').error(error))
  return response
}

let _USER: any
async function getToken(db, site) {
  if (_USER?.token) {
    const decoded = jwt.decode(_USER?.token) as JwtPayload
    const one_hours_miliseconds = 1000 * 60 * 60
    if ((Date.now() + one_hours_miliseconds) >= (decoded?.exp || 0) * 1000)
      _USER = await login(db, site)
  }
  else {
    _USER = await login(db, site)
  }
  return _USER?.token
}

async function login(db, site) {
  const myHeaders = new Headers()
  myHeaders.append('accept', '*/*')
  myHeaders.append('db', db)
  myHeaders.append('site', site)
  myHeaders.append('content-type', 'application/json')

  const raw = JSON.stringify({
    username: login_user,
    password: login_password,
  })

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  }

  let response
  try {
    response = await fetch(login_endpoint, requestOptions)
  }
  catch (error) {
    logger('vuejx').error(error)
  }

  // Uses the 'optional chaining' operator
  if (response?.ok) {
    const json = await response.json()
    return json
  }
  else {
    logger('vuejx').error(`Login failed, status:${response?.status}, statusText:${response?.statusText}`)
  }
}
