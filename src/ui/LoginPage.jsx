import React, { useState } from 'react';
import { base44 } from '../api/base44Client.js';
import { tokens } from './tokens.js';

const F = tokens.fontUI;

function getReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('from_url');
  if (fromUrl) {
    try {
      const url = new URL(fromUrl);
      if (url.origin === window.location.origin) return url.pathname + url.search + url.hash;
    } catch {
      /* ignore */
    }
  }
  return '/';
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const returnPath = getReturnUrl();

  const handleGoogleLogin = () => {
    base44.auth.loginWithProvider('google', returnPath);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      window.location.href = returnPath;
    } catch (err) {
      setError(err?.message ?? 'Login failed — check email and password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bg0,
      fontFamily: F,
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: 32,
        borderRadius: 12,
        border: `1px solid ${tokens.border1}`,
        backgroundColor: tokens.bg1,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: tokens.text1, marginBottom: 8 }}>
          Sign in to Base44
        </h1>
        <p style={{ fontSize: 13, color: tokens.text3, marginBottom: 24, lineHeight: 1.5 }}>
          Log in to save panel layouts and site data to your Base44 app.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 8,
            border: `1px solid ${tokens.border1}`,
            backgroundColor: tokens.bg2,
            color: tokens.text1,
            fontFamily: F,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          Continue with Google
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          color: tokens.text3,
          fontSize: 12,
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: tokens.border1 }} />
          or email
          <div style={{ flex: 1, height: 1, backgroundColor: tokens.border1 }} />
        </div>

        <form onSubmit={handleEmailLogin}>
          <label style={{ display: 'block', fontSize: 12, color: tokens.text2, marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              height: 36,
              marginBottom: 12,
              padding: '0 10px',
              borderRadius: 6,
              border: `1px solid ${tokens.border1}`,
              backgroundColor: tokens.bg2,
              color: tokens.text1,
              fontFamily: F,
              fontSize: 13,
            }}
          />
          <label style={{ display: 'block', fontSize: 12, color: tokens.text2, marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              height: 36,
              marginBottom: 16,
              padding: '0 10px',
              borderRadius: 6,
              border: `1px solid ${tokens.border1}`,
              backgroundColor: tokens.bg2,
              color: tokens.text1,
              fontFamily: F,
              fontSize: 13,
            }}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#e57373', marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 8,
              border: 'none',
              backgroundColor: tokens.accent,
              color: '#fff',
              fontFamily: F,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { window.location.href = returnPath; }}
          style={{
            width: '100%',
            marginTop: 16,
            border: 'none',
            background: 'none',
            color: tokens.text3,
            fontFamily: F,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ← Back to editor (without saving)
        </button>
      </div>
    </div>
  );
}
