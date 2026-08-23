# Roadmap (To-Do)

Planned features and technical improvements for future iterations of Vidmix v2:

- [ ] **FFmpeg Progress Bar**: Pipe progress data from `fluent-ffmpeg` via the IPC bridge to render a real-time progress bar in the React UI.
- [ ] **Pause/Cancel Render**: Implement a process kill function to allow users to cancel ongoing renders.
- [ ] **Extended Media Format Support**: Test and add support for `.mkv`, `.wav`, and other formats beyond `.mp4` and `.mp3`.
- [ ] **Logging System**: Implement an automated error logging system (e.g., using `winston`) that writes to a local text file for easier debugging.
- [ ] **Auto-Update System**: Configure the `electron-updater` module for seamless over-the-air software updates.
