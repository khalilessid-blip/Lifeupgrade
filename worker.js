/* ============================================================
   LIFE UPGRADE
   CLOUDFLARE WORKER API
============================================================ */

const SESSION_COOKIE =
  "lu_session";

const SESSION_DAYS =
  30;


/* ============================================================
   MAIN WORKER
============================================================ */

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


    try {

      /*
        API
      */

      if(
        url.pathname.startsWith("/api/")
      ){

        return await handleApi(
          request,
          env,
          url
        );

      }


      /*
        STATIC WEBSITE
      */

      return env.ASSETS.fetch(
        request
      );


    } catch(error) {

      console.error(
        "Life Upgrade Worker error:",
        error
      );


      return json(
        {
          ok:false,
          error:"INTERNAL_ERROR",
          message:
            "Une erreur interne est survenue."
        },
        500
      );

    }

  }

};



/* ============================================================
   API ROUTER
============================================================ */

async function handleApi(
  request,
  env,
  url
){

  const method =
    request.method.toUpperCase();


  /*
    HEALTH
  */

  if(
    method === "GET" &&
    url.pathname === "/api/health"
  ){

    return health(
      env
    );

  }


  /*
    AUTH REGISTER
  */

  if(
    method === "POST" &&
    url.pathname === "/api/auth/register"
  ){

    return register(
      request,
      env
    );

  }


  /*
    AUTH LOGIN
  */

  if(
    method === "POST" &&
    url.pathname === "/api/auth/login"
  ){

    return login(
      request,
      env
    );

  }


  /*
    AUTH CURRENT USER
  */

  if(
    method === "GET" &&
    url.pathname === "/api/auth/me"
  ){

    return me(
      request,
      env
    );

  }


  /*
    LOGOUT
  */

  if(
    method === "POST" &&
    url.pathname === "/api/auth/logout"
  ){

    return logout(
      request,
      env
    );

  }


  return json(
    {
      ok:false,
      error:"NOT_FOUND",
      message:
        "Route API inconnue."
    },
    404
  );

}



/* ============================================================
   HEALTH
============================================================ */

