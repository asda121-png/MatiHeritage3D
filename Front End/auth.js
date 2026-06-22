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

  function register({ displayName, username, email, password }) {
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

    if (users.some((user) => user.username === cleanUsername)) {
      return { ok: false, message: "That username is already taken." };
    }

    if (users.some((user) => user.email === cleanEmail)) {
      return { ok: false, message: "An account with this email already exists." };
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

    return { ok: true, user: newUser };
  }

  function login(identifier, password) {
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

    return { ok: true, user };
  }

  function logout() {
    clearSession();
  }

  function isLoggedIn() {
    return Boolean(getSession());
  }

  return {
    register,
    login,
    logout,
    getSession,
    isLoggedIn,
    readUsers,
  };
})();
