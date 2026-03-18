import { useState, type CSSProperties } from "react";
import readingData from "./data/recommendations.json";

type ReadingData = typeof readingData;
type AgeGroup = ReadingData["ageGroups"][number];
type Theme = AgeGroup["themes"][number];
type Recommendation = Theme["recommendations"][number];
type TeacherPick = ReadingData["teacherPicks"][number];
type GroupId = AgeGroup["id"];

type GroupProfile = {
  eyebrow: string;
  description: string;
  accent: string;
  ink: string;
  wash: string;
  covers: Array<[string, string]>;
};

const GROUP_PROFILES: Record<GroupId, GroupProfile> = {
  "picture-books-by-topic": {
    eyebrow: "Read-aloud magic",
    description:
      "Warm, inventive picture books for big feelings, big laughs, and even bigger curiosity.",
    accent: "#14735c",
    ink: "#14342b",
    wash: "#eef9f4",
    covers: [
      ["#f3c15d", "#d87433"],
      ["#3f9d8b", "#165d50"],
      ["#ff8b6a", "#b94834"],
    ],
  },
  "chapter-books": {
    eyebrow: "Bridge readers",
    description:
      "Independent-reader adventures packed with mysteries, missions, animals, and comic energy.",
    accent: "#cc6936",
    ink: "#422118",
    wash: "#fff3eb",
    covers: [
      ["#ffbf7a", "#d16a29"],
      ["#f58d6a", "#a54833"],
      ["#7956d4", "#46307d"],
    ],
  },
  "middle-grade-readers-between-the-ages-of-8-and-12": {
    eyebrow: "Big world energy",
    description:
      "For readers ready for epic stakes, secret powers, hard choices, and unforgettable friendships.",
    accent: "#4767c7",
    ink: "#172544",
    wash: "#eef3ff",
    covers: [
      ["#5b7bde", "#2f468c"],
      ["#7ab7ff", "#3c74bf"],
      ["#b573ff", "#7044a7"],
    ],
  },
  "young-adult": {
    eyebrow: "Thought-provoking favorites",
    description:
      "Darkly delicious, emotionally rich, and identity-shaping stories for older readers.",
    accent: "#8f365f",
    ink: "#3d1828",
    wash: "#fff0f6",
    covers: [
      ["#df77a2", "#8f365f"],
      ["#5b8b8c", "#295354"],
      ["#241f4f", "#5f4fc2"],
    ],
  },
};

const HERO_CARDS = [
  { label: "Picture Books", title: "Try, try again!" },
  { label: "Chapter Books", title: "Detectives: on the case!" },
  { label: "Young Adult", title: "Fantastic worlds" },
];

const READING_STEPS = [
  {
    title: "Choose a shelf",
    body: "Start with picture books, chapter books, middle grade, or young adult.",
    action: "Jump to age groups",
    href: "#reading-map",
  },
  {
    title: "Use theme shelves",
    body: "Once you land in a section, jump by mood, interest, or reading vibe.",
    action: "Browse themes",
    href: "#collection",
  },
  {
    title: "Open teacher picks",
    body: "Need a short shortlist fast? Head straight to the ambassador recommendations.",
    action: "See teacher picks",
    href: "#teacher-picks",
  },
];

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

function getCoverLabel(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N}\s'’&-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  return words.join(" ");
}

