const ALLOWED_ROLES = require("../config/roles");
const User = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/password");
const { createSession } = require("../utils/session");
const { normalizeEmail, publicUser } = require("../utils/users");

async function register(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = String(req.body.role || "student").trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Please choose a valid role." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordData = hashPassword(password);
    const user = await User.create({
      name,
      email,
      role,
      salt: passwordData.salt,
      passwordHash: passwordData.hash,
    });

    return res.status(201).json({
      token: createSession(user),
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      token: createSession(user),
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMe,
  login,
  register,
};
