"use client";

import { useActionState, useId, useRef, useState } from "react";
import {
  addTestimonial,
  deleteTestimonial,
  saveSettings,
  setTestimonialPublished,
  updateTestimonial,
  type SettingsState,
  type TestimonialState,
} from "@/app/(admin)/admin/settings/actions";
import Icon from "@/components/admin/Icon";
import { EmptyState } from "@/components/admin/ui";
import { SOCIALS } from "@/lib/site/links";

const box =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const lab = "mb-1 block text-sm font-medium text-neutral-800";
const hint = "mt-1 text-xs text-neutral-500";

function Err({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-sm text-red-700">
      {text}
    </p>
  ) : null;
}

export type SettingsValues = Record<string, string>;
export type Review = {
  id: string;
  quote: string;
  author: string;
  published: boolean;
};

export type TabKey =
  | "profile"
  | "contact"
  | "social"
  | "homepage"
  | "reviews"
  | "contactpage";

const TABS: { key: TabKey; label: string; blurb: string }[] = [
  { key: "profile", label: "Studio profile", blurb: "Introduction, areas covered, events shot and years of experience." },
  { key: "contact", label: "Contact information", blurb: "How clients reach you: Messenger, email and mobile number." },
  { key: "social", label: "Social media", blurb: "Links to your pages. Empty boxes are simply not shown." },
  { key: "homepage", label: "Homepage content", blurb: "A preview of what visitors see about the studio on the homepage." },
  { key: "reviews", label: "Client reviews", blurb: "Add, edit, show, hide or delete what clients said." },
  { key: "contactpage", label: "Contact page", blurb: "A preview of the details on the public Contact page." },
];

const FIELD_TAB: Record<string, TabKey> = {
  aboutText: "profile",
  serviceArea: "profile",
  eventsShot: "profile",
  yearsExperience: "profile",
  messenger: "contact",
  email: "contact",
  phone: "contact",
  ...Object.fromEntries(SOCIALS.map((s) => [s.key, "social" as TabKey])),
};

function formValues(form: HTMLFormElement): SettingsValues {
  const out: SettingsValues = {};
  for (const [k, v] of new FormData(form).entries())
    if (typeof v === "string") out[k] = v;
  return out;
}

