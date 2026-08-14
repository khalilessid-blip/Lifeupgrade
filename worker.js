const SESSION_COOKIE = "lu_session";
const SESSION_DAYS = 30;

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    try {

      if (url.pathname === "/api/health") {
        return await health(env);
      }

      if (
        url.pathname === "/api/auth/register" &&
        request.method === "POST"
      ) {
        return await register(request, env);
      }

      if (
        url.pathname === "/api/auth/login" &&
        request.method === "POST"
      ) {
        return await login(request, env);
      }

      if (
        url.pathname === "/api/auth/me" &&
        request.method === "GET"
      ) {
        return await me(request, env);
      }

      if (
        url.pathname === "/api/auth/logout" &&
        request.method === "POST"
      ) {
        return await logout(request, env);
      }

      if (url.pathname.startsWith("/api/")) {

        return json({
          ok: false,
          error: "NOT_FOUND",
          message: "Route API inconnue."
        }, 404);

      }

      return env.ASSETS.fetch(request);

    } catch (error) {

      console.error("LIFE UPGRADE ERROR:", error);

      return json({
        ok: false,
        error: "INTERNAL_ERROR",
        message: error?.message || "Erreur interne.",
        details: String(error),
        stack: error?.stack || null
      }, 500);

    }

  }

};


/* ============================================================
   HEALTH
============================================================ */

