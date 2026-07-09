const MatiAuth = (() => {
  const USERS_KEY = "matiHeritageUsers";
  const SESSION_KEY = "matiHeritageSession";

  function readUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeEmail(email) {
    return email.trim().toLowerCase();
  }

  function normalizeUsername(username) {
    return username.trim().toLowerCase();
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    const session = {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function usesSupabaseAuth() {
    return Boolean(
      typeof MatiSupabaseAuth !== "undefined" && MatiSupabaseAuth.enabled?.(),
    );
  }

  function checkRegistrationAvailability(email, username) {
    const cleanEmail = normalizeEmail(email);
    const cleanUsername = normalizeUsername(username);
    const users = readUsers();

    if (cleanEmail && users.some((user) => user.email === cleanEmail)) {
      return {
        ok: false,
        field: "email",
        message: "An account with this email already exists.",
      };
    }

    if (
      cleanUsername &&
      users.some((user) => user.username === cleanUsername)
    ) {
      return {
        ok: false,
        field: "username",
        message: "That username is already taken.",
      };
    }

    return { ok: true };
  }

  async function checkRegistrationAvailabilityAsync(email, username) {
    if (usesSupabaseAuth()) {
      return MatiSupabaseAuth.checkRegistrationAvailability(email, username);
    }
    return checkRegistrationAvailability(email, username);
  }

  async function register(payload) {
    if (usesSupabaseAuth()) {
      const result = await MatiSupabaseAuth.register(payload);
      if (!result) {
        return {
          ok: false,
          message: "Registration is not available. Check Supabase configuration.",
        };
      }
      if (result.ok && result.user) {
        setSession(result.user);
        if (localStorage.getItem("totalHeritagePoints") === null) {
          localStorage.setItem("totalHeritagePoints", "0");
        }
        if (typeof MatiHeritagePoints !== "undefined") {
          await MatiHeritagePoints.hydrateFromCloud?.();
          void MatiHeritagePoints.syncToCloud();
        }
      }
      return result;
    }

    return registerLocal(payload);
  }

  function registerLocal({ displayName, username, email, password }) {
    if (!displayName || !username || !email || !password) {
      return { ok: false, message: "Please fill in all fields." };
    }

    if (password.length < 6) {
      return {
        ok: false,
        message: "Password must be at least 6 characters.",
      };
    }

    const cleanUsername = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);

    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      return {
        ok: false,
        message:
          "Username must be 3–24 characters (letters, numbers, . _ -).",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, message: "Please enter a valid email address." };
    }

    const users = readUsers();

    const availability = checkRegistrationAvailability(cleanEmail, cleanUsername);
    if (!availability.ok) {
      return { ok: false, message: availability.message };
    }

    const newUser = {
      displayName: displayName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);
    setSession(newUser);

    if (localStorage.getItem("totalHeritagePoints") === null) {
      localStorage.setItem("totalHeritagePoints", "0");
    }
    if (typeof MatiHeritagePoints !== "undefined") {
      void MatiHeritagePoints.syncToCloud();
    }

    return { ok: true, user: newUser };
  }

  async function login(identifier, password) {
    if (usesSupabaseAuth()) {
      const result = await MatiSupabaseAuth.login(identifier, password);
      if (!result) {
        return {
          ok: false,
          message: "Sign-in is not available. Check Supabase configuration.",
        };
      }
      if (result.ok && result.user) {
        setSession(result.user);
        if (localStorage.getItem("totalHeritagePoints") === null) {
          localStorage.setItem("totalHeritagePoints", "0");
        }
        if (typeof MatiHeritagePoints !== "undefined") {
          await MatiHeritagePoints.hydrateFromCloud?.();
          void MatiHeritagePoints.syncToCloud();
        }
      }
      return result;
    }

    return loginLocal(identifier, password);
  }

  function loginLocal(identifier, password) {
    if (!identifier || !password) {
      return { ok: false, message: "Please enter your email/username and password." };
    }

    const key = identifier.includes("@")
      ? normalizeEmail(identifier)
      : normalizeUsername(identifier);

    const users = readUsers();
    const user = users.find((entry) =>
      identifier.includes("@")
        ? entry.email === key
        : entry.username === key,
    );

    if (!user || user.password !== password) {
      return { ok: false, message: "Invalid email/username or password." };
    }

    setSession(user);

    if (localStorage.getItem("totalHeritagePoints") === null) {
      localStorage.setItem("totalHeritagePoints", "0");
    }
    if (typeof MatiHeritagePoints !== "undefined") {
      void MatiHeritagePoints.hydrateFromCloud?.();
      void MatiHeritagePoints.syncToCloud();
    }

    return { ok: true, user };
  }

  async function restoreSession() {
    if (usesSupabaseAuth()) {
      const cloud = await MatiSupabaseAuth.getSession();
      if (cloud) {
        setSession(cloud);
        return cloud;
      }
      clearSession();
      return null;
    }
    return getSession();
  }

  async function logout() {
    if (usesSupabaseAuth()) {
      await MatiSupabaseAuth.logout();
    }
    clearSession();
  }

  function isLoggedIn() {
    return Boolean(getSession());
  }

  function getAvatarUrl(username) {
    const key = normalizeUsername(username || "");
    if (!key) return "https://i.pravatar.cc/150?u=guest";

    const user = readUsers().find((entry) => entry.username === key);
    if (user?.avatarUrl) return user.avatarUrl;

    return `https://i.pravatar.cc/150?u=${encodeURIComponent(key)}`;
  }

  return {
    register,
    login,
    logout,
    restoreSession,
    getSession,
    isLoggedIn,
    readUsers,
    getAvatarUrl,
    usesSupabaseAuth,
    checkRegistrationAvailability: checkRegistrationAvailabilityAsync,
  };
})();
