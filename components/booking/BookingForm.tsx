"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  submitBooking,
  type BookingResult,
} from "@/app/(public)/booking/actions";
import BookingCalendar from "@/components/booking/BookingCalendar";
import { BOOKING_MAX_DAYS_AHEAD } from "@/lib/booking/bookingSchema";
import { OTHER_LABEL_MAX, validateOtherLabel } from "@/lib/booking/eventType";
import { MESSENGER_MAX, parseMessengerLink } from "@/lib/booking/messenger";
import {
  busyOnDay,
  instantTimeLabel,
  manilaMs,
  overlapsAny,
  startTimes,
  timeLabel,
  type Busy,
} from "@/lib/booking/manila";
import { SERVICE_LABEL, formatPeso } from "@/lib/format";
import type { CategoryRow, PackageRow, Quote } from "@/lib/types/db";

type Props = {
  todayKey: string;
  busy: Busy[] | null; // null = the calendar could not be loaded
  categories: CategoryRow[];
  pkg: PackageRow;
  hours: number;
  quote: Quote;
  initialCategoryId: string;
  initialOther: string;
  addonIds: string[];
  outsideBase: boolean;
  turnaround: string;
  changeHref: string; // link back to the pricing page
};

const field =
  "border-line bg-ink-2 text-bone placeholder:text-mute w-full rounded-md border px-3 py-2";
const label = "text-stone mb-2 block text-sm";

