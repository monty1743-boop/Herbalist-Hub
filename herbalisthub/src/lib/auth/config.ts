import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          })

          if (!user || !user.isActive) {
            return null
          }

          // For credentials provider, we need to verify password
          // This assumes password is stored in a separate table or field
          // For now, we'll implement basic password checking
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.email // Placeholder - implement proper password storage
          )

          if (!isPasswordValid) {
            return null
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          })

          if (existingUser) {
            // Update last login
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { lastLogin: new Date() },
            })
          } else {
            // Create new user with CLIENT role by default
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                role: Role.CLIENT,
                emailVerified: new Date(),
                lastLogin: new Date(),
              },
            })
          }
        } catch (error) {
          console.error("Error during Google sign in:", error)
          return false
        }
      }
      return true
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log authentication events for audit
      console.log(`User ${user.email} signed in via ${account?.provider}`)
      
      // TODO: Implement audit logging
      // await createAuditLog({
      //   eventType: 'SIGN_IN',
      //   resourceType: 'User',
      //   resourceId: user.id,
      //   action: 'User authentication',
      //   userId: user.id,
      //   userRole: user.role,
      //   ipAddress: '0.0.0.0', // Get from request
      // })
    },
  },
  debug: process.env.NODE_ENV === "development",
}