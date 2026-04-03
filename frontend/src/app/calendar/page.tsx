"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  CalendarDays,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  compareAsc,
} from "date-fns";

const STORAGE_KEY = "lexmalta_calendar_events";

type EventType = "court" | "filing" | "appeal" | "meeting";

interface CalendarEvent {
  id: string;
  name: string;
  date: string; // ISO date string YYYY-MM-DD
  type: EventType;
  notes: string;
}

const EVENT_COLORS: Record<EventType, { bg: string; text: string; border: string; dot: string }> = {
  court:   { bg: "bg-gold/10",       text: "text-[#b8963a]", border: "border-gold/30",   dot: "bg-[#b8963a]" },
  filing:  { bg: "bg-navy/10",       text: "text-navy",      border: "border-navy/30",   dot: "bg-navy" },
  appeal:  { bg: "bg-red-50",        text: "text-red-600",   border: "border-red-200",   dot: "bg-red-500" },
  meeting: { bg: "bg-emerald-50",    text: "text-emerald-700",border: "border-emerald-200", dot: "bg-emerald-500" },
};

const EVENT_ICONS: Record<EventType, React.ElementType> = {
  court:   Scale,
  filing:  FileText,
  appeal:  AlertTriangle,
  meeting: Users,
};

const LABELS = {
  mt: {
    title: "Kalendarju Legali",
    subtitle: "Skedja u segwi d-dati tal-qorti u l-iskadenza",
    addEvent: "Żid Avveniment",
    upcoming: "Avvenimenti li Ġejjin",
    noEvents: "L-ebda avveniment skedat.",
    eventName: "Isem l-Avveniment",
    eventDate: "Data",
    eventType: "Tip",
    notes: "Noti",
    save: "Issejvja",
    cancel: "Ikkanċella",
    delete: "Ħassar",
    today: "Illum",
    types: {
      court:   "Smigħ tal-Qorti",
      filing:  "Skadenza ta' Sottomissjoni",
      appeal:  "Skadenza ta' Appell",
      meeting: "Laqgħa",
    },
    back: "← Lura / Back",
    nav: {
      laws: "Liġijiet",
      judgments: "Sentenzi",
      lawyers: "Avukati",
      igaming: "iGaming",
      calendar: "Kalendarju",
    },
    days: ["Ħad", "Tne", "Tli", "Erb", "Ħam", "Sib", "Sab"],
    confirmDelete: "Trid tħassar dan l-avveniment?",
    noUpcoming: "L-ebda avveniment li ġej.",
    namePlaceholder: "eż. Smigħ — Pulizija vs. Smith",
    notesPlaceholder: "Noti addizzjonali...",
  },
  en: {
    title: "Legal Calendar",
    subtitle: "Schedule and track court dates and filing deadlines",
    addEvent: "Add Event",
    upcoming: "Upcoming Events",
    noEvents: "No events scheduled.",
    eventName: "Event Name",
    eventDate: "Date",
    eventType: "Type",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    today: "Today",
    types: {
      court:   "Court Hearing",
      filing:  "Filing Deadline",
      appeal:  "Appeal Deadline",
      meeting: "Meeting",
    },
    back: "← Lura / Back",
    nav: {
      laws: "Laws",
      judgments: "Judgments",
      lawyers: "Lawyers",
      igaming: "iGaming",
      calendar: "Calendar",
    },
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    confirmDelete: "Delete this event?",
    noUpcoming: "No upcoming events.",
    namePlaceholder: "e.g. Hearing — Police vs. Smith",
    notesPlaceholder: "Additional notes...",
  },
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CalendarPage() {
  const [lang, setLang] = useLanguage();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<EventType>("court");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const t = LABELS[lang];

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEvents(JSON.parse(stored));
    } catch {
      setEvents([]);
    }
  }, []);

  const saveEvents = useCallback((updated: CalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable — graceful degradation
    }
  }, []);

  const handleAddEvent = () => {
    setFormError("");
    if (!formName.trim()) { setFormError(lang === "mt" ? "Daħħal isem." : "Please enter a name."); return; }
    if (!formDate) { setFormError(lang === "mt" ? "Agħżel data." : "Please select a date."); return; }
    const newEvent: CalendarEvent = {
      id: generateId(),
      name: formName.trim(),
      date: formDate,
      type: formType,
      notes: formNotes.trim(),
    };
    saveEvents([...events, newEvent]);
    setFormName("");
    setFormDate("");
    setFormType("court");
    setFormNotes("");
    setShowForm(false);
    setSelectedDate("");
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    saveEvents(events.filter((e) => e.id !== id));
  };

  const handleOpenForm = (dateStr?: string) => {
    setFormDate(dateStr ?? "");
    setSelectedDate(dateStr ?? "");
    setShowForm(true);
    setFormError("");
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsOnDay = (day: Date) =>
    events.filter((e) => {
      try { return isSameDay(parseISO(e.date), day); } catch { return false; }
    });

  // Upcoming events — sorted by date, only future or today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = [...events]
    .filter((e) => {
      try { return parseISO(e.date) >= today; } catch { return false; }
    })
    .sort((a, b) => {
      try { return compareAsc(parseISO(a.date), parseISO(b.date)); } catch { return 0; }
    });

  const NAV_LINKS = Object.entries(t.nav);

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold text-[#1a1a2e]">
              <span className="text-gold">Ligi</span>4Friends
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map(([key, label]) => (
              <Link
                key={key}
                href={`/${key}`}
                className={`hover:text-gold transition-colors font-medium ${key === "calendar" ? "text-gold" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-[#e5e0d5] hover:border-gold/50
                       hover:bg-gold/5 text-xs font-mono text-[#6b7280] transition-all"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#1a1a2e] transition-colors mb-6 inline-block">
          {t.back}
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20">
                <CalendarDays size={22} className="text-gold" />
              </div>
              <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
            </div>
            <p className="text-[#6b7280] ml-14">{t.subtitle}</p>
          </div>
          <button
            onClick={() => handleOpenForm(format(new Date(), "yyyy-MM-dd"))}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#b8963a] text-white rounded-xl
                       font-semibold hover:bg-[#a07828] transition-colors text-sm shrink-0 shadow-sm"
          >
            <Plus size={15} />
            {t.addEvent}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========== CALENDAR ========== */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Month navigation */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e0d5]">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 rounded-xl hover:bg-[#f5f3ee] text-[#6b7280] hover:text-[#1a1a2e] transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="font-display font-bold text-[#1a1a2e] text-lg">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 rounded-xl hover:bg-[#f5f3ee] text-[#6b7280] hover:text-[#1a1a2e] transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-[#e5e0d5]">
                {t.days.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-[#9ca3af] py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calDays.map((day, idx) => {
                  const dayEvents = eventsOnDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const todayDay = isToday(day);
                  const isSelected = selectedDate === format(day, "yyyy-MM-dd");

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOpenForm(format(day, "yyyy-MM-dd"))}
                      className={`relative min-h-[64px] p-1.5 border-b border-r border-[#e5e0d5] text-left
                                  transition-all hover:bg-gold/5 group
                                  ${!inMonth ? "opacity-30" : ""}
                                  ${isSelected ? "bg-gold/5" : ""}
                                  ${idx % 7 === 6 ? "border-r-0" : ""}
                      `}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1
                                    ${todayDay
                                      ? "bg-[#b8963a] text-white"
                                      : "text-[#1a1a2e] group-hover:text-gold"
                                    }`}
                      >
                        {format(day, "d")}
                      </span>
                      {/* Event dots */}
                      <div className="flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[ev.type].dot}`}
                            title={ev.name}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-[#9ca3af] leading-none">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Color legend */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 mt-4 px-1"
            >
              {(Object.entries(EVENT_COLORS) as [EventType, (typeof EVENT_COLORS)[EventType]][]).map(
                ([type, colors]) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    {t.types[type]}
                  </div>
                )
              )}
            </motion.div>
          </div>

          {/* ========== RIGHT PANEL ========== */}
          <div className="flex flex-col gap-5">
            {/* Add Event Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, scale: 0.97, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5"
                >
                  <h3 className="font-display font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                    <Plus size={15} style={{ color: "#b8963a" }} />
                    {t.addEvent}
                  </h3>

                  <div className="flex flex-col gap-3">
                    {/* Name */}
                    <div>
                      <label className="text-xs font-semibold text-[#6b7280] mb-1 block">{t.eventName}</label>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3 py-2.5 bg-white border border-[#e5e0d5] rounded-xl
                                   focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                                   placeholder:text-[#9ca3af] text-sm transition-all"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-xs font-semibold text-[#6b7280] mb-1 block">{t.eventDate}</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-[#e5e0d5] rounded-xl
                                   focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                                   text-sm transition-all cursor-pointer"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-xs font-semibold text-[#6b7280] mb-1 block">{t.eventType}</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["court", "filing", "appeal", "meeting"] as EventType[]).map((type) => {
                          const Icon = EVENT_ICONS[type];
                          const colors = EVENT_COLORS[type];
                          return (
                            <button
                              key={type}
                              onClick={() => setFormType(type)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
                                          ${formType === type
                                            ? `${colors.bg} ${colors.text} ${colors.border}`
                                            : "bg-white text-[#6b7280] border-[#e5e0d5] hover:border-[#b8963a]/30"
                                          }`}
                            >
                              <Icon size={12} />
                              {t.types[type]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-semibold text-[#6b7280] mb-1 block">{t.notes}</label>
                      <textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder={t.notesPlaceholder}
                        rows={2}
                        className="w-full px-3 py-2.5 bg-white border border-[#e5e0d5] rounded-xl
                                   focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                                   placeholder:text-[#9ca3af] text-sm transition-all resize-none"
                      />
                    </div>

                    {/* Error */}
                    {formError && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {formError}
                      </p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddEvent}
                        className="flex-1 py-2.5 bg-[#b8963a] text-white rounded-xl font-semibold
                                   hover:bg-[#a07828] transition-colors text-sm"
                      >
                        {t.save}
                      </button>
                      <button
                        onClick={() => { setShowForm(false); setSelectedDate(""); }}
                        className="px-4 py-2.5 bg-[#f5f3ee] text-[#6b7280] rounded-xl font-semibold
                                   hover:bg-[#ede9e0] transition-colors text-sm border border-[#e5e0d5]"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#e5e0d5] flex items-center gap-2">
                <Clock size={15} style={{ color: "#b8963a" }} />
                <h3 className="font-display font-bold text-[#1a1a2e]">{t.upcoming}</h3>
                {upcomingEvents.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gold/10 text-[#b8963a] font-semibold border border-gold/20">
                    {upcomingEvents.length}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[#e5e0d5] max-h-[420px] overflow-y-auto">
                <AnimatePresence>
                  {upcomingEvents.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-[#9ca3af]">
                      {t.noUpcoming}
                    </div>
                  ) : (
                    upcomingEvents.map((ev, i) => {
                      const colors = EVENT_COLORS[ev.type];
                      const Icon = EVENT_ICONS[ev.type];
                      let dateDisplay = ev.date;
                      try {
                        dateDisplay = format(parseISO(ev.date), "EEE d MMM yyyy");
                      } catch {}

                      return (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#f5f3ee]/60 transition-colors group"
                        >
                          <div className={`p-1.5 rounded-lg ${colors.bg} border ${colors.border} shrink-0 mt-0.5`}>
                            <Icon size={12} className={colors.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1a1a2e] truncate">{ev.name}</p>
                            <p className="text-xs text-[#9ca3af] mt-0.5">{dateDisplay}</p>
                            {ev.notes && (
                              <p className="text-xs text-[#6b7280] mt-1 truncate">{ev.notes}</p>
                            )}
                            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                                             ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {t.types[ev.type]}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-red-500
                                       hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title={t.delete}
                          >
                            <Trash2 size={13} />
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              {!showForm && (
                <div className="p-3 border-t border-[#e5e0d5]">
                  <button
                    onClick={() => handleOpenForm(format(new Date(), "yyyy-MM-dd"))}
                    className="w-full py-2 text-sm text-[#9ca3af] hover:text-[#b8963a] transition-colors
                               flex items-center justify-center gap-2 rounded-xl hover:bg-gold/5"
                  >
                    <Plus size={14} />
                    {t.addEvent}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5] mt-10">
          <p>Ligi4Friends — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