async function health(env) {

  if (!env.DB) {

    throw new Error(
      "Binding D1 DB introuvable."
    );

  }

  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) AS total
      FROM users
    `)
    .first();

  return json({
    ok: true,
    service: "Life Upgrade API",
    database: "connected",
    users: Number(result?.total || 0),
    timestamp: new Date().toISOString()
  });

}


/* ============================================================
   REGISTER
============================================================ */

async function register(request, env) {

  if (!env.DB) {

    throw new Error(
      "Binding D1 DB introuvable."
    );

  }

  const body = await readJson(request);

  if (!body) {

    return json({
      ok: false,
      error: "INVALID_JSON",
      message: "Données invalides."
    }, 400);

  }


  const firstName =
    clean(body.firstName, 80);

  const lastName =
    clean(body.lastName, 80);

  const email =
    normalizeEmail(body.email);

  const country =
    clean(body.country, 80);

  const phone =
    clean(body.phone, 40);

  const password =
    String(body.password || "");

  const situation =
    clean(body.situation, 80);

  const goal90 =
    clean(body.goal90, 2000);

  const goal365 =
    clean(body.goal365, 2000);

  const weeklyTime =
    Number(body.weeklyTime || 0);

  const interests =
    Array.isArray(body.interests)
      ? body.interests
          .slice(0, 50)
          .map(item => clean(item, 80))
          .filter(Boolean)
      : [];


  if (
    !firstName ||
    !lastName ||
    !email ||
    !country ||
    !password
  ) {

    return json({
      ok: false,
      error: "MISSING_FIELDS",
      message: "Complète les champs obligatoires."
    }, 400);

  }


  if (!isValidEmail(email)) {

    return json({
      ok: false,
      error: "INVALID_EMAIL",
      message: "Adresse email invalide."
    }, 400);

  }


  if (password.length < 8) {

    return json({
      ok: false,
      error: "WEAK_PASSWORD",
      message:
        "Le mot de passe doit contenir au moins 8 caractères."
    }, 400);

  }


  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .bind(email)
    .first();


  if (existing) {

    return json({
      ok: false,
      error: "EMAIL_EXISTS",
      message:
        "Un compte existe déjà avec cette adresse email."
    }, 409);

  }


  const passwordHash =
    await hashPassword(password);


  /*
    1. UTILISATEUR
  */

  const userResult = await env.DB
    .prepare(`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        country,
        phone,
        status,
        subscription_type,
        email_verified
      )
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'FREE', 0)
    `)
    .bind(
      email,
      passwordHash,
      firstName,
      lastName,
      country,
      phone
    )
    .run();


  if (!userResult.success) {

    throw new Error(
      "Échec de création de l'utilisateur."
    );

  }


  const userId =
    Number(userResult.meta?.last_row_id);


  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {

    throw new Error(
      "D1 n'a pas retourné l'identifiant du nouvel utilisateur."
    );

  }


  /*
    2. PROFIL
  */

  await env.DB
    .prepare(`
      INSERT INTO profiles (
        user_id,
        situation,
        weekly_time,
        goal_90_days,
        goal_365_days,
        interests_json,
        preferences_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      userId,
      situation || null,
      Number.isFinite(weeklyTime)
        ? weeklyTime
        : null,
      goal90 || null,
      goal365 || null,
      JSON.stringify(interests),
      JSON.stringify({})
    )
    .run();


  /*
    3. RÔLE MEMBER
  */

  const memberRole = await env.DB
    .prepare(`
      SELECT id
      FROM roles
      WHERE code = 'MEMBER'
      LIMIT 1
    `)
    .first();


  if (!memberRole) {

    throw new Error(
      "Le rôle MEMBER n'existe pas dans la base."
    );

  }


  await env.DB
    .prepare(`
      INSERT OR IGNORE INTO user_roles (
        user_id,
        role_id
      )
      VALUES (?, ?)
    `)
    .bind(
      userId,
      memberRole.id
    )
    .run();


  /*
    4. CONFIDENTIALITÉ
  */

  await env.DB
    .prepare(`
      INSERT OR IGNORE INTO privacy_preferences (
        user_id
      )
      VALUES (?)
    `)
    .bind(userId)
    .run();


  /*
    5. ÉVALUATION PERSONNALISÉE
  */

  const assessmentConfig =
    buildAssessmentConfiguration(
      situation,
      interests
    );


  await env.DB
    .prepare(`
      INSERT INTO personalized_assessments (
        user_id,
        title,
        total_questions,
        configuration_json,
        status
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      userId,
      "Évaluation personnalisée Life Upgrade",
      50,
      JSON.stringify(assessmentConfig),
      "READY"
    )
    .run();


  /*
    6. SESSION
  */

  const session =
    await createSession(
      env,
      userId
    );


  /*
    7. AUDIT
  */

  await safeAudit(
    env,
    userId,
    "USER_REGISTER",
    "USER",
    String(userId),
    {
      email
    }
  );


  return json(
    {
      ok: true,

      user: {
        id: userId,
        email,
        firstName,
        lastName,
        subscription: "FREE",
        roles: ["MEMBER"]
      },

      assessment: {
        questions: 50,
        configuration: assessmentConfig
      }
    },
    201,
    {
      "Set-Cookie":
        buildSessionCookie(
          session.token,
          session.expiresAt
        )
    }
  );

}


/* ============================================================
   LOGIN
============================================================ */

async function login(request, env) {

  const body =
    await readJson(request);

  if (!body) {

    return json({
      ok: false,
      message: "Données invalides."
    }, 400);

  }


  const email =
    normalizeEmail(body.email);

  const password =
    String(body.password || "");


  if (!email || !password) {

    return json({
      ok: false,
      message:
        "Email et mot de passe requis."
    }, 400);

  }


  const user = await env.DB
    .prepare(`
      SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        country,
        phone,
        status,
        subscription_type,
        email_verified
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .bind(email)
    .first();


  if (!user) {

    return invalidCredentials();

  }


  if (user.status !== "ACTIVE") {

    return json({
      ok: false,
      message:
        "Ce compte n'est pas actif."
    }, 403);

  }


  const valid =
    await verifyPassword(
      password,
      user.password_hash
    );


  if (!valid) {

    return invalidCredentials();

  }


  const session =
    await createSession(
      env,
      user.id
    );


  const roles =
    await getUserRoles(
      env,
      user.id
    );


  await safeAudit(
    env,
    user.id,
    "USER_LOGIN",
    "USER",
    String(user.id),
    {}
  );


  return json(
    {
      ok: true,

      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        country: user.country,
        phone: user.phone,
        subscription:
          user.subscription_type,
        roles
      }
    },
    200,
    {
      "Set-Cookie":
        buildSessionCookie(
          session.token,
          session.expiresAt
        )
    }
  );

}


/* ============================================================
   ME
============================================================ */

async function me(request, env) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );


  if (!user) {

    return json({
      ok: false,
      authenticated: false
    }, 401);

  }


  const roles =
    await getUserRoles(
      env,
      user.id
    );


  const profile =
    await env.DB
      .prepare(`
        SELECT
          situation,
          weekly_time,
          goal_90_days,
          goal_365_days,
          interests_json,
          preferences_json
        FROM profiles
        WHERE user_id = ?
        LIMIT 1
      `)
      .bind(user.id)
      .first();


  return json({

    ok: true,
    authenticated: true,

    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      country: user.country,
      phone: user.phone,
      subscription:
        user.subscription_type,
      emailVerified:
        Boolean(user.email_verified),
      roles
    },

    profile: {
      situation:
        profile?.situation || null,

      weeklyTime:
        profile?.weekly_time || 0,

      goal90:
        profile?.goal_90_days || "",

      goal365:
        profile?.goal_365_days || "",

      interests:
        parseJson(
          profile?.interests_json,
          []
        ),

      preferences:
        parseJson(
          profile?.preferences_json,
          {}
        )
    }

  });

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout(request, env) {

  const token =
    getCookie(
      request,
      SESSION_COOKIE
    );


  if (token) {

    const tokenHash =
      await sha256Hex(token);


    await env.DB
      .prepare(`
        UPDATE auth_sessions
        SET revoked_at = ?
        WHERE token_hash = ?
      `)
      .bind(
        new Date().toISOString(),
        tokenHash
      )
      .run();

  }


  return json(
    {
      ok: true
    },
    200,
    {
      "Set-Cookie":
        `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    }
  );

}


/* ============================================================
   AUTHENTICATED USER
============================================================ */

async function getAuthenticatedUser(
  request,
  env
) {

  const token =
    getCookie(
      request,
      SESSION_COOKIE
    );


  if (!token) {

    return null;

  }


  const hash =
    await sha256Hex(token);


  return env.DB
    .prepare(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.country,
        u.phone,
        u.status,
        u.subscription_type,
        u.email_verified

      FROM auth_sessions s

      JOIN users u
        ON u.id = s.user_id

      WHERE
        s.token_hash = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > ?
        AND u.status = 'ACTIVE'

      LIMIT 1
    `)
    .bind(
      hash,
      new Date().toISOString()
    )
    .first();

}


/* ============================================================
   SESSION
============================================================ */

async function createSession(
  env,
  userId
) {

  const token =
    randomToken(32);


  const tokenHash =
    await sha256Hex(token);


  const expires =
    new Date(
      Date.now() +
      SESSION_DAYS *
      24 *
      60 *
      60 *
      1000
    );


  const expiresAt =
    expires.toISOString();


  await env.DB
    .prepare(`
      INSERT INTO auth_sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `)
    .bind(
      userId,
      tokenHash,
      expiresAt
    )
    .run();


  return {
    token,
    expiresAt
  };

}


function buildSessionCookie(
  token,
  expiresAt
) {

  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`
  ].join("; ");

}


/* ============================================================
   PASSWORD
============================================================ */

async function hashPassword(password) {

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );


  const iterations =
    210000;


  const hash =
    await derivePassword(
      password,
      salt,
      iterations
    );


  return [
    "pbkdf2",
    "sha256",
    iterations,
    bytesToBase64(salt),
    bytesToBase64(
      new Uint8Array(hash)
    )
  ].join("$");

}


async function verifyPassword(
  password,
  stored
) {

  try {

    const parts =
      String(stored)
        .split("$");


    if (parts.length !== 5) {
      return false;
    }


    const [
      type,
      digest,
      iterationText,
      saltText,
      expectedText
    ] = parts;


    if (
      type !== "pbkdf2" ||
      digest !== "sha256"
    ) {
      return false;
    }


    const iterations =
      Number(iterationText);


    const salt =
      base64ToBytes(
        saltText
      );


    const expected =
      base64ToBytes(
        expectedText
      );


    const actual =
      new Uint8Array(
        await derivePassword(
          password,
          salt,
          iterations
        )
      );


    return constantTimeEqual(
      actual,
      expected
    );


  } catch {

    return false;

  }

}


async function derivePassword(
  password,
  salt,
  iterations
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder()
        .encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );


  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    key,
    256
  );

}


/* ============================================================
   ROLES
============================================================ */

async function getUserRoles(
  env,
  userId
) {

  const result =
    await env.DB
      .prepare(`
        SELECT r.code

        FROM user_roles ur

        JOIN roles r
          ON r.id = ur.role_id

        WHERE ur.user_id = ?

        ORDER BY r.id
      `)
      .bind(userId)
      .all();


  return (
    result.results || []
  ).map(
    item => item.code
  );

}


/* ============================================================
   ASSESSMENT
============================================================ */

function buildAssessmentConfiguration(
  situation,
  interests
) {

  const selected =
    new Set(interests || []);


  let domains;


  if (
    situation === "lyceen" ||
    situation === "etudiant"
  ) {

    domains = [
      "organisation",
      "concentration",
      "memoire",
      "gestion-temps",
      "orientation"
    ];

  }

  else if (
    situation === "salarie" ||
    situation === "independant"
  ) {

    domains = [
      "organisation",
      "communication",
      "intelligence-emotionnelle",
      "decision",
      "carriere"
    ];

  }

  else if (
    situation === "reconversion" ||
    situation === "recherche-emploi"
  ) {

    domains = [
      "carriere",
      "reconversion",
      "orientation",
      "communication",
      "adaptabilite"
    ];

  }

  else {

    domains = [
      "organisation",
      "concentration",
      "communication",
      "intelligence-emotionnelle",
      "objectifs"
    ];

  }


  domains.sort(
    (a, b) =>
      Number(selected.has(b)) -
      Number(selected.has(a))
  );


  return {

    totalQuestions: 50,

    domains:
      domains.map(
        domain => ({
          domain,
          questions: 10
        })
      )

  };

}


/* ============================================================
   AUDIT
============================================================ */

async function safeAudit(
  env,
  actorUserId,
  action,
  entityType,
  entityId,
  details
) {

  try {

    await env.DB
      .prepare(`
        INSERT INTO audit_log (
          actor_user_id,
          action,
          entity_type,
          entity_id,
          details_json
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        actorUserId || null,
        action,
        entityType || null,
        entityId || null,
        JSON.stringify(details || {})
      )
      .run();

  } catch (error) {

    console.error(
      "Audit error:",
      error
    );

  }

}


