const MatiAuth = (() => {
  const USERS_KEY = "matiHeritageUsers";
  const SESSION_KEY = "matiHeritageSession";
  const SESSION_KEY_REMEMBER = "matiHeritageSessionRemember";

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
      // First check localStorage (remember me)
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        session.remember = true;
        return session;
      }
      // Then check sessionStorage (don't remember me)
      const rawSession = sessionStorage.getItem(SESSION_KEY);
      if (rawSession) {
        const session = JSON.parse(rawSession);
        session.remember = false;
        return session;
      }
      return null;
    } catch {
      return null;
    }
  }

  function setSession(user, remember = true) {
    const session = {
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      loggedInAt: new Date().toISOString(),
    };
    const sessionJson = JSON.stringify(session);
    
    if (remember) {
      localStorage.setItem(SESSION_KEY, sessionJson);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, sessionJson);
      localStorage.removeItem(SESSION_KEY);
    }
    return session;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
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
    const remember = payload.remember !== false; // Default to true
    if (usesSupabaseAuth()) {
      const result = await MatiSupabaseAuth.register(payload);
      if (!result) {
        return {
          ok: false,
          message:
            "Registration is not available. Check Supabase configuration.",
        };
      }
      if (result.ok && result.user) {
        setSession(result.user, remember);
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

    return registerLocal(payload, remember);
  }

  async function registerLocal({ username, email, password }, remember = true) {
    if (!username || !email || !password) {
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
        message: "Username must be 3–24 characters (letters, numbers, . _ -).",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, message: "Please enter a valid email address." };
    }

    const users = readUsers();

    const availability = checkRegistrationAvailability(
      cleanEmail,
      cleanUsername,
    );
    if (!availability.ok) {
      return { ok: false, message: availability.message };
    }

    const { salt, hash } = await MatiPasswordHash.createDigest(password);

    const newUser = {
      username: cleanUsername,
      email: cleanEmail,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);
    setSession(newUser, remember);

    if (localStorage.getItem("totalHeritagePoints") === null) {
      localStorage.setItem("totalHeritagePoints", "0");
    }
    if (typeof MatiHeritagePoints !== "undefined") {
      void MatiHeritagePoints.syncToCloud();
    }

    return { ok: true, user: newUser };
  }

  async function login(identifier, password, remember = true) {
    if (usesSupabaseAuth()) {
      const result = await MatiSupabaseAuth.login(identifier, password);
      if (!result) {
        return {
          ok: false,
          message: "Sign-in is not available. Check Supabase configuration.",
        };
      }
      if (result.ok && result.user) {
        setSession(result.user, remember);
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

    return loginLocal(identifier, password, remember);
  }

  async function loginLocal(identifier, password, remember = true) {
    if (!identifier || !password) {
      return {
        ok: false,
        message: "Please enter your email/username and password.",
      };
    }

    const key = identifier.includes("@")
      ? normalizeEmail(identifier)
      : normalizeUsername(identifier);

    const users = readUsers();
    const user = users.find((entry) =>
      identifier.includes("@") ? entry.email === key : entry.username === key,
    );

    let passwordOk = false;

    if (user.passwordHash && user.passwordSalt) {
      passwordOk = await MatiPasswordHash.verifyPassword(
        password,
        user.passwordSalt,
        user.passwordHash,
      );
    } else if (user.password) {
      passwordOk = user.password === password;
      if (passwordOk) {
        const { salt, hash } = await MatiPasswordHash.createDigest(password);
        user.passwordSalt = salt;
        user.passwordHash = hash;
        delete user.password;
        writeUsers(users);
      }
    }

    if (!user || !passwordOk) {
      return { ok: false, message: "Invalid email/username or password." };
    }

    setSession(user, remember);

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
        setSession(cloud, true); // Supabase sessions are always remembered
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

    // Check session first for Supabase users
    const session = getSession();
    if (session?.avatarUrl && session.username === key) {
      return session.avatarUrl;
    }

    const user = readUsers().find((entry) => entry.username === key);
    if (user?.avatarUrl) return user.avatarUrl;

    return `https://i.pravatar.cc/150?u=${encodeURIComponent(key)}`;
  }

  async function updateProfile(payload) {
    if (usesSupabaseAuth()) {
      const result = await MatiSupabaseAuth.updateProfile(payload);
      if (!result) {
        return {
          ok: false,
          message: "Profile updates are not available.",
        };
      }
      if (result.ok && result.user) {
        const current = getSession() || {};
        setSession({
          ...current,
          username: result.user.username,
          displayName: result.user.displayName,
          email: result.user.email || current.email,
        });
      }
      return result;
    }

    return updateProfileLocal(payload);
  }

  async function updateProfileLocal({ username, displayName }) {
    const session = getSession();
    if (!session) {
      return {
        ok: false,
        message: "You must be signed in to update your profile.",
      };
    }

    const cleanUsername = normalizeUsername(username);
    const cleanDisplay = String(displayName || "").trim();

    if (!cleanDisplay) {
      return { ok: false, message: "Please enter a display name." };
    }

    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      return {
        ok: false,
        field: "username",
        message: "Username must be 3–24 characters (letters, numbers, . _ -).",
      };
    }

    const users = readUsers();
    const taken = users.some(
      (entry) =>
        entry.username === cleanUsername && entry.username !== session.username,
    );
    if (taken) {
      return {
        ok: false,
        field: "username",
        message: "That username is already taken.",
      };
    }

    const user = users.find((entry) => entry.username === session.username);
    if (user) {
      user.username = cleanUsername;
      user.displayName = cleanDisplay;
      writeUsers(users);
    }

    setSession({
      ...session,
      username: cleanUsername,
      displayName: cleanDisplay,
    });

    return {
      ok: true,
      user: {
        username: cleanUsername,
        displayName: cleanDisplay,
        email: session.email,
      },
    };
  }

  async function checkUsernameAvailability(username) {
    if (usesSupabaseAuth()) {
      const userId = await MatiSupabaseAuth.getCurrentUserId?.();
      return MatiSupabaseAuth.checkUsernameAvailability(username, userId);
    }

    const cleanUsername = normalizeUsername(username);
    const session = getSession();
    const users = readUsers();
    const taken = users.some(
      (entry) =>
        entry.username === cleanUsername &&
        entry.username !== session?.username,
    );
    if (taken) {
      return {
        ok: false,
        field: "username",
        message: "That username is already taken.",
      };
    }
    return { ok: true };
  }

  async function updatePasswordWithCurrent(currentPassword, newPassword) {
    if (usesSupabaseAuth()) {
      return MatiSupabaseAuth.updatePasswordWithCurrent(
        currentPassword,
        newPassword,
      );
    }
    // Local storage implementation would go here.
    // For now, we assume this is only for Supabase-enabled auth.
    return {
      ok: false,
      message: "Password updates are only available with a server connection.",
    };
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
    checkUsernameAvailability,
    updateProfile,
    updatePasswordWithCurrent,
  };
})();