export default function BookingForm(p: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BookingResult | null>(null);

  const [categoryId, setCategoryId] = useState(p.initialCategoryId);
  const [other, setOther] = useState(p.initialOther);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messenger, setMessenger] = useState("");
  const [venue, setVenue] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // bot trap
  const [errors, setErrors] = useState<Record<string, string>>({});

  const busy = p.busy ?? [];
  const category = p.categories.find((c) => c.id === categoryId);
  const isOther = category?.is_other === true;

  const dayBusy = date ? busyOnDay(date, busy) : [];
  const times = startTimes();
  const takesTime = (t: string) =>
    overlapsAny(manilaMs(date, t), manilaMs(date, t) + p.hours * 3600000, busy);
  const chosenTaken = date && time ? takesTime(time) : false;

  function chooseCategory(id: string) {
    setCategoryId(id);
    setOther(""); // switching away from "Others" clears what was typed
    setErrors((e) => ({ ...e, eventTypeOther: "" }));
  }

  function chooseDate(key: string) {
    setDate(key);
    setErrors((e) => ({ ...e, date: "" }));
    // Forget a start time that does not fit the new day.
    if (
      time &&
      overlapsAny(
        manilaMs(key, time),
        manilaMs(key, time) + p.hours * 3600000,
        busy,
      )
    ) {
      setTime("");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!date) found.date = "Please pick a date on the calendar.";
    if (!time) found.time = "Please pick a start time.";
    else if (chosenTaken)
      found.time = "That time overlaps a booked time. Please pick another.";
    if (isOther) {
      const check = validateOtherLabel(other);
      if (!check.ok) found.eventTypeOther = check.message;
    }
    const link = parseMessengerLink(messenger);
    if (!link.ok) found.messenger = link.message;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    startTransition(async () => {
      const res = await submitBooking({
        packageId: p.pkg.id,
        hours: p.hours,
        addonIds: p.addonIds,
        outsideBase: p.outsideBase,
        categoryId,
        eventTypeOther: isOther ? other : "",
        date,
        time,
        name,
        email,
        phone,
        messenger,
        venue,
        message,
        website,
      });
      setResult(res);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        if (res.slotTaken) {
          setTime("");
          router.refresh(); // reload the calendar so the taken time shows up
        }
        document.getElementById("form-status")?.focus();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (result?.ok) {
    return (
      <div
        role="status"
        className="border-line bg-ink-2 mx-auto max-w-xl rounded-md border p-8"
      >
        <p className="text-brass text-xs tracking-[0.25em] uppercase">
          Request received
        </p>
        <h2 className="text-bone mt-2 font-serif text-3xl">
          Thank you, {name.split(" ")[0]}.
        </h2>
        <p className="text-stone mt-4">
          Your reference is{" "}
          <strong className="text-bone tracking-wider">
            {result.reference}
          </strong>
          . Please keep it.
        </p>
        <p className="text-stone mt-3">
          This is a request, not a confirmed booking. The date is only held for
          you once we reply and confirm. We will contact you using the details
          you gave.
        </p>
        <p className="text-bone mt-4">
          {result.total !== null
            ? `Estimated total: ${formatPeso(result.total)}`
            : "We will confirm the price with you."}
        </p>
        <Link
          href="/"
          className="bg-brass text-brass-ink mt-6 inline-block rounded-md px-5 py-3 text-sm font-medium"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-8">
        <div
          id="form-status"
          tabIndex={-1}
          role="alert"
          className={
            result && !result.ok
              ? "border-l-2 border-[#E8806A] pl-3 text-sm text-[#E8806A]"
              : "sr-only"
          }
        >
          {result && !result.ok ? result.message : ""}
        </div>

        {p.busy === null && (
          <p className="border-brass text-bone border-l-2 pl-3 text-sm">
            We could not load the calendar right now. You can still send a
            request. We will check the date with you before confirming.
          </p>
        )}

        <fieldset>
          <legend className="text-mute mb-3 text-xs tracking-[0.2em] uppercase">
            1. Event date
          </legend>
          <BookingCalendar
            todayKey={p.todayKey}
            maxDaysAhead={BOOKING_MAX_DAYS_AHEAD}
            busy={busy}
            value={date}
            onChange={chooseDate}
            invalid={!!errors.date}
          />
          {errors.date && <Err>{errors.date}</Err>}
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start-time"
              className="text-mute mb-3 block text-xs tracking-[0.2em] uppercase"
            >
              2. Start time
            </label>
            <select
              id="start-time"
              value={time}
              disabled={!date}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors((x) => ({ ...x, time: "" }));
              }}
              aria-invalid={errors.time ? true : undefined}
              className={field}
            >
              <option value="">
                {date ? "Choose a start time" : "Pick a date first"}
              </option>
              {date &&
                times.map((t) => (
                  <option key={t} value={t} disabled={takesTime(t)}>
                    {timeLabel(t)}
                    {takesTime(t) ? " (taken)" : ""}
                  </option>
                ))}
            </select>
            {errors.time && <Err>{errors.time}</Err>}
            {dayBusy.length > 0 && (
              <p className="text-stone mt-2 text-xs">
                Already booked that day (travel time included):{" "}
                {dayBusy
                  .map(
                    (b) =>
                      `${instantTimeLabel(b.s)} to ${instantTimeLabel(b.e)}`,
                  )
                  .join(", ")}
                .
              </p>
            )}
            {date && time && !chosenTaken && (
              <p className="text-mute mt-2 text-xs">
                Coverage: {timeLabel(time)}, {p.hours}{" "}
                {p.hours === 1 ? "hour" : "hours"}.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="event-type"
              className="text-mute mb-3 block text-xs tracking-[0.2em] uppercase"
            >
              3. Event type
            </label>
            <select
              id="event-type"
              value={categoryId}
              onChange={(e) => chooseCategory(e.target.value)}
              className={field}
            >
              {p.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isOther && (
              <div className="mt-4">
                <label htmlFor="event-type-other" className={label}>
                  Please specify your event type
                </label>
                <input
                  id="event-type-other"
                  type="text"
                  required
                  maxLength={OTHER_LABEL_MAX}
                  value={other}
                  onChange={(e) => {
                    setOther(e.target.value);
                    setErrors((x) => ({ ...x, eventTypeOther: "" }));
                  }}
                  aria-invalid={errors.eventTypeOther ? true : undefined}
                  placeholder="e.g. Baby shower, reunion"
                  className={field}
                />
                {errors.eventTypeOther && <Err>{errors.eventTypeOther}</Err>}
              </div>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-5">
          <legend className="text-mute mb-3 text-xs tracking-[0.2em] uppercase">
            4. Your details
          </legend>
          <div>
            <label htmlFor="client-name" className={label}>
              Full name
            </label>
            <input
              id="client-name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              maxLength={120}
              className={field}
            />
            {errors.name && <Err>{errors.name}</Err>}
          </div>
          <div>
            <label htmlFor="client-messenger" className={label}>
              Messenger link
            </label>
            <input
              id="client-messenger"
              type="url"
              inputMode="url"
              autoComplete="off"
              required
              value={messenger}
              onChange={(e) => {
                setMessenger(e.target.value);
                setErrors((x) => ({ ...x, messenger: "" }));
              }}
              aria-invalid={errors.messenger ? true : undefined}
              aria-describedby="messenger-help"
              maxLength={MESSENGER_MAX}
              placeholder="https://m.me/yourname"
              className={field}
            />
            {errors.messenger && <Err>{errors.messenger}</Err>}
            <p id="messenger-help" className="text-mute mt-1 text-xs">
              Paste a link, not just your name, so we can message you directly.
              In Messenger or Facebook, open your profile, tap the three dots,
              then Copy link.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="client-email" className={label}>
                Email (optional)
              </label>
              <input
                id="client-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                maxLength={254}
                className={field}
              />
              {errors.email && <Err>{errors.email}</Err>}
            </div>
            <div>
              <label htmlFor="client-phone" className={label}>
                Mobile number (optional)
              </label>
              <input
                id="client-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                placeholder="0917 123 4567"
                maxLength={30}
                className={field}
              />
              {errors.phone && <Err>{errors.phone}</Err>}
            </div>
          </div>
          <div>
            <label htmlFor="client-venue" className={label}>
              Venue or address (optional)
            </label>
            <input
              id="client-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={300}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="client-message" className={label}>
              Anything we should know? (optional)
            </label>
            <textarea
              id="client-message"
              rows={4}
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
              className={field}
            />
            {errors.message && <Err>{errors.message}</Err>}
          </div>

          {/* Bot trap: hidden from people and screen readers. Bots fill it in. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          >
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="border-line bg-ink-2 h-fit rounded-md border p-6 lg:sticky lg:top-6">
        <h2 className="text-bone font-serif text-2xl">Your request</h2>
        <p className="text-mute mt-1 text-sm">
          {SERVICE_LABEL[p.pkg.service_type]} · {p.pkg.name} ·{" "}
          {p.pkg.max_hours === null
            ? "Whole Event"
            : `${p.hours} ${p.hours === 1 ? "hour" : "hours"}`}
        </p>
        {category && (
          <p className="text-mute text-sm">
            {isOther
              ? `Event: Others${other.trim() ? ` (${other.trim()})` : ""}`
              : `Event: ${category.name}`}
          </p>
        )}
        {date && time && (
          <p className="text-mute text-sm">
            When: {date}, {timeLabel(time)}
          </p>
        )}

        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <Line
            label={`${p.quote.package_name} package`}
            value={formatPeso(p.quote.base_price)}
          />
          {p.quote.extra_hours > 0 && !p.quote.custom_quote && (
            <Line
              label={`Extra hours (${p.quote.extra_hours})`}
              value={formatPeso(p.quote.extra_hours_fee)}
            />
          )}
          {p.quote.addons.map((a) => (
            <Line
              key={a.id}
              label={a.name}
              value={a.included ? "Included" : formatPeso(a.line_total)}
            />
          ))}
          {p.quote.outside_base_area && (
            <Line label="Transport" value={formatPeso(p.quote.travel_fee)} />
          )}
          <div className="border-line mt-2 border-t pt-4">
            {p.quote.total !== null ? (
              <Line
                label="Estimated total"
                value={formatPeso(p.quote.total)}
                strong
              />
            ) : (
              <p className="text-bone">
                Extra hours are quoted separately. We will confirm the price
                with you.
              </p>
            )}
          </div>
        </dl>

        {p.turnaround && (
          <p className="text-stone mt-6 text-xs">{p.turnaround}.</p>
        )}
        <p className="text-mute mt-2 text-xs">
          This is a request. Your date is held only after we reply and confirm.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-brass text-brass-ink rounded-md px-5 py-3 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send booking request"}
          </button>
          <Link
            href={p.changeHref}
            className="text-stone text-center text-sm underline"
          >
            Change package or hours
          </Link>
        </div>
      </aside>
    </form>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-[#E8806A]">
      {children}
    </p>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${strong ? "text-bone text-lg" : "text-stone"}`}
    >
      <dt>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-brass" : "text-bone"}`}>
        {value}
      </dd>
    </div>
  );
}