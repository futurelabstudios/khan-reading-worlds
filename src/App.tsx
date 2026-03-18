import { useState, type CSSProperties } from "react";
import readingData from "./data/recommendations.json";

type ReadingData = typeof readingData;
type AgeGroup = ReadingData["ageGroups"][number];
type Theme = AgeGroup["themes"][number];
type Recommendation = Theme["recommendations"][number];
type TeacherPick = ReadingData["teacherPicks"][number];
type GroupId = AgeGroup["id"];
type IconKind = GroupId | "teacher";

type GroupProfile = {
  eyebrow: string;
  description: string;
  accent: string;
  ink: string;
  wash: string;
  tint: string;
};

const GROUP_PROFILES: Record<GroupId, GroupProfile> = {
  "picture-books-by-topic": {
    eyebrow: "Read-aloud magic",
    description:
      "Warm, inviting books for early readers, shared read-alouds, and joyful story time.",
    accent: "#f3b35b",
    ink: "#193c72",
    wash: "#fff7e8",
    tint: "#fde9c6",
  },
  "chapter-books": {
    eyebrow: "Independent readers",
    description:
      "Mysteries, humor, and adventure stories for kids ready to stretch into longer reads.",
    accent: "#f26a33",
    ink: "#193c72",
    wash: "#fff1ea",
    tint: "#ffd7c7",
  },
  "middle-grade-readers-between-the-ages-of-8-and-12": {
    eyebrow: "Big world energy",
    description:
      "Epic quests, mischief, secret powers, and unforgettable middle-grade page-turners.",
    accent: "#5d43e7",
    ink: "#193c72",
    wash: "#f1efff",
    tint: "#ddd4ff",
  },
  "young-adult": {
    eyebrow: "Thoughtful favorites",
    description:
      "Richer, darker, identity-shaping stories for older readers ready for bigger stakes.",
    accent: "#7d2d7b",
    ink: "#193c72",
    wash: "#f9eff7",
    tint: "#edcde7",
  },
};

const SEARCHABLE_FIELDS = [
  "title",
  "headline",
  "author",
  "summary",
  "meta",
  "note",
] as const;

function getTotalRecommendations(groups: AgeGroup[]) {
  return groups.reduce(
    (groupSum, group) =>
      groupSum +
      group.themes.reduce(
        (themeSum, theme) => themeSum + theme.recommendations.length,
        0,
      ),
    0,
  );
}

function getTotalThemes(groups: AgeGroup[]) {
  return groups.reduce((sum, group) => sum + group.themes.length, 0);
}

function formatSyncDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(date);
}

function matchesSearch(recommendation: Recommendation, query: string) {
  if (!query) {
    return true;
  }

  return SEARCHABLE_FIELDS.some((field) =>
    recommendation[field].toLowerCase().includes(query),
  );
}

function getByline(recommendation: Recommendation) {
  if (recommendation.author) {
    return `by ${recommendation.author}`;
  }

  if (recommendation.headline && recommendation.headline !== recommendation.title) {
    return recommendation.headline;
  }

  return "";
}

function getPrimaryLink(recommendation: Recommendation) {
  return recommendation.links[0] ?? null;
}

function getProfileStyle(profile: GroupProfile): CSSProperties {
  return {
    "--accent": profile.accent,
    "--ink": profile.ink,
    "--wash": profile.wash,
    "--tint": profile.tint,
  } as CSSProperties;
}

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="brand-mark"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="40" height="40" rx="14" fill="#14B892" />
      <path
        d="M22 11 31 16.5V26c0 5.2-4.1 9.4-9 9.4S13 31.2 13 26v-9.5L22 11Z"
        fill="#fff"
      />
      <path
        d="M22 16c2.9 0 5.2 2.2 5.5 5h-11c.3-2.8 2.6-5 5.5-5Z"
        fill="#14B892"
      />
    </svg>
  );
}

function DoodleIcon({ kind }: { kind: IconKind }) {
  switch (kind) {
    case "picture-books-by-topic":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 44 44 14" />
          <path d="M18 20 46 48" />
          <path d="M18 48h30" />
          <path d="M44 14h6v6" />
          <path d="M14 44v6h6" />
        </svg>
      );
    case "chapter-books":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M16 18c8-3 14-3 20 0v30c-6-3-12-3-20 0V18Z" />
          <path d="M48 18c-8-3-14-3-20 0v30c6-3 12-3 20 0V18Z" />
          <path d="M28 22v26" />
        </svg>
      );
    case "middle-grade-readers-between-the-ages-of-8-and-12":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 14 42 22l8 10-8 10-10 8-10-8-8-10 8-10 10-8Z" />
          <path d="M32 22v20" />
          <path d="M22 32h20" />
          <circle cx="32" cy="32" r="4" />
        </svg>
      );
    case "young-adult":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="m32 12 4 12 12 1-9 7 3 12-10-6-10 6 3-12-9-7 12-1 4-12Z" />
          <path d="M18 48c4-3 8-4 14-4s10 1 14 4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="28" r="12" />
          <path d="M24 38v10l8-5 8 5V38" />
          <path d="m28 28 3 3 5-6" />
        </svg>
      );
  }
}

