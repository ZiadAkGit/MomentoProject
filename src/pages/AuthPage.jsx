function AuthPage({
  isRegisterMode,
  title,
  isLoading,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  setMode,
  clearStatus,
  onSubmit,
  firebaseSetupError,
  error,
  success,
}) {
  return (
    <main className="page">
      <section className="card" dir="rtl">
        <p className="badge">Momento</p>
        <h1>{title}</h1>
        <p className="subtitle">
          {isRegisterMode ? "יצירת חשבון מארגן חדש" : "התחברות לחשבון"}
        </p>

        <div className="switcher">
          <button
            type="button"
            className={!isRegisterMode ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              clearStatus();
            }}
            disabled={isLoading}
          >
            התחברות
          </button>
          <button
            type="button"
            className={isRegisterMode ? "tab active" : "tab"}
            onClick={() => {
              setMode("register");
              clearStatus();
            }}
            disabled={isLoading}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          {isRegisterMode && (
            <>
              <label htmlFor="name">שם מלא</label>
              <input
                id="name"
                type="text"
                placeholder="השם שלך"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </>
          )}

          <label htmlFor="email">אימייל</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus={!isRegisterMode}
          />

          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {isRegisterMode && (
            <>
              <label htmlFor="confirmPassword">אימות סיסמה</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </>
          )}

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "טוען..." : isRegisterMode ? "יצירת חשבון" : "התחברות"}
          </button>
        </form>

        {firebaseSetupError && <p className="warning">{firebaseSetupError}</p>}
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </section>
    </main>
  );
}

export default AuthPage;
