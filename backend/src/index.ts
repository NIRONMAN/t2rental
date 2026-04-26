import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  t2_rental_database: D1Database
  cache_kv: KVNamespace
  GOOGLE_CLIENT_ID: string
}

type SessionUser = {
  id: number
  email: string | null
  displayName: string | null
  anonymousAlias: string
  pictureUrl: string | null
  isAdmin: boolean
}

type RentalLocationRow = {
  id: number
  title: string
  city: string
  locality: string
  address: string
  latitude: number
  longitude: number
  rent_inr: number
  bhk: number
  area_sqft: number | null
  furnishing_status: string
  available_from: string
  description: string | null
  contact_name: string | null
  is_verified: number
  created_at: string
  updated_at: string
}

type RentalLocationSummaryRow = RentalLocationRow & {
  review_count: number | null
  avg_rating: number | null
  verification_count: number | null
  avoid_count: number | null
}

type RentalLocationResponse = {
  id: number
  title: string
  city: string
  locality: string
  address: string
  latitude: number
  longitude: number
  rentInr: number
  bhk: number
  areaSqft: number | null
  furnishingStatus: string
  availableFrom: string
  description: string | null
  contactName: string | null
  isVerified: boolean
  reviewCount: number
  averageRating: number | null
  verificationCount: number
  avoidCount: number
  createdAt: string
  updatedAt: string
}

type RentalLocationInput = {
  title: string
  city: string
  locality: string
  address: string
  latitude: number
  longitude: number
  rentInr: number
  bhk: number
  areaSqft?: number | null
  furnishingStatus?: 'unfurnished' | 'semi-furnished' | 'furnished'
  availableFrom: string
  description?: string | null
  contactName?: string | null
  isVerified?: boolean
}

type LocationReviewResponse = {
  id: number
  locationId: number
  rating: number
  recommendation: 'recommend' | 'avoid'
  comment: string
  tenantExperience: string | null
  proofOfWorkMethod: 'ad-farming'
  proofOfWorkStatus: 'verified'
  authorName: string
  isAnonymous: boolean
  createdAt: string
}

const SESSION_TTL_DAYS = 30
const KV_EDGE_CACHE_TTL_SECONDS = 60
const RENTAL_LOCATIONS_CACHE_TTL_SECONDS = 60
const RENTAL_LOCATION_DETAIL_CACHE_TTL_SECONDS = 60
const RENTAL_LOCATION_REVIEWS_CACHE_TTL_SECONDS = 45
const ADMIN_OBSERVABILITY_CACHE_TTL_SECONDS = 30
const ALIAS_ADJECTIVES = ['Calm', 'Swift', 'Wise', 'Brave', 'Quiet', 'Bright']
const ALIAS_NOUNS = ['Tenant', 'Neighbor', 'Renter', 'Citizen', 'Seeker', 'Scout']
const ADMIN_EMAILS = new Set(['hi.niranjan.gd@gmail.com'])
const CACHE_KEYS = {
  rentalLocations: 'cache:v1:rental-locations:all',
  rentalLocationById: (id: number) => `cache:v1:rental-locations:${id}`,
  rentalLocationReviews: (id: number) => `cache:v1:rental-locations:${id}:reviews`,
  adminObservability: 'cache:v1:admin:observability',
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({ origin: '*' }))
app.options('/api/*', (c) => c.body(null, 204))

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toLocationResponse(row: RentalLocationSummaryRow): RentalLocationResponse {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    locality: row.locality,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    rentInr: row.rent_inr,
    bhk: row.bhk,
    areaSqft: row.area_sqft,
    furnishingStatus: row.furnishing_status,
    availableFrom: row.available_from,
    description: row.description,
    contactName: row.contact_name,
    isVerified: row.is_verified === 1,
    reviewCount: row.review_count ?? 0,
    averageRating: row.avg_rating === null ? null : Number(row.avg_rating.toFixed(2)),
    verificationCount: row.verification_count ?? 0,
    avoidCount: row.avoid_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseIdParam(idParam: string): number | null {
  const id = Number.parseInt(idParam, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

async function getCachedJson<T>(env: Bindings, key: string): Promise<T | null> {
  try {
    return await env.cache_kv.get<T>(key, {
      type: 'json',
      cacheTtl: KV_EDGE_CACHE_TTL_SECONDS,
    })
  } catch (error) {
    console.error('KV cache read failed', { key, error })
    return null
  }
}

async function putCachedJson<T>(env: Bindings, key: string, value: T, expirationTtl: number): Promise<void> {
  try {
    await env.cache_kv.put(key, JSON.stringify(value), { expirationTtl })
  } catch (error) {
    console.error('KV cache write failed', { key, error })
  }
}

async function deleteCachedKeys(env: Bindings, keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await env.cache_kv.delete(key)
      } catch (error) {
        console.error('KV cache delete failed', { key, error })
      }
    })
  )
}

