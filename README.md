# Neuro Learn

A Duolingo-style learning app for the lab. It runs entirely in the phone's browser, works offline once it's installed, and keeps your progress on the device. There's no server, database, or build step. The whole app is the files in this folder.

- **Home** is a neural map: each unit is a neuron, and prereqs are the axons between them.
- **Lessons** run in focus mode, one step per screen. A progress trace across the top adds a spike for each answer you get right and a dip for each miss.
- **Review** uses spaced repetition (Leitner boxes). Questions you miss come back first.

## Put it on your iPhone (GitHub Pages, free)

You only do this once. Everything happens on github.com, so you don't need to install anything.

1. Make a free account at [github.com](https://github.com) and sign in.
2. Click **+** (top right) → **New repository**. Name it something like `neuro-learn`, set it to **Public**, and click **Create repository**.
3. On the new, empty repository page, click **uploading an existing file**.
4. In Finder, open this `app` folder, select everything inside it (**⌘A**), and drag it onto the GitHub page. Wait for the upload to finish, then click **Commit changes**.
   *(If the folders don't come through, use Chrome for this step.)*
5. In the repository, go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, and folder to **/ (root)**. Click **Save**.
6. Wait a minute or two, then refresh that page. It will show your address, something like `https://YOUR-USERNAME.github.io/neuro-learn/`.
7. On your iPhone, open that address in **Safari** → tap **Share** → **Add to Home Screen**.

The app now opens from your home screen like any other app, and it works without a connection.

> **Heads-up:** free GitHub Pages sites come from a public repository, so anyone who finds the address or the repository can read the lessons. Leave unpublished project details out of the lessons, or ask about a private option first.

## Add or update lessons

Put the lesson file in `content/lessons/`, add its id to `content/course.json`, then publish (see below). The full guide is in [`content/README.md`](content/README.md). You can also edit or upload files directly on GitHub, but then run `git pull` here before the next publish so the two copies stay in sync.

## Preview on your Mac (optional)

In Terminal, from this folder:

```bash
perl dev/serve.pl
```

Then open http://localhost:8765. In this local preview, any problem in a lesson file opens straight to a list of errors that names the file and field. You can also see that list on the live app under **Settings → See content problems**.

## Publishing changes

This folder is connected to the GitHub repository, so you never need to upload files by hand again. From this folder, run:

```bash
sh dev/publish.sh "What changed"
```

It commits everything, pushes to GitHub, and, if any app code changed, bumps `VERSION` in `sw.js` so phones know there's a new version. GitHub rebuilds the site in about a minute. After that, the app on your phone updates itself the next time you open it or switch back to it. If you're in the middle of a lesson or review, it waits until you finish.

Lesson-only changes (anything in `content/`) don't need a version bump, because lessons are always fetched fresh when you're online.

## What's where

```
index.html            app shell (loads src/app.js)
styles.css            all styling; dark and light themes follow the phone setting
manifest.webmanifest  home-screen install info
sw.js                 offline caching
icons/                app icons
src/
  app.js              starts the app, sets up screens
  router.js           #/unit/C1-style navigation
  content.js          loads course.json and lessons, works out locks
  validate.js         checks lesson files against the format
  progress.js         XP, streak, spaced repetition (stored on the device)
  map.js              lays out the neural map from prereqs
  player.js           focus-mode lesson player and finish screen
  steps.js            the six step types
  views/              home, unit, lesson, review, settings, errors screens
content/
  course.json         tracks → units → lesson ids
  lessons/*.json      one file per lesson
  images/             figures used by lessons
dev/serve.pl          local preview server
dev/publish.sh        commit, version-bump and push to GitHub
```

Progress (XP, streak, review boxes) lives in the phone's local storage, separate from the content. Deleting the home-screen app or clearing Safari website data resets it.
