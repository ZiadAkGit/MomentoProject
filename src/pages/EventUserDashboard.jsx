function EventUserDashboard({
  isLoading,
  eventUserEvents,
  selectedPreferenceEventId,
  setSelectedPreferenceEventId,
  musicStylesInput,
  setMusicStylesInput,
  songSuggestionsInput,
  setSongSuggestionsInput,
  drinkPreferencesInput,
  setDrinkPreferencesInput,
  feedbackInput,
  setFeedbackInput,
  handleSavePreferences,
}) {
  return (
    <>
      <div id="event-user-events" className="users-list">
        <h3>האירועים שלי</h3>
        {eventUserEvents.length === 0 && <p>עדיין לא שויכת לאירועים.</p>}
        {eventUserEvents.map((item) => (
          <div key={item.id} className="user-row">
            <div>
              <strong>{item.eventName}</strong>
              <div className="row-meta">
                {item.eventDate || "ללא תאריך"}
                {item.eventLocation ? ` | ${item.eventLocation}` : ""}
              </div>
              {item.eventDescription && (
                <div className="row-meta">{item.eventDescription}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div id="event-user-preferences" className="users-list">
        <h3>העדפות לאירוע</h3>
        <form className="promote-form" onSubmit={handleSavePreferences}>
          <select
            value={selectedPreferenceEventId}
            onChange={(event) => setSelectedPreferenceEventId(event.target.value)}
            required
          >
            <option value="">בחר אירוע</option>
            {eventUserEvents.map((item) => (
              <option key={item.id} value={item.eventId}>
                {item.eventName}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="סגנונות מוזיקה (מופרד בפסיקים)"
            value={musicStylesInput}
            onChange={(event) => setMusicStylesInput(event.target.value)}
          />
          <input
            type="text"
            placeholder="שירים מוצעים (מופרד בפסיקים)"
            value={songSuggestionsInput}
            onChange={(event) => setSongSuggestionsInput(event.target.value)}
          />
          <input
            type="text"
            placeholder="משקאות מועדפים (מופרד בפסיקים)"
            value={drinkPreferencesInput}
            onChange={(event) => setDrinkPreferencesInput(event.target.value)}
          />
          <input
            type="text"
            placeholder="פידבק כללי (אופציונלי)"
            value={feedbackInput}
            onChange={(event) => setFeedbackInput(event.target.value)}
          />
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "שומר..." : "שמור העדפות"}
          </button>
        </form>
      </div>
    </>
  );
}

export default EventUserDashboard;