// All the editable site content, split into clearly separated sections. The three form sections share
// one form (hidden sections stay in the page, so one "Save changes" saves everything), and the
// previews update as you type.
export function SiteContentEditor({
  initial,
  reviews,
  initialTab,
}: {
  initial: SettingsValues;
  reviews: Review[];
  initialTab: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettings,
    {},
  );
  const v0 = state.values ?? initial;
  const [live, setLive] = useState<SettingsValues>(v0);
  const [seenNonce, setSeenNonce] = useState(state.nonce);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const f = state.fields ?? {};

  // After a save the form is remounted with the saved values; keep the previews in step.
  if (state.nonce !== seenNonce) {
    setSeenNonce(state.nonce);
    setLive(state.values ?? initial);
  }

  const tabsWithErrors = [
    ...new Set(Object.keys(f).map((k) => FIELD_TAB[k]).filter(Boolean)),
  ] as TabKey[];
  const current = TABS.find((t) => t.key === tab)!;
  const hasForm = tab !== "reviews";
  const show = (k: TabKey) => (tab === k ? "" : "hidden");
  const L = live;

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <div role="tablist" aria-label="Website content sections" aria-orientation="vertical"
          className="flex gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`${uid}-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`${uid}-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                const i = TABS.findIndex((x) => x.key === tab);
                const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const n = TABS[(i + step + TABS.length) % TABS.length];
                setTab(n.key);
                document.getElementById(`${uid}-tab-${n.key}`)?.focus();
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className="a-nav-link flex-none justify-between whitespace-nowrap aria-selected:bg-[var(--a-card)] aria-selected:font-semibold aria-selected:text-[var(--a-ink)] aria-selected:shadow-sm"
            >
              <span>{t.label}</span>
              {tabsWithErrors.includes(t.key) && (
                <span className="h-2 w-2 rounded-full bg-red-600" title="Needs attention">
                  <span className="sr-only">Needs attention</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-4">
          <h2 className="a-serif text-2xl">{current.label}</h2>
          <p className="text-sm text-neutral-500">{current.blurb}</p>
        </div>

        <form
          ref={formRef}
          key={state.nonce ?? "initial"}
          action={action}
          noValidate
          onInput={(e) => setLive(formValues(e.currentTarget))}
          className={hasForm ? "" : "hidden"}
        >
          <div className="a-card flex flex-col gap-5 p-5">
            {/* Studio profile */}
            <div role="tabpanel" id={`${uid}-panel-profile`} aria-labelledby={`${uid}-tab-profile`}
              className={`flex flex-col gap-5 ${show("profile")}`}>
              <div>
                <label htmlFor="s-about" className={lab}>Short introduction</label>
                <textarea id="s-about" name="aboutText" rows={5} defaultValue={v0.aboutText} className={box} />
                <p className={hint}>Shown on the homepage. Up to 1200 characters.</p>
                <Err text={f.aboutText} />
              </div>
              <div>
                <label htmlFor="s-area" className={lab}>Areas you cover</label>
                <input id="s-area" name="serviceArea" defaultValue={v0.serviceArea}
                  placeholder="Cavite, Metro Manila, Laguna and nearby provinces" className={box} />
                <Err text={f.serviceArea} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-events" className={lab}>Events photographed</label>
                  <input id="s-events" name="eventsShot" inputMode="numeric" defaultValue={v0.eventsShot} className={box} />
                  <p className={hint}>Only enter a number that is true. Empty hides it.</p>
                  <Err text={f.eventsShot} />
                </div>
                <div>
                  <label htmlFor="s-years" className={lab}>Years of experience</label>
                  <input id="s-years" name="yearsExperience" inputMode="numeric" defaultValue={v0.yearsExperience} className={box} />
                  <Err text={f.yearsExperience} />
                </div>
              </div>
            </div>

            {/* Contact information */}
            <div role="tabpanel" id={`${uid}-panel-contact`} aria-labelledby={`${uid}-tab-contact`}
              className={`flex flex-col gap-5 ${show("contact")}`}>
              <div>
                <label htmlFor="s-messenger" className={lab}>Messenger link</label>
                <input id="s-messenger" name="messenger" defaultValue={v0.messenger}
                  placeholder="https://m.me/yourname" className={box} />
                <p className={hint}>The main &quot;Message us&quot; button. Paste your Messenger or Facebook profile link.</p>
                <Err text={f.messenger} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-email" className={lab}>Email</label>
                  <input id="s-email" name="email" type="email" defaultValue={v0.email} className={box} />
                  <Err text={f.email} />
                </div>
                <div>
                  <label htmlFor="s-phone" className={lab}>Mobile number</label>
                  <input id="s-phone" name="phone" type="tel" defaultValue={v0.phone} placeholder="0917 123 4567" className={box} />
                  <Err text={f.phone} />
                </div>
              </div>
            </div>

            {/* Social media */}
            <div role="tabpanel" id={`${uid}-panel-social`} aria-labelledby={`${uid}-tab-social`}
              className={`grid gap-4 sm:grid-cols-2 ${show("social")}`}>
              {SOCIALS.map((p) => (
                <div key={p.key}>
                  <label htmlFor={`s-${p.key}`} className={lab}>{p.label}</label>
                  <input id={`s-${p.key}`} name={p.key} defaultValue={v0[p.key]}
                    placeholder={`https://${p.hosts[0]}/...`} className={box} />
                  <Err text={f[p.key]} />
                </div>
              ))}
            </div>

            {/* Homepage preview */}
            <div role="tabpanel" id={`${uid}-panel-homepage`} aria-labelledby={`${uid}-tab-homepage`}
              className={show("homepage")}>
              <p className="mb-3 text-sm text-neutral-600">
                The homepage &quot;studio&quot; section is built from your Studio profile. This preview
                is simplified, and updates as you type. Nothing is shown for empty boxes.
              </p>
              <div className="rounded-lg bg-[#0d0c0a] p-6 text-[#f5f1ea]">
                <p className="text-xs tracking-[0.18em] text-[#c9a24b] uppercase">The studio</p>
                <p className="a-serif mt-2 text-3xl">Hi, I&apos;m Ian Arzaga</p>
                <p className="mt-3 max-w-prose text-sm leading-relaxed whitespace-pre-wrap text-[#b8b3a6]">
                  {L.aboutText?.trim() || "No introduction yet. The site shows its own short default text."}
                </p>
                <dl className="mt-5 flex flex-wrap gap-8">
                  {Number(L.eventsShot) > 0 && (
                    <div>
                      <dt className="text-xs text-[#8a8578]">events covered</dt>
                      <dd className="a-serif text-3xl">{Number(L.eventsShot)}+</dd>
                    </div>
                  )}
                  {Number(L.yearsExperience) > 0 && (
                    <div>
                      <dt className="text-xs text-[#8a8578]">years behind the camera</dt>
                      <dd className="a-serif text-3xl">{Number(L.yearsExperience)}</dd>
                    </div>
                  )}
                </dl>
                {L.serviceArea?.trim() && (
                  <p className="mt-5 text-sm text-[#b8b3a6]">Covering {L.serviceArea.trim()}</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="a-btn" onClick={() => setTab("profile")}>Edit studio profile</button>
                <a href="/" target="_blank" rel="noopener noreferrer" className="a-btn">
                  Open the homepage <Icon name="external" size={14} />
                </a>
              </div>
            </div>

            {/* Contact page preview */}
            <div role="tabpanel" id={`${uid}-panel-contactpage`} aria-labelledby={`${uid}-tab-contactpage`}
              className={show("contactpage")}>
              <p className="mb-3 text-sm text-neutral-600">
                These are the contact details visitors can use. Items with an empty box are left out.
              </p>
              <ul className="divide-y divide-[var(--a-line)] rounded-md border border-[var(--a-line)]">
                {[
                  { label: "Messenger", value: L.messenger, tab: "contact" as TabKey },
                  { label: "Email", value: L.email, tab: "contact" as TabKey },
                  { label: "Mobile", value: L.phone, tab: "contact" as TabKey },
                  ...SOCIALS.map((s) => ({ label: s.label, value: L[s.key], tab: "social" as TabKey })),
                ].map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium">{r.label}</span>
                    {r.value?.trim() ? (
                      <span className="min-w-0 truncate text-neutral-600">{r.value.trim()}</span>
                    ) : (
                      <button type="button" onClick={() => setTab(r.tab)} className="text-xs text-neutral-500 underline">
                        Not shown. Add it
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <a href="/contact" target="_blank" rel="noopener noreferrer" className="a-btn">
                  Open the Contact page <Icon name="external" size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--a-line)] bg-[var(--a-bg)]/95 py-3 backdrop-blur">
            <button disabled={pending} className="a-btn a-btn-primary">
              {pending ? "Saving…" : "Save changes"}
            </button>
            <p className="text-xs text-neutral-500">Saves the profile, contact details and social links together.</p>
            {state.message && (
              <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>
                {state.message}
                {!state.ok && tabsWithErrors.length > 0 && (
                  <>
                    {" "}
                    Check:{" "}
                    {tabsWithErrors.map((k, i) => (
                      <span key={k}>
                        {i > 0 && ", "}
                        <button type="button" onClick={() => setTab(k)} className="underline">
                          {TABS.find((t) => t.key === k)!.label}
                        </button>
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
            )}
          </div>
        </form>

        {/* Client reviews (their own forms, outside the settings form) */}
        <div role="tabpanel" id={`${uid}-panel-reviews`} aria-labelledby={`${uid}-tab-reviews`}
          className={tab === "reviews" ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" : "hidden"}>
          <ReviewList reviews={reviews} />
          <TestimonialForm />
        </div>
      </div>
    </div>
  );
}

export function TestimonialForm() {
  const [state, action, pending] = useActionState<TestimonialState, FormData>(addTestimonial, {});
  const f = state.fields ?? {};
  return (
    <form key={state.nonce ?? "initial"} action={action} noValidate className="a-card flex h-fit min-w-0 flex-col gap-3 p-5">
      <h3 className="a-card-title">Add a client review</h3>
      <p className="text-sm text-neutral-600">Only add words a real client said or wrote, with their permission.</p>
      <div>
        <label htmlFor="t-quote" className={lab}>What they said</label>
        <textarea id="t-quote" name="quote" rows={4} className={box} />
        <Err text={f.quote} />
      </div>
      <div>
        <label htmlFor="t-author" className={lab}>Who said it</label>
        <input id="t-author" name="author" placeholder="Maria and Paolo, wedding" className={box} />
        <Err text={f.author} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked /> Show on the website
      </label>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
      <button disabled={pending} className="a-btn a-btn-primary self-start">
        {pending ? "Adding…" : "Add review"}
      </button>
    </form>
  );
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0)
    return (
      <div className="a-card">
        <EmptyState
          icon="reviews"
          title="No reviews yet"
          text="When a client says something kind, add it here with their permission. It appears on the homepage."
        />
      </div>
    );
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
    </ul>
  );
}

function ReviewItem({ review: r }: { review: Review }) {
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<TestimonialState, FormData>(updateTestimonial, {});
  const [seen, setSeen] = useState(state.nonce);
  // Close the editor once a save went through.
  if (state.nonce !== seen) {
    setSeen(state.nonce);
    if (state.ok) setEditing(false);
  }
  const f = state.fields ?? {};

  if (editing)
    return (
      <li className="a-card p-5">
        <form action={action} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="id" value={r.id} />
          <div>
            <label htmlFor={`e-q-${r.id}`} className={lab}>What they said</label>
            <textarea id={`e-q-${r.id}`} name="quote" rows={4} defaultValue={r.quote} className={box} />
            <Err text={f.quote} />
          </div>
          <div>
            <label htmlFor={`e-a-${r.id}`} className={lab}>Who said it</label>
            <input id={`e-a-${r.id}`} name="author" defaultValue={r.author} className={box} />
            <Err text={f.author} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={r.published} /> Show on the website
          </label>
          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-red-700">{state.message}</p>
          )}
          <div className="flex gap-2">
            <button disabled={pending} className="a-btn a-btn-primary">{pending ? "Saving…" : "Save review"}</button>
            <button type="button" className="a-btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );

  return (
    <li className="a-card p-5">
      <blockquote className="a-serif text-xl leading-snug">&ldquo;{r.quote}&rdquo;</blockquote>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        {r.author}
        <span className={`rounded-full px-2 py-0.5 text-xs ${r.published ? "bg-[var(--a-olive-soft)] text-[var(--a-olive-ink)]" : "bg-neutral-200 text-neutral-700"}`}>
          {r.published ? "Shown" : "Hidden"}
        </span>
      </p>
      {asking ? (
        <form action={deleteTestimonial} className="mt-3 flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm deleting the review">
          <input type="hidden" name="id" value={r.id} />
          <span className="text-sm">Delete this review for good?</span>
          <button className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white">Yes, delete</button>
          <button type="button" className="a-btn !min-h-9" onClick={() => setAsking(false)}>Keep it</button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="a-btn !min-h-9 !px-3 !text-xs" onClick={() => setEditing(true)}>Edit</button>
          <form action={setTestimonialPublished}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="publish" value={r.published ? "0" : "1"} />
            <button className="a-btn !min-h-9 !px-3 !text-xs">{r.published ? "Hide" : "Show"}</button>
          </form>
          <button type="button" onClick={() => setAsking(true)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}