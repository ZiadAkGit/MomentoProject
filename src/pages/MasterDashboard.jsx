function MasterDashboard({
  isLoading,
  eventName,
  setEventName,
  eventDate,
  setEventDate,
  eventLocation,
  setEventLocation,
  eventDescription,
  setEventDescription,
  selectedEventOwnerAdminId,
  setSelectedEventOwnerAdminId,
  eventAdmins,
  handleSaveEvent,
  masterEvents,
  promoteEmail,
  setPromoteEmail,
  handlePromoteToEventAdmin,
  selectedEventAdminId,
  setSelectedEventAdminId,
  selectedEventUserId,
  setSelectedEventUserId,
  eventUsers,
  handleAssignEventUser,
  managedUsers,
  roleLabel,
  handleDemoteEventAdmin,
  ROLE_EVENT_ADMIN,
}) {
  return (
    <>
      <div id="master-events" className="users-list">
        <h3>יצירת אירוע ושיוך ל-Event Admin</h3>
        <form className="promote-form" onSubmit={handleSaveEvent}>
          <input
            type="text"
            placeholder="שם האירוע"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            required
          />
          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            required
          />
          <input
            type="text"
            placeholder="מיקום האירוע (אופציונלי)"
            value={eventLocation}
            onChange={(event) => setEventLocation(event.target.value)}
          />
          <input
            type="text"
            placeholder="תיאור קצר (אופציונלי)"
            value={eventDescription}
            onChange={(event) => setEventDescription(event.target.value)}
          />
          <select
            value={selectedEventOwnerAdminId}
            onChange={(event) => setSelectedEventOwnerAdminId(event.target.value)}
            required
          >
            <option value="">בחרו Event Admin לאירוע</option>
            {eventAdmins.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName || item.email}
              </option>
            ))}
          </select>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "שומר..." : "צור אירוע"}
          </button>
        </form>
        {masterEvents.length === 0 && <p>עדיין לא יצרת אירועים.</p>}
        {masterEvents.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.name}</strong>
              <div className="row-meta">
                {item.eventDate}
                {item.location ? ` | ${item.location}` : ""}
                {item.assignedEventAdminEmail
                  ? ` | Event Admin: ${item.assignedEventAdminEmail}`
                  : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        id="master-admins"
        className="promote-form"
        onSubmit={handlePromoteToEventAdmin}
      >
        <label htmlFor="promoteEmail">מינוי Event Admin (לפי אימייל)</label>
        <input
          id="promoteEmail"
          type="email"
          placeholder="event-admin@example.com"
          value={promoteEmail}
          onChange={(event) => setPromoteEmail(event.target.value)}
          required
        />
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "מעדכן..." : "מנה ל-Event Admin"}
        </button>
      </form>

      <form id="master-assign" className="promote-form" onSubmit={handleAssignEventUser}>
        <label htmlFor="eventAdminSelect">שיוך Event User ל-Event Admin</label>
        <select
          id="eventAdminSelect"
          value={selectedEventAdminId}
          onChange={(event) => setSelectedEventAdminId(event.target.value)}
          required
        >
          <option value="">בחרו Event Admin</option>
          {eventAdmins.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName || item.email}
            </option>
          ))}
        </select>
        <select
          value={selectedEventUserId}
          onChange={(event) => setSelectedEventUserId(event.target.value)}
          required
        >
          <option value="">בחרו Event User</option>
          {eventUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName || item.email}
            </option>
          ))}
        </select>
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "מעדכן..." : "שייך משתמש"}
        </button>
      </form>

      <div id="master-users" className="users-list">
        <h3>משתמשים תחת Master Admin</h3>
        {managedUsers.length === 0 && <p>אין משתמשים להצגה.</p>}
        {managedUsers.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.fullName || item.email}</strong>
              <div className="row-meta">
                {item.email} | {roleLabel(item.role)}{" "}
                {item.parentEventAdminEmail ? `| תחת ${item.parentEventAdminEmail}` : ""}
              </div>
            </div>
            {item.role === ROLE_EVENT_ADMIN && (
              <button
                type="button"
                className="tab"
                onClick={() => handleDemoteEventAdmin(item)}
                disabled={isLoading}
              >
                הורד ל-Event User
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default MasterDashboard;
