# End User Access Implementation Plan

## Current State
- Demo user system (hardcoded User ID: 1)
- No real authentication
- Single user database structure
- All data tied to demo user

## Implementation Steps for User Access

### 1. Authentication System
```javascript
// Add to server/routes.ts
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await storage.createUser({
    username,
    email,
    password: hashedPassword,
    payCycle: 'fortnightly' // default
  });
  
  req.session.userId = user.id;
  res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await storage.getUserByUsername(username);
  
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 2. Session Management
```javascript
// Already configured in server/index.ts
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new (connectPgSimple(session))({
    conString: process.env.DATABASE_URL
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));
```

### 3. Protected Routes Middleware
```javascript
// Add middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Apply to all API routes
app.use('/api/envelopes', requireAuth);
app.use('/api/transactions', requireAuth);
app.use('/api/accounts', requireAuth);
// etc.
```

### 4. Frontend Authentication
```typescript
// Add to client/src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return data.user;
    }
    throw new Error('Login failed');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## User Access Flow

### 1. Landing Page
- Public marketing page at your domain
- Features overview from FEATURES_MARKETING.md
- Sign up / Login buttons

### 2. Registration Process
1. User visits your .replit.app domain
2. Sees landing page with sign up form
3. Enters email, username, password
4. Account created with empty envelopes/transactions
5. Redirected to onboarding flow

### 3. Onboarding Experience
1. Welcome screen
2. Account setup (bank accounts, opening balances)
3. Envelope creation wizard
4. First transaction tutorial
5. Dashboard tour

### 4. Daily Usage
1. User logs in at your domain
2. Sees their personal dashboard
3. All data isolated to their user ID
4. Full feature access based on subscription tier

## Deployment URLs

### Development
- `https://your-repl-name.your-username.repl.co`
- For testing and development

### Production Deployment
- `https://your-app-name.replit.app`
- Custom domain available: `https://envelopebudget.nz`

## Data Isolation
Each user gets:
- Separate envelope sets
- Personal transactions
- Individual account balances
- Private net worth data
- Isolated debt tracking

## Required Changes to Current Code
1. Replace hardcoded `userId: 1` with `req.session.userId`
2. Add authentication middleware to all routes
3. Create login/register pages
4. Add user context to React app
5. Implement protected routes on frontend

## Security Considerations
- Password hashing with bcrypt
- Session management with PostgreSQL store
- CSRF protection
- Rate limiting on auth endpoints
- Input validation and sanitization

## Example User Journey
1. User hears about your app from marketing
2. Visits envelopebudget.nz
3. Signs up with email/password
4. Completes onboarding setup
5. Starts using envelope budgeting
6. Upgrades to premium for bank sync
7. Achieves debt freedom with your tools