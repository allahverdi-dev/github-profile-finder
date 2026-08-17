# 🔎 GitHub Profile Finder

A responsive GitHub profile search app for exploring public GitHub users, repositories, languages and activity from a username.

Built with **HTML, CSS and Vanilla JavaScript**, powered by the **GitHub REST API**.

🌐 **Live Demo:** available from the repository's **About** section.

---

## 🖼️ Preview

### Profile Overview

![GitHub Profile Finder profile page](screenshots/profile-page-dashboard.png)

### Light & Dark Themes

<table>
  <tr>
    <td width="50%">
      <img src="screenshots/light-mode-dashboard.png" alt="GitHub Profile Finder light mode">
    </td>
    <td width="50%">
      <img src="screenshots/dark-mode-dashboard.png" alt="GitHub Profile Finder dark mode">
    </td>
  </tr>
</table>

### 📱 Mobile

<table>
  <tr>
    <td width="50%">
      <img src="screenshots/mobile-design-dashboard-light.png" alt="GitHub Profile Finder mobile light mode">
    </td>
    <td width="50%">
      <img src="screenshots/mobile-design-dashboard-dark.png" alt="GitHub Profile Finder mobile dark mode">
    </td>
  </tr>
</table>

---

## ✨ Features

- Search public GitHub users by username
- Display profile details and account statistics
- Browse public repositories
- View repository descriptions, languages, stars and forks
- Explore language usage across repositories
- Open GitHub profiles and repositories directly
- Light and dark themes
- Responsive desktop and mobile layouts
- Loading, empty and error states
- Keyboard-friendly interactions

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Semantic page structure |
| CSS3 | Styling, themes and responsive layouts |
| Vanilla JavaScript | Application logic and interactivity |
| GitHub REST API | Public GitHub profile and repository data |
| LocalStorage | Theme preference |
| GitHub Pages | Static deployment |

The project uses **no frontend framework or build tool**.

---

## 🤖 AI-Assisted Development

GitHub Profile Finder was created using an **AI-assisted development workflow**.

- **ChatGPT** — planning, problem-solving and iteration
- **Claude Code** — implementation, debugging and refinement

I directed the project structure, feature decisions, testing and revisions while continuing to strengthen my HTML, CSS and JavaScript fundamentals.

The project is part of my broader learning process: using AI tools to turn ideas into working products while gradually building a deeper understanding of the code behind them.

---

## 👤 Profile Information

When a valid GitHub username is found, the app can display public information such as:

- Avatar
- Name and username
- Bio
- Location
- Company
- Website
- Followers and following
- Public repository count
- Account creation date

The exact information available depends on what the GitHub user has made public.

---

## 📦 Repository Explorer

The application also presents a user's public repositories with information such as:

- Repository name
- Description
- Primary language
- Stars
- Forks
- Last updated date
- Direct repository link

Repository cards are designed to make a user's public work easy to scan without leaving the application.

---

## 📊 Language Overview

GitHub Profile Finder summarizes languages used across a user's public repositories.

This provides a quick visual overview of the technologies most commonly represented in their GitHub profile.

---

## 🌐 GitHub REST API

Profile data is retrieved from the GitHub REST API.

Example user request:

```text
https://api.github.com/users/{username}
```

Public repositories are retrieved from:

```text
https://api.github.com/users/{username}/repos
```

The application uses public endpoints and does not require visitors to sign in with GitHub.

---

## ⚠️ API Rate Limits

GitHub applies rate limits to unauthenticated API requests.

If the public rate limit is reached, new searches may temporarily stop working until the limit resets.

The interface includes handling for situations such as:

- User not found
- Network failure
- API rate limit reached
- Invalid API response
- Missing or unavailable profile information

---

## 🌓 Light & Dark Themes

The application includes both light and dark interface themes.

The selected theme is stored locally so the preference can persist between visits.

---

## 📱 Responsive Design

GitHub Profile Finder adapts across desktop and mobile layouts.

Responsive behavior includes:

- Flexible profile layouts
- Adaptive repository grids
- Responsive statistics cards
- Mobile-friendly search controls
- Touch-friendly interactions
- Mobile light and dark themes

---

## ♿ Accessibility

The interface includes practical accessibility-focused improvements such as:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible search controls
- Descriptive button labels
- Clear loading and error feedback
- Readable contrast across themes

This project does not claim formal WCAG certification.

---

## 📁 Project Structure

<details>
<summary>View project structure</summary>

```text
github-profile-finder/
├── screenshots/
│   ├── dark-mode-dashboard.png
│   ├── light-mode-dashboard.png
│   ├── mobile-design-dashboard-dark.png
│   ├── mobile-design-dashboard-light.png
│   └── profile-page-dashboard.png
│
├── index.html
├── README.md
├── LICENSE
└── ...
```

> The project structure may evolve as the application is refined.

</details>

---

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/allahverdi-dev/github-profile-finder.git
cd github-profile-finder
```

### 2. Start a local server

Using Python:

```bash
python3 -m http.server 5173
```

Or using Node.js:

```bash
npx serve -l 5173
```

Then open:

```text
http://localhost:5173
```

No package installation or build step is required.

---

## 🎯 Project Goals

This project was created to practice and explore:

- Fetching data from a public REST API
- Working with asynchronous JavaScript
- Rendering API data dynamically
- Handling loading and error states
- Processing GitHub profile and repository data
- Building responsive layouts
- Managing interface state
- Creating light and dark themes
- Building a polished application without a frontend framework

---

## 🌱 What I'm Learning

GitHub Profile Finder is also part of my ongoing frontend learning process.

I'm currently strengthening my understanding of:

- HTML
- CSS
- JavaScript
- REST APIs
- Asynchronous programming
- DOM manipulation
- Responsive web design
- Git and GitHub

AI tools helped me build and refine the project, while my goal is to increasingly understand and implement projects like this independently.

---

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for details.

GitHub names, logos and API data remain subject to GitHub's own terms and policies.
