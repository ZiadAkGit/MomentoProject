import { useMemo, useState } from "react";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseSetupError } from "./firebase";
import "./App.css";

const AUTH_ERROR_MESSAGES = {
	"auth/email-already-in-use": "האימייל כבר קיים במערכת.",
	"auth/invalid-email": "כתובת האימייל לא תקינה.",
	"auth/weak-password": "הסיסמה חלשה מדי. השתמשו בלפחות 6 תווים.",
	"auth/invalid-credential": "אימייל או סיסמה שגויים.",
	"auth/too-many-requests": "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.",
	"auth/network-request-failed": "בעיית רשת. בדקו חיבור אינטרנט ונסו שוב.",
	"app/not-admin": "אין הרשאת מנהל. פנו למנהל המערכת.",
	"app/pending-admin": "החשבון נוצר, אבל הרשאת מנהל עדיין לא הופעלה.",
};

const DEFAULT_ERROR_MESSAGE = "אירעה שגיאה. נסו שוב.";

function appError(code, message) {
	const error = new Error(message);
	error.code = code;
	return error;
}

function getErrorMessage(error) {
	if (!error?.code) {
		return DEFAULT_ERROR_MESSAGE;
	}

	return AUTH_ERROR_MESSAGES[error.code] ?? DEFAULT_ERROR_MESSAGE;
}

function App() {
	const [mode, setMode] = useState("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const isRegisterMode = mode === "register";
	const title = useMemo(
		() => (isRegisterMode ? "הרשמה למארגן" : "התחברות למארגן"),
		[isRegisterMode],
	);

	const clearStatus = () => {
		setError("");
		setSuccess("");
	};

	const ensureConfigured = () => {
		if (!auth || !db) {
			setError("Firebase לא מוגדר עדיין. מלאו את הקובץ .env.");
			return false;
		}

		return true;
	};

	const upsertUserProfile = async (user, fullName) => {
		await setDoc(
			doc(db, "users", user.uid),
			{
				uid: user.uid,
				email: user.email,
				fullName: fullName || null,
				isAdmin: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	};

	const handleRegister = async () => {
		if (password !== confirmPassword) {
			throw appError("app/password-mismatch", "הסיסמאות לא תואמות.");
		}

		const trimmedName = name.trim();
		const credential = await createUserWithEmailAndPassword(
			auth,
			email.trim(),
			password,
		);

		if (trimmedName) {
			await updateProfile(credential.user, { displayName: trimmedName });
		}

		await upsertUserProfile(credential.user, trimmedName);
		setSuccess("ההרשמה הצליחה. לאחר שתגדירו isAdmin=true תוכלו להתחבר כמנהל.");
	};

	const handleLogin = async () => {
		const credential = await signInWithEmailAndPassword(
			auth,
			email.trim(),
			password,
		);

		const userRef = doc(db, "users", credential.user.uid);
		const userSnapshot = await getDoc(userRef);

		if (!userSnapshot.exists()) {
			await upsertUserProfile(
				credential.user,
				credential.user.displayName ?? "",
			);
			await signOut(auth);
			throw appError(
				"app/pending-admin",
				"החשבון נוצר אך הרשאת מנהל עדיין לא הופעלה.",
			);
		}

		const isAdmin = userSnapshot.data().isAdmin === true;
		if (!isAdmin) {
			await signOut(auth);
			throw appError("app/not-admin", "אין הרשאת מנהל.");
		}

		setSuccess("התחברות הצליחה. ברוך הבא מנהל.");
	};

	const onSubmit = async (event) => {
		event.preventDefault();

		if (!ensureConfigured()) {
			return;
		}

		clearStatus();
		setIsLoading(true);

		try {
			if (isRegisterMode) {
				await handleRegister();
			} else {
				await handleLogin();
			}
		} catch (caughtError) {
			if (caughtError?.code === "app/password-mismatch") {
				setError(caughtError.message);
			} else {
				setError(getErrorMessage(caughtError));
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="page">
			<section className="card" dir="rtl">
				<p className="badge">Momento</p>
				<h1>{title}</h1>
				<p className="subtitle">
					{isRegisterMode
						? "יצירת חשבון מארגן חדש"
						: "התחברות לחשבון עם בדיקת הרשאת מנהל"}
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

export default App;
