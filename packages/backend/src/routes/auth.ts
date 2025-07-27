import { Router } from 'express';
import { authService } from '../services/authService';
import { z } from 'zod';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['Analyst', 'Developer'])
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);
    const result = await authService.register(email, password, role);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
  }
});