/* ============================================================
   HELPERS
============================================================ */

async function readJson(request) {

  try {

    return await request.json();

  } catch {

    return null;

  }

}


function json(
  data,
  status = 200,
  headers = {}
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        ...headers
      }
    }
  );

}


function clean(
  value,
  max
) {

  return String(
    value || ""
  )
    .trim()
    .slice(0, max);

}


function normalizeEmail(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .slice(0, 254);

}


function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


function invalidCredentials() {

  return json({
    ok: false,
    error: "INVALID_CREDENTIALS",
    message:
      "Email ou mot de passe incorrect."
  }, 401);

}


function parseJson(
  value,
  fallback
) {

  try {

    return JSON.parse(value);

  } catch {

    return fallback;

  }

}


/* ============================================================
   COOKIE
============================================================ */

function getCookie(
  request,
  name
) {

  const header =
    request.headers.get(
      "Cookie"
    );


  if (!header) {

    return null;

  }


  for (
    const part
    of header.split(";")
  ) {

    const index =
      part.indexOf("=");


    if (index === -1) {
      continue;
    }


    const key =
      part
        .slice(0, index)
        .trim();


    if (key === name) {

      return part
        .slice(index + 1)
        .trim();

    }

  }


  return null;

}


/* ============================================================
   CRYPTO
============================================================ */

function randomToken(size = 32) {

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(size)
    );


  return bytesToBase64Url(
    bytes
  );

}


async function sha256Hex(value) {

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder()
        .encode(value)
    );


  return Array
    .from(
      new Uint8Array(digest)
    )
    .map(
      value =>
        value
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


function bytesToBase64(bytes) {

  let binary = "";


  for (const byte of bytes) {

    binary +=
      String.fromCharCode(byte);

  }


  return btoa(binary);

}


function base64ToBytes(value) {

  const binary =
    atob(value);


  const result =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    result[i] =
      binary.charCodeAt(i);

  }


  return result;

}


function bytesToBase64Url(bytes) {

  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

}


function constantTimeEqual(
  a,
  b
) {

  if (a.length !== b.length) {

    return false;

  }


  let difference = 0;


  for (
    let i = 0;
    i < a.length;
    i++
  ) {

    difference |=
      a[i] ^ b[i];

  }


  return difference === 0;

}