function getPrimaryLink(recommendation: Recommendation) {
  return recommendation.links[0] ?? null;
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

function getAccentStyle(
  profile: GroupProfile,
  themeIndex: number,
  recommendationIndex = 0,
): CSSProperties {
  const [coverStart, coverEnd] =
    profile.covers[(themeIndex + recommendationIndex) % profile.covers.length];

  return {
    "--accent": profile.accent,
    "--ink": profile.ink,
    "--wash": profile.wash,
    "--cover-start": coverStart,
    "--cover-end": coverEnd,
  } as CSSProperties;
}

function RecommendationCard({
  recommendation,
  groupLabel,
  profile,
  themeIndex,
  recommendationIndex,
}: {
  recommendation: Recommendation;
  groupLabel: string;
  profile: GroupProfile;
  themeIndex: number;
  recommendationIndex: number;
}) {
  const primaryLink = getPrimaryLink(recommendation);
  const byline = getByline(recommendation);

  return (
    <article
      className="recommendation-card"
      style={getAccentStyle(profile, themeIndex, recommendationIndex)}
    >
      <div className="recommendation-card__cover">
        <span className="recommendation-card__cover-label">{groupLabel}</span>
        <strong>{getCoverLabel(recommendation.title)}</strong>
      </div>

      <div className="recommendation-card__body">
        <div className="recommendation-card__chips">
          {recommendation.meta ? (
            <span className="chip chip--accent">{recommendation.meta}</span>
          ) : null}
          {recommendation.note ? (
            <span className="chip chip--muted">Content note</span>
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
            <span className="recommendation-card__source">
              Shared by the Khan Academy team
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function TeacherCard({ pick }: { pick: TeacherPick }) {
  return (
    <article className="teacher-card">
      <div className="teacher-card__header">
        <p className="teacher-card__eyebrow">Ambassador shelf</p>
        <h3>{pick.name}</h3>
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
        <a
          className="teacher-card__link"
          href={pick.resource.url}
          target="_blank"
          rel="noreferrer"
        >
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
  const selectedGroupLabel =
    selectedGroup === "all"
      ? "All shelves"
      : readingData.ageGroups.find((group) => group.id === selectedGroup)?.label ??
        "Selected shelf";

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
  const totalTeacherShelves = readingData.teacherPicks.length;
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

  const handleShelfJump = (targetId: string) => {
    setQuery("");
    setSelectedGroup("all");

    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <div className="site-shell" id="top">
      <header className="topbar">
        <a href="#top" className="topbar__brand">
          <span className="topbar__brand-mark">KR</span>
          <span className="topbar__brand-copy">
            <strong>Khan Academy Reading Worlds</strong>
            <small>Reading lists, organized for quick browsing</small>
          </span>
        </a>
        <nav className="topbar__nav">
          <a href="#reading-map">Start here</a>
          <a href="#collection">Browse shelves</a>
          <a href="#teacher-picks">Teacher Picks</a>
          <a href={readingData.sourceUrl} target="_blank" rel="noreferrer">
            Source doc
          </a>
        </nav>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero__content">
            <p className="hero__eyebrow">Khan Academy staff library</p>
            <h1>Books that children will not want to put down.</h1>
            <p className="hero__lead">
              {readingData.intro} The original recommendations now live in a
              calmer, more visual home that is easy to browse, share, and send
              to families, teachers, and curious readers.
            </p>

            <div className="hero__actions">
              <a className="button button--solid" href="#collection">
                Browse the shelves
              </a>
              <a
                className="button button--ghost"
                href={readingData.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open the published doc
              </a>
            </div>

            <div className="hero__stats" aria-label="Site summary">
              <div className="hero-stat">
                <strong>{totalRecommendations}</strong>
                <span>recommendations</span>
              </div>
              <div className="hero-stat">
                <strong>{totalThemes}</strong>
                <span>theme shelves</span>
              </div>
              <div className="hero-stat">
                <strong>{totalTeacherShelves}</strong>
                <span>teacher spotlights</span>
              </div>
            </div>

            <p className="hero__timestamp">
              Last synced from the source document on{" "}
              {formatSyncDate(readingData.syncedAt)}.
            </p>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__halo" />
            {HERO_CARDS.map((card, index) => (
              <article
                className={`floating-book floating-book--${index + 1}`}
                key={card.title}
              >
                <span>{card.label}</span>
                <strong>{card.title}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="reading-map" id="reading-map">
          <div className="reading-map__header">
            <div>
              <p className="section-kicker">Reading map</p>
              <h2>Find the right path into the library.</h2>
            </div>
            <p className="reading-map__copy">
              Navigate in two ways: jump straight to a shelf if you know the
              audience, or use the filters below to narrow by title, mood, or
              topic.
            </p>
          </div>

          <div className="reading-map__steps">
            {READING_STEPS.map((step, index) => (
              <article className="reading-step" key={step.title}>
                <span className="reading-step__number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <a href={step.href}>{step.action}</a>
              </article>
            ))}
          </div>

          <div className="reading-map__jump-grid">
            {readingData.ageGroups.map((group, index) => {
              const profile = GROUP_PROFILES[group.id];
              return (
                <button
                  className="jump-card"
                  key={group.id}
                  onClick={() => handleShelfJump(group.id)}
                  style={getAccentStyle(profile, index)}
                  type="button"
                >
                  <span className="jump-card__eyebrow">{profile.eyebrow}</span>
                  <strong>{group.label}</strong>
                  <p>{getTotalRecommendations([group])} books across {group.themes.length} theme shelves</p>
                </button>
              );
            })}

            <button
              className="jump-card jump-card--teacher"
              onClick={() => handleShelfJump("teacher-picks")}
              type="button"
            >
              <span className="jump-card__eyebrow">Fast shortlist</span>
              <strong>Teacher picks</strong>
              <p>{totalTeacherShelves} ambassador shelves for quick recommendations</p>
            </button>
          </div>
        </section>

        <section className="filter-panel" id="collection">
          <div className="filter-panel__header">
            <div>
              <p className="section-kicker">Find a fit</p>
              <h2>Search by age band, mood, or book title.</h2>
              <p className="filter-panel__helper">
                Use these controls when you want to narrow the library instead
                of jumping around it.
              </p>
            </div>
            <p className="filter-panel__count">
              {selectedGroupLabel}: {visibleRecommendations} books across{" "}
              {visibleThemeCount} visible theme shelves
            </p>
          </div>

          <div className="filter-panel__controls">
            <label className="search-field">
              <span className="search-field__label">Search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try 'fantasy', 'snow', 'Charlotte', or 'Harry Potter'"
                aria-label="Search reading recommendations"
              />
            </label>

            <div className="pill-row" role="tablist" aria-label="Age group filters">
              <button
                className={`pill ${selectedGroup === "all" ? "pill--active" : ""}`}
                onClick={() => setSelectedGroup("all")}
                type="button"
              >
                All shelves
              </button>
              {readingData.ageGroups.map((group) => (
                <button
                  key={group.id}
                  className={`pill ${
                    selectedGroup === group.id ? "pill--active" : ""
                  }`}
                  onClick={() => setSelectedGroup(group.id)}
                  type="button"
                >
                  {group.label}
                </button>
              ))}
            </div>

            {activeFilters ? (
              <button
                className="button button--ghost button--small"
                onClick={() => {
                  setQuery("");
                  setSelectedGroup("all");
                }}
                type="button"
              >
                Reset filters
              </button>
            ) : null}
          </div>

          <div className="browse-links" aria-label="Quick section links">
            <span className="browse-links__label">Quick jumps</span>
            {readingData.ageGroups.map((group) => (
              <button
                className="browse-link"
                key={group.id}
                onClick={() => handleShelfJump(group.id)}
                type="button"
              >
                {group.label}
              </button>
            ))}
            <a className="browse-link browse-link--anchor" href="#teacher-picks">
              Teacher picks
            </a>
          </div>

          {currentThemeLinks.length > 0 ? (
            <div className="theme-link-row">
              <span className="browse-links__label">Themes in this shelf</span>
              {currentThemeLinks.map((theme) => (
                <a href={`#${theme.id}`} key={theme.id} className="theme-link">
                  {theme.title}
                  <span>{theme.count}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section className="spotlight-grid" aria-label="Age group spotlights">
          {readingData.ageGroups.map((group, index) => {
            const profile = GROUP_PROFILES[group.id];
            const recommendationCount = getTotalRecommendations([group]);

            return (
              <a
                href={`#${group.id}`}
                key={group.id}
                className="spotlight-card"
                style={getAccentStyle(profile, index)}
                onClick={(event) => {
                  event.preventDefault();
                  handleShelfJump(group.id);
                }}
              >
                <div className="spotlight-card__top">
                  <span>{profile.eyebrow}</span>
                  <span>{recommendationCount} picks</span>
                </div>
                <h3>{group.label}</h3>
                <p>{profile.description}</p>
                <div className="spotlight-card__footer">
                  <span>{group.themes.length} themed shelves</span>
                  <span>Jump to shelf</span>
                </div>
              </a>
            );
          })}
        </section>

        {visibleGroups.length === 0 ? (
          <section className="empty-state">
            <p className="section-kicker">No matches yet</p>
            <h2>Try a broader search.</h2>
            <p>
              A different age band, author name, or theme should bring the
              shelves back into view.
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
                style={{
                  "--accent": profile.accent,
                  "--wash": profile.wash,
                  "--ink": profile.ink,
                } as CSSProperties}
              >
                <div className="collection-section__header">
                  <div>
                    <p className="section-kicker">{profile.eyebrow}</p>
                    <h2>{group.label}</h2>
                    <p className="collection-section__copy">
                      {profile.description}
                    </p>
                  </div>
                  <p className="collection-section__count">
                    {getTotalRecommendations([group])} recommendations
                  </p>
                </div>

                <div className="collection-section__jump-row">
                  <span className="browse-links__label">Jump to a theme</span>
                  {group.themes.map((theme) => (
                    <a className="theme-link" href={`#${theme.id}`} key={theme.id}>
                      {theme.title}
                      <span>{theme.recommendations.length}</span>
                    </a>
                  ))}
                </div>

                <div className="collection-section__themes">
                  {group.themes.map((theme, themeIndex) => (
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
                        {theme.recommendations.map((recommendation, recommendationIndex) => (
                          <RecommendationCard
                            key={recommendation.id}
                            recommendation={recommendation}
                            groupLabel={group.label}
                            profile={profile}
                            themeIndex={themeIndex}
                            recommendationIndex={recommendationIndex}
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
          <div className="teacher-section__header">
            <div>
              <p className="section-kicker">Teacher Picks</p>
              <h2>Ambassador favorites for the classroom and beyond.</h2>
            </div>
            <p className="teacher-section__copy">
              Fast recommendations from the Khan Academy ambassador team for
              when you want a short shortlist instead of a deep browse.
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
            Built from Khan Academy&apos;s published recommendation doc and made
            easier to explore for readers, teachers, and families.
          </p>
          <div className="footer__links">
            <a href="#top">Back to top</a>
            <a href={readingData.sourceUrl} target="_blank" rel="noreferrer">
              Visit the source document
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