async function invalidateLocationCaches(env: Bindings, locationId: number): Promise<void> {
  await deleteCachedKeys(env, [
    CACHE_KEYS.rentalLocations,
    CACHE_KEYS.rentalLocationById(locationId),
    CACHE_KEYS.rentalLocationReviews(locationId),
    CACHE_KEYS.adminObservability,
  ])
}

function parseRentalLocationPayload(body: unknown): RentalLocationInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object.' }
  }

  const payload = body as Record<string, unknown>
  const title = normalizeString(payload.title)
  const city = normalizeString(payload.city)
  const locality = normalizeString(payload.locality)
  const address = normalizeString(payload.address)
  const availableFrom = normalizeString(payload.availableFrom)

  if (!title || !city || !locality || !address || !availableFrom) {
    return { error: 'title, city, locality, address, and availableFrom are required.' }
  }

  if (!isFiniteNumber(payload.latitude) || !isFiniteNumber(payload.longitude)) {
    return { error: 'latitude and longitude must be valid numbers.' }
  }

  if (!Number.isInteger(payload.rentInr) || (payload.rentInr as number) <= 0) {
    return { error: 'rentInr must be a positive integer.' }
  }

  if (!Number.isInteger(payload.bhk) || (payload.bhk as number) <= 0) {
    return { error: 'bhk must be a positive integer.' }
  }

  const areaSqft = payload.areaSqft
  if (areaSqft !== undefined && areaSqft !== null) {
    if (typeof areaSqft !== 'number' || !Number.isInteger(areaSqft) || areaSqft <= 0) {
      return { error: 'areaSqft must be a positive integer when provided.' }
    }
  }

  const validFurnishing = ['unfurnished', 'semi-furnished', 'furnished'] as const
  const furnishingStatus = payload.furnishingStatus
  if (
    furnishingStatus !== undefined
    && furnishingStatus !== null
    && (typeof furnishingStatus !== 'string' || !validFurnishing.includes(furnishingStatus as (typeof validFurnishing)[number]))
  ) {
    return { error: 'furnishingStatus must be unfurnished, semi-furnished, or furnished.' }
  }

  const description = payload.description === undefined ? undefined : normalizeString(payload.description)
  const contactName = payload.contactName === undefined ? undefined : normalizeString(payload.contactName)
  const isVerified = payload.isVerified
  if (isVerified !== undefined && typeof isVerified !== 'boolean') {
    return { error: 'isVerified must be a boolean when provided.' }
  }

  return {
    title,
    city,
    locality,
    address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    rentInr: payload.rentInr as number,
    bhk: payload.bhk as number,
    areaSqft: (areaSqft as number | null | undefined) ?? null,
    furnishingStatus: (furnishingStatus as RentalLocationInput['furnishingStatus']) ?? 'unfurnished',
    availableFrom,
    description: description ?? null,
    contactName: contactName ?? null,
    isVerified: isVerified ?? false,
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function generateAnonymousAlias(): string {
  const adjective = ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)]
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)]
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${adjective}${noun}${suffix}`
}

function readBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null
  }

  const token = headerValue.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

function isAdminEmail(email: string | null): boolean {
  if (!email) {
    return false
  }
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}

async function getSessionUser(c: { req: { header: (name: string) => string | undefined }, env: Bindings }): Promise<SessionUser | null> {
  const sessionToken = readBearerToken(c.req.header('Authorization'))
  if (!sessionToken) {
    return null
  }

  const tokenHash = await sha256Hex(sessionToken)
  const nowIso = new Date().toISOString()

  const row = await c.env.t2_rental_database
    .prepare(
      `SELECT
        users.id,
        users.email,
        users.display_name,
        users.anonymous_alias,
        users.picture_url
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ?
        AND user_sessions.revoked_at IS NULL
        AND user_sessions.expires_at > ?`
    )
    .bind(tokenHash, nowIso)
    .first<{
      id: number
      email: string | null
      display_name: string | null
      anonymous_alias: string
      picture_url: string | null
    }>()

  if (!row) {
    return null
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    anonymousAlias: row.anonymous_alias,
    pictureUrl: row.picture_url,
    isAdmin: isAdminEmail(row.email),
  }
}

function requireAuth(user: SessionUser | null): { error: string } | null {
  if (!user) {
    return { error: 'Authentication required. Sign in with Google first.' }
  }

  return null
}

function requireAdmin(user: SessionUser | null): { error: string } | null {
  const authError = requireAuth(user)
  if (authError) {
    return authError
  }

  if (!user?.isAdmin) {
    return { error: 'Admin access required.' }
  }

  return null
}

async function ensureLocationExists(db: D1Database, locationId: number): Promise<boolean> {
  const row = await db.prepare('SELECT id FROM rental_locations WHERE id = ?').bind(locationId).first<{ id: number }>()
  return Boolean(row)
}

async function updateVerificationStatus(db: D1Database, locationId: number): Promise<number> {
  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM location_verifications WHERE location_id = ?')
    .bind(locationId)
    .first<{ count: number }>()

  const verificationCount = countRow?.count ?? 0
  const isVerified = verificationCount >= 2 ? 1 : 0

  await db
    .prepare('UPDATE rental_locations SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(isVerified, locationId)
    .run()

  return verificationCount
}

app.get('/', (c) => c.json({ service: 't2rental-backend', status: 'ok' }))

app.post('/api/auth/google', async (c) => {
  const googleClientId = normalizeString(c.env.GOOGLE_CLIENT_ID)
  if (!googleClientId) {
    return c.json({ error: 'Server misconfiguration: GOOGLE_CLIENT_ID missing.' }, 500)
  }

  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const idToken = normalizeString(body?.idToken)

  if (!idToken) {
    return c.json({ error: 'idToken is required.' }, 400)
  }

  const verificationResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  if (!verificationResponse.ok) {
    return c.json({ error: 'Invalid Google token.' }, 401)
  }

  const tokenInfo = await verificationResponse.json() as {
    aud?: string
    sub?: string
    email?: string
    email_verified?: string
    name?: string
    picture?: string
  }

  if (tokenInfo.aud !== googleClientId || !tokenInfo.sub) {
    return c.json({ error: 'Google token audience mismatch.' }, 401)
  }

  if (tokenInfo.email_verified && tokenInfo.email_verified !== 'true') {
    return c.json({ error: 'Google account email is not verified.' }, 401)
  }

  const nowIso = new Date().toISOString()
  const existing = await c.env.t2_rental_database
    .prepare(
      `SELECT id, email, display_name, anonymous_alias, picture_url
      FROM users
      WHERE google_sub = ?`
    )
    .bind(tokenInfo.sub)
    .first<{
      id: number
      email: string | null
      display_name: string | null
      anonymous_alias: string
      picture_url: string | null
    }>()

  let user = existing

  if (!user) {
    const anonymousAlias = generateAnonymousAlias()
    const result = await c.env.t2_rental_database
      .prepare(
        `INSERT INTO users (
          google_sub,
          email,
          display_name,
          anonymous_alias,
          picture_url,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tokenInfo.sub,
        normalizeString(tokenInfo.email),
        normalizeString(tokenInfo.name),
        anonymousAlias,
        normalizeString(tokenInfo.picture),
        nowIso,
        nowIso
      )
      .run()

    user = await c.env.t2_rental_database
      .prepare('SELECT id, email, display_name, anonymous_alias, picture_url FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<{
        id: number
        email: string | null
        display_name: string | null
        anonymous_alias: string
        picture_url: string | null
      }>()
  } else {
    await c.env.t2_rental_database
      .prepare(
        `UPDATE users SET
          email = ?,
          display_name = ?,
          picture_url = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .bind(
        normalizeString(tokenInfo.email),
        normalizeString(tokenInfo.name),
        normalizeString(tokenInfo.picture),
        nowIso,
        user.id
      )
      .run()
  }

  if (!user) {
    return c.json({ error: 'Failed to create user session.' }, 500)
  }

  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await c.env.t2_rental_database
    .prepare('INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(user.id, tokenHash, expiresAt, nowIso)
    .run()

  await deleteCachedKeys(c.env, [CACHE_KEYS.adminObservability])

  return c.json({
    data: {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        anonymousAlias: user.anonymous_alias,
        pictureUrl: user.picture_url,
        isAdmin: isAdminEmail(user.email),
      },
    },
  })
})

app.get('/api/auth/session', async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: 'No active session.' }, 401)
  }

  return c.json({ data: { user } })
})

app.get('/api/rental-locations', async (c) => {
  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const cached = await getCachedJson<RentalLocationResponse[]>(c.env, CACHE_KEYS.rentalLocations)
  if (cached) {
    return c.json({ data: cached })
  }

  const result = await c.env.t2_rental_database
    .prepare(
      `SELECT
        rental_locations.*,
        COALESCE(reviews.review_count, 0) AS review_count,
        reviews.avg_rating AS avg_rating,
        COALESCE(verifications.verification_count, 0) AS verification_count,
        COALESCE(reviews.avoid_count, 0) AS avoid_count
      FROM rental_locations
      LEFT JOIN (
        SELECT
          location_id,
          COUNT(*) AS review_count,
          AVG(rating) AS avg_rating,
          SUM(CASE WHEN recommendation = 'avoid' THEN 1 ELSE 0 END) AS avoid_count
        FROM location_reviews
        GROUP BY location_id
      ) AS reviews ON reviews.location_id = rental_locations.id
      LEFT JOIN (
        SELECT location_id, COUNT(*) AS verification_count
        FROM location_verifications
        GROUP BY location_id
      ) AS verifications ON verifications.location_id = rental_locations.id
      ORDER BY rental_locations.created_at DESC`
    )
    .all<RentalLocationSummaryRow>()

  const records = (result.results ?? []).map(toLocationResponse)
  await putCachedJson(c.env, CACHE_KEYS.rentalLocations, records, RENTAL_LOCATIONS_CACHE_TTL_SECONDS)
  return c.json({ data: records })
})

app.get('/api/rental-locations/:id', async (c) => {
  const id = parseIdParam(c.req.param('id'))
  if (!id) {
    return c.json({ error: 'Invalid id.' }, 400)
  }

  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const cacheKey = CACHE_KEYS.rentalLocationById(id)
  const cached = await getCachedJson<RentalLocationResponse>(c.env, cacheKey)
  if (cached) {
    return c.json({ data: cached })
  }

  const row = await c.env.t2_rental_database
    .prepare(
      `SELECT
        rental_locations.*,
        COALESCE(reviews.review_count, 0) AS review_count,
        reviews.avg_rating AS avg_rating,
        COALESCE(verifications.verification_count, 0) AS verification_count,
        COALESCE(reviews.avoid_count, 0) AS avoid_count
      FROM rental_locations
      LEFT JOIN (
        SELECT
          location_id,
          COUNT(*) AS review_count,
          AVG(rating) AS avg_rating,
          SUM(CASE WHEN recommendation = 'avoid' THEN 1 ELSE 0 END) AS avoid_count
        FROM location_reviews
        GROUP BY location_id
      ) AS reviews ON reviews.location_id = rental_locations.id
      LEFT JOIN (
        SELECT location_id, COUNT(*) AS verification_count
        FROM location_verifications
        GROUP BY location_id
      ) AS verifications ON verifications.location_id = rental_locations.id
      WHERE rental_locations.id = ?`
    )
    .bind(id)
    .first<RentalLocationSummaryRow>()

  if (!row) {
    return c.json({ error: 'Rental location not found.' }, 404)
  }

  const data = toLocationResponse(row)
  await putCachedJson(c.env, cacheKey, data, RENTAL_LOCATION_DETAIL_CACHE_TTL_SECONDS)
  return c.json({ data })
})

app.post('/api/rental-locations', async (c) => {
  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = parseRentalLocationPayload(body)

  if ('error' in parsed) {
    return c.json({ error: parsed.error }, 400)
  }

  const insertResult = await c.env.t2_rental_database
    .prepare(
      `INSERT INTO rental_locations (
        title, city, locality, address, latitude, longitude,
        rent_inr, bhk, area_sqft, furnishing_status, available_from,
        description, contact_name, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      parsed.title,
      parsed.city,
      parsed.locality,
      parsed.address,
      parsed.latitude,
      parsed.longitude,
      parsed.rentInr,
      parsed.bhk,
      parsed.areaSqft,
      parsed.furnishingStatus,
      parsed.availableFrom,
      parsed.description,
      parsed.contactName,
      parsed.isVerified ? 1 : 0
    )
    .run()

  const created = await c.env.t2_rental_database
    .prepare(
      `SELECT
        rental_locations.*,
        0 AS review_count,
        NULL AS avg_rating,
        0 AS verification_count,
        0 AS avoid_count
      FROM rental_locations
      WHERE id = ?`
    )
    .bind(insertResult.meta.last_row_id)
    .first<RentalLocationSummaryRow>()

  if (!created) {
    return c.json({ error: 'Failed to create rental location.' }, 500)
  }

  await deleteCachedKeys(c.env, [CACHE_KEYS.rentalLocations, CACHE_KEYS.adminObservability])
  return c.json({ data: toLocationResponse(created) }, 201)
})

