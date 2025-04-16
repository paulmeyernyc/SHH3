import { type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { db as dbClient } from "./db/index";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";

// Define the SessionStore type
type SessionStore = session.Store;

// Setup PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: SessionStore;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();

// Seed function for initial data
async function seedInitialData() {
  try {
    // Check if we already have users
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping seed.");
      return;
    }
    
    console.log("Seeding database with initial data...");

    // Create default demo user
    await storage.createUser({
      username: "admin",
      password: await hashPassword("password123"),
      name: "Admin User",
      role: "admin",
      email: "admin@smarthealth.com"
    });
    
    await storage.createUser({
      username: "provider",
      password: await hashPassword("password123"),
      name: "Dr. Sarah Johnson",
      role: "provider",
      email: "provider@smarthealth.com"
    });
    
    await storage.createUser({
      username: "patient",
      password: await hashPassword("password123"),
      name: "Emily Cooper",
      role: "patient",
      email: "patient@example.com"
    });
    
    console.log("Database seeding completed.");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run the seed function
seedInitialData();