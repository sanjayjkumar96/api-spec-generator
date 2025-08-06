import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, User } from '../services/authService'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is already logged in and token exists
        const currentUser = authService.getCurrentUser()
        const token = authService.getToken()

        if (currentUser && token) {
          // Validate token by trying to refresh user data
          try {
            const refreshedUser = await authService.refreshUser()
            if (refreshedUser) {
              setUser(refreshedUser)
            } else {
              // Token is invalid, clear auth data
              authService.logout()
              setUser(null)
            }
          } catch (error) {
            console.warn('Token validation failed, logging out:', error)
            authService.logout()
            setUser(null)
          }
        } else {
          // No user or token, ensure clean state
          authService.logout()
          setUser(null)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        authService.logout()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { user } = await authService.login({ email, password })
      setUser(user)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    try {
      const { user } = await authService.register({ email, password })
      setUser(user)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user && authService.isAuthenticated(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}