app.post('/api/rental-locations/:id/verify', async (c) => {
  const locationId = parseIdParam(c.req.param('id'))
  if (!locationId) {
    return c.json({ error: 'Invalid id.' }, 400)
  }

  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const exists = await ensureLocationExists(c.env.t2_rental_database, locationId)
  if (!exists) {
    return c.json({ error: 'Rental location not found.' }, 404)
  }

  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const note = normalizeString(body?.note)

  const insertResult = await c.env.t2_rental_database
    .prepare(
      `INSERT INTO location_verifications (location_id, user_id, note)
      VALUES (?, ?, ?)
      ON CONFLICT(location_id, user_id)
      DO UPDATE SET note = excluded.note`
    )
    .bind(locationId, user!.id, note)
    .run()

  if (!insertResult.success) {
    return c.json({ error: 'Failed to save verification.' }, 500)
  }

  const verificationCount = await updateVerificationStatus(c.env.t2_rental_database, locationId)
  await invalidateLocationCaches(c.env, locationId)
  return c.json({
    data: {
      locationId,
      verificationCount,
      isVerified: verificationCount >= 2,
    },
  })
})

app.get('/api/rental-locations/:id/reviews', async (c) => {
  const locationId = parseIdParam(c.req.param('id'))
  if (!locationId) {
    return c.json({ error: 'Invalid id.' }, 400)
  }

  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const exists = await ensureLocationExists(c.env.t2_rental_database, locationId)
  if (!exists) {
    return c.json({ error: 'Rental location not found.' }, 404)
  }

  const cacheKey = CACHE_KEYS.rentalLocationReviews(locationId)
  const cached = await getCachedJson<{
    reviews: LocationReviewResponse[]
    summary: {
      reviewCount: number
      averageRating: number | null
      avoidCount: number
    }
  }>(c.env, cacheKey)
  if (cached) {
    return c.json({ data: cached })
  }

  const reviewsResult = await c.env.t2_rental_database
    .prepare(
      `SELECT
        location_reviews.id,
        location_reviews.location_id,
        location_reviews.rating,
        location_reviews.recommendation,
        location_reviews.comment,
        location_reviews.tenant_experience,
        location_reviews.is_anonymous,
        location_reviews.proof_of_work_method,
        location_reviews.proof_of_work_status,
        location_reviews.created_at,
        users.display_name,
        users.anonymous_alias
      FROM location_reviews
      INNER JOIN users ON users.id = location_reviews.user_id
      WHERE location_reviews.location_id = ?
      ORDER BY location_reviews.created_at DESC`
    )
    .bind(locationId)
    .all<{
      id: number
      location_id: number
      rating: number
      recommendation: 'recommend' | 'avoid'
      comment: string
      tenant_experience: string | null
      is_anonymous: number
      proof_of_work_method: 'ad-farming'
      proof_of_work_status: 'verified'
      created_at: string
      display_name: string | null
      anonymous_alias: string
    }>()

  const summary = await c.env.t2_rental_database
    .prepare(
      `SELECT
        COUNT(*) AS review_count,
        AVG(rating) AS average_rating,
        SUM(CASE WHEN recommendation = 'avoid' THEN 1 ELSE 0 END) AS avoid_count
      FROM location_reviews
      WHERE location_id = ?`
    )
    .bind(locationId)
    .first<{ review_count: number, average_rating: number | null, avoid_count: number | null }>()

  const reviews: LocationReviewResponse[] = (reviewsResult.results ?? []).map((review) => ({
    id: review.id,
    locationId: review.location_id,
    rating: review.rating,
    recommendation: review.recommendation,
    comment: review.comment,
    tenantExperience: review.tenant_experience,
    proofOfWorkMethod: review.proof_of_work_method,
    proofOfWorkStatus: review.proof_of_work_status,
    authorName: review.is_anonymous === 1 ? review.anonymous_alias : (review.display_name ?? review.anonymous_alias),
    isAnonymous: review.is_anonymous === 1,
    createdAt: review.created_at,
  }))

  const data = {
    reviews,
    summary: {
      reviewCount: summary?.review_count ?? 0,
      averageRating: summary?.average_rating === null || summary?.average_rating === undefined
        ? null
        : Number(summary.average_rating.toFixed(2)),
      avoidCount: summary?.avoid_count ?? 0,
    },
  }

  await putCachedJson(c.env, cacheKey, data, RENTAL_LOCATION_REVIEWS_CACHE_TTL_SECONDS)
  return c.json({ data })
})