function HeroIllustration() {
  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 720 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M430 396 654 345l33 91H506l-76-40Z"
        fill="#B4D7E5"
        opacity=".78"
      />
      <path d="M316 388 543 350l-28 75-160 14Z" fill="#A7CDDD" opacity=".75" />
      <path
        d="M470 250 626 292l-82 147-164-34 90-155Z"
        fill="#FFF9F1"
        transform="rotate(7 470 250)"
      />
      <path
        d="M417 286h184v82H417z"
        fill="#6F2774"
        transform="rotate(18 417 286)"
      />
      <path
        d="M383 258h184v82H383z"
        fill="#F66A35"
        transform="rotate(18 383 258)"
      />
      <path
        d="M454 114 548 184l9 147-110 38-23-173Z"
        fill="#4F35E8"
      />
      <path
        d="M452 136 531 93l8 126-87 50-5-133Z"
        fill="#E8CADB"
      />
      <path
        d="M443 143 536 91l8 120-92 52-9-120Z"
        fill="#312C4B"
      />
      <path
        d="M430 207 525 265l-99 59 4-117Z"
        fill="#4F35E8"
      />
      <g fill="#2D2046" opacity=".9">
        <ellipse cx="469" cy="255" rx="10" ry="5" transform="rotate(-20 469 255)" />
        <ellipse cx="495" cy="246" rx="10" ry="5" transform="rotate(-20 495 246)" />
        <ellipse cx="519" cy="236" rx="10" ry="5" transform="rotate(-20 519 236)" />
        <ellipse cx="468" cy="286" rx="10" ry="5" transform="rotate(-20 468 286)" />
        <ellipse cx="494" cy="276" rx="10" ry="5" transform="rotate(-20 494 276)" />
        <ellipse cx="519" cy="266" rx="10" ry="5" transform="rotate(-20 519 266)" />
      </g>
      <path
        d="M325 360c20-9 38 3 46 18 7 12 14 33 30 41"
        stroke="#111111"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M362 334c12 2 19 11 18 24"
        stroke="#111111"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M617 116 704 48l16 20-102 83-44 16 24-35Z"
        fill="#F9BE42"
      />
      <path
        d="M346 126 356 106M351 117l-12-6M351 117l14 3M351 117l2 14"
        stroke="#2A5F9E"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m548 133 16 11M560 121l2 23M548 126l17-10"
        stroke="#E8CADB"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecommendationCard({
  recommendation,
  profile,
  groupLabel,
}: {
  recommendation: Recommendation;
  profile: GroupProfile;
  groupLabel: string;
}) {
  const primaryLink = getPrimaryLink(recommendation);
  const byline = getByline(recommendation);

  return (
    <article
      className="recommendation-card"
      style={getProfileStyle(profile)}
    >
      <div className="recommendation-card__top">
        <span className="recommendation-card__shelf">{groupLabel}</span>
        {recommendation.meta ? (
          <span className="recommendation-card__badge">{recommendation.meta}</span>
        ) : null}
      </div>

      <h4>{recommendation.title}</h4>
      {byline ? <p className="recommendation-card__byline">{byline}</p> : null}
      <p className="recommendation-card__summary">{recommendation.summary}</p>
      {recommendation.note ? (
        <p className="recommendation-card__note">{recommendation.note}</p>
      ) : null}

      <div className="recommendation-card__footer">
        {primaryLink ? (
          <a href={primaryLink.url} target="_blank" rel="noreferrer">
            Explore source
          </a>
        ) : (
          <span>Shared by the Khan Academy team</span>
        )}
      </div>
    </article>
  );
}

function TeacherCard({ pick }: { pick: TeacherPick }) {
  return (
    <article className="teacher-card">
      <div className="teacher-card__top">
        <span className="teacher-card__icon">
          <DoodleIcon kind="teacher" />
        </span>
        <div>
          <p className="teacher-card__eyebrow">Ambassador shelf</p>
          <h3>{pick.name}</h3>
        </div>
      </div>

      {pick.picks.length > 0 ? (
        <ul className="teacher-card__list">
          {pick.picks.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      ) : (
        <p className="teacher-card__empty">
          Shared a trusted outside list for extra browsing.
        </p>
      )}

      {pick.resource ? (
        <a href={pick.resource.url} target="_blank" rel="noreferrer">
          Open "{pick.resource.label}"
        </a>
      ) : null}
    </article>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<GroupId | "all">("all");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups: AgeGroup[] = [];
  for (const group of readingData.ageGroups) {
    if (selectedGroup !== "all" && group.id !== selectedGroup) {
      continue;
    }

    const visibleThemes: Theme[] = [];
    for (const theme of group.themes) {
      const visibleRecommendations = theme.recommendations.filter((recommendation) =>
        matchesSearch(recommendation, normalizedQuery),
      );

      if (!normalizedQuery || visibleRecommendations.length > 0) {
        visibleThemes.push({
          ...theme,
          recommendations: visibleRecommendations,
        });
      }
    }

    if (visibleThemes.length > 0) {
      visibleGroups.push({
        ...group,
        themes: visibleThemes,
      });
    }
  }

  const totalRecommendations = getTotalRecommendations(readingData.ageGroups);
  const totalThemes = getTotalThemes(readingData.ageGroups);
  const visibleRecommendations = getTotalRecommendations(visibleGroups);
  const visibleThemeCount = getTotalThemes(visibleGroups);
  const currentThemeLinks =
    selectedGroup === "all" || visibleGroups.length === 0
      ? []
      : visibleGroups[0].themes.map((theme) => ({
          id: theme.id,
          title: theme.title,
          count: theme.recommendations.length,
        }));

  const activeFilters = selectedGroup !== "all" || normalizedQuery.length > 0;

  const jumpToAnchor = (id: string) => {
    window.setTimeout(() => {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const jumpToShelf = (id: string) => {
    setQuery("");
    setSelectedGroup("all");
    jumpToAnchor(id);
  };

  return (
    <div className="site-shell" id="top">
      <header className="topbar">
        <a href="#top" className="topbar__brand">
          <BrandMark />
          <div className="topbar__brand-copy">
            <strong>Khan Academy Reading Worlds</strong>
            <small>Curated lists for families, classrooms, and curious readers</small>
          </div>
        </a>

        <nav className="topbar__nav">
          <a href="#start-here">Start here</a>
          <a href="#collection">Search library</a>
          <a href="#teacher-picks">Teacher picks</a>
          <a href={readingData.sourceUrl} target="_blank" rel="noreferrer">
            Source doc
          </a>
        </nav>

        <a className="topbar__cta" href="#collection">
          Browse all books
        </a>
      </header>

      <section className="hero-band">
        <div className="hero-band__inner">
          <div className="hero-copy">
            <p className="hero-copy__eyebrow">Khan Academy staff library</p>
            <h1>
              We&apos;re here with recommended books to{" "}
              <span className="hero-copy__highlight">Keep Everyone Reading</span>
            </h1>
            <p className="hero-copy__lead">
              Picture books, chapter books, middle grade adventures, and young
              adult favorites selected by the Khan Academy team and organized
              into a library that&apos;s easier to share.
            </p>

            <div className="hero-copy__actions">
              <a className="button button--primary" href="#start-here">
                Start browsing
              </a>
              <a className="button button--secondary" href="#teacher-picks">
                Open teacher picks
              </a>
            </div>

            <p className="hero-copy__meta">
              <span>{totalRecommendations} books</span>
              <span>{totalThemes} theme shelves</span>
              <span>Updated {formatSyncDate(readingData.syncedAt)}</span>
            </p>
          </div>

          <div className="hero-art">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <main className="page">
        <section className="entry-section" id="start-here">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Choose a starting point</p>
              <h2>Jump into the shelf that fits the reader in front of you.</h2>
            </div>
            <p className="section-heading__copy">
              These audience-first cards are the quickest way into the
              collection. If you already know the age band, start here.
            </p>
          </div>

          <div className="entry-grid">
            {readingData.ageGroups.map((group) => {
              const profile = GROUP_PROFILES[group.id];
              const count = getTotalRecommendations([group]);

              return (
                <button
                  className="entry-card"
                  key={group.id}
                  onClick={() => jumpToShelf(group.id)}
                  style={getProfileStyle(profile)}
                  type="button"
                >
                  <span className="entry-card__icon">
                    <DoodleIcon kind={group.id} />
                  </span>
                  <p className="entry-card__eyebrow">{profile.eyebrow}</p>
                  <h3>{group.label}</h3>
                  <p className="entry-card__copy">{profile.description}</p>
                  <div className="entry-card__meta">
                    <span>{count} books</span>
                    <span>{group.themes.length} shelves</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="navigator" id="collection">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="section-heading__eyebrow">Or search the full library</p>
              <h2>Filter by title, age band, theme, or recommender.</h2>
            </div>
            <p className="section-heading__copy">
              Use this when you don&apos;t know exactly where to begin, or when
              you want to narrow the collection to a very specific kind of read.
            </p>
          </div>

          <div className="navigator__panel">
            <label className="search-field">
              <span>Search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try fantasy, snow, Charlotte, or Harry Potter"
                aria-label="Search reading recommendations"
              />
            </label>

            <div className="navigator__summary">
              Showing {visibleRecommendations} books across {visibleThemeCount} visible shelves
            </div>

            <div className="navigator__filters" role="tablist" aria-label="Age group filters">
              <button
                className={`filter-pill ${selectedGroup === "all" ? "filter-pill--active" : ""}`}
                onClick={() => setSelectedGroup("all")}
                type="button"
              >
                All shelves
              </button>
              {readingData.ageGroups.map((group) => (
                <button
                  className={`filter-pill ${
                    selectedGroup === group.id ? "filter-pill--active" : ""
                  }`}
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  type="button"
                >
                  {group.label}
                </button>
              ))}
              <a className="filter-pill filter-pill--anchor" href="#teacher-picks">
                Teacher picks
              </a>
            </div>

            {activeFilters ? (
              <button
                className="reset-link"
                onClick={() => {
                  setQuery("");
                  setSelectedGroup("all");
                }}
                type="button"
              >
                Reset filters
              </button>
            ) : null}

            {currentThemeLinks.length > 0 ? (
              <div className="theme-jumps">
                <span className="theme-jumps__label">Themes in this shelf</span>
                {currentThemeLinks.map((theme) => (
                  <a href={`#${theme.id}`} key={theme.id} className="theme-jump">
                    {theme.title}
                    <span>{theme.count}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {visibleGroups.length === 0 ? (
          <section className="empty-state">
            <p className="section-heading__eyebrow">No matches yet</p>
            <h2>Try a broader search.</h2>
            <p>
              A different age band, author name, or theme should bring the
              collection back into view.
            </p>
          </section>
        ) : (
          visibleGroups.map((group) => {
            const profile = GROUP_PROFILES[group.id];

            return (
              <section
                className="collection-section"
                id={group.id}
                key={group.id}
                style={getProfileStyle(profile)}
              >
                <div className="collection-section__intro">
                  <div className="collection-section__title">
                    <span className="collection-section__icon">
                      <DoodleIcon kind={group.id} />
                    </span>
                    <div>
                      <p className="collection-section__eyebrow">{profile.eyebrow}</p>
                      <h2>{group.label}</h2>
                    </div>
                  </div>
                  <p className="collection-section__copy">{profile.description}</p>
                </div>

                <div className="theme-jumps theme-jumps--group">
                  <span className="theme-jumps__label">Jump to a theme</span>
                  {group.themes.map((theme) => (
                    <a href={`#${theme.id}`} key={theme.id} className="theme-jump">
                      {theme.title}
                      <span>{theme.recommendations.length}</span>
                    </a>
                  ))}
                </div>

                <div className="theme-stack">
                  {group.themes.map((theme) => (
                    <article className="theme-panel" id={theme.id} key={theme.id}>
                      <div className="theme-panel__header">
                        <div>
                          <p className="theme-panel__eyebrow">Theme shelf</p>
                          <h3>{theme.title}</h3>
                        </div>
                        <span className="theme-panel__count">
                          {theme.recommendations.length} picks
                        </span>
                      </div>

                      <div className="recommendation-grid">
                        {theme.recommendations.map((recommendation) => (
                          <RecommendationCard
                            groupLabel={group.label}
                            key={recommendation.id}
                            profile={profile}
                            recommendation={recommendation}
                          />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        )}

        <section className="teacher-section" id="teacher-picks">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="section-heading__eyebrow">Teacher picks</p>
              <h2>Quick ambassador favorites for when you need a shortlist fast.</h2>
            </div>
            <p className="section-heading__copy">
              This section is intentionally lightweight: fewer choices, faster
              browsing, and easy sharing with teachers or families.
            </p>
          </div>

          <div className="teacher-grid">
            {readingData.teacherPicks.map((pick) => (
              <TeacherCard key={pick.id} pick={pick} />
            ))}
          </div>
        </section>

        <footer className="footer">
          <p>
            Built from the published Khan Academy recommendation document and
            reshaped into a calmer, more visual reading resource.
          </p>
          <div className="footer__links">
            <a href="#top">Back to top</a>
            <a href={readingData.sourceUrl} target="_blank" rel="noreferrer">
              Open the source doc
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
