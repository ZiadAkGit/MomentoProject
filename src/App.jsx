import { useEffect, useMemo, useState } from "react";
import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	updateProfile,
	signOut,
} from "firebase/auth";
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	serverTimestamp,
	setDoc,
	where,
} from "firebase/firestore";
import { auth, db, firebaseSetupError } from "./firebase";
import "./App.css";
import DashboardNav from "./components/DashboardNav";
import AuthPage from "./pages/AuthPage";
import MasterDashboard from "./pages/MasterDashboard";
import EventAdminDashboard from "./pages/EventAdminDashboard";
import EventUserDashboard from "./pages/EventUserDashboard";

const AUTH_ERROR_MESSAGES = {
	"auth/email-already-in-use": "האימייל כבר קיים במערכת.",
	"auth/invalid-email": "כתובת האימייל לא תקינה.",
	"auth/weak-password": "הסיסמה חלשה מדי. השתמשו בלפחות 6 תווים.",
	"auth/invalid-credential": "אימייל או סיסמה שגויים.",
	"auth/too-many-requests": "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.",
	"auth/network-request-failed": "בעיית רשת. בדקו חיבור אינטרנט ונסו שוב.",
};

const DEFAULT_ERROR_MESSAGE = "אירעה שגיאה. נסו שוב.";
const MASTER_ADMIN_EMAILS = new Set(["ziadak14@gmail.com", "nournim98@gmail.com"]);
const ROLE_MASTER_ADMIN = "master_admin";
const ROLE_EVENT_ADMIN = "event_admin";
const ROLE_EVENT_USER = "event_user";
const DASHBOARD_LINKS_BY_ROLE = {
	[ROLE_MASTER_ADMIN]: [
		{ id: "master-events", label: "אירועים" },
		{ id: "master-admins", label: "מינוי אדמינים" },
		{ id: "master-assign", label: "שיוך משתמשים" },
		{ id: "master-users", label: "כל המשתמשים" },
	],
	[ROLE_EVENT_ADMIN]: [
		{ id: "event-admin-events", label: "אירועים שהוקצו" },
		{ id: "event-admin-assignments", label: "שיוך לאירועים" },
		{ id: "event-admin-preferences", label: "דשבורד העדפות" },
		{ id: "event-admin-users", label: "המשתמשים שלי" },
	],
	[ROLE_EVENT_USER]: [
		{ id: "event-user-events", label: "האירועים שלי" },
		{ id: "event-user-preferences", label: "העדפות שלי" },
	],
};

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
	// Auth form state
	const [mode, setMode] = useState("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isAuthReady, setIsAuthReady] = useState(false);

	// Session and role state
	const [userRole, setUserRole] = useState(null);
	const [displayName, setDisplayName] = useState("");
	const [currentUser, setCurrentUser] = useState(null);
	const [promoteEmail, setPromoteEmail] = useState("");

	// Dashboard data state
	const [managedUsers, setManagedUsers] = useState([]);
	const [eventAdminUsers, setEventAdminUsers] = useState([]);
	const [masterEvents, setMasterEvents] = useState([]);
	const [eventAdminEvents, setEventAdminEvents] = useState([]);
	const [eventAssignments, setEventAssignments] = useState([]);
	const [eventAdminPreferences, setEventAdminPreferences] = useState([]);
	const [eventUserEvents, setEventUserEvents] = useState([]);
	const [eventUserPreferences, setEventUserPreferences] = useState([]);
	const [eventName, setEventName] = useState("");
	const [eventDate, setEventDate] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [eventDescription, setEventDescription] = useState("");
	const [selectedEventOwnerAdminId, setSelectedEventOwnerAdminId] = useState("");
	const [selectedAssignmentEventId, setSelectedAssignmentEventId] = useState("");
	const [selectedAssignmentUserId, setSelectedAssignmentUserId] = useState("");
	const [selectedPreferenceEventId, setSelectedPreferenceEventId] = useState("");
	const [musicStylesInput, setMusicStylesInput] = useState("");
	const [songSuggestionsInput, setSongSuggestionsInput] = useState("");
	const [drinkPreferencesInput, setDrinkPreferencesInput] = useState("");
	const [feedbackInput, setFeedbackInput] = useState("");
	const [selectedEventAdminId, setSelectedEventAdminId] = useState("");
	const [selectedEventUserId, setSelectedEventUserId] = useState("");

	const isRegisterMode = mode === "register";
	const title = useMemo(
		() => (isRegisterMode ? "הרשמה למארגן" : "התחברות למארגן"),
		[isRegisterMode],
	);

	const clearStatus = () => {
		setError("");
		setSuccess("");
	};

	const resetForm = () => {
		setName("");
		setEmail("");
		setPassword("");
		setConfirmPassword("");
	};

	const normalizeEmail = (value) => value.trim().toLowerCase();
	const roleLabel = (role) => {
		if (role === ROLE_MASTER_ADMIN) return "Master Admin";
		if (role === ROLE_EVENT_ADMIN) return "Event Admin";
		return "Event User";
	};
	const isAdminRole = (role) => role === ROLE_MASTER_ADMIN || role === ROLE_EVENT_ADMIN;
	const getDashboardLinks = (role) => DASHBOARD_LINKS_BY_ROLE[role] || [];

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
				email: normalizeEmail(user.email ?? ""),
				fullName: fullName || null,
				role: ROLE_EVENT_USER,
				parentMasterAdminId: null,
				parentMasterAdminEmail: null,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	};

	const resolveRole = (profile, userEmail) => {
		const normalizedEmail = normalizeEmail(userEmail ?? "");
		if (MASTER_ADMIN_EMAILS.has(normalizedEmail)) {
			return ROLE_MASTER_ADMIN;
		}

		return profile?.role || ROLE_EVENT_USER;
	};

	const loadMasterUsers = async (masterContext = currentUser) => {
		if (!masterContext || masterContext.role !== ROLE_MASTER_ADMIN) {
			return;
		}

		const usersRef = collection(db, "users");
		const snapshot = await getDocs(usersRef);

		const allUsers = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		const filtered = allUsers.filter((item) => {
			const emailValue = normalizeEmail(item.email ?? "");
			if (MASTER_ADMIN_EMAILS.has(emailValue)) {
				return false;
			}

			return (
				item.parentMasterAdminId === masterContext.uid ||
				item.parentMasterAdminId == null
			);
		});

		filtered.sort((a, b) =>
			normalizeEmail(a.email ?? "").localeCompare(normalizeEmail(b.email ?? "")),
		);
		setManagedUsers(filtered);
	};

	const loadEventAdminUsers = async (eventAdminContext = currentUser) => {
		if (!eventAdminContext || eventAdminContext.role !== ROLE_EVENT_ADMIN) {
			return;
		}

		const usersRef = collection(db, "users");
		const q = query(
			usersRef,
			where("parentEventAdminId", "==", eventAdminContext.uid),
			where("role", "==", ROLE_EVENT_USER),
		);
		const snapshot = await getDocs(q);

		const assignedUsers = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		assignedUsers.sort((a, b) =>
			normalizeEmail(a.email ?? "").localeCompare(normalizeEmail(b.email ?? "")),
		);
		setEventAdminUsers(assignedUsers);
	};

	const loadEventAdminEvents = async (eventAdminContext = currentUser) => {
		if (!eventAdminContext || eventAdminContext.role !== ROLE_EVENT_ADMIN) {
			return;
		}

		const eventsRef = collection(db, "events");
		const q = query(
			eventsRef,
			where("assignedEventAdminId", "==", eventAdminContext.uid),
		);
		const snapshot = await getDocs(q);

		const events = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		events.sort((a, b) => {
			const aDate = a.eventDate || "";
			const bDate = b.eventDate || "";
			return aDate.localeCompare(bDate);
		});
		setEventAdminEvents(events);
	};

	const loadMasterEvents = async (masterContext = currentUser) => {
		if (!masterContext || masterContext.role !== ROLE_MASTER_ADMIN) {
			return;
		}

		const eventsRef = collection(db, "events");
		const q = query(
			eventsRef,
			where("createdByMasterAdminId", "==", masterContext.uid),
		);
		const snapshot = await getDocs(q);

		const events = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		events.sort((a, b) => {
			const aDate = a.eventDate || "";
			const bDate = b.eventDate || "";
			return aDate.localeCompare(bDate);
		});
		setMasterEvents(events);
	};

	const loadEventAdminAssignments = async (eventAdminContext = currentUser) => {
		if (!eventAdminContext || eventAdminContext.role !== ROLE_EVENT_ADMIN) {
			return;
		}

		const assignmentsRef = collection(db, "eventAssignments");
		const q = query(
			assignmentsRef,
			where("ownerEventAdminId", "==", eventAdminContext.uid),
		);
		const snapshot = await getDocs(q);

		const assigned = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		assigned.sort((a, b) => {
			const aDate = a.eventDate || "";
			const bDate = b.eventDate || "";
			return aDate.localeCompare(bDate);
		});
		setEventAssignments(assigned);
	};

	const loadEventUserEvents = async (userContext = currentUser) => {
		if (!userContext || userContext.role !== ROLE_EVENT_USER) {
			return;
		}

		const assignmentsRef = collection(db, "eventAssignments");
		const q = query(assignmentsRef, where("userId", "==", userContext.uid));
		const snapshot = await getDocs(q);

		const assignedEvents = snapshot.docs.map((item) => ({
			id: item.id,
			...item.data(),
		}));

		assignedEvents.sort((a, b) => {
			const aDate = a.eventDate || "";
			const bDate = b.eventDate || "";
			return aDate.localeCompare(bDate);
		});
		setEventUserEvents(assignedEvents);
	};

	const loadEventAdminPreferences = async (eventAdminContext = currentUser) => {
		if (!eventAdminContext || eventAdminContext.role !== ROLE_EVENT_ADMIN) {
			return;
		}

		const prefsRef = collection(db, "guestPreferences");
		const q = query(
			prefsRef,
			where("ownerEventAdminId", "==", eventAdminContext.uid),
		);
		const snapshot = await getDocs(q);

		const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
		setEventAdminPreferences(items);
	};

	const loadEventUserPreferences = async (userContext = currentUser) => {
		if (!userContext || userContext.role !== ROLE_EVENT_USER) {
			return;
		}

		const prefsRef = collection(db, "guestPreferences");
		const q = query(prefsRef, where("userId", "==", userContext.uid));
		const snapshot = await getDocs(q);

		const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
		setEventUserPreferences(items);
	};

	const getSessionDisplayName = (profile, user) =>
		profile.fullName || user.displayName || user.email || "User";

	const buildSessionContext = (user, role) => ({
		uid: user.uid,
		email: normalizeEmail(user.email ?? ""),
		role,
	});

	const loadRoleData = async (role, context) => {
		if (role === ROLE_MASTER_ADMIN) {
			await loadMasterUsers(context);
			await loadMasterEvents(context);
			setEventAdminUsers([]);
			setEventAdminEvents([]);
			setEventAssignments([]);
			setEventAdminPreferences([]);
			setEventUserEvents([]);
			setEventUserPreferences([]);
			return;
		}

		if (role === ROLE_EVENT_ADMIN) {
			await loadEventAdminUsers(context);
			await loadEventAdminEvents(context);
			await loadEventAdminAssignments(context);
			await loadEventAdminPreferences(context);
			setManagedUsers([]);
			setMasterEvents([]);
			setEventUserEvents([]);
			setEventUserPreferences([]);
			return;
		}

		setManagedUsers([]);
		setMasterEvents([]);
		setEventAdminUsers([]);
		setEventAdminEvents([]);
		setEventAssignments([]);
		setEventAdminPreferences([]);
		await loadEventUserEvents(context);
		await loadEventUserPreferences(context);
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
		setSuccess("ההרשמה הצליחה. עכשיו אפשר להתחבר.");
		setMode("login");
		setPassword("");
		setConfirmPassword("");
	};

	const hydrateSessionFromUser = async (user) => {
		const userRef = doc(db, "users", user.uid);
		const userSnapshot = await getDoc(userRef);

		if (!userSnapshot.exists()) {
			await upsertUserProfile(user, user.displayName ?? "");
		}

		const profile = userSnapshot.exists()
			? userSnapshot.data()
			: { role: ROLE_EVENT_USER };
		const role = resolveRole(profile, user.email);
		const sessionContext = buildSessionContext(user, role);
		const isAdmin = isAdminRole(role);

		setDisplayName(getSessionDisplayName(profile, user));
		setCurrentUser(sessionContext);
		setUserRole(role);
		setSuccess(isAdmin ? "התחברת כאדמין." : "התחברת בהצלחה.");
		resetForm();

		await loadRoleData(role, sessionContext);
	};

	const handleLogin = async () => {
		const credential = await signInWithEmailAndPassword(
			auth,
			email.trim(),
			password,
		);
		await hydrateSessionFromUser(credential.user);
	};

	const clearEventForm = () => {
		setEventName("");
		setEventDate("");
		setEventLocation("");
		setEventDescription("");
		setSelectedEventOwnerAdminId("");
	};

	const clearPreferenceForm = () => {
		setSelectedPreferenceEventId("");
		setMusicStylesInput("");
		setSongSuggestionsInput("");
		setDrinkPreferencesInput("");
		setFeedbackInput("");
	};

	const parseCsv = (value) =>
		value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);

	const clearAuthState = () => {
		setUserRole(null);
		setDisplayName("");
		setCurrentUser(null);
		setManagedUsers([]);
		setMasterEvents([]);
		setEventAdminUsers([]);
		setEventAdminEvents([]);
		setEventAssignments([]);
		setEventAdminPreferences([]);
		setEventUserEvents([]);
		setEventUserPreferences([]);
		setPromoteEmail("");
		setSelectedAssignmentEventId("");
		setSelectedAssignmentUserId("");
		setSelectedEventAdminId("");
		setSelectedEventUserId("");
		clearEventForm();
		clearPreferenceForm();
	};

	const handlePromoteToEventAdmin = async (event) => {
		event.preventDefault();
		if (!currentUser || currentUser.role !== ROLE_MASTER_ADMIN) {
			setError("רק Master Admin יכול למנות Event Admin.");
			return;
		}

		const targetEmail = normalizeEmail(promoteEmail);
		if (!targetEmail) {
			setError("יש להזין אימייל תקין.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			const usersRef = collection(db, "users");
			const q = query(usersRef, where("email", "==", targetEmail), limit(1));
			const snapshot = await getDocs(q);

			if (snapshot.empty) {
				throw appError("app/user-not-found", "המשתמש לא נמצא. בקשו ממנו להירשם קודם.");
			}

			const targetDoc = snapshot.docs[0];
			await setDoc(
				doc(db, "users", targetDoc.id),
				{
					role: ROLE_EVENT_ADMIN,
					parentMasterAdminId: currentUser.uid,
					parentMasterAdminEmail: currentUser.email,
					parentEventAdminId: null,
					parentEventAdminEmail: null,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);

			setPromoteEmail("");
			setSuccess(`המשתמש ${targetEmail} מונה ל-Event Admin.`);
			await loadMasterUsers();
		} catch (promoteError) {
			setError(promoteError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDemoteEventAdmin = async (userItem) => {
		if (!currentUser || currentUser.role !== ROLE_MASTER_ADMIN) {
			setError("רק Master Admin יכול לשנות הרשאות.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			await setDoc(
				doc(db, "users", userItem.id),
				{
					role: ROLE_EVENT_USER,
					parentMasterAdminId: currentUser.uid,
					parentMasterAdminEmail: currentUser.email,
					parentEventAdminId: null,
					parentEventAdminEmail: null,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);

			setSuccess(`המשתמש ${userItem.email} הורד ל-Event User.`);
			await loadMasterUsers();
		} catch (demoteError) {
			setError(demoteError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAssignEventUser = async (event) => {
		event.preventDefault();
		if (!currentUser || currentUser.role !== ROLE_MASTER_ADMIN) {
			setError("רק Master Admin יכול לשייך משתמשים.");
			return;
		}

		if (!selectedEventAdminId || !selectedEventUserId) {
			setError("בחרו Event Admin ומשתמש לשיוך.");
			return;
		}

		const eventAdmin = managedUsers.find((item) => item.id === selectedEventAdminId);
		const eventUser = managedUsers.find((item) => item.id === selectedEventUserId);

		if (!eventAdmin || eventAdmin.role !== ROLE_EVENT_ADMIN) {
			setError("האדמין שנבחר לא תקין.");
			return;
		}

		if (!eventUser || eventUser.role !== ROLE_EVENT_USER) {
			setError("יש לבחור משתמש מסוג Event User.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			await setDoc(
				doc(db, "users", eventUser.id),
				{
					role: ROLE_EVENT_USER,
					parentMasterAdminId: currentUser.uid,
					parentMasterAdminEmail: currentUser.email,
					parentEventAdminId: eventAdmin.id,
					parentEventAdminEmail: normalizeEmail(eventAdmin.email ?? ""),
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);

			setSuccess(`המשתמש ${eventUser.email} שויך ל-${eventAdmin.email}.`);
			setSelectedEventUserId("");
			await loadMasterUsers();
		} catch (assignError) {
			setError(assignError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveEvent = async (event) => {
		event.preventDefault();
		if (!currentUser || currentUser.role !== ROLE_MASTER_ADMIN) {
			setError("רק Master Admin יכול ליצור אירועים.");
			return;
		}

		if (!eventName.trim() || !eventDate || !selectedEventOwnerAdminId) {
			setError("יש להזין שם אירוע, תאריך, ולבחור Event Admin.");
			return;
		}

		const selectedAdmin = managedUsers.find(
			(item) => item.id === selectedEventOwnerAdminId && item.role === ROLE_EVENT_ADMIN,
		);
		if (!selectedAdmin) {
			setError("האדמין שנבחר לא תקין.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			const newEventRef = doc(collection(db, "events"));
			await setDoc(newEventRef, {
				name: eventName.trim(),
				eventDate,
				location: eventLocation.trim() || null,
				description: eventDescription.trim() || null,
				assignedEventAdminId: selectedAdmin.id,
				assignedEventAdminEmail: normalizeEmail(selectedAdmin.email ?? ""),
				assignedEventAdminName: selectedAdmin.fullName || null,
				createdByMasterAdminId: currentUser.uid,
				createdByMasterAdminEmail: currentUser.email,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			clearEventForm();
			setSuccess("האירוע נוצר ושויך ל-Event Admin.");
			await loadMasterEvents();
		} catch (saveError) {
			setError(saveError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAssignUserToEvent = async (event) => {
		event.preventDefault();
		if (!currentUser || currentUser.role !== ROLE_EVENT_ADMIN) {
			setError("רק Event Admin יכול לשייך משתמשים לאירוע.");
			return;
		}

		if (!selectedAssignmentEventId || !selectedAssignmentUserId) {
			setError("בחרו אירוע ומשתמש.");
			return;
		}

		const targetEvent = eventAdminEvents.find((item) => item.id === selectedAssignmentEventId);
		const targetUser = eventAdminUsers.find((item) => item.id === selectedAssignmentUserId);
		if (!targetEvent || !targetUser) {
			setError("אירוע או משתמש לא תקינים.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			const assignmentsRef = collection(db, "eventAssignments");
			const duplicateQuery = query(
				assignmentsRef,
				where("eventId", "==", targetEvent.id),
				where("userId", "==", targetUser.id),
				limit(1),
			);
			const duplicateSnapshot = await getDocs(duplicateQuery);
			if (!duplicateSnapshot.empty) {
				setError("המשתמש כבר משויך לאירוע הזה.");
				return;
			}

			const assignmentRef = doc(collection(db, "eventAssignments"));
			await setDoc(assignmentRef, {
				eventId: targetEvent.id,
				eventName: targetEvent.name,
				eventDate: targetEvent.eventDate,
				eventLocation: targetEvent.location || null,
				eventDescription: targetEvent.description || null,
				userId: targetUser.id,
				userEmail: normalizeEmail(targetUser.email ?? ""),
				userFullName: targetUser.fullName || null,
				ownerEventAdminId: currentUser.uid,
				ownerEventAdminEmail: currentUser.email,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			setSelectedAssignmentUserId("");
			setSuccess("המשתמש שויך לאירוע בהצלחה.");
			await loadEventAdminAssignments();
		} catch (assignError) {
			setError(assignError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveAssignment = async (assignmentId) => {
		if (!currentUser || currentUser.role !== ROLE_EVENT_ADMIN) {
			setError("רק Event Admin יכול להסיר שיוך.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			await deleteDoc(doc(db, "eventAssignments", assignmentId));
			setSuccess("שיוך המשתמש הוסר מהאירוע.");
			await loadEventAdminAssignments();
		} catch (removeError) {
			setError(removeError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSavePreferences = async (event) => {
		event.preventDefault();
		if (!currentUser || currentUser.role !== ROLE_EVENT_USER) {
			setError("רק Event User יכול לשמור העדפות.");
			return;
		}

		if (!selectedPreferenceEventId) {
			setError("בחר אירוע להגשת העדפות.");
			return;
		}

		const targetEvent = eventUserEvents.find((item) => item.eventId === selectedPreferenceEventId);
		if (!targetEvent) {
			setError("האירוע שנבחר לא נמצא.");
			return;
		}

		setError("");
		setSuccess("");
		setIsLoading(true);

		try {
			const prefDocId = `${selectedPreferenceEventId}_${currentUser.uid}`;
			const musicStyles = parseCsv(musicStylesInput);
			const songSuggestions = parseCsv(songSuggestionsInput);
			const drinkPreferences = parseCsv(drinkPreferencesInput);

			await setDoc(
				doc(db, "guestPreferences", prefDocId),
				{
					eventId: targetEvent.eventId,
					eventName: targetEvent.eventName,
					eventDate: targetEvent.eventDate || null,
					userId: currentUser.uid,
					userEmail: currentUser.email,
					userFullName: displayName || null,
					ownerEventAdminId: targetEvent.ownerEventAdminId,
					ownerEventAdminEmail: targetEvent.ownerEventAdminEmail || null,
					musicStyles,
					songSuggestions,
					drinkPreferences,
					feedback: feedbackInput.trim() || null,
					updatedAt: serverTimestamp(),
					createdAt: serverTimestamp(),
				},
				{ merge: true },
			);

			setSuccess("ההעדפות נשמרו בהצלחה.");
			await loadEventUserPreferences();
		} catch (savePrefError) {
			setError(savePrefError.message || DEFAULT_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!selectedPreferenceEventId) {
			return;
		}

		const existing = eventUserPreferences.find(
			(item) => item.eventId === selectedPreferenceEventId,
		);
		if (!existing) {
			setMusicStylesInput("");
			setSongSuggestionsInput("");
			setDrinkPreferencesInput("");
			setFeedbackInput("");
			return;
		}

		setMusicStylesInput((existing.musicStyles || []).join(", "));
		setSongSuggestionsInput((existing.songSuggestions || []).join(", "));
		setDrinkPreferencesInput((existing.drinkPreferences || []).join(", "));
		setFeedbackInput(existing.feedback || "");
	}, [selectedPreferenceEventId, eventUserPreferences]);

	const handleLogout = async () => {
		if (!auth) {
			return;
		}

		await signOut(auth);
		clearAuthState();
		setMode("login");
		setSuccess("");
		setError("");
	};

	/* eslint-disable react-hooks/exhaustive-deps */
	// Session persistence: subscribe once and restore the active session.
	useEffect(() => {
		if (!auth || !db) {
			setIsAuthReady(true);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					clearAuthState();
					setIsAuthReady(true);
					return;
				}

				await hydrateSessionFromUser(user);
				setIsAuthReady(true);
			} catch (sessionError) {
				setError(sessionError.message || DEFAULT_ERROR_MESSAGE);
				setIsAuthReady(true);
			}
		});

		return () => unsubscribe();
	}, [auth, db]);
	/* eslint-enable react-hooks/exhaustive-deps */

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

	if (!isAuthReady) {
		return (
			<main className="page">
				<section className="card" dir="rtl">
					<p className="badge">Momento</p>
					<h1>טוען...</h1>
					<p className="subtitle">בודקים את מצב ההתחברות שלך</p>
				</section>
			</main>
		);
	}

	if (userRole) {
		const isAdmin = isAdminRole(userRole);
		const eventAdmins = managedUsers.filter((item) => item.role === ROLE_EVENT_ADMIN);
		const eventUsers = managedUsers.filter((item) => item.role === ROLE_EVENT_USER);
		const dashboardLinks = getDashboardLinks(userRole);
		return (
			<main className="page">
				<section className="card dashboard" dir="rtl">
					<p className="badge">Momento</p>
					<h1>{isAdmin ? "Admin Panel" : "Home Page"}</h1>
					<p className="subtitle">שלום {displayName}</p>
					<p className="success">
						{isAdmin
							? userRole === ROLE_MASTER_ADMIN
								? "אתה מחובר כ-Master Admin."
								: "אתה מחובר כ-Event Admin."
							: "התחברת כמשתמש רגיל ללא הרשאות מנהל."}
					</p>

					<DashboardNav links={dashboardLinks} />

					{userRole === ROLE_MASTER_ADMIN && (
						<MasterDashboard
							isLoading={isLoading}
							eventName={eventName}
							setEventName={setEventName}
							eventDate={eventDate}
							setEventDate={setEventDate}
							eventLocation={eventLocation}
							setEventLocation={setEventLocation}
							eventDescription={eventDescription}
							setEventDescription={setEventDescription}
							selectedEventOwnerAdminId={selectedEventOwnerAdminId}
							setSelectedEventOwnerAdminId={setSelectedEventOwnerAdminId}
							eventAdmins={eventAdmins}
							handleSaveEvent={handleSaveEvent}
							masterEvents={masterEvents}
							promoteEmail={promoteEmail}
							setPromoteEmail={setPromoteEmail}
							handlePromoteToEventAdmin={handlePromoteToEventAdmin}
							selectedEventAdminId={selectedEventAdminId}
							setSelectedEventAdminId={setSelectedEventAdminId}
							selectedEventUserId={selectedEventUserId}
							setSelectedEventUserId={setSelectedEventUserId}
							eventUsers={eventUsers}
							handleAssignEventUser={handleAssignEventUser}
							managedUsers={managedUsers}
							roleLabel={roleLabel}
							handleDemoteEventAdmin={handleDemoteEventAdmin}
							ROLE_EVENT_ADMIN={ROLE_EVENT_ADMIN}
						/>
					)}

					{userRole === ROLE_EVENT_ADMIN && (
						<EventAdminDashboard
							isLoading={isLoading}
							eventAdminEvents={eventAdminEvents}
							eventAdminUsers={eventAdminUsers}
							selectedAssignmentEventId={selectedAssignmentEventId}
							setSelectedAssignmentEventId={setSelectedAssignmentEventId}
							selectedAssignmentUserId={selectedAssignmentUserId}
							setSelectedAssignmentUserId={setSelectedAssignmentUserId}
							handleAssignUserToEvent={handleAssignUserToEvent}
							eventAssignments={eventAssignments}
							handleRemoveAssignment={handleRemoveAssignment}
							eventAdminPreferences={eventAdminPreferences}
						/>
					)}

					{userRole === ROLE_EVENT_USER && (
						<EventUserDashboard
							isLoading={isLoading}
							eventUserEvents={eventUserEvents}
							selectedPreferenceEventId={selectedPreferenceEventId}
							setSelectedPreferenceEventId={setSelectedPreferenceEventId}
							musicStylesInput={musicStylesInput}
							setMusicStylesInput={setMusicStylesInput}
							songSuggestionsInput={songSuggestionsInput}
							setSongSuggestionsInput={setSongSuggestionsInput}
							drinkPreferencesInput={drinkPreferencesInput}
							setDrinkPreferencesInput={setDrinkPreferencesInput}
							feedbackInput={feedbackInput}
							setFeedbackInput={setFeedbackInput}
							handleSavePreferences={handleSavePreferences}
						/>
					)}

					<button
						type="button"
						className="submit-button"
						onClick={handleLogout}
					>
						התנתקות
					</button>
				</section>
			</main>
		);
	}

	return (
		<AuthPage
			isRegisterMode={isRegisterMode}
			title={title}
			isLoading={isLoading}
			name={name}
			setName={setName}
			email={email}
			setEmail={setEmail}
			password={password}
			setPassword={setPassword}
			confirmPassword={confirmPassword}
			setConfirmPassword={setConfirmPassword}
			setMode={setMode}
			clearStatus={clearStatus}
			onSubmit={onSubmit}
			firebaseSetupError={firebaseSetupError}
			error={error}
			success={success}
		/>
	);
}

export default App;