app.post('/api/rental-locations/:id/reviews', async (c) => {
  const locationId = parseIdParam(c.req.param('id'))
  if (!locationId) {
    return c.json({ error: 'Invalid id.' }, 400)
  }

  const user = await getSessionUser(c)
  const authError = requireAuth(user)
  if (authError) {
    return c.json(authError, 401)
  }

  const exists = await ensureLocationExists(c.env.t2_rental_database, locationId)
  if (!exists) {
    return c.json({ error: 'Rental location not found.' }, 404)
  }

  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Request body must be a JSON object.' }, 400)
  }

  const payload = body as Record<string, unknown>
  const rating = payload.rating
  const recommendation = payload.recommendation
  const comment = normalizeString(payload.comment)
  const tenantExperience = normalizeString(payload.tenantExperience)
  const isAnonymous = payload.isAnonymous
  const proofOfWorkConfirmed = payload.proofOfWorkConfirmed

  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return c.json({ error: 'rating must be an integer from 1 to 5.' }, 400)
  }

  if (recommendation !== 'recommend' && recommendation !== 'avoid') {
    return c.json({ error: "recommendation must be 'recommend' or 'avoid'." }, 400)
  }

  if (!comment) {
    return c.json({ error: 'comment is required.' }, 400)
  }

  if (typeof isAnonymous !== 'boolean') {
    return c.json({ error: 'isAnonymous must be a boolean.' }, 400)
  }

  if (proofOfWorkConfirmed !== true) {
    return c.json({
      error: 'Review submission requires proof-of-work through ad farming acknowledgement.',
    }, 400)
  }

  const nowIso = new Date().toISOString()

  const upsert = await c.env.t2_rental_database
    .prepare(
      `INSERT INTO location_reviews (
        location_id,
        user_id,
        rating,
        recommendation,
        comment,
        tenant_experience,
        is_anonymous,
        proof_of_work_method,
        proof_of_work_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ad-farming', 'verified', ?, ?)
      ON CONFLICT(location_id, user_id)
      DO UPDATE SET
        rating = excluded.rating,
        recommendation = excluded.recommendation,
        comment = excluded.comment,
        tenant_experience = excluded.tenant_experience,
        is_anonymous = excluded.is_anonymous,
        proof_of_work_method = 'ad-farming',
        proof_of_work_status = 'verified',
        updated_at = excluded.updated_at`
    )
    .bind(
      locationId,
      user!.id,
      rating,
      recommendation,
      comment,
      tenantExperience,
      isAnonymous ? 1 : 0,
      nowIso,
      nowIso
    )
    .run()

  if (!upsert.success) {
    return c.json({ error: 'Failed to save review.' }, 500)
  }

  const saved = await c.env.t2_rental_database
    .prepare(
      `SELECT
        location_reviews.id,
        location_reviews.location_id,
        location_reviews.rating,
        location_reviews.recommendation,
        location_reviews.comment,
        location_reviews.tenant_experience,
        location_reviews.is_anonymous,
        location_reviews.proof_of_work_method,
        location_reviews.proof_of_work_status,
        location_reviews.created_at,
        users.display_name,
        users.anonymous_alias
      FROM location_reviews
      INNER JOIN users ON users.id = location_reviews.user_id
      WHERE location_reviews.location_id = ? AND location_reviews.user_id = ?`
    )
    .bind(locationId, user!.id)
    .first<{
      id: number
      location_id: number
      rating: number
      recommendation: 'recommend' | 'avoid'
      comment: string
      tenant_experience: string | null
      is_anonymous: number
      proof_of_work_method: 'ad-farming'
      proof_of_work_status: 'verified'
      created_at: string
      display_name: string | null
      anonymous_alias: string
    }>()

  if (!saved) {
    return c.json({ error: 'Failed to fetch saved review.' }, 500)
  }

  const response: LocationReviewResponse = {
    id: saved.id,
    locationId: saved.location_id,
    rating: saved.rating,
    recommendation: saved.recommendation,
    comment: saved.comment,
    tenantExperience: saved.tenant_experience,
    proofOfWorkMethod: saved.proof_of_work_method,
    proofOfWorkStatus: saved.proof_of_work_status,
    authorName: saved.is_anonymous === 1 ? saved.anonymous_alias : (saved.display_name ?? saved.anonymous_alias),
    isAnonymous: saved.is_anonymous === 1,
    createdAt: saved.created_at,
  }

  await invalidateLocationCaches(c.env, locationId)
  return c.json({ data: response }, 201)
})

