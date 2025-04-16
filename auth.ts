import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log("Comparing passwords");
    
    // Handle the case where the password format is wrong
    if (!stored.includes('.')) {
      console.error("Invalid stored password format, missing dot separator");
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    
    // Debug information
    console.log("Stored hash:", hashed.substring(0, 10) + "...");
    console.log("Stored salt:", salt.substring(0, 10) + "...");
    
    // Special case for the demo user with SHA-256 hash
    if (hashed === "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8") {
      console.log("Detected demo user with SHA-256 password");
      // For demo user, just directly check if password is "password"
      return supplied === "password";
    }
    
    // Regular scrypt-based comparison
    try {
      // Check if we have valid hex values
      if (!/^[0-9a-f]+$/i.test(hashed) || !/^[0-9a-f]+$/i.test(salt)) {
        console.error("Invalid hex in stored password");
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      
      // Make sure the buffers are the same length before comparing
      if (hashedBuf.length !== suppliedBuf.length) {
        console.error(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
        return false;
      }
      
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (err) {
      console.error("Error in cryptographic comparison:", err);
      return false;
    }
  } catch (err) {
    console.error("Error comparing passwords:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "smart-health-hub-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    // Don't send the password in the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}
