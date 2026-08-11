import Link from "next/link";

// The shared masthead of the heritage register pages (home, areas, walks).
// The Minecraft-facing pages (/worlds, /atlas) keep their own dark chrome.
export function PlaceMasthead() {
  return (
    <header className="register-masthead">
      <Link className="register-wordmark" href="/" aria-label="BKKx home">
        <span>BKK</span>
        <b>x</b>
      </Link>
      <nav className="register-nav" aria-label="Primary navigation">
        <Link href="/#quarters">Quarters</Link>
        <Link href="/#walks">Walks</Link>
        <Link href="/#register">Register</Link>
        <Link href="/worlds">The worlds</Link>
        <a href="https://github.com/Nonarkara/BKKxCulture" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
