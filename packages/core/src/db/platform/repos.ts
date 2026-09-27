export type PlatformUser = {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  status: "active" | "invited" | "disabled";
  created_at: number;
};

export type PlatformClinic = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial";
  plan_id: string | null;
  db_strategy: "shared" | "dedicated";
  db_ref: string | null;
  created_at: number;
};

export type PlatformMembership = {
  id: string;
  user_id: string;
  clinic_id: string;
  role: "owner" | "admin" | "dentist" | "receptionist";
  status: "active" | "invited" | "disabled";
  created_at: number;
};

export type PlatformSession = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
};

export type PlatformDomain = {
  hostname: string;
  clinic_id: string;
  kind: "subdomain" | "custom";
  verified: number;
};

function rowId(): string {
  return crypto.randomUUID();
}

export function usersRepo(d1: D1Database) {
  return {
    async byEmail(email: string): Promise<PlatformUser | null> {
      return (await d1.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<PlatformUser>()) ?? null;
    },
    async byId(id: string): Promise<PlatformUser | null> {
      return (await d1.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<PlatformUser>()) ?? null;
    },
    async create(input: { email: string; passwordHash: string; name: string }): Promise<PlatformUser> {
      const user: PlatformUser = {
        id: rowId(),
        email: input.email,
        password_hash: input.passwordHash,
        name: input.name,
        status: "active",
        created_at: Date.now(),
      };
      await d1
        .prepare(
          "INSERT INTO users (id, email, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(user.id, user.email, user.password_hash, user.name, user.status, user.created_at)
        .run();
      return user;
    },
  };
}

export function clinicsRepo(d1: D1Database) {
  return {
    async bySlug(slug: string): Promise<PlatformClinic | null> {
      return (
        (await d1.prepare("SELECT * FROM clinics WHERE slug = ?").bind(slug).first<PlatformClinic>()) ?? null
      );
    },
    async byId(id: string): Promise<PlatformClinic | null> {
      return (await d1.prepare("SELECT * FROM clinics WHERE id = ?").bind(id).first<PlatformClinic>()) ?? null;
    },
    async create(input: { name: string; slug: string }): Promise<PlatformClinic> {
      const clinic: PlatformClinic = {
        id: rowId(),
        name: input.name,
        slug: input.slug,
        status: "trial",
        plan_id: null,
        db_strategy: "shared",
        db_ref: null,
        created_at: Date.now(),
      };
      await d1
        .prepare(
          "INSERT INTO clinics (id, name, slug, status, plan_id, db_strategy, db_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          clinic.id,
          clinic.name,
          clinic.slug,
          clinic.status,
          clinic.plan_id,
          clinic.db_strategy,
          clinic.db_ref,
          clinic.created_at,
        )
        .run();
      return clinic;
    },
  };
}

export function membershipsRepo(d1: D1Database) {
  return {
    async listByUser(userId: string): Promise<PlatformMembership[]> {
      const res = await d1
        .prepare("SELECT * FROM memberships WHERE user_id = ? AND status = 'active'")
        .bind(userId)
        .all<PlatformMembership>();
      return res.results ?? [];
    },
    async find(userId: string, clinicId: string): Promise<PlatformMembership | null> {
      return (
        (await d1
          .prepare("SELECT * FROM memberships WHERE user_id = ? AND clinic_id = ?")
          .bind(userId, clinicId)
          .first<PlatformMembership>()) ?? null
      );
    },
    async create(input: {
      userId: string;
      clinicId: string;
      role: PlatformMembership["role"];
    }): Promise<PlatformMembership> {
      const membership: PlatformMembership = {
        id: rowId(),
        user_id: input.userId,
        clinic_id: input.clinicId,
        role: input.role,
        status: "active",
        created_at: Date.now(),
      };
      await d1
        .prepare(
          "INSERT INTO memberships (id, user_id, clinic_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          membership.id,
          membership.user_id,
          membership.clinic_id,
          membership.role,
          membership.status,
          membership.created_at,
        )
        .run();
      return membership;
    },
  };
}

export function sessionsRepo(d1: D1Database) {
  return {
    async create(input: { userId: string; tokenHash: string; expiresAt: number }): Promise<PlatformSession> {
      const session: PlatformSession = {
        id: rowId(),
        user_id: input.userId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        created_at: Date.now(),
      };
      await d1
        .prepare(
          "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(session.id, session.user_id, session.token_hash, session.expires_at, session.created_at)
        .run();
      return session;
    },
    async byTokenHash(tokenHash: string): Promise<PlatformSession | null> {
      return (
        (await d1
          .prepare("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?")
          .bind(tokenHash, Date.now())
          .first<PlatformSession>()) ?? null
      );
    },
    async deleteByTokenHash(tokenHash: string): Promise<void> {
      await d1.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    },
  };
}

export function domainsRepo(d1: D1Database) {
  return {
    async create(input: { hostname: string; clinicId: string; kind: PlatformDomain["kind"] }): Promise<void> {
      await d1
        .prepare("INSERT INTO domains (hostname, clinic_id, kind, verified) VALUES (?, ?, ?, ?)")
        .bind(input.hostname, input.clinicId, input.kind, input.kind === "subdomain" ? 1 : 0)
        .run();
    },
    async byHostname(hostname: string): Promise<PlatformDomain | null> {
      return (
        (await d1
          .prepare("SELECT * FROM domains WHERE hostname = ?")
          .bind(hostname)
          .first<PlatformDomain>()) ?? null
      );
    },
  };
}
