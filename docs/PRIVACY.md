# Privacy and operating boundaries

- Only `https://usflearn.instructure.com/`, `/dashboard`, and `/dashboard/` are themed. Query strings do not alter that boundary.
- No course, assignment, quiz, message, login, or embedded-tool routes are themed.
- `storage` is the only requested Chrome permission and contains only appearance preferences.
- There is no Canvas API client, telemetry, analytics, cookie reader, credential handling, grade collection, upload, or submission workflow.
- Images and styles load from the extension itself. The source samples are static bundled text.
- Decorative background layers are inert and click-through. Native Canvas links and controls remain owned by Canvas.
- Automated tests use synthetic markup and mock browser storage. No student records, screenshots of coursework, browser profiles, or personal machine paths are included in the project.

The repository is intended to remain private. Changing visibility would not change third-party artwork ownership or provide redistribution rights.