async function health(
  env
){

  const result =
    await env.DB
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM users
        `
      )
      .first();


  return json(
    {
      ok:true,
      service:
        "Life Upgrade API",

      database:
        "connected",

      users:
        Number(
          result?.total || 0
        ),

      timestamp:
        new Date()
          .toISOString()
    }
  );

}



/* ============================================================
   REGISTER
============================================================ */

async function register(
  request,
  env
){

  const body =
    await readJson(
      request
    );


  if(!body){

    return json(
      {
        ok:false,
        error:"INVALID_JSON",
        message:
          "Les données envoyées sont invalides."
      },
      400
    );

  }


  const firstName =
    cleanString(
      body.firstName,
      80
    );

  const lastName =
    cleanString(
      body.lastName,
      80
    );

  const email =
    normalizeEmail(
      body.email
    );

  const phone =
    cleanString(
      body.phone,
      40
    );

  const country =
    cleanString(
      body.country,
      80
    );

  const password =
    String(
      body.password || ""
    );

  const situation =
    cleanString(
      body.situation,
      80
    );

  const interests =
    Array.isArray(
      body.interests
    )
    ?
    body.interests
      .slice(0,50)
      .map(
        item =>
          cleanString(
            item,
            80
          )
      )
      .filter(Boolean)
    :
    [];

  const goal90 =
    cleanString(
      body.goal90,
      2000
    );

  const goal365 =
    cleanString(
      body.goal365,
      2000
    );

  const weeklyTime =
    Number(
      body.weeklyTime || 0
    );


  /*
    VALIDATION
  */

  if(
    !firstName ||
    !lastName ||
    !email ||
    !country ||
    !password
  ){

    return json(
      {
        ok:false,
        error:"MISSING_FIELDS",
        message:
          "Complète les champs obligatoires."
      },
      400
    );

  }


  if(
    !isValidEmail(email)
  ){

    return json(
      {
        ok:false,
        error:"INVALID_EMAIL",
        message:
          "Adresse email invalide."
      },
      400
    );

  }


  if(
    password.length < 8
  ){

    return json(
      {
        ok:false,
        error:"WEAK_PASSWORD",
        message:
          "Le mot de passe doit contenir au moins 8 caractères."
      },
      400
    );

  }


  /*
    DUPLICATE EMAIL
  */

  const existing =
    await env.DB
      .prepare(
        `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
        `
      )
      .bind(email)
      .first();


  if(existing){

    return json(
      {
        ok:false,
        error:"EMAIL_EXISTS",
        message:
          "Un compte existe déjà avec cette adresse email."
      },
      409
    );

  }


  /*
    HASH PASSWORD
  */

  const passwordHash =
    await hashPassword(
      password
    );


  /*
    CREATE USER
  */

  const userInsert =
    await env.DB
      .prepare(
        `
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
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'ACTIVE',
          'FREE',
          0
        )
        `
      )
      .bind(
        email,
        passwordHash,
        firstName,
        lastName,
        country,
        phone
      )
      .run();


  const userId =
    Number(
      userInsert.meta
        .last_row_id
    );


  /*
    PROFILE
  */

  await env.DB
    .prepare(
      `
      INSERT INTO profiles (
        user_id,
        situation,
        weekly_time,
        goal_90_days,
        goal_365_days,
        interests_json,
        preferences_json
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `
    )
    .bind(
      userId,
      situation,
      Number.isFinite(
        weeklyTime
      )
      ?
      weeklyTime
      :
      null,
      goal90,
      goal365,
      JSON.stringify(
        interests
      ),
      JSON.stringify({})
    )
    .run();


  /*
    MEMBER ROLE
  */

  await env.DB
    .prepare(
      `
      INSERT OR IGNORE
      INTO user_roles (
        user_id,
        role_id
      )
      SELECT
        ?,
        id
      FROM roles
      WHERE code = 'MEMBER'
      `
    )
    .bind(
      userId
    )
    .run();


  /*
    PRIVACY DEFAULT
  */

  await env.DB
    .prepare(
      `
      INSERT OR IGNORE
      INTO privacy_preferences (
        user_id
      )
      VALUES (?)
      `
    )
    .bind(
      userId
    )
    .run();


  /*
    CREATE PERSONALIZED ASSESSMENT
  */

  const assessmentConfig =
    buildAssessmentConfiguration(
      situation,
      interests
    );


  await env.DB
    .prepare(
      `
      INSERT INTO personalized_assessments (
        user_id,
        title,
        total_questions,
        configuration_json,
        status
      )
      VALUES (
        ?,
        'Évaluation personnalisée Life Upgrade',
        50,
        ?,
        'READY'
      )
      `
    )
    .bind(
      userId,
      JSON.stringify(
        assessmentConfig
      )
    )
    .run();


  /*
    CREATE SESSION
  */

  const session =
    await createSession(
      env,
      userId
    );


  /*
    AUDIT
  */

  await writeAudit(
    env,
    userId,
    "USER_REGISTER",
    "USER",
    userId,
    {
      email
    }
  );


  /*
    RESPONSE
  */

  return json(
    {
      ok:true,

      user:{
        id:userId,
        email,
        firstName,
        lastName,
        subscription:
          "FREE",

        roles:[
          "MEMBER"
        ]
      },

      assessment:{
        questions:50,
        configuration:
          assessmentConfig
      }
    },
    201,
    {
      "Set-Cookie":
        buildSessionCookie(
          session.rawToken,
          session.expiresAt
        )
    }
  );

}



/* ============================================================
   LOGIN
============================================================ */

async function login(
  request,
  env
){

  const body =
    await readJson(
      request
    );


  if(!body){

    return json(
      {
        ok:false,
        error:"INVALID_JSON"
      },
      400
    );

  }


  const email =
    normalizeEmail(
      body.email
    );

  const password =
    String(
      body.password || ""
    );


  if(
    !email ||
    !password
  ){

    return json(
      {
        ok:false,
        error:"MISSING_CREDENTIALS",
        message:
          "Email et mot de passe requis."
      },
      400
    );

  }


  const user =
    await env.DB
      .prepare(
        `
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
        `
      )
      .bind(
        email
      )
      .first();


  if(!user){

    return invalidLogin();

  }


  if(
    user.status !==
    "ACTIVE"
  ){

    return json(
      {
        ok:false,
        error:"ACCOUNT_DISABLED",
        message:
          "Ce compte n'est pas actuellement actif."
      },
      403
    );

  }


  const valid =
    await verifyPassword(
      password,
      user.password_hash
    );


  if(!valid){

    return invalidLogin();

  }


  /*
    REVOKE OLD EXPIRED SESSIONS
  */

  await env.DB
    .prepare(
      `
      DELETE FROM auth_sessions
      WHERE user_id = ?
      AND (
        expires_at <= ?
        OR revoked_at IS NOT NULL
      )
      `
    )
    .bind(
      user.id,
      new Date()
        .toISOString()
    )
    .run();


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


  await writeAudit(
    env,
    user.id,
    "USER_LOGIN",
    "USER",
    user.id,
    {}
  );


  return json(
    {
      ok:true,

      user:{
        id:user.id,
        email:user.email,
        firstName:
          user.first_name,
        lastName:
          user.last_name,
        country:
          user.country,
        phone:
          user.phone,
        subscription:
          user.subscription_type,
        roles
      }
    },
    200,
    {
      "Set-Cookie":
        buildSessionCookie(
          session.rawToken,
          session.expiresAt
        )
    }
  );

}



/* ============================================================
   CURRENT USER
============================================================ */

async function me(
  request,
  env
){

  const sessionUser =
    await getAuthenticatedUser(
      request,
      env
    );


  if(!sessionUser){

    return json(
      {
        ok:false,
        authenticated:false
      },
      401
    );

  }


  const roles =
    await getUserRoles(
      env,
      sessionUser.id
    );


  const profile =
    await env.DB
      .prepare(
        `
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
        `
      )
      .bind(
        sessionUser.id
      )
      .first();


  return json(
    {
      ok:true,
      authenticated:true,

      user:{
        id:
          sessionUser.id,

        email:
          sessionUser.email,

        firstName:
          sessionUser.first_name,

        lastName:
          sessionUser.last_name,

        country:
          sessionUser.country,

        phone:
          sessionUser.phone,

        subscription:
          sessionUser.subscription_type,

        emailVerified:
          Boolean(
            sessionUser.email_verified
          ),

        roles
      },

      profile:{
        situation:
          profile?.situation || null,

        weeklyTime:
          profile?.weekly_time || 0,

        goal90:
          profile?.goal_90_days || "",

        goal365:
          profile?.goal_365_days || "",

        interests:
          safeJsonParse(
            profile?.interests_json,
            []
          ),

        preferences:
          safeJsonParse(
            profile?.preferences_json,
            {}
          )
      }
    }
  );

}



/* ============================================================
   LOGOUT
============================================================ */

async function logout(
  request,
  env
){

  const token =
    getCookie(
      request,
      SESSION_COOKIE
    );


  if(token){

    const tokenHash =
      await sha256Hex(
        token
      );


    await env.DB
      .prepare(
        `
        UPDATE auth_sessions
        SET revoked_at = ?
        WHERE token_hash = ?
        AND revoked_at IS NULL
        `
      )
      .bind(
        new Date()
          .toISOString(),
        tokenHash
      )
      .run();

  }


  return json(
    {
      ok:true
    },
    200,
    {
      "Set-Cookie":
        `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    }
  );

}



