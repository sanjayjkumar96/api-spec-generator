import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import { dynamoService } from './dynamoService';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'secret';

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const user = await dynamoService.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async register(email: string, password: string, role: 'Analyst' | 'Developer'): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const existingUser = await dynamoService.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await dynamoService.createUser({
      email,
      password: hashedPassword,
      role,
      createdAt: new Date()
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  verifyToken(token: string): { id: string; email: string; role: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { id: string; email: string; role: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService();