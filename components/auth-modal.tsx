'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        throw new Error('Supabase project URL is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL in your build secrets.')
      }

      if (isSignUp) {

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
            },
          },
        })

        if (error) throw error

        if (data.session) {
          setSuccessMsg('Account created and logged in!')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1000)
        } else {
          setSuccessMsg('Account created! Please check your email inbox to confirm your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.session) {
          setSuccessMsg('Welcome back!')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 800)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="detail-modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 380px)', padding: '24px' }}>
        <button
          className="modal-close detail-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="eyebrow" style={{ marginBottom: '6px' }}>
          {isSignUp ? 'JOIN ESPRESSO STUDIO' : 'WELCOME BACK'}
        </div>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
          {isSignUp ? 'Create your account' : 'Sign in to your journal'}
        </h2>
        <p style={{ color: '#88857d', fontSize: '11px', marginBottom: '18px' }}>
          {isSignUp
            ? 'Sync your recipes, dial-in logs, and equipment across all your devices.'
            : 'Access your dialed-in shots and grinder presets.'}
        </p>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '9px 12px',
              borderRadius: '7px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '9px 12px',
              borderRadius: '7px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isSignUp && (
            <label className="form-field">
              <span>Your Name / Barista Tag</span>
              <div className="number-field" style={{ padding: '0 10px', height: '38px' }}>
                <User size={15} style={{ color: '#9e9b92', marginRight: '6px' }} />
                <input
                  type="text"
                  placeholder="e.g. Jamie Parker"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </label>
          )}

          <label className="form-field">
            <span>Email address</span>
            <div className="number-field" style={{ padding: '0 10px', height: '38px' }}>
              <Mail size={15} style={{ color: '#9e9b92', marginRight: '6px' }} />
              <input
                type="email"
                required
                placeholder="barista@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '12px' }}
              />
            </div>
          </label>

          <label className="form-field">
            <span>Password</span>
            <div className="number-field" style={{ padding: '0 10px', height: '38px' }}>
              <Lock size={15} style={{ color: '#9e9b92', marginRight: '6px' }} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '12px' }}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
            style={{ width: '100%', marginTop: '6px', height: '38px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create account' : 'Sign in'}</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#88857d' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                style={{ color: '#52634b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                style={{ color: '#52634b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Create one
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