app.get('/api/admin/observability', async (c) => {
  const user = await getSessionUser(c)
  const adminError = requireAdmin(user)
  if (adminError) {
    return c.json(adminError, user ? 403 : 401)
  }

  const cached = await getCachedJson<{
    totals: {
      users: number
      listings: number
      reviews: number
      verifications: number
      activeSessions: number
    }
    last7Days: {
      newUsers: number
      newListings: number
      newReviews: number
      signIns: number
    }
    topCities: Array<{ city: string, count: number }>
    recentActivity: Array<{
      type: 'listing_created' | 'review_submitted'
      entityId: number
      label: string
      context: string
      createdAt: string
    }>
  }>(c.env, CACHE_KEYS.adminObservability)
  if (cached) {
    return c.json({ data: cached })
  }

  const [totalUsers, totalListings, totalReviews, totalVerifications, activeSessions] = await Promise.all([
    c.env.t2_rental_database.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>(),
    c.env.t2_rental_database.prepare('SELECT COUNT(*) AS count FROM rental_locations').first<{ count: number }>(),
    c.env.t2_rental_database.prepare('SELECT COUNT(*) AS count FROM location_reviews').first<{ count: number }>(),
    c.env.t2_rental_database.prepare('SELECT COUNT(*) AS count FROM location_verifications').first<{ count: number }>(),
    c.env.t2_rental_database
      .prepare('SELECT COUNT(*) AS count FROM user_sessions WHERE revoked_at IS NULL AND expires_at > ?')
      .bind(new Date().toISOString())
      .first<{ count: number }>(),
  ])

  const last7Days = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()
  const [newUsers7d, newListings7d, newReviews7d, signIns7d] = await Promise.all([
    c.env.t2_rental_database
      .prepare('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?')
      .bind(last7Days)
      .first<{ count: number }>(),
    c.env.t2_rental_database
      .prepare('SELECT COUNT(*) AS count FROM rental_locations WHERE created_at >= ?')
      .bind(last7Days)
      .first<{ count: number }>(),
    c.env.t2_rental_database
      .prepare('SELECT COUNT(*) AS count FROM location_reviews WHERE created_at >= ?')
      .bind(last7Days)
      .first<{ count: number }>(),
    c.env.t2_rental_database
      .prepare('SELECT COUNT(*) AS count FROM user_sessions WHERE created_at >= ?')
      .bind(last7Days)
      .first<{ count: number }>(),
  ])

  const topCities = await c.env.t2_rental_database
    .prepare(
      `SELECT city, COUNT(*) AS count
      FROM rental_locations
      GROUP BY city
      ORDER BY count DESC, city ASC
      LIMIT 5`
    )
    .all<{ city: string, count: number }>()

  const recentActivity = await c.env.t2_rental_database
    .prepare(
      `SELECT *
      FROM (
        SELECT
          'listing_created' AS event_type,
          rental_locations.id AS entity_id,
          rental_locations.title AS label,
          rental_locations.city AS context,
          rental_locations.created_at AS created_at
        FROM rental_locations
        UNION ALL
        SELECT
          'review_submitted' AS event_type,
          location_reviews.id AS entity_id,
          users.anonymous_alias AS label,
          location_reviews.recommendation AS context,
          location_reviews.created_at AS created_at
        FROM location_reviews
        INNER JOIN users ON users.id = location_reviews.user_id
      ) activity
      ORDER BY created_at DESC
      LIMIT 20`
    )
    .all<{
      event_type: 'listing_created' | 'review_submitted'
      entity_id: number
      label: string
      context: string
      created_at: string
    }>()

  const data = {
    totals: {
      users: totalUsers?.count ?? 0,
      listings: totalListings?.count ?? 0,
      reviews: totalReviews?.count ?? 0,
      verifications: totalVerifications?.count ?? 0,
      activeSessions: activeSessions?.count ?? 0,
    },
    last7Days: {
      newUsers: newUsers7d?.count ?? 0,
      newListings: newListings7d?.count ?? 0,
      newReviews: newReviews7d?.count ?? 0,
      signIns: signIns7d?.count ?? 0,
    },
    topCities: topCities.results ?? [],
    recentActivity: (recentActivity.results ?? []).map((row) => ({
      type: row.event_type,
      entityId: row.entity_id,
      label: row.label,
      context: row.context,
      createdAt: row.created_at,
    })),
  }

  await putCachedJson(c.env, CACHE_KEYS.adminObservability, data, ADMIN_OBSERVABILITY_CACHE_TTL_SECONDS)
  return c.json({ data })
})

export default app
