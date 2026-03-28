function EventAdminDashboard({
  isLoading,
  eventAdminEvents,
  eventAdminUsers,
  selectedAssignmentEventId,
  setSelectedAssignmentEventId,
  selectedAssignmentUserId,
  setSelectedAssignmentUserId,
  handleAssignUserToEvent,
  eventAssignments,
  handleRemoveAssignment,
  eventAdminPreferences,
}) {
  const prefsByEvent = eventAdminPreferences.reduce((acc, item) => {
    const key = item.eventName || "ללא שם אירוע";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div id="event-admin-events" className="users-list">
        <h3>האירועים שהוקצו אליך</h3>
        {eventAdminEvents.length === 0 && <p>עדיין לא הוקצו לך אירועים.</p>}
        {eventAdminEvents.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.name}</strong>
              <div className="row-meta">
                {item.eventDate}
                {item.location ? ` | ${item.location}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id="event-admin-assignments" className="users-list">
        <h3>שיוך משתמשים לאירועים</h3>
        <form className="promote-form" onSubmit={handleAssignUserToEvent}>
          <select
            value={selectedAssignmentEventId}
            onChange={(event) => setSelectedAssignmentEventId(event.target.value)}
            required
          >
            <option value="">בחרו אירוע</option>
            {eventAdminEvents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={selectedAssignmentUserId}
            onChange={(event) => setSelectedAssignmentUserId(event.target.value)}
            required
          >
            <option value="">בחרו Event User</option>
            {eventAdminUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName || item.email}
              </option>
            ))}
          </select>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "משייך..." : "שייך משתמש לאירוע"}
          </button>
        </form>

        {eventAssignments.length === 0 && <p>עדיין אין שיוכים.</p>}
        {eventAssignments.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.eventName}</strong>
              <div className="row-meta">
                {item.userFullName || item.userEmail}
                {item.eventDate ? ` | ${item.eventDate}` : ""}
              </div>
            </div>
            <button
              type="button"
              className="tab"
              onClick={() => handleRemoveAssignment(item.id)}
              disabled={isLoading}
            >
              הסר שיוך
            </button>
          </div>
        ))}
      </div>

      <div id="event-admin-preferences" className="users-list">
        <h3>דשבורד העדפות</h3>
        <p className="row-meta">סה״כ הגשות: {eventAdminPreferences.length}</p>
        {Object.keys(prefsByEvent).length === 0 && <p>עדיין אין הגשות העדפות.</p>}
        {Object.entries(prefsByEvent).map(([eventNameKey, count]) => (
          <div key={eventNameKey} className="user-row">
            <div>
              <strong>{eventNameKey}</strong>
              <div className="row-meta">{count} הגשות</div>
            </div>
          </div>
        ))}
        {eventAdminPreferences.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.userFullName || item.userEmail}</strong>
              <div className="row-meta">
                {item.eventName} | מוזיקה: {(item.musicStyles || []).join(", ") || "-"}
              </div>
              <div className="row-meta">
                משקאות: {(item.drinkPreferences || []).join(", ") || "-"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id="event-admin-users" className="users-list">
        <h3>Event Users תחתייך</h3>
        <p className="row-meta">סה״כ משתמשים משויכים: {eventAdminUsers.length}</p>
        {eventAdminUsers.length === 0 && <p>עדיין לא שויכו אליך Event Users.</p>}
        {eventAdminUsers.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.fullName || item.email}</strong>
              <div className="row-meta">{item.email} | Event User</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default EventAdminDashboard;