/* ============================================================
   AUTH USER
============================================================ */

async function getAuthenticatedUser(
  request,
  env
){

  const token =
    getCookie(
      request,
      SESSION_COOKIE
    );


  if(!token){

    return null;

  }


  const tokenHash =
    await sha256Hex(
      token
    );


  const now =
    new Date()
      .toISOString();


  return env.DB
    .prepare(
      `
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
      `
    )
    .bind(
      tokenHash,
      now
    )
    .first();

}



/* ============================================================
   CREATE SESSION
============================================================ */

async function createSession(
  env,
  userId
){

  const rawToken =
    randomToken(
      32
    );


  const tokenHash =
    await sha256Hex(
      rawToken
    );


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
    .prepare(
      `
      INSERT INTO auth_sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (
        ?,
        ?,
        ?
      )
      `
    )
    .bind(
      userId,
      tokenHash,
      expiresAt
    )
    .run();


  return {
    rawToken,
    expiresAt
  };

}



/* ============================================================
   COOKIE
============================================================ */

function buildSessionCookie(
  token,
  expiresAt
){

  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Expires=${new Date(
      expiresAt
    ).toUTCString()}`
  ].join("; ");

}



/* ============================================================
   PASSWORD HASHING
============================================================ */

async function hashPassword(
  password
){

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
    bytesToBase64(
      salt
    ),
    bytesToBase64(
      new Uint8Array(
        hash
      )
    )
  ].join("$");

}


async function verifyPassword(
  password,
  storedHash
){

  try{

    const parts =
      String(
        storedHash
      )
      .split("$");


    if(
      parts.length !== 5
    ){

      return false;

    }


    const [
      type,
      digest,
      iterationText,
      saltBase64,
      expectedBase64
    ] = parts;


    if(
      type !== "pbkdf2" ||
      digest !== "sha256"
    ){

      return false;

    }


    const iterations =
      Number(
        iterationText
      );


    if(
      !Number.isInteger(
        iterations
      ) ||
      iterations < 100000
    ){

      return false;

    }


    const salt =
      base64ToBytes(
        saltBase64
      );


    const derived =
      new Uint8Array(
        await derivePassword(
          password,
          salt,
          iterations
        )
      );


    const expected =
      base64ToBytes(
        expectedBase64
      );


    return constantTimeEqual(
      derived,
      expected
    );


  }catch(error){

    return false;

  }

}


async function derivePassword(
  password,
  salt,
  iterations
){

  const key =
    await crypto.subtle
      .importKey(
        "raw",
        new TextEncoder()
          .encode(password),
        "PBKDF2",
        false,
        [
          "deriveBits"
        ]
      );


  return crypto.subtle
    .deriveBits(
      {
        name:"PBKDF2",
        hash:"SHA-256",
        salt,
        iterations
      },
      key,
      256
    );

}



/* ============================================================
   USER ROLES
============================================================ */

async function getUserRoles(
  env,
  userId
){

  const result =
    await env.DB
      .prepare(
        `
        SELECT
          r.code
        FROM user_roles ur

        JOIN roles r
          ON r.id = ur.role_id

        WHERE ur.user_id = ?

        ORDER BY r.id
        `
      )
      .bind(
        userId
      )
      .all();


  return (
    result.results || []
  ).map(
    item =>
      item.code
  );

}



/* ============================================================
   PERSONALIZED ASSESSMENT CONFIG
============================================================ */

function buildAssessmentConfiguration(
  situation,
  interests
){

  const selected =
    new Set(
      interests || []
    );


  let domains;


  if(
    situation === "lyceen" ||
    situation === "etudiant"
  ){

    domains = [
      "organisation",
      "concentration",
      "memoire",
      "gestion-temps",
      "orientation"
    ];

  }

  else if(
    situation === "salarie" ||
    situation === "independant"
  ){

    domains = [
      "organisation",
      "communication",
      "intelligence-emotionnelle",
      "decision",
      "carriere"
    ];

  }

  else if(
    situation === "reconversion" ||
    situation === "recherche-emploi"
  ){

    domains = [
      "carriere",
      "reconversion",
      "orientation",
      "communication",
      "adaptabilite"
    ];

  }

  else{

    domains = [
      "organisation",
      "concentration",
      "communication",
      "intelligence-emotionnelle",
      "objectifs"
    ];

  }


  domains.sort(
    (a,b) =>
      Number(
        selected.has(b)
      ) -
      Number(
        selected.has(a)
      )
  );


  return {
    totalQuestions:50,

    domains:
      domains.map(
        domain => ({
          domain,
          questions:10
        })
      )
  };

}



/* ============================================================
   AUDIT
============================================================ */

async function writeAudit(
  env,
  actorUserId,
  action,
  entityType,
  entityId,
  details
){

  try{

    await env.DB
      .prepare(
        `
        INSERT INTO audit_log (
          actor_user_id,
          action,
          entity_type,
          entity_id,
          details_json
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?
        )
        `
      )
      .bind(
        actorUserId || null,
        action,
        entityType || null,
        entityId !== undefined
        ?
        String(
          entityId
        )
        :
        null,
        JSON.stringify(
          details || {}
        )
      )
      .run();


  }catch(error){

    console.error(
      "Audit error",
      error
    );

  }

}



/* ============================================================
   JSON
============================================================ */

async function readJson(
  request
){

  try{

    return await request.json();

  }catch(error){

    return null;

  }

}


function json(
  data,
  status = 200,
  extraHeaders = {}
){

  return new Response(
    JSON.stringify(
      data
    ),
    {
      status,
      headers:{
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        ...extraHeaders
      }
    }
  );

}



/* ============================================================
   VALIDATION
============================================================ */

function normalizeEmail(
  value
){

  return String(
    value || ""
  )
  .trim()
  .toLowerCase()
  .slice(
    0,
    254
  );

}


function cleanString(
  value,
  maxLength
){

  return String(
    value || ""
  )
  .trim()
  .slice(
    0,
    maxLength
  );

}


function isValidEmail(
  email
){

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      email
    );

}


function invalidLogin(){

  return json(
    {
      ok:false,
      error:"INVALID_CREDENTIALS",
      message:
        "Email ou mot de passe incorrect."
    },
    401
  );

}



/* ============================================================
   COOKIE PARSING
============================================================ */

function getCookie(
  request,
  name
){

  const header =
    request.headers
      .get(
        "Cookie"
      );


  if(!header){

    return null;

  }


  const cookies =
    header.split(";");


  for(
    const cookie
    of cookies
  ){

    const index =
      cookie.indexOf("=");


    if(
      index === -1
    ){
      continue;
    }


    const key =
      cookie
        .slice(
          0,
          index
        )
        .trim();


    if(
      key === name
    ){

      return cookie
        .slice(
          index + 1
        )
        .trim();

    }

  }


  return null;

}



/* ============================================================
   CRYPTO HELPERS
============================================================ */

function randomToken(
  size = 32
){

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(
        size
      )
    );


  return bytesToBase64Url(
    bytes
  );

}


async function sha256Hex(
  value
){

  const digest =
    await crypto.subtle
      .digest(
        "SHA-256",
        new TextEncoder()
          .encode(
            value
          )
      );


  return Array
    .from(
      new Uint8Array(
        digest
      )
    )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");

}


function bytesToBase64(
  bytes
){

  let binary =
    "";


  for(
    const byte
    of bytes
  ){

    binary +=
      String.fromCharCode(
        byte
      );

  }


  return btoa(
    binary
  );

}


function base64ToBytes(
  value
){

  const binary =
    atob(value);


  const bytes =
    new Uint8Array(
      binary.length
    );


  for(
    let i = 0;
    i < binary.length;
    i++
  ){

    bytes[i] =
      binary.charCodeAt(i);

  }


  return bytes;

}


function bytesToBase64Url(
  bytes
){

  return bytesToBase64(
    bytes
  )
  .replaceAll(
    "+",
    "-"
  )
  .replaceAll(
    "/",
    "_"
  )
  .replaceAll(
    "=",
    ""
  );

}


function constantTimeEqual(
  a,
  b
){

  if(
    a.length !==
    b.length
  ){

    return false;

  }


  let result =
    0;


  for(
    let i = 0;
    i < a.length;
    i++
  ){

    result |=
      a[i] ^
      b[i];

  }


  return result === 0;

}



/* ============================================================
   SAFE JSON
============================================================ */

function safeJsonParse(
  value,
  fallback
){

  try{

    return JSON.parse(
      value
    );

  }catch(error){

    return fallback;

  }

}
