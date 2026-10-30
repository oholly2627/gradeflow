# GradeFlow

A static student gradebook designed for GitHub Pages. It stores data locally in the browser, so no server or database is required.

## Features

- Student roster with class and contact information
- Assignment grade entry and student averages
- At-a-glance performance dashboard and grade distribution
- Search and filter students
- CSV export and JSON backup/import
- Light/dark mode
- Responsive layout for phones and desktops

## Deploy to GitHub Pages

1. Create a GitHub repository and upload the contents of this folder.
2. Push the default branch as `main`.
3. In **Settings → Pages**, set the source to **GitHub Actions**.
4. The included workflow deploys the app after each push to `main`.

Because this is a client-side app, each browser/device has its own local gradebook. Use the backup feature to move data between devices.
